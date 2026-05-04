import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import _sum from "lodash/sum";
import _trim from "lodash/trim";
import _subtract from "lodash/subtract";
import _toNumber from "lodash/toNumber";
import _toUpper from "lodash/toUpper";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import DetailItem from "@/components/ui/DetailItem";
import Checkbox from "@/components/ui/Checkbox";
import AmountInput from "@/components/amountInput";
import { Esim } from "@/components/ESIMItem";
import { getEsimOrderPayload } from "@/helpers/esimOrder";
import { createOrder } from "@/utils/bff/order";
import { useCouponLookup } from "@/hooks/useCouponLookup";
import * as SecureStore from "expo-secure-store";
import { useEsimCompatibility } from "@/hooks/useEsimCompatibility";
import { useCreateTopupOrder, ESIM_ID_KEY } from "@/hooks/useCreateOrder";
import { useToast } from "@/contexts/ToastContext";
import CheckoutSuccessModal from "@/components/ui/CheckoutSuccessModal";
import WalletSetupModal from "@/components/ui/WalletSetupModal";
import CreditCardModal from "@/components/CreditCardModal";

import { createRadioButtons } from "./checkout.helpers";
import { RADIO_KEYS } from "@/constants/checkout.constants";
import { useKokio } from "@/hooks/useKokio";

const SCREEN_WIDTH = Dimensions.get("window").width;
const RADIO_WIDTH = SCREEN_WIDTH - 24;

const Checkout = ({ currentBalance = 25 }: any) => {
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
  const [fundOnDeviceWallet, setFundOnDeviceWallet] = useState<boolean>(false);
  const [amount, setAmount] = useState<number | null>(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [showWalletSetupModal, setShowWalletSetupModal] = useState(false);
  const [showCreditCardModal, setShowCreditCardModal] = useState(false);
  const { kokio, savePurchasedESIM } = useKokio();
  const [discountCode, setDiscountCode] = useState<string>("");
  const [debouncedCode, setDebouncedCode] = useState<string>("");
  const [isDiscountApplied, setIsDiscountApplied] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [orderResponse, setOrderResponse] = useState<any>(null);
  const [discountError, setDiscountError] = useState<string>("");

  const radioButtons: RadioButtonProps[] = useMemo(
    () => createRadioButtons(selectedPaymentMethod, styles.buttonStyle),
    [selectedPaymentMethod]
  );

  const { showMessage } = useToast();
  const createTopupOrder = useCreateTopupOrder();

  // undefined = not yet read; null = read, no prior eSIM; string = prior eSIM address
  const [storedEsimId, setStoredEsimId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    SecureStore.getItemAsync(ESIM_ID_KEY).then(setStoredEsimId);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCode(discountCode), 500);
    return () => clearTimeout(timer);
  }, [discountCode]);

  const {
    data: coupon,
    isLoading: isCouponLoading,
    isError: isCouponError,
  } = useCouponLookup(debouncedCode, debouncedCode.length === 8);

  const { isLoading: isCheckingTopup, compatibleEsims } = useEsimCompatibility(
    { planId: eSimItem?.catalogueId, esimId: storedEsimId ?? undefined },
    { enabled: !!storedEsimId },
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

  const addAmountSection = useMemo(() => {
    return (
      <View>
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          <ThemedText
            style={{ color: Theme.colors.foreground, marginRight: 4 }}
          >
            Add this amount to my device wallet
          </ThemedText>
          <ThemedText style={{ color: Theme.colors.foreground }}>
            (1USD=1USDC)
          </ThemedText>
        </View>
        <AmountInput value={amount} onChangeValue={setAmount} />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <ThemedText style={{ color: Theme.colors.foreground }}>
            Current Balance
          </ThemedText>
          <ThemedText>{`${(currentBalance || 0).toFixed(2)}  USDC`}</ThemedText>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <ThemedText style={{ color: Theme.colors.foreground }}>
            Balance after
          </ThemedText>
          <ThemedText>
            {_sum([amount, currentBalance]).toFixed(2)} USDC
          </ThemedText>
        </View>
      </View>
    );
  }, [amount, currentBalance, setAmount]);

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
      const orderData = await createOrder(({
        ...payload,
        payeeAddress: deviceWalletId,
      }) as any);

      setOrderResponse(orderData);

      // Store purchased eSIM in SecureStore and reducer
      if (kokio.deviceUID) {
        await savePurchasedESIM(kokio.deviceUID, eSimItem, orderData);
      }

      setIsCheckoutLoading(false);
    } catch (err) {
      if (__DEV__) console.error("Checkout error:", err);
      const errCode = (err as any)?.code;
      const errMessage = (err as any)?.message;
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

  const handleCheckout = useCallback(async () => {
    if (selectedPaymentMethod === RADIO_KEYS.CREDIT_CARD) {
      setShowCreditCardModal(true);
      return;
    }
    handleEsimCheckout();
  }, [selectedPaymentMethod, handleEsimCheckout]);

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

  const handleCreditModalClose = useCallback(() => {
    setShowCreditCardModal(false);
  }, []);

  const handleCreditCardSubmit = useCallback(
    (cardData: {
      cardName: string;
      nameOnCard: string;
      cardNumber: string;
      expiration: string;
      cvv: string;
      saveCard: boolean;
    }) => {
      // TODO: Handle credit card submission
      setShowCreditCardModal(false);

      // Now proceed with the actual checkout process
      handleEsimCheckout();
    },
    [handleEsimCheckout]
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
    if (!isESimEnabled || isCheckoutLoading) return false;
    return !!kokio.userWallet && isDiscountApplied;
  }, [isESimEnabled, isCheckoutLoading, kokio.userWallet, isDiscountApplied]);

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
          containerStyles={[styles.checkoutButton, { backgroundColor: Theme.colors.secondary }]}
        />
      </TouchableOpacity>

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

      <CreditCardModal
        visible={showCreditCardModal}
        onClose={handleCreditModalClose}
        onSubmit={handleCreditCardSubmit}
      />
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
