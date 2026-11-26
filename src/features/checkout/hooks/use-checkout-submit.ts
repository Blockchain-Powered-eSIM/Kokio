import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import type { Esim } from "@/components/ui/esim-item";
import { useToast } from "@/contexts/ToastContext";
import { useKokio } from "@/hooks/useKokio";
import { isOrderSuccess, pollOrderStatus } from "@/lib/api/bff/order";
import type { CreateOrderRequest, CreateOrderResponse, OrderStatusResponse, PollUpdate } from "@/lib/api/bff/order";
import { formatBffError } from "@/lib/api/bff/client";
import { resolveBffErrorMessage } from "@/lib/api/bff/errors";
import { CREDIT_BALANCE_KEY, DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY } from "@/lib/query-keys";
import { RADIO_KEYS } from "@/lib/constants/app";
import { logger } from "@/lib/logger";
import { pollingLabel, isUserActionableManualReview } from "@/features/orders/order-status";
import { formatOnChainError, isUserCancelledPasskeyError } from "@/lib/chain/format-on-chain-error";
import { CODE_ERROR_CODES, MAPPED_ORDER_ERROR_CODES } from "../checkout-errors";
import { sendDeviceWalletPayment, waitForDeviceWalletOrder } from "../device-wallet-payment";
import { formatPlanLabel } from "../esim-order";
import { useCreateOrder, StripeCancelledError, StripeSheetError, OrderCreationError } from "./use-create-order";
import type { TopupSelection } from "./use-topup-selection";

type CheckoutSubmitOptions = {
  eSimItem: Esim;
  selectedPaymentMethod: string | undefined;
  applyAsTopup: boolean;
  compatibleTopUpEsimRef: string | undefined;
  buildOrderRequest: (topup: TopupSelection) => CreateOrderRequest;
  buildTopupEsimLabel: (eSimRef: string, iccid?: string) => string;
  onOrderCompleted: () => void;
  onCodeRejected: (message: string) => void;
  refetchCredit: () => void;
  refreshPreview: () => void;
};

/** Places the order, runs the chosen payment flow, and tracks the result shown to the user. */
export function useCheckoutSubmit({
  eSimItem,
  selectedPaymentMethod,
  applyAsTopup,
  compatibleTopUpEsimRef,
  buildOrderRequest,
  buildTopupEsimLabel,
  onOrderCompleted,
  onCodeRejected,
  refetchCredit,
  refreshPreview,
}: CheckoutSubmitOptions) {
  const { kokio }     = useKokio();
  const { showMessage } = useToast();
  const queryClient   = useQueryClient();

  const [showSuccessModal, setShowSuccessModal]           = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading]         = useState(false);
  const [loadingMessage, setLoadingMessage]               = useState('');
  const [helioChargeToken, setHelioChargeToken]           = useState<string | null>(null);
  const [helioCorrelationId, setHelioCorrelationId]       = useState<string | null>(null);
  const [pendingHelioOrder, setPendingHelioOrder]         = useState<CreateOrderResponse | null>(null);
  const [orderResponse, setOrderResponse]                 = useState<OrderStatusResponse | null>(null);
  const [topupSuccessInfo, setTopupSuccessInfo]           = useState<{ fromLabel: string; toLabel: string } | null>(null);
  const [showManualReviewModal, setShowManualReviewModal] = useState(false);
  const [failedOrderInfo, setFailedOrderInfo]             = useState<{
    orderStatus: string;
    referenceId: string | null;
    manualReviewReason?: string | null;
  } | null>(null);

  const orderCorrelationRef = useRef<string | null>(null);
  const handlePollUpdate    = useCallback(
    (update: PollUpdate) => {
      setLoadingMessage(update.kind === 'status' ? pollingLabel(update.orderStatus) : 'Retrying...');
    },
    [],
  );
  const createOrderMutation = useCreateOrder({
    onOrderCreated: async (correlationId) => {
      orderCorrelationRef.current = correlationId;
    },
    onPollUpdate: handlePollUpdate,
  });

  // Set synchronously at the start of each handleCheckout call, read by
  // handleOrderResult whenever that order's result eventually resolves -
  // see handleOrderResult for why this can't just be component state.
  const topupSelectionRef = useRef<TopupSelection>({ applyAsTopup: false });

  const handleOrderResult = useCallback(async (
    order: OrderStatusResponse | null,
    correlationId?: string | null,
  ) => {
    if (!order) {
      showMessage('Unable to confirm order status. Check Order History in Settings.', 'info');
      return;
    }
    if (isOrderSuccess(order.orderStatus)) {
      onOrderCompleted();
      queryClient.invalidateQueries({ queryKey: [DEVICE_ESIMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEVICE_ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CREDIT_BALANCE_KEY] });
      setOrderResponse(order);
      // Reads the ref (set synchronously at the start of the checkout that
      // produced this order), not component state - state may have already
      // moved on by the time this resolves (e.g. a device-wallet payment
      // awaiting a passkey confirmation).
      const topupSelection = topupSelectionRef.current;
      setTopupSuccessInfo(
        topupSelection.applyAsTopup && topupSelection.compatibleTopUpEsimRef
          ? {
              fromLabel: formatPlanLabel(eSimItem) ?? 'your new plan',
              toLabel:   buildTopupEsimLabel(topupSelection.compatibleTopUpEsimRef),
            }
          : null,
      );
      setShowSuccessModal(true);
      return;
    }
    if (isUserActionableManualReview(order.flaggedForManualReview, order.manualReviewReason)) {
      setFailedOrderInfo({
        orderStatus: order.orderStatus,
        referenceId: correlationId ?? order.orderId ?? null,
        manualReviewReason: order.manualReviewReason ?? null,
      });
      setShowManualReviewModal(true);
      return;
    }
    const msg =
      order.orderStatus === 'PAYMENT_FAILED' ? 'Payment failed. Please try again.'  :
      order.orderStatus === 'ABANDONED'       ? 'Order expired. Please try again.'   :
      'Order could not be completed. Please try again.';
    showMessage(msg, 'info');
  }, [queryClient, showMessage, eSimItem, buildTopupEsimLabel, onOrderCompleted]);

  const resetHelioState = useCallback(() => {
    setHelioChargeToken(null);
    setPendingHelioOrder(null);
    setHelioCorrelationId(null);
  }, []);

  const handleHelioComplete = useCallback(async (finalOrder: OrderStatusResponse | null) => {
    resetHelioState();
    setIsCheckoutLoading(false);
    setLoadingMessage('');
    await handleOrderResult(finalOrder, helioCorrelationId);
  }, [resetHelioState, handleOrderResult, helioCorrelationId]);

  const handleBrowserPay = useCallback(async (url: string, cid: string | null) => {
    let polled = false;
    const doPoll = async () => {
      if (polled) return;
      polled = true;
      setIsCheckoutLoading(true);
      setLoadingMessage('Checking payment status...');
      try {
        const finalOrder = cid
          ? await pollOrderStatus(cid, { onUpdate: handlePollUpdate }).catch(() => null)
          : null;
        setIsCheckoutLoading(false);
        setLoadingMessage('');
        await handleOrderResult(finalOrder, cid);
      } catch {
        setIsCheckoutLoading(false);
        setLoadingMessage('');
      }
    };
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { appStateSub.remove(); WebBrowser.dismissBrowser(); doPoll(); }
    });
    await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'cancel' });
    appStateSub.remove();
    doPoll();
  }, [handleOrderResult, handlePollUpdate]);

  const handleDeviceWalletPayment = useCallback(async (
    userOperations: { to: string; data: string }[],
    correlationId: string,
  ) => {
    const deviceWallet = kokio.sdk?.deviceWallet;
    const smartAccountClient = kokio.sdk?.smartAccountClient;
    if (!deviceWallet || !smartAccountClient) {
      showMessage("Wallet isn't ready yet - try again in a moment", 'info');
      return;
    }

    try {
      setIsCheckoutLoading(true);
      setLoadingMessage('Confirm the payment...');

      const hash = await sendDeviceWalletPayment(deviceWallet, smartAccountClient, userOperations);

      setLoadingMessage('Checking payment status...');

      const finalOrder = await waitForDeviceWalletOrder(correlationId, hash, handlePollUpdate);
      setIsCheckoutLoading(false);
      setLoadingMessage('');
      await handleOrderResult(finalOrder, correlationId);
    } catch (err) {
      setIsCheckoutLoading(false);
      setLoadingMessage('');
      if (isUserCancelledPasskeyError(err)) {
        logger.debug('DEVICE_WALLET_PAYMENT_CANCELLED_BY_USER');
        return;
      }
      logger.error('DEVICE_WALLET_PAYMENT_FAILED', { err });
      showMessage(formatOnChainError(err, 'Could not complete the payment.'), 'info');
    }
  }, [kokio.sdk, handlePollUpdate, handleOrderResult, showMessage]);

  const handleCheckout = useCallback(async (override?: TopupSelection) => {
    const topupSelection = override ?? { applyAsTopup, compatibleTopUpEsimRef };
    topupSelectionRef.current = topupSelection;
    const request = buildOrderRequest(topupSelection);

    setIsCheckoutLoading(true);
    setLoadingMessage('Preparing your payment...');
    orderCorrelationRef.current = null;

    try {
      const result = await createOrderMutation.mutateAsync({ request, eSimItem });

      if (result.kind === 'terminal') {
        setIsCheckoutLoading(false);
        setLoadingMessage('');
        await handleOrderResult(result.order, result.correlationId);
        return;
      }

      setIsCheckoutLoading(false);
      setLoadingMessage('');

      if (result.kind === 'awaiting_device_wallet_payment') {
        await handleDeviceWalletPayment(result.userOperations, result.correlationId);
        return;
      }

      // awaiting_crypto_payment
      if (
        //@ts-expect-error EXTERNAL_WALLET has been intentionally disabled for now
        selectedPaymentMethod === RADIO_KEYS.EXTERNAL_WALLET
      ) {
        setPendingHelioOrder({
          orderId:              result.orderId,
          moonpayChargeId:      result.moonpayChargeId,
          moonpayPaymentPageUrl: result.moonpayPaymentPageUrl,
        });
        setHelioCorrelationId(result.correlationId);
        setHelioChargeToken(result.moonpayChargeId);
      } else {
        // EXTERNAL_WALLET_BROWSER and the device-wallet path share this browser
        // fallback — both resolve to the same CRYPTO response shape.
        // TODO: Revisit once the backend distinguishes direct transfers from processor payments.
        handleBrowserPay(result.moonpayPaymentPageUrl, result.correlationId);
      }
    } catch (err) {
      logger.error('CHECKOUT_FAILED', { err });
      if (err instanceof StripeCancelledError) {
        setIsCheckoutLoading(false);
        setLoadingMessage('');
        return;
      }
      if (err instanceof StripeSheetError) {
        showMessage(err.message, 'info');
        setIsCheckoutLoading(false);
        setLoadingMessage('');
        return;
      }
      const errorCode = err instanceof OrderCreationError ? err.code : null;
      if (errorCode && MAPPED_ORDER_ERROR_CODES.has(errorCode)) {
        const message = resolveBffErrorMessage(errorCode);
        showMessage(message, 'info');
        if (errorCode === 'STORE_CREDIT_INSUFFICIENT') {
          refetchCredit();
          refreshPreview();
        } else if (CODE_ERROR_CODES.has(errorCode)) {
          onCodeRejected(message);
        }
      } else if (
        err instanceof OrderCreationError &&
        (errorCode === 'WALLET_DEPLOYMENT_IN_PROGRESS' || /wallet deployment is in progress/i.test(err.message))
      ) {
        // By design, every payment method, including fiat, is blocked while this device's wallet is DEPLOYING to avoid a race between order fulfilment and deployment completing.
        showMessage(
          "Your wallet is still being set up. This can take a few minutes, please try again shortly.",
          'info',
        );
      } else {
        showMessage(formatBffError(err), 'info');
      }
      setIsCheckoutLoading(false);
      setLoadingMessage('');
    }
  }, [
    selectedPaymentMethod, eSimItem, applyAsTopup, compatibleTopUpEsimRef, buildOrderRequest,
    createOrderMutation, handleOrderResult, handleBrowserPay, showMessage,
    handleDeviceWalletPayment, refetchCredit, refreshPreview, onCodeRejected,
  ]);

  const handleInstallESIM = useCallback(() => {
    setShowSuccessModal(false);
    router.dismissAll();
    router.push({
      pathname: "/(tabs)/installation",
      params: {
        orderId:              orderResponse?.orderId || "",
        qrcode:               orderResponse?.installationDetails?.qrcode || "",
        appleInstallationUrl: orderResponse?.installationDetails?.appleInstallationUrl || "",
        iccid:                orderResponse?.iccid || "",
      },
    });
  }, [orderResponse]);

  const handleTopupDone = useCallback(() => {
    setShowSuccessModal(false);
    router.dismissAll();
    router.navigate("/(tabs)/orders");
  }, []);

  return {
    handleCheckout,
    isCheckoutLoading,
    setIsCheckoutLoading,
    loadingMessage,
    setLoadingMessage,
    showSuccessModal,
    topupSuccessInfo,
    handleInstallESIM,
    handleTopupDone,
    showManualReviewModal,
    failedOrderInfo,
    dismissManualReview: () => setShowManualReviewModal(false),
    helioChargeToken,
    helioCorrelationId,
    pendingHelioOrder,
    handleHelioComplete,
    resetHelioState,
  };
}
