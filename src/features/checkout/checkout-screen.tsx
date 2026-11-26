import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  View,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { RadioButtonProps, RadioGroup } from "react-native-radio-buttons-group";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useQueryClient } from '@tanstack/react-query';
import _toUpper from "lodash/toUpper";
import * as Clipboard from "expo-clipboard";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import UseCreditBalanceToggle from "./components/credit-balance-toggle";
import DetailItem from "@/components/ui/DetailItem";
import Checkbox from "@/components/ui/Checkbox";
import { Esim } from "@/components/ESIMItem";
import { getEsimOrderPayload, formatPlanLabel } from "./esim-order";
import { useEsims } from '@/hooks/useDeviceEsims';
import { CREDIT_BALANCE_KEY, DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY } from '@/lib/query-keys';
import { isOrderSuccess, pollOrderStatus } from "@/lib/api/bff/order";
import type { CreateOrderRequest, CreateOrderResponse, OrderStatusResponse } from "@/lib/api/bff/order";
import { pollingLabel, isUserActionableManualReview } from "@/features/orders/order-status";
import OrderFailureModal from "./components/order-failure-modal";
import { formatBffError } from "@/lib/api/bff/client";
import { resolveBffErrorMessage } from "@/lib/api/bff/errors";
import { getCoupon } from "@/lib/api/bff/coupon";
import type { CodeLookupResponse } from "@/lib/api/bff/coupon";
import { useOrderPreview } from "./use-order-preview";
import { useCreditBalance, heldCreditCents } from "@/hooks/useCreditHistory";
import { useEsimCompatibility } from "@/hooks/useEsimCompatibility";
import { useCreateOrder, StripeCancelledError, StripeSheetError, OrderCreationError } from "./use-create-order";
import { useToast } from "@/contexts/ToastContext";
import CheckoutSuccessModal from "./components/checkout-success-modal";
import WalletSetupModal from "./components/wallet-setup-modal";
import { createRadioButtons } from "./payment-options";
import { RADIO_KEYS, DEFAULT_DEVICE_WALLET_PAYMENT_ASSET, DEVICE_WALLET_PAYMENT_ASSETS, DEV_DEVICE_WALLET_PAYMENT_ASSETS } from "@/lib/constants/app";
import { FIAT_MINIMUM_CENTS } from "@/lib/constants/checkout";
import type { DeviceWalletPaymentAsset } from "@/lib/constants/app";
import { useWalletTokens } from "@/hooks/useWalletTokens";
import BottomSheet from "@gorhom/bottom-sheet";
import { TokenPickerSheet } from "@/components/wallet/sheets/TokenPickerSheet";
import { EsimTopupPickerSheet } from "./components/esim-topup-picker-sheet";
import { ApplyTopupConfirmModal } from "./components/apply-topup-confirm-modal";
import { useKokio } from "@/hooks/useKokio";
import { esimDisplayName, esimDocToDisplayItem } from "@/helpers/esimDisplay";
import * as WebBrowser from "expo-web-browser";
import { MoonpayCommerceProvider } from "@heliofi/checkout-react-native";
import { logger } from "@/lib/logger";
import { formatOnChainError, isUserCancelledPasskeyError } from "@/utils/formatOnChainError";
import { consumePreferredCheckoutPaymentMethod } from "./checkout-intent";
import { createStyles } from "./checkout-styles";
import { CODE_ERROR_CODES, MAPPED_ORDER_ERROR_CODES } from "./checkout-errors";
import { sendDeviceWalletPayment, waitForDeviceWalletOrder } from "./device-wallet-payment";
import { ExternalWalletCheckout } from "./components/external-wallet-checkout";
import { PromoCodeSection } from "./components/promo-code-section";
import { PriceBreakdown } from "./components/price-breakdown";
import { TopupSection } from "./components/topup-section";

const toApiPaymentMethod = (selected: string | undefined): CreateOrderRequest['paymentMethod'] =>
  selected === RADIO_KEYS.E_SIM_WALLET
    ? 'DEVICE_WALLET'
    : (selected === RADIO_KEYS.CREDIT_CARD || selected === RADIO_KEYS.APPLE_PAY)
      ? 'FIAT'
      : 'CRYPTO';

const Checkout = () => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();
  const { item: eSimDetails } = useLocalSearchParams();

  const eSimItem: Esim = React.useMemo(() => {
    if (typeof eSimDetails === "string") {
      try { return JSON.parse(eSimDetails); } catch { return null; }
    }
    return eSimDetails;
  }, [eSimDetails]);

  const { kokio }                                         = useKokio();
  const [isESimEnabled, setIsESimEnabled]                 = useState<boolean>(false);
  // The "Buy eSIMs with stable" entry point on the Wallet tab sets this before
  // navigating here; only honor it when the Kokio wallet is already deployed,
  // matching handlePaymentMethodChange's own gating for this radio option.
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(() => {
    const preferred = consumePreferredCheckoutPaymentMethod();
    if (preferred === RADIO_KEYS.E_SIM_WALLET && !kokio.userWallet) return undefined;
    return preferred ?? undefined;
  });
  const [isPaymentMethodExpanded, setIsPaymentMethodExpanded] = useState(false);
  const [deviceWalletAsset, setDeviceWalletAsset]       = useState<DeviceWalletPaymentAsset>(DEFAULT_DEVICE_WALLET_PAYMENT_ASSET);
  const [showSuccessModal, setShowSuccessModal]           = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading]         = useState(false);
  const [loadingMessage, setLoadingMessage]               = useState('');
  const [showWalletSetupModal, setShowWalletSetupModal]   = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod]   = useState<string | null>(null);
  const [helioChargeToken, setHelioChargeToken]           = useState<string | null>(null);
  const [helioCorrelationId, setHelioCorrelationId]       = useState<string | null>(null);
  const [pendingHelioOrder, setPendingHelioOrder]         = useState<CreateOrderResponse | null>(null);
  const [discountCode, setDiscountCode]                   = useState<string>("");
  const [isDiscountApplied, setIsDiscountApplied]         = useState<boolean>(false);
  const [isCouponLoading, setIsCouponLoading]             = useState<boolean>(false);
  const [coupon, setCoupon]                               = useState<CodeLookupResponse | null>(null);
  const [couponError, setCouponError]                     = useState<string>("");
  const [useStoreCredit, setUseStoreCredit]               = useState<boolean>(false);
  const [orderResponse, setOrderResponse]                 = useState<OrderStatusResponse | null>(null);
  const [orderCompleted, setOrderCompleted]               = useState(false);
  const [topupSuccessInfo, setTopupSuccessInfo]           = useState<{ fromLabel: string; toLabel: string } | null>(null);
  const [discountError, setDiscountError]                 = useState<string>("");
  const [showManualReviewModal, setShowManualReviewModal] = useState(false);
  const [failedOrderInfo, setFailedOrderInfo]             = useState<{
    orderStatus: string;
    referenceId: string | null;
    manualReviewReason?: string | null;
  } | null>(null);

  const deviceWalletTokenSheetRef = useRef<BottomSheet>(null);
  const openDeviceWalletTokenPicker = useCallback(() => {
    deviceWalletTokenSheetRef.current?.snapToIndex(0);
  }, []);
  const radioButtons: RadioButtonProps[] = useMemo(
    // ref is only read from onPress inside ESimWallet, not during this render
    // eslint-disable-next-line react-hooks/refs
    () => createRadioButtons(selectedPaymentMethod, styles.buttonStyle, colors, deviceWalletAsset, openDeviceWalletTokenPicker),
    // All missing dependencies are of style attributes which are in their on useMemo() call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPaymentMethod, colors, deviceWalletAsset],
  );
  const selectedRadioButton = radioButtons.find((button) => button.id === selectedPaymentMethod);
  const showAllPaymentMethods = !selectedPaymentMethod || isPaymentMethodExpanded;
  const { tokens: walletTokens } = useWalletTokens(kokio.deviceWalletAddress);
  const deviceWalletBalance = walletTokens.find((t) => t.symbol === deviceWalletAsset)?.amount;
  const selectableDeviceWalletAssets: readonly string[] = __DEV__
    ? [...DEVICE_WALLET_PAYMENT_ASSETS, ...DEV_DEVICE_WALLET_PAYMENT_ASSETS]
    : DEVICE_WALLET_PAYMENT_ASSETS;
  const deviceWalletPickerTokens = walletTokens.filter((t) =>
    selectableDeviceWalletAssets.includes(t.symbol)
  );

  const { showMessage }       = useToast();
  const orderCorrelationRef   = useRef<string | null>(null);
  const handlePollUpdate      = useCallback(
    (update: import("@/lib/api/bff/order").PollUpdate) => {
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

  const queryClient  = useQueryClient();
  const { data: creditBalance, isLoading: isCreditLoading, refetch: refetchCredit } = useCreditBalance();
  const availableCreditCents = creditBalance?.availableCents ?? 0;
  const heldCreditCentsValue = creditBalance ? heldCreditCents(creditBalance) : 0;
  const storeCreditActive    = useStoreCredit && availableCreditCents > 0;
  const { esims }    = useEsims();
  const hasPriorEsim = esims.length > 0;
  const {
    isLoading: isCheckingTopup,
    isError: isTopupCheckError,
    error: topupCheckError,
    refetch: refetchTopupCompatibility,
    compatibleEsims,
    vendorMismatches,
    checkErrors,
  } = useEsimCompatibility(
    { planId: eSimItem?.catalogueId },
    { enabled: hasPriorEsim && !orderCompleted },
  );
  const isTopupCompatible = compatibleEsims.length > 0;
  const [applyAsTopup, setApplyAsTopup]                     = useState(false);
  const [compatibleTopUpEsimRef, setCompatibleTopUpEsimRef] = useState<string | undefined>();
  const [showTopupConfirm, setShowTopupConfirm]             = useState(false);
  const topupPickerSheetRef = useRef<BottomSheet>(null);
  // Set synchronously at the start of each handleCheckout call, read by
  // handleOrderResult whenever that order's result eventually resolves -
  // see handleOrderResult for why this can't just be component state.
  const topupSelectionRef = useRef<{ applyAsTopup: boolean; compatibleTopUpEsimRef?: string }>({
    applyAsTopup: false,
  });
  const bg = useThemeColor({}, "background");

  // Build a human-readable label for a compatible topup eSIM.
  // Source of truth is the live ESimDocument from useEsims() (server-truth),
  // using the latest PlanHistoryEntry for region/validity/data fields.
  // Falls back to ICCID last-4, then eSimRef abbreviation.
  const buildTopupEsimLabel = useCallback((eSimRef: string, iccid?: string): string => {
    const doc  = esims.find((e) => e.eSimRef === eSimRef);
    const plan = doc ? { ...esimDocToDisplayItem(doc), serviceRegionName: esimDisplayName(doc) } : null;
    const label = formatPlanLabel(plan);
    if (label) return label;
    if (iccid) return `ICCID ...${iccid.slice(-4)}`;
    return `${eSimRef.slice(0, 6)}...${eSimRef.slice(-4)}`;
  }, [esims]);

  // Append ICCID last-4 only when two labels collide.
  const topupEsimOptions = useMemo(() => {
    const withLabel = compatibleEsims.map(r => ({
      ...r, label: buildTopupEsimLabel(r.eSimRef, r.iccid),
    }));
    const counts = withLabel.reduce<Record<string, number>>((acc, o) => {
      acc[o.label] = (acc[o.label] ?? 0) + 1; return acc;
    }, {});
    return withLabel.map(o => ({
      ...o,
      label: counts[o.label] > 1 && o.iccid ? `${o.label} (...${o.iccid.slice(-4)})` : o.label,
    }));
  }, [compatibleEsims, buildTopupEsimLabel]);

  const topupPickerItems = useMemo(
    () => topupEsimOptions.map((o) => ({
      eSimRef: o.eSimRef,
      label:   o.label,
      doc:     esims.find((e) => e.eSimRef === o.eSimRef),
    })),
    [topupEsimOptions, esims],
  );

  const selectedTopupDoc = compatibleTopUpEsimRef
    ? esims.find((e) => e.eSimRef === compatibleTopUpEsimRef)
    : undefined;

  // Defaults to the most recently purchased compatible eSIM, once, the first
  // time a compatible match shows up - a manual pick or "Buy a new eSIM"
  // afterwards must stick, not get overridden by a later recompute.
  const hasAppliedDefaultTopupRef = useRef(false);
  useEffect(() => {
    if (hasAppliedDefaultTopupRef.current || topupPickerItems.length === 0) return;
    hasAppliedDefaultTopupRef.current = true;
    const latest = [...topupPickerItems].sort(
      (a, b) => (b.doc?.createdAt ?? '').localeCompare(a.doc?.createdAt ?? ''),
    )[0];
    setApplyAsTopup(true);
    setCompatibleTopUpEsimRef(latest.eSimRef);
  }, [topupPickerItems]);

  const handleOrderResult = useCallback(async (
    order: OrderStatusResponse | null,
    correlationId?: string | null,
  ) => {
    if (!order) {
      showMessage('Unable to confirm order status. Check Order History in Settings.', 'info');
      return;
    }
    if (isOrderSuccess(order.orderStatus)) {
      setOrderCompleted(true);
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
  }, [queryClient, showMessage, eSimItem, buildTopupEsimLabel]);

  const handleRemoveDiscount = useCallback(() => {
    setIsDiscountApplied(false);
    setDiscountCode("");
    setDiscountError("");
    setCoupon(null);
    setCouponError("");
  }, []);

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

  const appliedCode = isDiscountApplied ? discountCode : undefined;
  const isPreviewInPlay = !!selectedPaymentMethod && (!!appliedCode || storeCreditActive);

  const buildOrderRequest = useCallback(
    (topup: { applyAsTopup: boolean; compatibleTopUpEsimRef?: string }): CreateOrderRequest => {
      const paymentMethod = toApiPaymentMethod(selectedPaymentMethod);
      return {
        ...getEsimOrderPayload({
          eSimItem, appliedCode, useStoreCredit: storeCreditActive,
          applyAsTopup: topup.applyAsTopup,
          compatibleTopUpEsimRef: topup.compatibleTopUpEsimRef,
        }),
        paymentMethod,
        ...(paymentMethod === 'DEVICE_WALLET' ? { asset: deviceWalletAsset } : {}),
      };
    },
    [selectedPaymentMethod, eSimItem, appliedCode, storeCreditActive, deviceWalletAsset],
  );

  const previewRequest = useMemo(
    () => (isPreviewInPlay ? buildOrderRequest({ applyAsTopup, compatibleTopUpEsimRef }) : null),
    [isPreviewInPlay, buildOrderRequest, applyAsTopup, compatibleTopUpEsimRef],
  );
  const {
    pricing: quote, error: previewError, isLoading: isPreviewLoading, refresh: refreshPreview,
  } = useOrderPreview(previewRequest);

  const handleCheckout = useCallback(async (
    override?: { applyAsTopup: boolean; compatibleTopUpEsimRef?: string },
  ) => {
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
          setIsDiscountApplied(false);
          setDiscountError(message);
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
    handleDeviceWalletPayment, refetchCredit, refreshPreview,
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

  const handleWalletModalClose = useCallback(() => {
    setShowWalletSetupModal(false);
    setPendingPaymentMethod(null);
  }, []);

  const handlePaymentMethodChange = useCallback(
    (value: string) => {
      // Paying from the device wallet needs one to exist first; deploy it via
      // the modal before allowing selection. Credit card, Apple Pay, and the
      // external-wallet browser flow are all wallet-independent and must
      // never gate on it.
      if (value === RADIO_KEYS.E_SIM_WALLET && !kokio.userWallet) {
        setPendingPaymentMethod(value);
        setShowWalletSetupModal(true);
        return;
      }
      setSelectedPaymentMethod(value);
      setIsPaymentMethodExpanded(false);
    },
    [kokio.userWallet],
  );

  const handleDiscountCodeChange = useCallback((text: string) => {
    setDiscountCode(_toUpper(text));
    setIsDiscountApplied(false);
    setDiscountError('');
    setCoupon(null);
    setCouponError('');
  }, []);

  const handlePasteDiscountCode = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const trimmed = text.trim();
      if (!trimmed) {
        showMessage("Clipboard is empty", "error");
        return;
      }
      handleDiscountCodeChange(trimmed);
    } catch (error) {
      logger.error('CLIPBOARD_PASTE_FAILED', { error });
      showMessage("Couldn't read from clipboard", "error");
    }
  }, [handleDiscountCodeChange, showMessage]);

  const handleApplyDiscount = useCallback(async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code || isCouponLoading) return;
    setIsCouponLoading(true);
    setCouponError('');
    try {
      const result = await getCoupon(code);
      setCoupon(result);
      if (result.eligibility.eligible) {
        setIsDiscountApplied(true);
      } else {
        setCouponError(resolveBffErrorMessage(result.eligibility.reason ?? ''));
      }
    } catch (err) {
      setCoupon(null);
      setCouponError(formatBffError(err));
    } finally {
      setIsCouponLoading(false);
    }
  }, [discountCode, isCouponLoading]);

  const quoteInPlay = isPreviewInPlay ? quote : undefined;
  const payableUsd = quoteInPlay ? quoteInPlay.railAmountCents / 100 : eSimItem.actualSellingPrice;
  const payLabel: string | number = quoteInPlay
    ? payableUsd.toFixed(2)
    : isPreviewInPlay
      ? '...'
      : eSimItem.actualSellingPrice;
  const isFiatFloorViolated =
    !!quoteInPlay &&
    toApiPaymentMethod(selectedPaymentMethod) === 'FIAT' &&
    quoteInPlay.railAmountCents > 0 &&
    quoteInPlay.railAmountCents < FIAT_MINIMUM_CENTS;
  const wasCreditTrimmed =
    !!quoteInPlay &&
    storeCreditActive &&
    quoteInPlay.creditAppliedCents <
      Math.min(availableCreditCents, quoteInPlay.listPriceCents - quoteInPlay.codeDiscountCents);
  const previewErrorMessage = isPreviewInPlay && previewError ? formatBffError(previewError) : '';

  const deviceWalletCharge = payableUsd;
  const deviceWalletBalanceNumber = deviceWalletBalance === undefined ? NaN : parseFloat(deviceWalletBalance);
  const isDeviceWalletSelected = selectedPaymentMethod === RADIO_KEYS.E_SIM_WALLET;
  const hasDeviceWalletFunds =
    Number.isFinite(deviceWalletBalanceNumber) && deviceWalletBalanceNumber >= deviceWalletCharge;
  const isDeviceWalletShort =
    isDeviceWalletSelected && Number.isFinite(deviceWalletBalanceNumber) && !hasDeviceWalletFunds;

  const canCheckout = useMemo(
    () =>
      isESimEnabled &&
      !isCheckoutLoading &&
      !!selectedPaymentMethod &&
      (!isDeviceWalletSelected || hasDeviceWalletFunds) &&
      (!isPreviewInPlay || (!!quote && !isPreviewLoading && !previewError && !isFiatFloorViolated)),
    [
      isESimEnabled, isCheckoutLoading, selectedPaymentMethod, isDeviceWalletSelected, hasDeviceWalletFunds,
      isPreviewInPlay, quote, isPreviewLoading, previewError, isFiatFloorViolated,
    ],
  );

  const handleCheckoutPress = useCallback(() => {
    if (applyAsTopup && compatibleTopUpEsimRef) {
      setShowTopupConfirm(true);
      return;
    }
    handleCheckout();
  }, [applyAsTopup, compatibleTopUpEsimRef, handleCheckout]);

  const confirmTopupAndCheckout = useCallback(() => {
    setShowTopupConfirm(false);
    handleCheckout();
  }, [handleCheckout]);

  const buyNewInsteadOfTopup = useCallback(() => {
    setShowTopupConfirm(false);
    setApplyAsTopup(false);
    setCompatibleTopUpEsimRef(undefined);
    handleCheckout({ applyAsTopup: false });
  }, [handleCheckout]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAwareScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="always"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 0}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 16 }}>
          <ThemedText>Payment Method</ThemedText>
          {showAllPaymentMethods ? (
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <RadioGroup
                radioButtons={radioButtons}
                onPress={handlePaymentMethodChange}
                selectedId={selectedPaymentMethod}
                containerStyle={styles.containerStyle}
              />
            </View>
          ) : (
            <View style={[styles.buttonStyle, styles.selectedPaymentRow, { borderColor: colors.primary, borderWidth: 2 }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <View style={{ flex: 1, flexShrink: 1 }}>{selectedRadioButton?.label}</View>
              <TouchableOpacity
                onPress={() => setIsPaymentMethodExpanded(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Change payment method"
                style={[styles.changePaymentMethodButton, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="chevron-down" size={16} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {selectedPaymentMethod === RADIO_KEYS.EXTERNAL_WALLET_BROWSER && (
          <View style={styles.externalWalletNoticeContainer}>
            <Ionicons name="information-circle-outline" size={14} color={isDark ? colors.mutedForeground : colors.text} />
            <ThemedText
              lightColor={colors.text}
              darkColor={colors.mutedForeground}
              style={styles.externalWalletNoticeText}
            >
              Select a network, pay by any wallet and keep a little extra for network fees, payable in the same token
            </ThemedText>
          </View>
        )}

        {isDeviceWalletShort && (
          <View style={styles.discountErrorContainer}>
            <ThemedText style={styles.discountErrorText}>
              {`Not enough ${deviceWalletAsset} in Kokio Wallet to cover this order.`}
            </ThemedText>
          </View>
        )}

        <PromoCodeSection
          discountCode={discountCode}
          isDiscountApplied={isDiscountApplied}
          isCouponLoading={isCouponLoading}
          coupon={coupon}
          couponError={couponError}
          discountError={discountError}
          quoteInPlay={quoteInPlay}
          onChangeCode={handleDiscountCodeChange}
          onPaste={handlePasteDiscountCode}
          onApply={handleApplyDiscount}
          onRemove={handleRemoveDiscount}
        />

        {isPreviewInPlay && (
          <PriceBreakdown
            isLoading={isPreviewLoading}
            errorMessage={previewErrorMessage}
            quote={quoteInPlay}
            wasCreditTrimmed={wasCreditTrimmed}
            isFiatFloorViolated={isFiatFloorViolated}
          />
        )}

        <TopupSection
          isChecking={isCheckingTopup}
          isError={isTopupCheckError}
          error={topupCheckError}
          onRetry={() => refetchTopupCompatibility()}
          isCompatible={isTopupCompatible}
          hasCheckErrors={checkErrors.length > 0}
          vendorMismatches={vendorMismatches}
          esims={esims}
          buildTopupEsimLabel={buildTopupEsimLabel}
          applyAsTopup={applyAsTopup}
          compatibleTopUpEsimRef={compatibleTopUpEsimRef}
          selectedTopupDoc={selectedTopupDoc}
          onOpenPicker={() => topupPickerSheetRef.current?.snapToIndex(0)}
        />
      </KeyboardAwareScrollView>

      <BottomActionBar>
        <UseCreditBalanceToggle
          value={storeCreditActive}
          onValueChange={setUseStoreCredit}
          availableCents={availableCreditCents}
          heldCents={heldCreditCentsValue}
          loading={isCreditLoading}
        />
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Checkbox onChange={setIsESimEnabled} checked={isESimEnabled} />
          <Text style={{ color: isDark ? colors.foreground : colors.text, marginLeft: 8, flex: 1 }}>
            I confirm my device is eSIM compatible and network-enabled.
          </Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                await WebBrowser.openBrowserAsync(
                  "https://kokio.app/blogs/esim-guide-for-travellers-2026#does-your-phone-support-esim",
                );
              } catch (error) {
                logger.error('BROWSER_OPEN_FAILED', { error });
              }
            }}
            hitSlop={8}
            style={{ marginLeft: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Learn more about eSIM compatibility"
          >
            <Ionicons name="bulb-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          key={`total-checkout-${canCheckout}`}
          style={!canCheckout && { opacity: 0.5 }}
          onPress={canCheckout ? handleCheckoutPress : undefined}
          disabled={!canCheckout}
          accessibilityRole="button"
          accessibilityLabel={`Pay ${payLabel} USD`}
          accessibilityState={{ disabled: !canCheckout }}
        >
          <DetailItem
            prefix="Pay "
            value={payLabel}
            suffix="USD"
            containerStyles={[styles.checkoutButton, { backgroundColor: colors.payButton }]}
          />
        </TouchableOpacity>
      </BottomActionBar>

      {isCheckoutLoading && !!loadingMessage && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}

      <CheckoutSuccessModal
        visible={showSuccessModal}
        loading={isCheckoutLoading}
        variant={topupSuccessInfo ? "topup" : "install"}
        onInstallESIM={handleInstallESIM}
        onDone={handleTopupDone}
        topupFromLabel={topupSuccessInfo?.fromLabel}
        topupToLabel={topupSuccessInfo?.toLabel}
      />

      <OrderFailureModal
        visible={showManualReviewModal}
        orderStatus={failedOrderInfo?.orderStatus ?? ''}
        referenceId={failedOrderInfo?.referenceId ?? null}
        manualReviewReason={failedOrderInfo?.manualReviewReason}
        onDismiss={() => setShowManualReviewModal(false)}
      />

      <WalletSetupModal
        visible={showWalletSetupModal}
        onClose={handleWalletModalClose}
        onContinue={() => {
          const method = pendingPaymentMethod;
          handleWalletModalClose();
          if (method) {
            setSelectedPaymentMethod(method);
            setIsPaymentMethodExpanded(false);
          }
        }}
      />

      <TokenPickerSheet
        ref={deviceWalletTokenSheetRef}
        tokens={deviceWalletPickerTokens}
        selectedSymbol={deviceWalletAsset}
        onSelect={(symbol) => {
          setDeviceWalletAsset(symbol as DeviceWalletPaymentAsset);
          deviceWalletTokenSheetRef.current?.close();
        }}
      />

      <EsimTopupPickerSheet
        ref={topupPickerSheetRef}
        items={topupPickerItems}
        selectedEsimRef={applyAsTopup ? compatibleTopUpEsimRef : undefined}
        onSelect={(eSimRef) => {
          setApplyAsTopup(true);
          setCompatibleTopUpEsimRef(eSimRef);
          topupPickerSheetRef.current?.close();
        }}
        onBuyNew={() => {
          setApplyAsTopup(false);
          setCompatibleTopUpEsimRef(undefined);
          topupPickerSheetRef.current?.close();
        }}
      />

      <ApplyTopupConfirmModal
        visible={showTopupConfirm}
        esimLabel={compatibleTopUpEsimRef ? buildTopupEsimLabel(compatibleTopUpEsimRef) : "your eSIM"}
        onConfirm={confirmTopupAndCheckout}
        onBuyNew={buyNewInsteadOfTopup}
      />

      {helioChargeToken && (
        <MoonpayCommerceProvider
          chargeToken={helioChargeToken}
          network={__DEV__ ? "test" : "main"}
          theme="dark"
        >
          <ExternalWalletCheckout
            correlationId={helioCorrelationId}
            pendingOrder={pendingHelioOrder}
            eSimItem={eSimItem}
            kokioDeviceUID={kokio.deviceUID}
            setIsCheckoutLoading={setIsCheckoutLoading}
            setLoadingMessage={setLoadingMessage}
            onComplete={handleHelioComplete}
            onSdkDismiss={resetHelioState}
          />
        </MoonpayCommerceProvider>
      )}
    </View>
  );
};

export default Checkout;
