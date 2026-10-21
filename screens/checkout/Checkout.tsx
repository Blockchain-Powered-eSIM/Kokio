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
import _toUpper from "lodash/toUpper";
import * as Clipboard from "expo-clipboard";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/contexts/ThemeContext";
import type { Palette } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import UseCreditBalanceToggle from "@/components/checkout/UseCreditBalanceToggle";
import DetailItem from "@/components/ui/DetailItem";
import Checkbox from "@/components/ui/Checkbox";
import { Esim } from "@/components/ESIMItem";
import { getEsimOrderPayload, formatPlanLabel } from "@/helpers/esimOrder";
import { useEsims, DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY } from '@/hooks/useDeviceEsims';
import { isOrderSuccess, pollOrderStatus, submitPaymentHash } from "@/utils/bff/order";
import type { CreateOrderRequest, CreateOrderResponse, OrderStatusResponse } from "@/utils/bff/order";
import { pollingLabel, formatCents, isUserActionableManualReview } from "@/utils/orderStatus";
import OrderFailureModal from "@/components/ui/OrderFailureModal";
import { formatBffError } from "@/utils/bff/koKioBffClient";
import { resolveBffErrorMessage } from "@/utils/bff/errors";
import { getCoupon } from "@/utils/bff/coupon";
import type { CodeLookupResponse } from "@/utils/bff/coupon";
import { useOrderPreview } from "@/hooks/useOrderPreview";
import { useCreditBalance, heldCreditCents, CREDIT_BALANCE_KEY } from "@/hooks/useCreditHistory";
import { useEsimCompatibility } from "@/hooks/useEsimCompatibility";
import { useCreateOrder, StripeCancelledError, StripeSheetError, OrderCreationError } from "@/hooks/useCreateOrder";
import { useToast } from "@/contexts/ToastContext";
import CheckoutSuccessModal from "@/components/ui/CheckoutSuccessModal";
import WalletSetupModal from "@/components/ui/WalletSetupModal";
import { createRadioButtons } from "./checkout.helpers";
import { RADIO_KEYS, DEFAULT_DEVICE_WALLET_PAYMENT_ASSET, DEVICE_WALLET_PAYMENT_ASSETS, DEV_DEVICE_WALLET_PAYMENT_ASSETS, FIAT_MINIMUM_CENTS } from "@/constants/checkout.constants";
import type { DeviceWalletPaymentAsset } from "@/constants/checkout.constants";
import { useWalletTokens } from "@/hooks/useWalletTokens";
import BottomSheet from "@gorhom/bottom-sheet";
import { TokenPickerSheet } from "@/components/wallet/sheets/TokenPickerSheet";
import { EsimTopupPickerSheet } from "@/components/wallet/sheets/EsimTopupPickerSheet";
import { ApplyTopupConfirmModal } from "@/components/ui/ApplyTopupConfirmModal";
import { useKokio } from "@/hooks/useKokio";
import { esimDisplayName, esimDocToDisplayItem } from "@/helpers/esimDisplay";
import CountryFlag, { type CoverageType } from "@/components/ui/CountryFlag";
import * as WebBrowser from "expo-web-browser";
import {
  MoonpayCommerceProvider,
  usePayWithCrypto,
} from "@heliofi/checkout-react-native";
import type { PaymentCallback } from "@heliofi/checkout-react-native";
import { logger } from "@/utils/logger";
import { formatOnChainError, isUserCancelledPasskeyError } from "@/utils/formatOnChainError";

const SCREEN_WIDTH = Dimensions.get("window").width;
const RADIO_WIDTH = SCREEN_WIDTH - 24;

// How long to wait for the chain webhook to confirm a device-wallet payment
// before submitting the signed hash ourselves as a recovery fallback.
const DEVICE_WALLET_PAYMENT_SUBMISSION_DELAY_MS = 25000;

// Longer than the default poll budget (30s, tuned for Stripe/MoonPay's
// near-instant webhooks): a device-wallet payment's confirmation depends on
// the chain webhook's own wait for `safe` L1 finality, which real-device
// testing showed can run past 30s even when the payment actually succeeded.
const DEVICE_WALLET_PAYMENT_POLL_MAX_DURATION_MS = 120000;

// GET /order/{idempotencyKey} shares a 20 requests per minute per-device
// limit (per deviceWalletAddress) with /esim, /order/list, /coupon/{code},
// and /order/preview. A device-wallet payment's confirmation depends on the
// chain webhook's `safe` L1 finality, which takes 30s+. Polling faster
// wouldn't surface the status sooner; 8s (7.5 req/min) leaves headroom for
// concurrent traffic.
const DEVICE_WALLET_PAYMENT_POLL_INTERVAL_MS = 8000;

const CODE_ERROR_CODES: ReadonlySet<string> = new Set([
  'PROMO_CODE_INVALID_FORMAT',
  'PROMO_CODE_NOT_FOUND',
  'PROMO_CODE_NOT_YET_VALID',
  'PROMO_CODE_EXPIRED',
  'PROMO_CODE_REVOKED',
  'PROMO_CODE_EXHAUSTED',
  'PROMO_ACCOUNT_LIMIT_REACHED',
  'PROMO_FIRST_PURCHASE_ONLY',
  'PROMO_CODE_NOT_APPLICABLE',
  'REFERRAL_NOT_ALLOWED',
]);

const MAPPED_ORDER_ERROR_CODES: ReadonlySet<string> = new Set([
  ...CODE_ERROR_CODES,
  'FIAT_MINIMUM_NOT_MET',
  'STORE_CREDIT_INSUFFICIENT',
  'FIRST_ORDER_IN_PROGRESS',
]);

const LIGHT_SUCCESS_TEXT = "#1B8A42";

const toApiPaymentMethod = (selected: string | undefined): CreateOrderRequest['paymentMethod'] =>
  selected === RADIO_KEYS.E_SIM_WALLET
    ? 'DEVICE_WALLET'
    : (selected === RADIO_KEYS.CREDIT_CARD || selected === RADIO_KEYS.APPLE_PAY)
      ? 'FIAT'
      : 'CRYPTO';

const describeCodeTerms = (lookup: CodeLookupResponse): string => {
  if (lookup.kind === 'REFERRAL' && lookup.referral) {
    return `${lookup.referral.refereePercent}% off, up to ${formatCents(lookup.referral.refereeCapCents)}`;
  }
  const terms = lookup.coupon?.terms;
  if (!terms) return 'Discount applied at checkout';
  if (terms.amountCents != null) return `${formatCents(terms.amountCents)} off`;
  if (terms.percent != null) {
    return terms.maxDiscountCents != null
      ? `${terms.percent}% off, up to ${formatCents(terms.maxDiscountCents)}`
      : `${terms.percent}% off`;
  }
  if (terms.planId != null) return terms.planActive ? 'Free plan voucher' : 'Plan voucher (plan no longer available)';
  return 'Discount applied at checkout';
};

const createStyles = (colors: Palette) => StyleSheet.create({
  container:              { flex: 1 },
  scrollContent:          { flex: 1, paddingHorizontal: 12 },
  scrollContentContainer: { paddingBottom: 20 },
  checkoutButton: {
    borderRadius: 32, paddingVertical: 12, flexDirection: "row",
    alignItems: "center", justifyContent: "center",
  },
  checkoutButtonText: { fontSize: 16, fontWeight: "600" },
  logoImage:          { width: 24, height: 24, objectFit: "contain" },
  containerStyle:     { flex: 1, alignItems: "flex-start" },
  buttonStyle: {
    flexDirection: "row", justifyContent: "space-between", width: RADIO_WIDTH,
    backgroundColor: colors.inputBackground, paddingVertical: 16, paddingHorizontal: 24,
    marginHorizontal: 0, marginVertical: 2, borderRadius: 12, borderWidth: 1,
  },
  selectedPaymentRow:      { marginTop: 12, alignItems: "center", paddingRight: 16 },
  changePaymentMethodButton: {
    marginLeft: 8, width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  promoInputRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
    backgroundColor: colors.inputBackground, borderRadius: 12, paddingHorizontal: 12,
  },
  promoInput: { flex: 1, color: colors.foreground, fontSize: 16, paddingVertical: 10 },
  promoInputTyped: { fontFamily: "monospace", fontWeight: "700" },
  promoStatusRow:          { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  promoStatusText:         { flex: 1, fontSize: 13 },
  promoAppliedCard: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12,
    padding: 12, borderRadius: 12,
  },
  promoAppliedCodeRow:     { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  promoAppliedCode:        { fontSize: 14, fontWeight: "700", fontFamily: "monospace" },
  promoAppliedAmount:      { fontSize: 13, fontWeight: "600" },
  topupOptionRow: {
    flexDirection: "row", alignItems: "center", gap: 10, width: "100%",
    marginTop: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
  },
  topupOptionText:         { fontSize: 14, fontWeight: "600", flex: 1 },
  discountErrorContainer:  { marginTop: 8, padding: 12, backgroundColor: colors.destructiveBackground, borderRadius: 8 },
  discountErrorText:       { color: colors.destructive, fontSize: 14 },
  breakdownContainer:      { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: colors.inputBackground, gap: 6 },
  breakdownRow:            { flexDirection: "row", justifyContent: "space-between" },
  breakdownTotalRow:       { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  loadingOverlay: {
    ...StyleSheet.absoluteFill, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', gap: 16, zIndex: 10,
  },
  loadingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
});

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

  const [isESimEnabled, setIsESimEnabled]                 = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>();
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
  const { kokio }                                         = useKokio();
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

      // Fires the passkey/biometric prompt. Resolves with the user operation
      // hash, NOT a receipt - the payment is not confirmed on-chain yet. The
      // calls are bundled as one user operation, in order (e.g. an approval
      // followed by the actual payment call).
      const hash = await deviceWallet.sendUserOperation(
        userOperations.map((op) => ({ to: op.to as `0x${string}`, data: op.data as `0x${string}` })),
      );

      const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash });

      // A user operation whose calls REVERT still gets mined and still
      // returns a receipt - a resolved promise here is not proof the
      // payment went through.
      if (!receipt.success) {
        throw new Error('Payment reverted on-chain');
      }

      setLoadingMessage('Checking payment status...');

      // The chain webhook confirms this order independently of anything the
      // client does; submitting the hash early would only add a wasted call
      // on the common case where the webhook lands first. Submit it once,
      // only if the webhook still hasn't confirmed after a reasonable wait.
      const fallbackTimer = setTimeout(() => {
        submitPaymentHash(correlationId, hash).catch((err) => {
          logger.error('DEVICE_WALLET_PAYMENT_SUBMISSION_FAILED', { err });
        });
      }, DEVICE_WALLET_PAYMENT_SUBMISSION_DELAY_MS);

      const finalOrder = await pollOrderStatus(correlationId, {
        onUpdate: handlePollUpdate,
        maxDurationMs: DEVICE_WALLET_PAYMENT_POLL_MAX_DURATION_MS,
        intervalMs: DEVICE_WALLET_PAYMENT_POLL_INTERVAL_MS,
      }).catch(() => null);
      clearTimeout(fallbackTimer);
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

        {isDeviceWalletShort && (
          <View style={styles.discountErrorContainer}>
            <ThemedText style={styles.discountErrorText}>
              {`Not enough ${deviceWalletAsset} in your Device Wallet to cover this order.`}
            </ThemedText>
          </View>
        )}

        <View style={{ marginTop: 16 }}>
          <ThemedText>Promo code</ThemedText>
          {!isDiscountApplied && (
            <View style={styles.promoInputRow}>
              <Ionicons name="pricetag-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.promoInput, !!discountCode && styles.promoInputTyped]}
                value={discountCode}
                onChangeText={handleDiscountCodeChange}
                placeholder="Coupon or referral code"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={16}
                onSubmitEditing={handleApplyDiscount}
                returnKeyType="done"
              />
              {isCouponLoading && <ActivityIndicator size="small" color={colors.mutedForeground} />}
              {!isCouponLoading && !discountCode && (
                <TouchableOpacity
                  onPress={handlePasteDiscountCode}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Paste code from clipboard"
                >
                  <ThemedText bold style={{ color: colors.primary, fontSize: 14 }}>Paste</ThemedText>
                </TouchableOpacity>
              )}
              {!isCouponLoading && !!discountCode && !couponError && (
                <TouchableOpacity
                  onPress={handleApplyDiscount}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Apply code"
                >
                  <ThemedText bold style={{ color: colors.primary, fontSize: 14 }}>Apply</ThemedText>
                </TouchableOpacity>
              )}
              {!isCouponLoading && !!discountCode && !!couponError && (
                <TouchableOpacity
                  onPress={handleRemoveDiscount}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear code"
                >
                  <ThemedText bold style={{ color: colors.destructive, fontSize: 14 }}>Clear</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
          {isDiscountApplied && (
            <View style={[styles.promoAppliedCard, { backgroundColor: colors.successBackground }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <View style={styles.promoAppliedCodeRow}>
                <ThemedText style={styles.promoAppliedCode} numberOfLines={1}>{discountCode}</ThemedText>
                <ThemedText
                  style={[styles.promoAppliedAmount, { color: isDark ? colors.success : LIGHT_SUCCESS_TEXT }]}
                  numberOfLines={1}
                >
                  {quoteInPlay && quoteInPlay.codeDiscountCents > 0
                    ? `-${formatCents(quoteInPlay.codeDiscountCents)} off`
                    : coupon ? describeCodeTerms(coupon) : 'Applied'}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={handleRemoveDiscount}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Remove discount"
              >
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}
          {!isDiscountApplied && couponError ? (
            <View style={styles.promoStatusRow}>
              <Ionicons name="alert-circle" size={18} color={colors.destructive} />
              <ThemedText style={[styles.promoStatusText, { color: colors.destructive }]} numberOfLines={2}>
                {couponError}
              </ThemedText>
            </View>
          ) : null}
          {discountError ? (
            <View style={styles.promoStatusRow}>
              <Ionicons name="alert-circle" size={18} color={colors.destructive} />
              <ThemedText style={[styles.promoStatusText, { color: colors.destructive }]} numberOfLines={2}>
                {discountError}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {isPreviewInPlay && (
          <View style={styles.breakdownContainer}>
            {isPreviewLoading && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator size="small" color={colors.foreground} />
                <ThemedText style={{ marginLeft: 8, color: colors.mutedForeground, fontSize: 14 }}>
                  Calculating your total…
                </ThemedText>
              </View>
            )}
            {!isPreviewLoading && !!previewErrorMessage && (
              <ThemedText style={styles.discountErrorText}>{previewErrorMessage}</ThemedText>
            )}
            {!isPreviewLoading && quoteInPlay && (
              <>
                <View style={styles.breakdownRow}>
                  <ThemedText>Plan price</ThemedText>
                  <ThemedText>{formatCents(quoteInPlay.listPriceCents)}</ThemedText>
                </View>
                {quoteInPlay.codeDiscountCents > 0 && (
                  <View style={styles.breakdownRow}>
                    <ThemedText>{quoteInPlay.codeKind === 'REFERRAL' ? 'Referral discount' : 'Coupon discount'}</ThemedText>
                    <ThemedText>{`-${formatCents(quoteInPlay.codeDiscountCents)}`}</ThemedText>
                  </View>
                )}
                {quoteInPlay.creditAppliedCents > 0 && (
                  <View style={styles.breakdownRow}>
                    <ThemedText>Kokio credits</ThemedText>
                    <ThemedText>{`-${formatCents(quoteInPlay.creditAppliedCents)}`}</ThemedText>
                  </View>
                )}
                <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                  <ThemedText bold>Amount to pay</ThemedText>
                  <ThemedText bold>{formatCents(quoteInPlay.railAmountCents)}</ThemedText>
                </View>
                {wasCreditTrimmed && (
                  <ThemedText style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    Credits were reduced so the card payment stays at {formatCents(FIAT_MINIMUM_CENTS)}.
                  </ThemedText>
                )}
                {isFiatFloorViolated && (
                  <ThemedText style={styles.discountErrorText}>
                    The amount to pay by card must be {formatCents(FIAT_MINIMUM_CENTS)} or more.
                  </ThemedText>
                )}
              </>
            )}
          </View>
        )}

        {isCheckingTopup && (
          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
            <ActivityIndicator size="small" color={colors.foreground} />
            <ThemedText style={{ marginLeft: 8, color: colors.mutedForeground }}>
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
              {(() => {
                const names = vendorMismatches.map((r) => {
                  const doc = esims.find((e) => e.eSimRef === r.eSimRef);
                  return doc ? esimDisplayName(doc) : buildTopupEsimLabel(r.eSimRef, r.iccid);
                });
                const isPlural = names.length > 1;
                return `Your existing ${isPlural ? "eSIMs" : "eSIM"} ${names.join(", ")} ${isPlural ? "aren't" : "isn't"} compatible with this plan for top-up. The purchase will be a new eSIM.`;
              })()}
            </ThemedText>
          </View>
        )}
        {!isCheckingTopup && isTopupCompatible && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: colors.foreground, fontSize: 13 }} numberOfLines={1}>
              <ThemedText style={{ fontSize: 13 }} bold>Top Up: </ThemedText>
              Apply this plan as top up, else disable to buy a new one
            </Text>
            <TouchableOpacity
              onPress={() => topupPickerSheetRef.current?.snapToIndex(0)}
              style={[
                styles.topupOptionRow,
                { backgroundColor: applyAsTopup ? colors.primary : colors.inputBackground },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                applyAsTopup && compatibleTopUpEsimRef
                  ? `Change top-up eSIM, currently ${buildTopupEsimLabel(compatibleTopUpEsimRef)}`
                  : "Choose an eSIM to top up"
              }
            >
              {applyAsTopup && selectedTopupDoc && (() => {
                const display = esimDocToDisplayItem(selectedTopupDoc);
                return (
                  <CountryFlag
                    size={24}
                    flagUrl={display.serviceRegionFlag ?? ""}
                    coverageType={display.coverageType as CoverageType}
                    serviceRegionName={display.serviceRegionName}
                  />
                );
              })()}
              <ThemedText
                style={[
                  styles.topupOptionText,
                  { color: applyAsTopup ? colors.primaryForeground : colors.foreground },
                ]}
                numberOfLines={1}
              >
                {applyAsTopup && compatibleTopUpEsimRef ? buildTopupEsimLabel(compatibleTopUpEsimRef) : "Buy a new eSIM"}
              </ThemedText>
              <Ionicons
                name="chevron-down"
                size={16}
                color={applyAsTopup ? colors.primaryForeground : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAwareScrollView>

      <BottomActionBar>
        <UseCreditBalanceToggle
          value={storeCreditActive}
          onValueChange={setUseStoreCredit}
          availableCents={availableCreditCents}
          heldCents={heldCreditCentsValue}
          loading={isCreditLoading}
        />
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <Checkbox onChange={setIsESimEnabled} checked={isESimEnabled} />
          <Text style={{ color: colors.foreground, marginLeft: 8 }}>
            I confirm my device is eSIM compatible and network-enabled.
          </Text>
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
