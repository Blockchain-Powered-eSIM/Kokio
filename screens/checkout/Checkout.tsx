import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  View,
  Platform,
  Text,
  Dimensions,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { RadioButtonProps, RadioGroup } from "react-native-radio-buttons-group";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import _trim from "lodash/trim";
import _subtract from "lodash/subtract";
import _toNumber from "lodash/toNumber";
import _toUpper from "lodash/toUpper";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useTheme } from "@/contexts/ThemeContext";
import DetailItem from "@/components/ui/DetailItem";
import Checkbox from "@/components/ui/Checkbox";
import { Esim } from "@/components/ESIMItem";
import { getEsimOrderPayload } from "@/helpers/esimOrder";
import { createCryptoOrder, createFiatOrder, createExternalWalletOrder, pollOrderStatus, isOrderSuccess } from "@/utils/bff/order";
import { pollingLabel } from "@/utils/orderStatus";
import OrderFailureModal from "@/components/ui/OrderFailureModal";
import { formatBffError } from "@/utils/bff/koKioBffClient";
import { useCouponLookup } from "@/hooks/useCouponLookup";
import { useEsimCompatibility } from "@/hooks/useEsimCompatibility";
import { useCreateTopupOrder } from "@/hooks/useCreateOrder";
import { useToast } from "@/contexts/ToastContext";
import CheckoutSuccessModal from "@/components/ui/CheckoutSuccessModal";
import WalletSetupModal from "@/components/ui/WalletSetupModal";
import { useStripePaymentSheet } from "@/hooks/useStripePaymentSheet";
import { createRadioButtons } from "./checkout.helpers";
import { RADIO_KEYS } from "@/constants/checkout.constants";
import { useKokio } from "@/hooks/useKokio";
import { Config } from "@/appKeys";
import type { CreateOrderResponse, OrderStatusResponse, ExternalWalletOrderResponse } from "@/utils/bff/order";
import * as WebBrowser from "expo-web-browser";
import { v4 as uuidv4 } from "uuid";
import {
  MoonpayCommerceProvider,
  usePayWithCrypto,
} from "@heliofi/checkout-react-native";
import type { PaymentCallback } from "@heliofi/checkout-react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const RADIO_WIDTH = SCREEN_WIDTH - 24;

// ── ExternalWalletCheckout ────────────────────────────────────────────────────
// SDK "as is" pattern per Helio docs. Must render inside MoonpayCommerceProvider.
// Triggers the SDK's built-in wallet selector on mount and owns nothing except
// the BFF confirmation step after the SDK fires onSuccess.
const ExternalWalletCheckout = ({
  correlationId,
  pendingOrder,
  eSimItem,
  kokioDeviceUID,
  savePurchasedESIM,
  setIsCheckoutLoading,
  setLoadingMessage,
  onComplete,
  onSdkDismiss,
}: {
  correlationId: string | null;
  pendingOrder: CreateOrderResponse | null;
  eSimItem: Esim;
  kokioDeviceUID: string | undefined;
  savePurchasedESIM: (uid: string, item: Esim, order: OrderStatusResponse, cid?: string | null) => Promise<void>;
  setIsCheckoutLoading: (v: boolean) => void;
  setLoadingMessage: (msg: string) => void;
  onComplete: (order: OrderStatusResponse | null) => void;
  onSdkDismiss: () => void;
}) => {
  const successFiredRef = useRef(false);

  const onSuccess = useCallback<PaymentCallback>(
    async (result) => {
      successFiredRef.current = true;
      if (__DEV__) console.log('[Helio] onSuccess:', result.transactionSignature);
      setIsCheckoutLoading(true);
      setLoadingMessage('Processing your order...');
      const finalOrder = correlationId
        ? await pollOrderStatus(correlationId, 15, 2000, (s) =>
            setLoadingMessage(pollingLabel(s)),
          ).catch(() => null)
        : null;
      onComplete(finalOrder);
    },
    //TODO: Probably 'eSimItem', 'kokioDeviceUID', 'pendingOrder', and 'savePurchasedESIM' are not needed in the dependency array here, as they are not part of the changing values of this callback
    //eslint-disable-next-line react-hooks/exhaustive-deps
    [correlationId, eSimItem, kokioDeviceUID, onComplete, pendingOrder, savePurchasedESIM, setIsCheckoutLoading, setLoadingMessage],
  );

  const { payWithCrypto, drawerVisible } = usePayWithCrypto({ onSuccess });

  useEffect(() => {
    payWithCrypto();
  }, [payWithCrypto]);

  // SDK drawer closed without a confirmed payment → surface browser fallback
  const prevVisibleRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevVisibleRef.current === true && !drawerVisible && !successFiredRef.current) {
      onSdkDismiss();
    }
    prevVisibleRef.current = drawerVisible;
  }, [drawerVisible, onSdkDismiss]);

  return null;
};

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  bottomButtonContainer: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 16,
  },
  checkoutButton: {
    borderRadius: 32,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  logoImage: {
    width: 24,
    height: 24,
    objectFit: "contain",
  },
  containerStyle: {
    flex: 1,
    alignItems: "flex-start",
  },
  buttonStyle: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: RADIO_WIDTH,
    backgroundColor: Theme.colors.inputBackground,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 0,
    marginVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  walletModalOverlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  walletModalContainer: {
    backgroundColor: Theme.colors.popover,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 320,
  },
  walletModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  walletModalDescription: {
    fontSize: 16,
    color: Theme.colors.foreground,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  walletModalButtons: {
    flexDirection: "row",
    gap: 1,
  },
  laterButton: {
    flex: 1,
    backgroundColor: Theme.colors.muted,
    paddingVertical: 16,
    alignItems: "center",
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  laterButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  continueButton: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    alignItems: "center",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  discountContainer: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  discountInput: {
    flex: 1,
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    color: Theme.colors.foreground,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  applyButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  applyButtonText: {
    color: Theme.colors.secondaryForeground,
    fontSize: 16,
    fontWeight: "600",
  },
  discountAppliedContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Theme.colors.successBackground,
    borderRadius: 8,
  },
  discountAppliedContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  discountAppliedText: {
    color: Theme.colors.success,
    fontSize: 14,
  },
  topupOptionRow: {
    marginTop: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: Theme.colors.inputBackground,
    borderColor: Theme.colors.mutedForeground,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topupOptionRowSelected: {
    borderColor: Theme.colors.success,
    borderWidth: 2,
  },
  topupOptionText: {
    color: Theme.colors.foreground,
    fontSize: 14,
  },
  removeDiscountButton: {
    padding: 4,
    backgroundColor: Theme.colors.destructiveBackground,
    borderRadius: 32,
  },
  discountErrorContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Theme.colors.destructiveBackground,
    borderRadius: 8,
  },
  discountErrorText: {
    color: Theme.colors.destructive,
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  walletStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 4,
  },
  toggleLeftSide: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
});

// e.g. "United Arab Emirates · 7 Days · 1GB" — same region/validity/data fields ESIMItem.tsx displays.
function formatPlanLabel(plan?: Esim | null): string | undefined {
  if (!plan?.serviceRegionName) return undefined;
  const parts = [plan.serviceRegionName];
  if (plan.validity) parts.push(`${plan.validity} Days`);
  if (plan.isUnlimited) parts.push('Unlimited');
  else if (plan.data) parts.push(`${plan.data}GB`);
  return parts.join(' · ');
}

const Checkout = () => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const { item: eSimDetails } = useLocalSearchParams();

  const eSimItem: Esim = React.useMemo(() => {
    if (typeof eSimDetails === "string") {
      try {
        return JSON.parse(eSimDetails);
      } catch {
        return null;
      }
    }
    return eSimDetails;
  }, [eSimDetails]);

  const [isESimEnabled, setIsESimEnabled] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | undefined
  >();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showWalletSetupModal, setShowWalletSetupModal] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string | null>(null);
  const [helioChargeToken, setHelioChargeToken] = useState<string | null>(null);
  const [helioCorrelationId, setHelioCorrelationId] = useState<string | null>(null);
  const [pendingHelioOrder, setPendingHelioOrder] = useState<CreateOrderResponse | null>(null);
  const { initPaymentSheet, presentPaymentSheet, confirmPaymentSheetPayment } =
    useStripePaymentSheet();
  const { kokio, savePurchasedESIM, upsertOrderRecord } = useKokio();
  const [discountCode, setDiscountCode] = useState<string>("");
  const [debouncedCode, setDebouncedCode] = useState<string>("");
  const [isDiscountApplied, setIsDiscountApplied] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [orderResponse, setOrderResponse] = useState<OrderStatusResponse | null>(null);
  const [topupSuccessInfo, setTopupSuccessInfo] = useState<{ fromLabel: string; toLabel: string } | null>(null);
  const [discountError, setDiscountError] = useState<string>("");
  const [showManualReviewModal, setShowManualReviewModal] = useState(false);
  const [failedOrderInfo, setFailedOrderInfo] = useState<{
    orderStatus: string;
    referenceId: string | null;
    manualReviewReason?: string | null;
  } | null>(null);

  const radioButtons: RadioButtonProps[] = useMemo(
    () => createRadioButtons(selectedPaymentMethod, styles.buttonStyle),
    // styles have their own memo watching for changes based on theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPaymentMethod]
  );

  const { showMessage } = useToast();
  const createTopupOrder = useCreateTopupOrder();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCode(discountCode), 500);
    return () => clearTimeout(timer);
  }, [discountCode]);

  const {
    data: coupon,
    isLoading: isCouponLoading,
    isError: isCouponError,
  } = useCouponLookup(debouncedCode, debouncedCode.length === 8);

  // Per the BFF spec, GET /esim/compatibility 404s with NO_ACTIVE_ESIMS_FOR_DEVICE
  // when the device has no active eSIMs — only run the check once the user has
  // at least one that actually completed (not a locally-recorded pending/failed attempt).
  // esimId (not orderStatus) is the reliable signal: orderStatus gets overwritten with
  // the eSIM's live activationStatus once synced (see syncPurchasedEsimsWithBff in
  // kokioProvider.tsx), but esimId is only ever set once a vendor actually provisions one.
  const hasPriorEsim = kokio.purchasedESIMs.some(e => !!e.transactionData.esimId);
  const {
    isLoading: isCheckingTopup,
    isError: isTopupCheckError,
    error: topupCheckError,
    refetch: refetchTopupCompatibility,
    compatibleEsims,
    vendorMismatches,
  } = useEsimCompatibility(
    { planId: eSimItem?.catalogueId },
    { enabled: hasPriorEsim },
  );
  const isTopupCompatible = compatibleEsims.length > 0;
  const [applyAsTopup, setApplyAsTopup] = useState(false);
  const [compatibleTopUpEsimId, setCompatibleTopUpEsimId] = useState<string | undefined>();
  const bg = useThemeColor({}, "background");

  // The compatibility check only returns esimId/iccid — build a human-readable
  // row label from local purchase history using the same region/validity/data
  // fields ESIMItem.tsx shows elsewhere (e.g. "United Arab Emirates · 7 Days · 1GB"),
  // so two eSIMs from the same country are still distinguishable by plan size.
  // Falls back to ICCID, then the wallet address, if no local record exists
  // (e.g. not yet synced).
  const buildTopupEsimLabel = useCallback((esimId: string, iccid?: string): string => {
    const plan = kokio.purchasedESIMs.find(e => e.transactionData.esimId === esimId)?.eSimItem;
    const label = formatPlanLabel(plan);
    if (label) return label;
    if (iccid) return `ICCID ...${iccid.slice(-4)}`;
    return `${esimId.slice(0, 6)}...${esimId.slice(-4)}`;
  }, [kokio.purchasedESIMs]);

  // Two eSIMs can share the exact same region + plan size (e.g. bought the same
  // UAE plan twice) — append the ICCID's last 4 digits only when labels collide.
  const topupEsimOptions = useMemo(() => {
    const withLabel = compatibleEsims.map(r => ({ ...r, label: buildTopupEsimLabel(r.esimId, r.iccid) }));
    const counts = withLabel.reduce<Record<string, number>>((acc, o) => {
      acc[o.label] = (acc[o.label] ?? 0) + 1;
      return acc;
    }, {});
    return withLabel.map(o => ({
      ...o,
      label: counts[o.label] > 1 && o.iccid ? `${o.label} (...${o.iccid.slice(-4)})` : o.label,
    }));
  }, [compatibleEsims, buildTopupEsimLabel]);

  // Stable per-attempt idempotency key: reused across retries of an unchanged
  // order (e.g. tapping Pay again after a dropped response) so the BFF can
  // recognize them as the same attempt, per its duplicate-order/duplicate-charge
  // contract. Regenerated only when the order's defining parameters change.
  const orderAttemptRef = useRef<{ signature: string; id: string } | null>(null);
  const getOrderAttemptId = useCallback((signature: string): string => {
    if (orderAttemptRef.current?.signature !== signature) {
      orderAttemptRef.current = { signature, id: uuidv4() };
    }
    return orderAttemptRef.current.id;
  }, []);
  const orderSignature = useMemo(
    () => JSON.stringify([eSimItem?.catalogueId, discountCode, applyAsTopup, compatibleTopUpEsimId, selectedPaymentMethod]),
    [eSimItem?.catalogueId, discountCode, applyAsTopup, compatibleTopUpEsimId, selectedPaymentMethod],
  );

  const handleOrderResult = useCallback(async (
    order: OrderStatusResponse | null,
    correlationId?: string | null,
  ) => {
    if (!order) {
      showMessage('Unable to confirm order status. Check Order History in Settings.', 'info');
      return;
    }

    if (isOrderSuccess(order.orderStatus)) {
      if (kokio.deviceUID) {
        await savePurchasedESIM(kokio.deviceUID, eSimItem, order, correlationId);
      }
      // Order attempt is complete — the next purchase (if any) should mint a fresh idempotency key.
      orderAttemptRef.current = null;
      setOrderResponse(order);
      setTopupSuccessInfo(
        applyAsTopup && compatibleTopUpEsimId
          ? { fromLabel: formatPlanLabel(eSimItem) ?? 'your new plan', toLabel: buildTopupEsimLabel(compatibleTopUpEsimId) }
          : null
      );
      setShowSuccessModal(true);
      return;
    }

    if (order.flaggedForManualReview) {
      setFailedOrderInfo({
        orderStatus: order.orderStatus,
        referenceId: correlationId ?? order.orderId ?? null,
        manualReviewReason: order.manualReviewReason ?? null,
      });
      setShowManualReviewModal(true);
      return;
    }

    // Pre-payment terminal failures: PAYMENT_FAILED, ABANDONED
    const msg =
      order.orderStatus === 'PAYMENT_FAILED' ? 'Payment failed. Please try again.' :
      order.orderStatus === 'ABANDONED'       ? 'Order expired. Please try again.' :
      'Order could not be completed. Please try again.';
    showMessage(msg, 'info');
  }, [kokio.deviceUID, eSimItem, savePurchasedESIM, showMessage, applyAsTopup, compatibleTopUpEsimId, buildTopupEsimLabel]);

  const handleRemoveDiscount = useCallback(() => {
    setIsDiscountApplied(false);
    setDiscountAmount(0);
    setDiscountCode("");
    setDiscountError("");
  }, []);

  const handleEsimCheckout = useCallback(async () => {
    try {
      setIsCheckoutLoading(true);

      const deviceWalletId = kokio.userWallet?.address || "";

      if (applyAsTopup && compatibleTopUpEsimId) {
        const { order, correlationId } = await createTopupOrder.mutateAsync({
          request: {
            catalogueId: eSimItem.catalogueId,
            isNewESim: false,
            esimId: compatibleTopUpEsimId,
            isCryptoPayment: true,
            coupon: discountCode || undefined,
          },
          eSimItem,
          idempotencyKey: getOrderAttemptId(orderSignature),
        });
        setIsCheckoutLoading(false);
        setLoadingMessage('');
        await handleOrderResult(order, correlationId);
        return;
      }

      const payload = getEsimOrderPayload({
        eSimItem,
        deviceWalletId,
        discountCode,
        applyAsTopup,
        compatibleTopUpEsimId
      });
      const esimBody = { ...payload, payeeAddress: deviceWalletId };
      if (__DEV__) console.log('[Order] eSIM wallet body:', JSON.stringify(esimBody, null, 2));
      const { correlationId } = await createCryptoOrder(esimBody, getOrderAttemptId(orderSignature));
      if (kokio.deviceUID && correlationId) {
        await upsertOrderRecord(kokio.deviceUID, eSimItem, correlationId);
      }
      setLoadingMessage('Processing your order...');
      const orderData = correlationId
        ? await pollOrderStatus(correlationId, 15, 2000, (s) => setLoadingMessage(pollingLabel(s))).catch(() => null)
        : null;
      setIsCheckoutLoading(false);
      setLoadingMessage('');
      await handleOrderResult(orderData, correlationId);
    } catch (err) {
      if (__DEV__) console.error("Checkout error:", err);
      const e = err as { code?: string; message?: string };
      const errCode = e.code;
      if (errCode === 'COUPON_INSUFFICIENT_BALANCE') {
        showMessage('Coupon has insufficient balance. Discount removed.', 'info');
        handleRemoveDiscount();
      } else {
        showMessage(formatBffError(err), 'info');
      }
      setIsCheckoutLoading(false);
      setShowSuccessModal(false);
    }
  }, [
    eSimItem,
    discountCode,
    kokio?.userWallet,
    kokio?.deviceUID,
    applyAsTopup,
    compatibleTopUpEsimId,
    createTopupOrder,
    showMessage,
    handleRemoveDiscount,
    handleOrderResult,
    upsertOrderRecord,
    getOrderAttemptId,
    orderSignature,
  ]);

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

  // Opens the payment page in SFSafariViewController / Chrome Custom Tab.
  // url/cid are passed explicitly so they can be forwarded directly from
  // handleCheckout without waiting for setState to flush.
  const handleBrowserPay = useCallback(async (
    url: string,
    cid: string | null,
  ) => {
    let polled = false;

    const doPoll = async () => {
      if (polled) return;
      polled = true;
      setIsCheckoutLoading(true);
      setLoadingMessage('Checking payment status...');
      try {
        const finalOrder = cid
          ? await pollOrderStatus(cid, 5, 3000, (s) =>
              setLoadingMessage(pollingLabel(s)),
            ).catch(() => null)
          : null;
        setIsCheckoutLoading(false);
        setLoadingMessage('');
        await handleOrderResult(finalOrder, cid);
      } catch {
        setIsCheckoutLoading(false);
        setLoadingMessage('');
      }
    };

    // When the user returns from the wallet app's browser, dismiss our browser
    // and poll BFF for payment status.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        appStateSub.remove();
        WebBrowser.dismissBrowser();
        doPoll();
      }
    });

    await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'cancel' });

    // Reaches here when browser is dismissed (user tapped close, or
    // dismissBrowser() was called by the AppState handler / moonpay-return).
    appStateSub.remove();
    doPoll();
  }, [handleOrderResult]);

  const handleCheckout = useCallback(async () => {
    if (
      selectedPaymentMethod === RADIO_KEYS.CREDIT_CARD ||
      selectedPaymentMethod === RADIO_KEYS.APPLE_PAY
    ) {
      setIsCheckoutLoading(true);
      setLoadingMessage('Preparing your payment...');
      let fiatCorrelationId: string | null = null;
      try {
        const base = getEsimOrderPayload({ eSimItem, deviceWalletId: "", discountCode, applyAsTopup, compatibleTopUpEsimId });
        const fiatBody = {
          catalogueId: base.catalogueId,
          currency: "USD" as const,
          isNewESim: base.isNewESim,
          esimId: base.esimId,
          coupon: base.coupon,
          isCryptoPayment: false as const,
        };
        if (__DEV__) console.log('[Order] fiat body:', JSON.stringify(fiatBody, null, 2));
        const { data: orderInit, correlationId } = await createFiatOrder(fiatBody, getOrderAttemptId(orderSignature));
        fiatCorrelationId = correlationId;
        if (__DEV__) console.log('[Order] fiat correlationId:', correlationId);

        if (kokio.deviceUID && correlationId) {
          await upsertOrderRecord(kokio.deviceUID, eSimItem, correlationId);
        }

        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: "Kokio",
          paymentIntentClientSecret: orderInit.clientSecret,
          customFlow: true,
          applePay: { merchantCountryCode: "US" },
          googlePay: { merchantCountryCode: "US", testEnv: __DEV__ },
          style: "alwaysDark",
        });
        if (initError) {
          showMessage(initError.message, "info");
          setIsCheckoutLoading(false);
          return;
        }

        setLoadingMessage('');
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          setIsCheckoutLoading(false);
          return;
        }

        const { error: confirmError } = await confirmPaymentSheetPayment();
        if (confirmError) {
          if (__DEV__) console.error("[Stripe] confirmPaymentSheetPayment error:", confirmError);
          showMessage(confirmError.message, "info");
          setIsCheckoutLoading(false);
          return;
        }

        setLoadingMessage('Processing your order...');
        const finalOrder = correlationId
          ? await pollOrderStatus(correlationId, 15, 2000, (s) =>
              setLoadingMessage(pollingLabel(s)),
            ).catch(() => null)
          : null;
        setIsCheckoutLoading(false);
        setLoadingMessage('');
        await handleOrderResult(finalOrder, correlationId);
      } catch (err) {
        const bffErr = err as { correlationId?: string | null };
        const errCid = fiatCorrelationId ?? bffErr?.correlationId;
        if (__DEV__) {
          console.error("[Stripe] checkout error:", err);
          if (errCid) console.log('[Order] fiat correlationId (error):', errCid);
        }
        if (kokio.deviceUID && errCid) {
          await upsertOrderRecord(kokio.deviceUID, eSimItem, errCid, 'FAILED');
        }
        showMessage(formatBffError(err), "info");
        setIsCheckoutLoading(false);
      }
      return;
    }

    if (
      //@ts-expect-error EXTERNAL_WALLET has been intentionally disable for now
      selectedPaymentMethod === RADIO_KEYS.EXTERNAL_WALLET ||
      selectedPaymentMethod === RADIO_KEYS.EXTERNAL_WALLET_BROWSER
    ) {
      setIsCheckoutLoading(true);
      setLoadingMessage('Preparing your payment...');
      let extCorrelationId: string | null = null;
      try {
        const base = getEsimOrderPayload({ eSimItem, deviceWalletId: "", discountCode, applyAsTopup, compatibleTopUpEsimId });
        const extBody = {
          catalogueId: base.catalogueId,
          currency: "USD" as const,
          isNewESim: base.isNewESim,
          esimId: base.esimId,
          coupon: base.coupon,
          isCryptoPayment: true as const,
          payeeAddress: kokio.userWallet?.address,
          successRedirectUrl: Config.EXTERNAL_WALLET_CALLBACK,
        };
        if (__DEV__) console.log('[Order] external wallet body:', JSON.stringify(extBody, null, 2));
        const { data: orderInit, correlationId } = await createExternalWalletOrder(extBody, getOrderAttemptId(orderSignature));
        extCorrelationId = correlationId;
        if (__DEV__) console.log('[Order] external wallet correlationId:', correlationId);

        if (kokio.deviceUID && correlationId) {
          await upsertOrderRecord(kokio.deviceUID, eSimItem, correlationId);
        }

        setIsCheckoutLoading(false);
        setLoadingMessage('');

        if (selectedPaymentMethod === RADIO_KEYS.EXTERNAL_WALLET_BROWSER) {
          // Skip the SDK drawer — open browser directly with fresh values.
          const pageUrl = (orderInit as ExternalWalletOrderResponse).moonpayPaymentPageUrl;
          if (pageUrl) handleBrowserPay(pageUrl, correlationId);
        } else {
          setPendingHelioOrder(orderInit);
          setHelioCorrelationId(correlationId);
          setHelioChargeToken(orderInit.moonpayChargeId);
        }
      } catch (err) {
        const bffErr = err as { correlationId?: string | null };
        const errCid = extCorrelationId ?? bffErr?.correlationId;
        if (__DEV__) {
          console.error("[Helio] checkout error:", err);
          if (errCid) console.log('[Order] external wallet correlationId (error):', errCid);
        }
        if (kokio.deviceUID && errCid) {
          await upsertOrderRecord(kokio.deviceUID, eSimItem, errCid, 'FAILED');
        }
        showMessage(formatBffError(err), "info");
        setIsCheckoutLoading(false);
      }
      return;
    }

    handleEsimCheckout();
  }, [
    selectedPaymentMethod,
    eSimItem,
    discountCode,
    applyAsTopup,
    compatibleTopUpEsimId,
    kokio.userWallet,
    kokio.deviceUID,
    upsertOrderRecord,
    initPaymentSheet,
    presentPaymentSheet,
    confirmPaymentSheetPayment,
    showMessage,
    handleEsimCheckout,
    handleBrowserPay,
    handleOrderResult,
    getOrderAttemptId,
    orderSignature,
  ]);

  const handleInstallESIM = useCallback(() => {
    setShowSuccessModal(false);
    router.navigate({
      pathname: "/(tabs)/installation",
      params: {
        orderId: orderResponse?.orderId || "",
        qrcode: orderResponse?.installationDetails?.qrcode || "",
        appleInstallationUrl:
          orderResponse?.installationDetails?.appleInstallationUrl || "",
        iccid: orderResponse?.iccid || "",
      },
    });
  }, [orderResponse]);

  const handleTopupDone = useCallback(() => {
    setShowSuccessModal(false);
    // Checkout lives inside the Shop tab's own stack, so navigate("/(tabs)")
    // operates on the already-mounted Tabs navigator, which just re-focuses
    // Shop (its last-active tab) instead of switching to Home. Resetting the
    // root stack to "/" remounts (tabs) fresh, landing on its initial tab
    // (Home) — same pattern used elsewhere in the app to return to the main
    // shell (Offline.tsx, wc-session.tsx, wc-connect.tsx, callback.tsx).
    router.replace("/");
  }, []);

  const handleWalletModalClose = useCallback(() => {
    setShowWalletSetupModal(false);
    setPendingPaymentMethod(null);
  }, []);

  const handlePaymentMethodChange = useCallback(
    (value: string) => {
      if (value === RADIO_KEYS.E_SIM_WALLET) return; // disabled — not a payment option yet
      if (!kokio.userWallet) {
        // Wallet not yet deployed — gate behind deployment modal then resume
        setPendingPaymentMethod(value);
        setShowWalletSetupModal(true);
      } else {
        setSelectedPaymentMethod(value);
      }
    },
    [kokio?.userWallet]
  );

  const handleDiscountCodeChange = useCallback((text: string) => {
    setDiscountCode(_toUpper(text));
    setIsDiscountApplied(false);
    setDiscountAmount(0);
    setDiscountError('');
  }, []);

  const handleApplyDiscount = useCallback(() => {
    if (!coupon || coupon.isExhausted) return;
    setDiscountError('');

    const couponBalance = _toNumber(coupon.balance || 0);
    if (eSimItem.actualSellingPrice > couponBalance) {
      setDiscountError('Cannot sponsor the entire amount');
      return;
    }

    setIsDiscountApplied(true);
    setDiscountAmount(eSimItem.actualSellingPrice);

    if (!kokio.userWallet) {
      setShowWalletSetupModal(true);
    }
  }, [coupon, eSimItem.actualSellingPrice, kokio.userWallet]);

  const totalAmount = useMemo(() => {
    if (isDiscountApplied) {
      return _subtract(eSimItem.actualSellingPrice, discountAmount);
    }
    return eSimItem.actualSellingPrice;
  }, [eSimItem.actualSellingPrice, isDiscountApplied, discountAmount]);


  // const canCheckout = useMemo(
  //   () =>
  //     isESimEnabled &&
  //     selectedPaymentMethod &&
  //     totalAmount === 0 &&
  //     !isCheckoutLoading,
  //   [isESimEnabled, selectedPaymentMethod, totalAmount, isCheckoutLoading]
  // );

  const canCheckout = useMemo(() => {
    if (!isESimEnabled || isCheckoutLoading || !selectedPaymentMethod) return false;
    if (selectedPaymentMethod === RADIO_KEYS.E_SIM_WALLET) {
      return !!kokio.userWallet && isDiscountApplied;
    }
    return true;
  }, [isESimEnabled, isCheckoutLoading, selectedPaymentMethod, kokio.userWallet, isDiscountApplied]);

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
          <ThemedText>eSIM & Network</ThemedText>
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <Checkbox onChange={setIsESimEnabled} checked={isESimEnabled} />
            <Text style={{ color: Theme.colors.foreground, marginLeft: 8 }}>
              I confirm my device is eSIM compatible and network-enabled.
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <ThemedText>Payment Method</ThemedText>
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <RadioGroup
              radioButtons={radioButtons}
              onPress={handlePaymentMethodChange}
              selectedId={selectedPaymentMethod}
              containerStyle={styles.containerStyle}
            />
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <ThemedText>Discount</ThemedText>
          <View style={styles.discountContainer}>
            <TextInput
              style={styles.discountInput}
              value={discountCode}
              onChangeText={handleDiscountCodeChange}
              placeholder="Enter coupon code"
              placeholderTextColor={Theme.colors.muted}
              autoCapitalize="characters"
              maxLength={8}
            />
          </View>

          {/* Loading */}
          {isCouponLoading && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <ActivityIndicator size="small" color={Theme.colors.foreground} />
              <ThemedText style={{ marginLeft: 8, color: Theme.colors.muted, fontSize: 14 }}>
                Validating coupon…
              </ThemedText>
            </View>
          )}

          {/* Valid coupon — show balance and Apply button */}
          {!isCouponLoading && debouncedCode.length === 8 && coupon && !coupon.isExhausted && !isDiscountApplied && (
            <View style={styles.discountAppliedContainer}>
              <View style={styles.discountAppliedContent}>
                <ThemedText style={styles.discountAppliedText}>
                  {`Balance: $${_toNumber(coupon.balance).toFixed(2)} ${coupon.tokenName}`}
                </ThemedText>
                <TouchableOpacity
                  style={[styles.applyButton, { paddingVertical: 6, paddingHorizontal: 14 }]}
                  onPress={handleApplyDiscount}
                >
                  <ThemedText style={styles.applyButtonText}>Apply Coupon</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Applied */}
          {isDiscountApplied && (
            <View style={styles.discountAppliedContainer}>
              <View style={styles.discountAppliedContent}>
                <ThemedText style={styles.discountAppliedText}>
                  Discount applied: -${discountAmount.toFixed(2)}
                </ThemedText>
                <TouchableOpacity
                  onPress={handleRemoveDiscount}
                  style={styles.removeDiscountButton}
                >
                  <Ionicons name="close" size={16} color={Theme.colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Exhausted coupon */}
          {!isCouponLoading && debouncedCode.length === 8 && coupon?.isExhausted && (
            <View style={styles.discountErrorContainer}>
              <ThemedText style={styles.discountErrorText}>
                This coupon has been fully used
              </ThemedText>
            </View>
          )}

          {/* Invalid / not found */}
          {!isCouponLoading && isCouponError && debouncedCode.length === 8 && (
            <View style={styles.discountErrorContainer}>
              <ThemedText style={styles.discountErrorText}>
                Invalid coupon code
              </ThemedText>
            </View>
          )}

          {/* Balance / other errors */}
          {discountError ? (
            <View style={styles.discountErrorContainer}>
              <ThemedText style={styles.discountErrorText}>
                {discountError}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Top-up compatibility */}
        {isCheckingTopup && (
          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
            <ActivityIndicator size="small" color={Theme.colors.foreground} />
            <ThemedText style={{ marginLeft: 8, color: Theme.colors.muted }}>
              Checking top-up compatibility…
            </ThemedText>
          </View>
        )}
        {!isCheckingTopup && isTopupCheckError && (
          <View style={styles.discountErrorContainer}>
            <ThemedText style={styles.discountErrorText}>
              {formatBffError(topupCheckError)}
            </ThemedText>
            <TouchableOpacity onPress={() => refetchTopupCompatibility()}>
              <ThemedText style={[styles.discountErrorText, { textDecorationLine: 'underline' }]}>
                Retry
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
        {!isCheckingTopup && !isTopupCheckError && !isTopupCompatible && vendorMismatches.length > 0 && (
          <View style={styles.discountErrorContainer}>
            <ThemedText style={styles.discountErrorText}>
              Your existing eSIM isn&apos;t compatible with this plan for top-up.
            </ThemedText>
          </View>
        )}
        {!isCheckingTopup && isTopupCompatible && (
          <View style={{ marginTop: 16 }}>
            <ThemedText>Apply as Top-up</ThemedText>
            <Text style={{ color: Theme.colors.foreground, marginTop: 4, marginBottom: 12 }}>
              Select an eSIM to top up, or leave unselected to buy a new one
            </Text>
            {topupEsimOptions.map((r) => {
              const isSelected = applyAsTopup && compatibleTopUpEsimId === r.esimId;
              return (
                <TouchableOpacity
                  key={r.esimId}
                  onPress={() => {
                    if (isSelected) {
                      setApplyAsTopup(false);
                      setCompatibleTopUpEsimId(undefined);
                    } else {
                      setApplyAsTopup(true);
                      setCompatibleTopUpEsimId(r.esimId);
                    }
                  }}
                  style={[
                    styles.topupOptionRow,
                    isSelected && styles.topupOptionRowSelected,
                  ]}
                >
                  <ThemedText style={styles.topupOptionText}>
                    {r.label}
                  </ThemedText>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={Theme.colors.success} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* <View style={{ marginTop: 16 }}>
          <ThemedText>Fund Device Wallet</ThemedText>
          <Text style={{ color: Theme.colors.foreground, marginTop: 12 }}>
            Speed up and secure your next eSIM purchase or top-up by funding
            your on-device eSIM crypto wallet.
          </Text>
          <View style={{ flexDirection: "row", marginVertical: 12 }}>
            <ToggleSwitch
              isOn={fundOnDeviceWallet}
              onToggle={setFundOnDeviceWallet}
              onColor={Theme.colors.success}
              offColor={Theme.colors.muted}
              size="small"
            />
            <ThemedText style={{ marginLeft: 8 }}>
              I'd like to also fund my on-device wallet
            </ThemedText>
          </View>
          {fundOnDeviceWallet && addAmountSection}
        </View> */}
      </KeyboardAwareScrollView>

      <TouchableOpacity
        key={`total-checkout-${canCheckout}`}
        style={[styles.bottomButtonContainer, !canCheckout && { opacity: 0.5 }]}
        onPress={canCheckout ? handleCheckout : undefined}
        disabled={!canCheckout}
      >
        <DetailItem
          prefix="Pay "
          value={totalAmount}
          suffix="USD"
          containerStyles={[styles.checkoutButton, { backgroundColor: Theme.colors.payButton }]}
        />
      </TouchableOpacity>

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
          if (method) setSelectedPaymentMethod(method);
        }}
      />

      {/* SDK wallet-app drawer flow */}
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
            savePurchasedESIM={savePurchasedESIM}
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

