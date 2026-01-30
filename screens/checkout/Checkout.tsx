import React, { useCallback, useMemo, useState } from "react";
import {
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
import DetailItem from "@/components/ui/DetailItem";
import Checkbox from "@/components/ui/Checkbox";
import AmountInput from "@/components/amountInput";
import { Esim } from "@/components/ESIMItem";
import { getEsimOrderPayload } from "@/helpers/esimOrder";
import { eSimOderCheckout, validateCoupon } from "@/services/esims";
import CheckoutSuccessModal from "@/components/ui/CheckoutSuccessModal";
import WalletSetupModal from "@/components/ui/WalletSetupModal";
import CreditCardModal from "@/components/CreditCardModal";

import { createRadioButtons } from "./checkout.helpers";
import { RADIO_KEYS } from "@/constants/checkout.constants";
import { useKokio } from "@/hooks/useKokio";
import { getSignClient } from "@/lib/reownWallet";
import { openBrowserAsync } from "expo-web-browser";

const BASE_CHAIN = "eip155:84532"; //base sepolia

const SCREEN_WIDTH = Dimensions.get("window").width;
const RADIO_WIDTH = SCREEN_WIDTH - 24;

function buildCheckoutMessage(params: { esimId: string; amount: number }) {
  return `
    KOKI'O External Wallet Checkout
    eSIM ID: ${params.esimId}
    Amount: ${params.amount} USD
    Timestamp: ${Date.now()}
    This signature authorizes this checkout.
    `;
}

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
  const [isDiscountApplied, setIsDiscountApplied] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [orderResponse, setOrderResponse] = useState<any>(null);
  const [discountError, setDiscountError] = useState<string>("");
  const [payViaExternalWallet, setPayViaExternalWallet] = useState(false);

  const radioButtons: RadioButtonProps[] = useMemo(
    () => createRadioButtons(selectedPaymentMethod, styles.buttonStyle),
    [selectedPaymentMethod]
  );

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
      setShowSuccessModal(true);

      const deviceWalletId = kokio.userWallet?.address || "";
      const payload = getEsimOrderPayload({
        eSimItem,
        deviceWalletId,
        discountCode,
      });
      console.log({ eSimItem });
      console.log("Order Api Payload", payload);

      const response = await eSimOderCheckout(payload);

      console.log("Order Api Response", response);

      if (response?.success && response?.data) {
        setOrderResponse(response.data);

        // Store purchased eSIM in SecureStore and reducer
        if (kokio.deviceUID) {
          await savePurchasedESIM(kokio.deviceUID, eSimItem, response.data);
        }
      } else {
        console.error("Checkout failed:", response?.message);
        setShowSuccessModal(false);
      }

      setIsCheckoutLoading(false);
    } catch (err) {
      console.error("Checkout error:", err);
      const { data } = err || {};
      if (data?.message) {
        console.error("Checkout failed:", data.message);
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
  ]);

  const handleExternalWalletCheckout = useCallback(async () => {
    try {
      setIsCheckoutLoading(true);

      const signClient = await getSignClient();

      const { uri, approval } = await signClient.connect({
        requiredNamespaces: {
          eip155: {
            chains: [BASE_CHAIN],
            methods: ["personal_sign"],
            events: [],
          },
        },
      });
      if (uri) {
        console.log("URI", uri);
        await openBrowserAsync(uri);
      }

      const session = await approval();

      const account = session.namespaces.eip155.accounts[0];
      const externalWalletAddress = account.split(":")[2];

      const message = buildCheckoutMessage({
        esimId: "test",
        amount: totalAmount,
      });

      const signature = await signClient.request({
        topic: session.topic,
        chainId: BASE_CHAIN,
        request: {
          method: "personal_sign",
          params: [message, externalWalletAddress],
        },
      });

      const payload = getEsimOrderPayload({
        eSimItem,
        deviceWalletId: "",
        discountCode: "",
      });

      const response = await eSimOderCheckout({
        ...payload,
        paymentMethod: "external_wallet",
        externalWalletAddress,
        signature,
      });

      if (!response?.success) {
        throw new Error("External wallet checkout failed");
      }

      setOrderResponse(response.data);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("External wallet checkout failed:", err);
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [eSimItem, totalAmount]);

  const handleCheckout = useCallback(async () => {
    console.log("handleCheckout triggered");

    // If credit card is selected, open the credit card modal instead of proceeding with checkout
    if (selectedPaymentMethod === RADIO_KEYS.CREDIT_CARD) {
      setShowCreditCardModal(true);
      return;
    }

    if (payViaExternalWallet) {
      console.log("Pay via external wallet selected");
      await handleExternalWalletCheckout();
      return;
    }

    console.log("Standard eSIM checkout");
    handleEsimCheckout();
  }, [payViaExternalWallet, handleExternalWalletCheckout, handleEsimCheckout]);

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
        console.log(kokio.userWallet?.address);
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
      console.log("Credit card data:", cardData);
      setShowCreditCardModal(false);

      // Now proceed with the actual checkout process
      handleEsimCheckout();
    },
    [handleEsimCheckout]
  );

  const handleDiscountCodeChange = useCallback((text: string) => {
    setDiscountCode(_toUpper(text));
  }, []);

  const handleApplyDiscount = useCallback(async () => {
    if (!_trim(discountCode)) return;

    try {
      // Clear previous error
      setDiscountError("");

      const response = await validateCoupon(discountCode);

      const couponBalance = _toNumber(response?.data?.balance || 0);
      const isValidCoupon = eSimItem.actualSellingPrice <= couponBalance;

      if (!isValidCoupon) {
        setDiscountError("Cannot sponsor the entire amount");
        setIsDiscountApplied(false);
        setDiscountAmount(0);
        return;
      }

      // Apply full discount (100% off)
      setIsDiscountApplied(true);
      setDiscountAmount(eSimItem.actualSellingPrice);
      console.log("Applying discount code:", discountCode);

      // Check if wallet is set up when applying discount
      if (!kokio.userWallet) {
        setShowWalletSetupModal(true);
        return;
      }
    } catch {
      setDiscountError("Invalid discount code");
      setIsDiscountApplied(false);
      setDiscountAmount(0);
      return;
    }
  }, [discountCode, eSimItem.actualSellingPrice, kokio.userWallet]);

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

    const hasDeviceWallet = !!kokio.userWallet;
    const hasDiscountOrExternal = isDiscountApplied || payViaExternalWallet;

    // Require device wallet and either a discount applied or external wallet toggle
    return hasDeviceWallet && hasDiscountOrExternal;
  }, [
    isESimEnabled,
    isCheckoutLoading,
    kokio.userWallet,
    isDiscountApplied,
    payViaExternalWallet,
  ]);

  return (
    <View style={styles.container}>
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
              placeholder="Enter discount code"
              placeholderTextColor={Theme.colors.muted}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              key={`apply-${discountCode?.length}`}
              style={[
                styles.applyButton,
                !_trim(discountCode) && { opacity: 0.5 },
              ]}
              onPress={handleApplyDiscount}
              disabled={!_trim(discountCode)}
            >
              <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
            </TouchableOpacity>
          </View>
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
                  <Ionicons name="close" size={16} color="#FF453A" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {discountError && (
            <View style={styles.discountErrorContainer}>
              <ThemedText style={styles.discountErrorText}>
                {discountError}
              </ThemedText>
            </View>
          )}
        </View>

        {/* External Wallet Toggle */}
        <View style={{ marginTop: 16 }}>
          <ThemedText>Pay directly via external wallet</ThemedText>
          <Text style={{ color: Theme.colors.foreground, marginTop: 12 }}>
            In alpha, use it to pay directly via external wallet.
          </Text>
          <View style={{ flexDirection: "row", marginVertical: 12 }}>
            <ToggleSwitch
              isOn={payViaExternalWallet}
              onToggle={setPayViaExternalWallet}
              onColor="#30D158"
              offColor={Theme.colors.muted}
              size="small"
            />
            <ThemedText style={{ marginLeft: 8 }}>
              Pay via external wallet
            </ThemedText>
          </View>
          {payViaExternalWallet && (
            <Text style={{ color: Theme.colors.foreground, marginTop: 8 }}>
              On placing order, you will be prompted to pay via your external
              wallet.
            </Text>
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          <ThemedText>Fund Device Wallet</ThemedText>
          <Text style={{ color: Theme.colors.foreground, marginTop: 12 }}>
            Speed up and secure your next eSIM purchase or top-up by funding
            your on-device eSIM crypto wallet.
          </Text>
          <View style={{ flexDirection: "row", marginVertical: 12 }}>
            <ToggleSwitch
              isOn={fundOnDeviceWallet}
              onToggle={setFundOnDeviceWallet}
              onColor="#30D158"
              offColor={Theme.colors.muted}
              size="small"
            />
            <ThemedText style={{ marginLeft: 8 }}>
              I'd like to also fund my on-device wallet
            </ThemedText>
          </View>
          {fundOnDeviceWallet && addAmountSection}
        </View>
      </KeyboardAwareScrollView>

      <TouchableOpacity
        key={`total-checkout-${canCheckout}`}
        style={[styles.bottomButtonContainer, !canCheckout && { opacity: 0.5 }]}
        onPress={canCheckout ? handleCheckout : undefined}
        disabled={!canCheckout}
      >
        <DetailItem
          prefix="Total "
          value={totalAmount}
          suffix="USD"
          containerStyles={styles.checkoutButton}
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
    backgroundColor: "#191919",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 16,
  },
  checkoutButton: {
    backgroundColor: Theme.colors.secondary,
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
    backgroundColor: "#7676803D",
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 0,
    marginVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  walletModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  walletModalContainer: {
    backgroundColor: "#2C2C2E",
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
    color: "#AEAEB2",
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
    backgroundColor: "#48484A",
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
    backgroundColor: "#FF9500",
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
    backgroundColor: "#7676803D",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    color: Theme.colors.foreground,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  applyButton: {
    backgroundColor: Theme.colors.secondary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  applyButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "600",
  },
  discountAppliedContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#30D15820",
    borderRadius: 8,
  },
  discountAppliedContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  discountAppliedText: {
    color: "#30D158",
    fontSize: 14,
  },
  removeDiscountButton: {
    padding: 4,
    backgroundColor: "#FF453A20",
    borderRadius: 32,
  },
  discountErrorContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#FF453A20",
    borderRadius: 8,
  },
  discountErrorText: {
    color: "#FF453A",
    fontSize: 14,
  },
});
