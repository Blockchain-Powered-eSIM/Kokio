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
import ToggleSwitch from "toggle-switch-react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import _trim from "lodash/trim";
import _subtract from "lodash/subtract";
import _toNumber from "lodash/toNumber";
import _toUpper from "lodash/toUpper";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import DetailItem from "@/components/ui/DetailItem";
import Checkbox from "@/components/ui/Checkbox";
import { Esim } from "@/components/ESIMItem";
import { getEsimOrderPayload } from "@/helpers/esimOrder";
import { createOrder, createFiatOrder, createExternalWalletOrder, pollOrderStatus } from "@/utils/bff/order";
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
import type { CreateOrderResponse, ExternalWalletOrderResponse } from "@/utils/bff/order";
import * as WebBrowser from "expo-web-browser";
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
  savePurchasedESIM: (uid: string, item: Esim, order: CreateOrderResponse, cid?: string | null) => Promise<void>;
  setIsCheckoutLoading: (v: boolean) => void;
  setLoadingMessage: (msg: string) => void;
  onComplete: (order: CreateOrderResponse | null) => void;
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
            setLoadingMessage(s.replace(/_/g, ' ')),
          ).catch(() => pendingOrder)
        : pendingOrder;
      if (finalOrder && kokioDeviceUID) {
        await savePurchasedESIM(kokioDeviceUID, eSimItem, finalOrder, correlationId);
      }
      onComplete(finalOrder);
    },
    [correlationId, eSimItem, kokioDeviceUID, onComplete, pendingOrder, savePurchasedESIM, setIsCheckoutLoading, setLoadingMessage],
  );

  const { payWithCrypto, drawerVisible } = usePayWithCrypto({ onSuccess });

  useEffect(() => {
    payWithCrypto();
  }, []);

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
  const [orderResponse, setOrderResponse] = useState<CreateOrderResponse | null>(null);
  const [discountError, setDiscountError] = useState<string>("");

  const radioButtons: RadioButtonProps[] = useMemo(
    () => createRadioButtons(selectedPaymentMethod, styles.buttonStyle),
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

  const hasPriorEsim = kokio.purchasedESIMs.length > 0;
  const { isLoading: isCheckingTopup, compatibleEsims } = useEsimCompatibility(
    { planId: eSimItem?.catalogueId },
    { enabled: hasPriorEsim },
  );
  const isTopupCompatible = compatibleEsims.length > 0;
  const [applyAsTopup, setApplyAsTopup] = useState(false);
  const [compatibleTopUpEsimId, setCompatibleTopUpEsimId] = useState<string | undefined>();
  const bg = useThemeColor({}, "background");

  useEffect(() => {
    if (compatibleEsims.length > 0 && !compatibleTopUpEsimId) {
      setCompatibleTopUpEsimId(compatibleEsims[0].esimId);
    }
  }, [compatibleEsims]);

  const handleEsimCheckout = useCallback(async () => {
    try {
      setIsCheckoutLoading(true);

      const deviceWalletId = kokio.userWallet?.address || "";

      if (applyAsTopup && compatibleTopUpEsimId) {
        await createTopupOrder.mutateAsync({
          request: {
            catalogueId: eSimItem.catalogueId,
            currency: "USD",
            isNewESim: false,
            eSimId: compatibleTopUpEsimId,
            isCryptoPayment: true,
            payeeAddress: deviceWalletId,
            coupon: discountCode || null,
          },
          eSimItem,
        });
        showMessage('eSIM topped up successfully!', 'info');
        return;
      }

      setShowSuccessModal(true);

      const payload = getEsimOrderPayload({
        eSimItem,
        deviceWalletId,
        discountCode,
        applyAsTopup,
        compatibleTopUpEsimId
      });
      const esimBody = { ...payload, payeeAddress: deviceWalletId };
      if (__DEV__) console.log('[Order] eSIM wallet body:', JSON.stringify(esimBody, null, 2));
      const orderData = await createOrder(esimBody);

      setOrderResponse(orderData);

      // Store purchased eSIM in SecureStore and reducer
      if (kokio.deviceUID) {
        await savePurchasedESIM(kokio.deviceUID, eSimItem, orderData);
      }

      setIsCheckoutLoading(false);
    } catch (err) {
      if (__DEV__) console.error("Checkout error:", err);
      const e = err as { code?: string; message?: string };
      const errCode = e.code;
      const errMessage = e.message;
      if (errCode === 'COUPON_INSUFFICIENT_BALANCE') {
        showMessage('Coupon has insufficient balance. Discount removed.', 'info');
        handleRemoveDiscount();
      } else if (errMessage) {
        if (__DEV__) console.error("Checkout failed:", errMessage);
      }
      setIsCheckoutLoading(false);
      setShowSuccessModal(false);
    }
  }, [
    eSimItem,
    discountCode,
    kokio?.userWallet,
    kokio?.deviceUID,
    savePurchasedESIM,
    applyAsTopup,
    compatibleTopUpEsimId,
    createTopupOrder,
    showMessage,
    handleRemoveDiscount,
  ]);

  const resetHelioState = useCallback(() => {
    setHelioChargeToken(null);
    setPendingHelioOrder(null);
    setHelioCorrelationId(null);
  }, []);

  const handleHelioComplete = useCallback((finalOrder: CreateOrderResponse | null) => {
    resetHelioState();
    setIsCheckoutLoading(false);
    setLoadingMessage('');
    if (finalOrder) {
      setOrderResponse(finalOrder);
      setShowSuccessModal(true);
    }
  }, [resetHelioState]);

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
              setLoadingMessage(s.replace(/_/g, ' ')),
            ).catch(() => null)
          : null;
        if (finalOrder?.installationDetails?.qrcode || finalOrder?.orderStatus === 'COMPLETED') {
          if (kokio.deviceUID) {
            await savePurchasedESIM(kokio.deviceUID, eSimItem, finalOrder!, cid);
          }
          handleHelioComplete(finalOrder);
        } else {
          setIsCheckoutLoading(false);
          setLoadingMessage('');
        }
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
  }, [kokio.deviceUID, eSimItem, savePurchasedESIM, handleHelioComplete]);

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
          eSimId: base.eSimId,
          coupon: base.coupon,
          isCryptoPayment: false as const,
        };
        if (__DEV__) console.log('[Order] fiat body:', JSON.stringify(fiatBody, null, 2));
        const { data: orderInit, correlationId } = await createFiatOrder(fiatBody);
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
              setLoadingMessage(s.replace(/_/g, ' ')),
            ).catch(() => orderInit)
          : orderInit;
        if (kokio.deviceUID) await savePurchasedESIM(kokio.deviceUID, eSimItem, finalOrder, correlationId);
        setOrderResponse(finalOrder);
        setIsCheckoutLoading(false);
        setShowSuccessModal(true);
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
          eSimId: base.eSimId,
          coupon: base.coupon,
          isCryptoPayment: true as const,
          payeeAddress: kokio.userWallet?.address,
          successRedirectUrl: Config.EXTERNAL_WALLET_CALLBACK,
        };
        if (__DEV__) console.log('[Order] external wallet body:', JSON.stringify(extBody, null, 2));
        const { data: orderInit, correlationId } = await createExternalWalletOrder(extBody);
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
    savePurchasedESIM,
    upsertOrderRecord,
    initPaymentSheet,
    presentPaymentSheet,
    confirmPaymentSheetPayment,
    showMessage,
    handleEsimCheckout,
    handleBrowserPay,
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

  const handleWalletModalClose = useCallback(() => {
    setShowWalletSetupModal(false);
  }, []);

  const handlePaymentMethodChange = useCallback(
    (value: string) => {
      if (value === RADIO_KEYS.E_SIM_WALLET) {
        if (kokio.userWallet) {
          setSelectedPaymentMethod(value);
        } else {
          setShowWalletSetupModal(true);
        }
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

  const handleRemoveDiscount = useCallback(() => {
    setIsDiscountApplied(false);
    setDiscountAmount(0);
    setDiscountCode("");
    setDiscountError("");
  }, []);

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
        {/* TODO: TOPUP , selection from  multiple eSIMs(if exists and comptabile) for top-up*/}
        {!isCheckingTopup && isTopupCompatible && (
          <View style={{ marginTop: 16 }}>
            <ThemedText>Apply as Top-up</ThemedText>
            <Text style={{ color: Theme.colors.foreground, marginTop: 4, marginBottom: 12 }}>
              Top up your existing eSIM instead of buying a new one
            </Text>
            <View style={styles.walletStatusRow}>
              <View style={styles.toggleLeftSide}>
                <ToggleSwitch
                  isOn={applyAsTopup}
                  onToggle={setApplyAsTopup}
                  onColor={Theme.colors.success}
                  offColor={Theme.colors.muted}
                  size="small"
                />
                <ThemedText style={{ marginLeft: 8 }}>
                  Apply this plan as a top-up
                </ThemedText>
              </View>
            </View>
            {applyAsTopup && compatibleEsims.length === 1 && compatibleTopUpEsimId && (
              <View style={styles.discountAppliedContainer}>
                <ThemedText style={styles.discountAppliedText}>
                  {`eSIM: ${compatibleTopUpEsimId.slice(0, 6)}...${compatibleTopUpEsimId.slice(-4)}`}
                </ThemedText>
              </View>
            )}
            {applyAsTopup && compatibleEsims.length > 1 && (
              <View style={{ marginTop: 8 }}>
                <ThemedText style={{ color: Theme.colors.muted, fontSize: 13, marginBottom: 6 }}>
                  Select eSIM to top up:
                </ThemedText>
                {compatibleEsims.map((r) => (
                  <TouchableOpacity
                    key={r.esimId}
                    onPress={() => setCompatibleTopUpEsimId(r.esimId)}
                    style={[
                      styles.discountAppliedContainer,
                      { marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
                      compatibleTopUpEsimId === r.esimId && { borderWidth: 1, borderColor: Theme.colors.success },
                    ]}
                  >
                    <ThemedText style={styles.discountAppliedText}>
                      {`${r.esimId.slice(0, 6)}...${r.esimId.slice(-4)}`}
                    </ThemedText>
                    {compatibleTopUpEsimId === r.esimId && (
                      <Ionicons name="checkmark-circle" size={18} color={Theme.colors.success} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
          <ActivityIndicator size="large" color={Theme.colors.secondary} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}

      <CheckoutSuccessModal
        visible={showSuccessModal}
        loading={isCheckoutLoading}
        onInstallESIM={handleInstallESIM}
      />

      <WalletSetupModal
        visible={showWalletSetupModal}
        onClose={handleWalletModalClose}
        onContinue={() => {
          // TODO: Loader for Wallet
          handleWalletModalClose();
          setSelectedPaymentMethod(RADIO_KEYS.E_SIM_WALLET);
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

const styles = StyleSheet.create({
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
    color: Theme.colors.foreground,
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
