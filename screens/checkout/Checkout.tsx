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
import { useQueryClient } from '@tanstack/react-query';
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
import { useEsims, DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY } from '@/hooks/useDeviceEsims';
import { isOrderSuccess, pollOrderStatus } from "@/utils/bff/order";
import type { CreateOrderRequest, CreateOrderResponse, OrderStatusResponse } from "@/utils/bff/order";
import { pollingLabel } from "@/utils/orderStatus";
import OrderFailureModal from "@/components/ui/OrderFailureModal";
import { formatBffError } from "@/utils/bff/koKioBffClient";
import { useCouponLookup } from "@/hooks/useCouponLookup";
import { useEsimCompatibility } from "@/hooks/useEsimCompatibility";
import { useCreateOrder, StripeCancelledError, StripeSheetError } from "@/hooks/useCreateOrder";
import { useToast } from "@/contexts/ToastContext";
import CheckoutSuccessModal from "@/components/ui/CheckoutSuccessModal";
import WalletSetupModal from "@/components/ui/WalletSetupModal";
import { createRadioButtons } from "./checkout.helpers";
import { RADIO_KEYS } from "@/constants/checkout.constants";
import { useKokio } from "@/hooks/useKokio";
import type { ESimDocument, PlanHistoryEntry } from "@/utils/bff/esim";
import * as WebBrowser from "expo-web-browser";
import {
  MoonpayCommerceProvider,
  usePayWithCrypto,
} from "@heliofi/checkout-react-native";
import type { PaymentCallback } from "@heliofi/checkout-react-native";
import { logger } from "@/utils/logger";

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
  setIsCheckoutLoading,
  setLoadingMessage,
  onComplete,
  onSdkDismiss,
}: {
  correlationId: string | null;
  pendingOrder: CreateOrderResponse | null;
  eSimItem: Esim;
  kokioDeviceUID: string | undefined;
  setIsCheckoutLoading: (v: boolean) => void;
  setLoadingMessage: (msg: string) => void;
  onComplete: (order: OrderStatusResponse | null) => void;
  onSdkDismiss: () => void;
}) => {
  const successFiredRef = useRef(false);

  const onSuccess = useCallback<PaymentCallback>(
    async (result) => {
      successFiredRef.current = true;
      logger.debug('HELIO_ONSUCCESS', { transactionSignature: result.transactionSignature });
      setIsCheckoutLoading(true);
      setLoadingMessage('Processing your order...');
      const finalOrder = correlationId
        ? await pollOrderStatus(correlationId, {
            onUpdate: (update) =>
              setLoadingMessage(
                update.kind === 'status' ? pollingLabel(update.orderStatus) : 'Retrying...',
              ),
          }).catch(() => null)
        : null;
      onComplete(finalOrder);
    },
    //TODO: 'eSimItem', 'kokioDeviceUID', 'pendingOrder' are likely not needed in the dep array
    //eslint-disable-next-line react-hooks/exhaustive-deps
    [correlationId, eSimItem, kokioDeviceUID, onComplete, pendingOrder, setIsCheckoutLoading, setLoadingMessage],
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
  container:              { flex: 1 },
  scrollContent:          { flex: 1, paddingHorizontal: 12 },
  scrollContentContainer: { paddingBottom: 20 },
  bottomButtonContainer: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 16,
  },
  checkoutButton: {
    borderRadius: 32, paddingVertical: 12, flexDirection: "row",
    alignItems: "center", justifyContent: "center",
  },
  checkoutButtonText: { fontSize: 16, fontWeight: "600" },
  logoImage:          { width: 24, height: 24, objectFit: "contain" },
  containerStyle:     { flex: 1, alignItems: "flex-start" },
  buttonStyle: {
    flexDirection: "row", justifyContent: "space-between", width: RADIO_WIDTH,
    backgroundColor: Theme.colors.inputBackground, paddingVertical: 16, paddingHorizontal: 24,
    marginHorizontal: 0, marginVertical: 2, borderRadius: 12, borderWidth: 1,
  },
  discountContainer:       { flexDirection: "row", marginTop: 12, gap: 8 },
  discountInput: {
    flex: 1, backgroundColor: Theme.colors.inputBackground, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 16, color: Theme.colors.foreground,
    fontSize: 16, borderWidth: 1, borderColor: "transparent",
  },
  applyButton:             { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 24, justifyContent: "center", alignItems: "center" },
  applyButtonText:         { color: Theme.colors.secondaryForeground, fontSize: 16, fontWeight: "600" },
  discountAppliedContainer:{ marginTop: 8, padding: 12, backgroundColor: Theme.colors.successBackground, borderRadius: 8 },
  discountAppliedContent:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  discountAppliedText:     { color: Theme.colors.success, fontSize: 14 },
  topupOptionRow: {
    marginTop: 4, padding: 12, borderRadius: 8, borderWidth: 1,
    backgroundColor: Theme.colors.inputBackground, borderColor: Theme.colors.mutedForeground,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  topupOptionRowSelected:  { borderColor: Theme.colors.success, borderWidth: 2 },
  topupOptionText:         { color: Theme.colors.foreground, fontSize: 14 },
  removeDiscountButton:    { padding: 4, backgroundColor: Theme.colors.destructiveBackground, borderRadius: 32 },
  discountErrorContainer:  { marginTop: 8, padding: 12, backgroundColor: Theme.colors.destructiveBackground, borderRadius: 8 },
  discountErrorText:       { color: Theme.colors.destructive, fontSize: 14 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill, backgroundColor: Theme.colors.overlay,
    justifyContent: 'center', alignItems: 'center', gap: 16, zIndex: 10,
  },
  loadingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
});

// e.g. "United Arab Emirates · 7 Days · 1GB"
function formatPlanLabel(plan?: Esim | null): string | undefined {
  if (!plan?.serviceRegionName) return undefined;
  const parts = [plan.serviceRegionName];
  if (plan.validity) parts.push(`${plan.validity} Days`);
  if (plan.isUnlimited) parts.push('Unlimited');
  else if (plan.data) parts.push(`${plan.data}GB`);
  return parts.join(' · ');
}

// Builds a minimal Esim display shape from an ESimDocument's latest PlanHistoryEntry.
function esimDocToDisplayItem(doc: ESimDocument): Esim {
  const entries: PlanHistoryEntry[] = doc.planHistory ?? [];
  const latest = entries[entries.length - 1] as PlanHistoryEntry | undefined;
  return {
    catalogueId:        '',
    actualSellingPrice: 0,
    isUnlimited:        latest?.isUnlimited      ?? false,
    serviceRegionCode:  undefined,
    serviceRegionFlag:  latest?.serviceRegionFlag ?? null,
    serviceRegionName:  latest?.serviceRegionName ?? null,
    coverageType:       latest?.coverageType      ?? 'LOCAL',
    data:               latest?.data              ?? null,
    sms:                latest?.sms               ?? null,
    voice:              latest?.voice             ?? null,
    validity:           latest?.validity          ?? null,
    info:               null,
  };
}

const Checkout = () => {
  const { isDark } = useTheme();
  const styles     = useMemo(createStyles, [isDark]);
  const { item: eSimDetails } = useLocalSearchParams();

  const eSimItem: Esim = React.useMemo(() => {
    if (typeof eSimDetails === "string") {
      try { return JSON.parse(eSimDetails); } catch { return null; }
    }
    return eSimDetails;
  }, [eSimDetails]);

  const [isESimEnabled, setIsESimEnabled]                 = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>();
  const [showSuccessModal, setShowSuccessModal]           = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading]         = useState(false);
  const [loadingMessage, setLoadingMessage]               = useState('');
  const [showWalletSetupModal, setShowWalletSetupModal]   = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod]   = useState<string | null>(null);
  const [helioChargeToken, setHelioChargeToken]           = useState<string | null>(null);
  const [helioCorrelationId, setHelioCorrelationId]       = useState<string | null>(null);
  const [pendingHelioOrder, setPendingHelioOrder]         = useState<CreateOrderResponse | null>(null);
  const { kokio }                                         = useKokio();
  const [discountCode, setDiscountCode]                   = useState<string>("");
  const [debouncedCode, setDebouncedCode]                 = useState<string>("");
  const [isDiscountApplied, setIsDiscountApplied]         = useState<boolean>(false);
  const [discountAmount, setDiscountAmount]               = useState<number>(0);
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

  const radioButtons: RadioButtonProps[] = useMemo(
    () => createRadioButtons(selectedPaymentMethod, styles.buttonStyle),
    // All missing dependencies are of style attributes which are in their on useMemo() call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPaymentMethod],
  );

  const { showMessage }       = useToast();
  const orderCorrelationRef   = useRef<string | null>(null);
  const handlePollUpdate      = useCallback(
    (update: import("@/utils/bff/order").PollUpdate) => {
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCode(discountCode), 500);
    return () => clearTimeout(timer);
  }, [discountCode]);

  const {
    data: coupon, isLoading: isCouponLoading, isError: isCouponError,
  } = useCouponLookup(debouncedCode, debouncedCode.length === 8);

  const queryClient  = useQueryClient();
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
  const [applyAsTopup, setApplyAsTopup]                   = useState(false);
  const [compatibleTopUpEsimId, setCompatibleTopUpEsimId] = useState<string | undefined>();
  const bg = useThemeColor({}, "background");

  useEffect(() => {
    if (compatibleEsims.length > 0 && !compatibleTopUpEsimId) {
      setCompatibleTopUpEsimId(compatibleEsims[0].esimId);
    }
  }, [compatibleEsims, compatibleTopUpEsimId]);

  // Build a human-readable label for a compatible topup eSIM.
  // Source of truth is the live ESimDocument from useEsims() (server-truth),
  // using the latest PlanHistoryEntry for region/validity/data fields.
  // Falls back to ICCID last-4, then esimId abbreviation.
  const buildTopupEsimLabel = useCallback((esimId: string, iccid?: string): string => {
    const doc  = esims.find((e) => e.esimId === esimId);
    const plan = doc ? esimDocToDisplayItem(doc) : null;
    const label = formatPlanLabel(plan);
    if (label) return label;
    if (iccid) return `ICCID ...${iccid.slice(-4)}`;
    return `${esimId.slice(0, 6)}...${esimId.slice(-4)}`;
  }, [esims]);

  // Append ICCID last-4 only when two labels collide.
  const topupEsimOptions = useMemo(() => {
    const withLabel = compatibleEsims.map(r => ({
      ...r, label: buildTopupEsimLabel(r.esimId, r.iccid),
    }));
    const counts = withLabel.reduce<Record<string, number>>((acc, o) => {
      acc[o.label] = (acc[o.label] ?? 0) + 1; return acc;
    }, {});
    return withLabel.map(o => ({
      ...o,
      label: counts[o.label] > 1 && o.iccid ? `${o.label} (...${o.iccid.slice(-4)})` : o.label,
    }));
  }, [compatibleEsims, buildTopupEsimLabel]);

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
      setOrderResponse(order);
      setTopupSuccessInfo(
        applyAsTopup && compatibleTopUpEsimId
          ? {
              fromLabel: formatPlanLabel(eSimItem) ?? 'your new plan',
              toLabel:   buildTopupEsimLabel(compatibleTopUpEsimId),
            }
          : null,
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
    const msg =
      order.orderStatus === 'PAYMENT_FAILED' ? 'Payment failed. Please try again.'  :
      order.orderStatus === 'ABANDONED'       ? 'Order expired. Please try again.'   :
      'Order could not be completed. Please try again.';
    showMessage(msg, 'info');
  }, [queryClient, showMessage, applyAsTopup, compatibleTopUpEsimId, eSimItem, buildTopupEsimLabel]);

  const handleRemoveDiscount = useCallback(() => {
    setIsDiscountApplied(false);
    setDiscountAmount(0);
    setDiscountCode("");
    setDiscountError("");
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

  const handleCheckout = useCallback(async () => {
    const isCryptoPayment = !(
      selectedPaymentMethod === RADIO_KEYS.CREDIT_CARD ||
      selectedPaymentMethod === RADIO_KEYS.APPLE_PAY
    );
    const request: CreateOrderRequest = {
      ...getEsimOrderPayload({ eSimItem, discountCode, applyAsTopup, compatibleTopUpEsimId }),
      isCryptoPayment,
    };

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

      // awaiting_crypto_payment
      setIsCheckoutLoading(false);
      setLoadingMessage('');

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
      const e = err as { code?: string; message?: string };
      if (e.code === 'COUPON_INSUFFICIENT_BALANCE') {
        showMessage('Coupon has insufficient balance. Discount removed.', 'info');
        handleRemoveDiscount();
      } else {
        showMessage(formatBffError(err), 'info');
      }
      setIsCheckoutLoading(false);
      setLoadingMessage('');
    }
  }, [
    selectedPaymentMethod, eSimItem, discountCode, applyAsTopup, compatibleTopUpEsimId,
    createOrderMutation, handleOrderResult, handleBrowserPay, handleRemoveDiscount, showMessage,
  ]);

  const handleInstallESIM = useCallback(() => {
    setShowSuccessModal(false);
    router.dismissAll();
    router.navigate({
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
    router.navigate("/(tabs)");
  }, []);

  const handleWalletModalClose = useCallback(() => {
    setShowWalletSetupModal(false);
    setPendingPaymentMethod(null);
  }, []);

  const handlePaymentMethodChange = useCallback(
    (value: string) => {
      if (value === RADIO_KEYS.E_SIM_WALLET) return;
      if (!kokio.userWallet) {
        setPendingPaymentMethod(value);
        setShowWalletSetupModal(true);
      } else {
        setSelectedPaymentMethod(value);
      }
    },
    [kokio?.userWallet],
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
    if (!kokio.userWallet) setShowWalletSetupModal(true);
  }, [coupon, eSimItem.actualSellingPrice, kokio.userWallet]);

  const totalAmount = useMemo(() => {
    if (isDiscountApplied) return _subtract(eSimItem.actualSellingPrice, discountAmount);
    return eSimItem.actualSellingPrice;
  }, [eSimItem.actualSellingPrice, isDiscountApplied, discountAmount]);

  const canCheckout = useMemo(
    () => isESimEnabled && !isCheckoutLoading && !!selectedPaymentMethod,
    [isESimEnabled, isCheckoutLoading, selectedPaymentMethod],
  );

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
          {isCouponLoading && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <ActivityIndicator size="small" color={Theme.colors.foreground} />
              <ThemedText style={{ marginLeft: 8, color: Theme.colors.muted, fontSize: 14 }}>
                Validating coupon…
              </ThemedText>
            </View>
          )}
          {!isCouponLoading && debouncedCode.length === 8 && coupon && !coupon.isExhausted && !isDiscountApplied && (
            <View style={styles.discountAppliedContainer}>
              <View style={styles.discountAppliedContent}>
                <ThemedText style={styles.discountAppliedText}>
                  {`Balance: $${_toNumber(coupon.balance).toFixed(2)} ${coupon.tokenName}`}
                </ThemedText>
                <TouchableOpacity
                  style={[styles.applyButton, { paddingVertical: 6, paddingHorizontal: 14 }]}
                  onPress={handleApplyDiscount}
                  accessibilityRole="button"
                  accessibilityLabel="Apply coupon"
                >
                  <ThemedText style={styles.applyButtonText}>Apply Coupon</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {isDiscountApplied && (
            <View style={styles.discountAppliedContainer}>
              <View style={styles.discountAppliedContent}>
                <ThemedText style={styles.discountAppliedText}>
                  Discount applied: -${discountAmount.toFixed(2)}
                </ThemedText>
                <TouchableOpacity
                  onPress={handleRemoveDiscount}
                  style={styles.removeDiscountButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove discount"
                >
                  <Ionicons name="close" size={16} color={Theme.colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {!isCouponLoading && debouncedCode.length === 8 && coupon?.isExhausted && (
            <View style={styles.discountErrorContainer}>
              <ThemedText style={styles.discountErrorText}>This coupon has been fully used</ThemedText>
            </View>
          )}
          {!isCouponLoading && isCouponError && debouncedCode.length === 8 && (
            <View style={styles.discountErrorContainer}>
              <ThemedText style={styles.discountErrorText}>Invalid coupon code</ThemedText>
            </View>
          )}
          {discountError ? (
            <View style={styles.discountErrorContainer}>
              <ThemedText style={styles.discountErrorText}>{discountError}</ThemedText>
            </View>
          ) : null}
        </View>

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
            <ThemedText style={styles.discountErrorText}>{formatBffError(topupCheckError)}</ThemedText>
            <TouchableOpacity onPress={() => refetchTopupCompatibility()} accessibilityRole="button">
              <ThemedText style={[styles.discountErrorText, { textDecorationLine: 'underline' }]}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        )}
        {!isCheckingTopup && !isTopupCheckError && !isTopupCompatible && checkErrors.length > 0 && (
          <View style={styles.discountErrorContainer}>
            <ThemedText style={styles.discountErrorText}>
              Couldn&apos;t verify top-up compatibility for your existing eSIM. Please try again.
            </ThemedText>
            <TouchableOpacity onPress={() => refetchTopupCompatibility()} accessibilityRole="button">
              <ThemedText style={[styles.discountErrorText, { textDecorationLine: 'underline' }]}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        )}
        {!isCheckingTopup && !isTopupCheckError && !isTopupCompatible && checkErrors.length === 0 && vendorMismatches.length > 0 && (
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
                    if (isSelected) { setApplyAsTopup(false); setCompatibleTopUpEsimId(undefined); }
                    else { setApplyAsTopup(true); setCompatibleTopUpEsimId(r.esimId); }
                  }}
                  style={[styles.topupOptionRow, isSelected && styles.topupOptionRowSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Apply this plan as a top-up to ${r.label}`}
                >
                  <ThemedText style={styles.topupOptionText}>{r.label}</ThemedText>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={Theme.colors.success} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </KeyboardAwareScrollView>

      <TouchableOpacity
        key={`total-checkout-${canCheckout}`}
        style={[styles.bottomButtonContainer, !canCheckout && { opacity: 0.5 }]}
        onPress={canCheckout ? handleCheckout : undefined}
        disabled={!canCheckout}
        accessibilityRole="button"
        accessibilityLabel={`Pay ${totalAmount} USD`}
        accessibilityState={{ disabled: !canCheckout }}
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
