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
import { WalletConnectModal } from "@walletconnect/modal-react-native";
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

import * as Linking from "expo-linking";
import { createRadioButtons } from "./checkout.helpers";
import { RADIO_KEYS } from "@/constants/checkout.constants";
import { useKokio } from "@/hooks/useKokio";
import { getSignClient } from "@/lib/reownWallet";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { WC_BASE_SEPOLIA } from "@/constants/general.constants";
import { AppExtraConfig } from "@/appKeys";
import Constants from "expo-constants";
import { keccak256 } from "viem";
import { checkEsimTopUpCompatibility } from "@/services/esims";

const extra = Constants.expoConfig?.extra as AppExtraConfig;
const SCREEN_WIDTH = Dimensions.get("window").width;
const RADIO_WIDTH = SCREEN_WIDTH - 24;

const Checkout = ({ currentBalance = 25 }: any) => {
  const { item: eSimDetails } = useLocalSearchParams();
  const {
    isConnecting,
    externalAddress,
    payViaExternalWallet,
    connectExternalWallet,
    disconnectExternalWallet
  } = useWalletConnect();

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

  const radioButtons: RadioButtonProps[] = useMemo(
    () => createRadioButtons(selectedPaymentMethod, styles.buttonStyle),
    [selectedPaymentMethod]
  );

  const [isCheckingTopup, setIsCheckingTopup] = useState(false);
  const [isTopupCompatible, setIsTopupCompatible] = useState(false);
  const [applyAsTopup, setApplyAsTopup] = useState(false);
  const [compatibleTopUpEsimId, setCompatibleTopUpEsimId] = useState<string | undefined>();

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
        applyAsTopup,
        compatibleTopUpEsimId
      });
      console.log({ eSimItem });
      console.log("Order Api Payload", { ...payload, payeeAddress: deviceWalletId });

      const response = await eSimOderCheckout({
        ...payload,
        payeeAddress: deviceWalletId,
      });

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
    applyAsTopup,
    compatibleTopUpEsimId,
  ]);

  const payWithUSDC = async (params: {
    amountInUsd: number;
    fromAddress: string;
    topic: string;
  }) => {
    // TODO: Update to mainnet during production
    const BASE_SEPOLIA_USDC_ADDRESS = "0x6Ac3aB54Dc5019A2e57eCcb214337FF5bbD52897";
    const toAddress = extra.kokioVaultAddress || "0x";
    const chainId = WC_BASE_SEPOLIA;
    const { amountInUsd, fromAddress, topic } = params;
    const signClient = await getSignClient();

    // Converting to USDC Units (6 decimals)
    // Eg: 10.50 USD -> 10,500,000 units
    const usdcAmount = BigInt(Math.floor(amountInUsd * 1e6));

    // Encode ERC-20 Data
    // Padding address to 64 chars and amount to 64 chars
    const formattedAddress = toAddress.replace("0x", "").toLowerCase().padStart(64, "0");
    const cleanAmount = usdcAmount.toString(16).padStart(64, "0");
    const transferFunc = "transfer(address,uint256)";
    const functionHash = (keccak256(Buffer.from(transferFunc))).slice(0, 10);
    
    const transactionData = `${functionHash}${formattedAddress}${cleanAmount}`;

    console.log("--- Initiating External Transaction ---");
    console.log("Wallet Address:", fromAddress);
    console.log("To (Kokio vault): ", extra.kokioVaultAddress);
    console.log(`${amountInUsd}USD ==>${cleanAmount}`);

    // 3. Request Transaction
    return await signClient.request({
      topic,
      chainId,
      request: {
        method: "eth_sendTransaction",
        params: [{
          from: fromAddress,
          to: BASE_SEPOLIA_USDC_ADDRESS, 
          data: transactionData,
          value: "0x0", 
        }],
      },
    });
  };

  const handleExternalWalletCheckout = useCallback(async () => {
    try {
      setIsCheckoutLoading(true);

      const signClient = await getSignClient();
      const sessions = signClient.session.getAll();
      if (sessions.length === 0 || !externalAddress) {
        // TODO: remove alert
        alert("No active wallet session. Please reconnect your wallet.");
        return;
      }

      const activeSession = sessions[0];
      // Trigger deeplink to the wallet app
      const redirect = activeSession.peer.metadata.redirect?.native;
      if (redirect) {
        await Linking.openURL(redirect);
      }

      const transactionHash = await payWithUSDC({
        amountInUsd: totalAmount as number,
        fromAddress: externalAddress,
        topic: activeSession.topic
      });

      console.log("--- Transaction Successful ---");
      console.log("Transaction Hash:", transactionHash);

      setShowSuccessModal(true);

      const payload = getEsimOrderPayload({
        eSimItem,
        deviceWalletId: kokio.userWallet?.address,
        discountCode: "",
        applyAsTopup,
        compatibleTopUpEsimId
      });                
      
      
      console.log('handleExternalWalletCheckout > getEsimOrderPayload',{ 
        ...payload,
        paymentMethod: "external_wallet", 
        payeeAddress: externalAddress,
        txnHash: transactionHash, 
        paymentVia: "USDC", 
      })

      const response = await eSimOderCheckout({
        ...payload,
        paymentMethod: "external_wallet", // NEEDED ?
        payeeAddress: externalAddress,
        txnHash: transactionHash, // Pass hash to backend
        paymentVia: "USDC", // change to ETH, USDC, USDT accordingly NEEDED ?
        tokenName: "USDC",
        network: "BASE"
      });

      if (response?.success && response?.data) {
        setOrderResponse(response.data);

        // Store purchased eSIM so it appears on the Home screen
        if (kokio.deviceUID) {
          await savePurchasedESIM(kokio.deviceUID, eSimItem, response.data);
        }
      } else {
        console.error("Backend validation failed:", response?.message);
      }

    } catch (err: any) {
      // TODO: add error handling, maybe error pop-up
      console.log("Full Error Object:", JSON.stringify(err, null, 2));
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [totalAmount, externalAddress, kokio.userWallet, discountCode, applyAsTopup, compatibleTopUpEsimId]);

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

  // Check compatibility on mount
  useEffect(() => {
    const checkCompatibility = async () => {
      const deviceId = kokio.userWallet?.address;
      const planId = eSimItem?.catalogueId;

      if (!deviceId || !planId) return;

      setIsCheckingTopup(true);
      try {
        const response = await checkEsimTopUpCompatibility({
          deviceId,
          planId,
        });

        const data = response?.data;
        const compatibleResult = data?.results?.find(
          (r: any) => r.compatible && !r.checkError
        );
        const isCompatible = !!data?.topupPlanResolved && !!compatibleResult;

        setIsTopupCompatible(isCompatible);
        if (compatibleResult) {
          setCompatibleTopUpEsimId(compatibleResult.esimId);
        }
     } catch (err) {
        console.log("Compatibility check failed:", JSON.stringify(err, null, 2));
        setIsTopupCompatible(false);
      } finally {
        setIsCheckingTopup(false);
      }
    };

    checkCompatibility();
  }, [kokio.userWallet?.address, eSimItem]);

  // const canCheckout = useMemo(
  //   () =>
  //     isESimEnabled &&
  //     selectedPaymentMethod &&
  //     totalAmount === 0 &&
  //     !isCheckoutLoading,
  //   [isESimEnabled, selectedPaymentMethod, totalAmount, isCheckoutLoading]
  // );

  const canCheckout = useMemo(() => {
    if (!isESimEnabled || isCheckoutLoading || isConnecting) return false;

    const hasDeviceWallet = !!kokio.userWallet;
    const hasDiscountOrExternal = isDiscountApplied || payViaExternalWallet;

    // Require device wallet and either a discount applied or external wallet toggle
    return hasDeviceWallet && hasDiscountOrExternal;
  }, [
    isESimEnabled,
    isCheckoutLoading,
    isConnecting,
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

        {/* Top-up compatibility */}
        {isCheckingTopup && (
          <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
            <ActivityIndicator size="small" color={Theme.colors.foreground} />
            <ThemedText style={{ marginLeft: 8, color: Theme.colors.muted }}>
              Checking top-up compatibility…
            </ThemedText>
          </View>
        )}
        {!isCheckingTopup && isTopupCompatible && (
          <View style={{ marginTop: 16 }}>
            <ThemedText>Apply as Top-up</ThemedText>
            <Text style={{ color: Theme.colors.foreground, marginTop: 4, marginBottom: 12 }}>
              Existing eSIM compatible. Apply it as a top-up instead of a new purchase.
            </Text>
            <View style={styles.walletStatusRow}>
              <View style={styles.toggleLeftSide}>
                <ToggleSwitch
                  isOn={applyAsTopup}
                  onToggle={setApplyAsTopup}
                  onColor="#30D158"
                  offColor={Theme.colors.muted}
                  size="small"
                />
                <ThemedText style={{ marginLeft: 8 }}>
                  Apply this plan as a top-up
                </ThemedText>
              </View>
            </View>
            {applyAsTopup && compatibleTopUpEsimId && (
              <View style={styles.discountAppliedContainer}>
                <ThemedText style={styles.discountAppliedText}>
                  Will top-up eSIM: {`${compatibleTopUpEsimId.slice(0, 6)}...${compatibleTopUpEsimId.slice(-4)}`}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* External Wallet Toggle */}
        <View style={{ marginTop: 16 }}>
          <ThemedText>Pay directly via external wallet</ThemedText>
          <Text style={{ color: Theme.colors.foreground, marginTop: 4, marginBottom: 12 }}>
            In alpha, use it to pay directly via external wallet.
          </Text>
          
          <View style={styles.walletStatusRow}>
            {/* This container ensures the toggle and label stay left-aligned */}
            <View style={styles.toggleLeftSide}>
              <ToggleSwitch
                isOn={payViaExternalWallet}
                onToggle={async (isOn) => {
                  if (isOn) {
                    await connectExternalWallet();
                  } else {
                    await disconnectExternalWallet();
                  }
                }}
                onColor="#30D158"
                offColor={Theme.colors.muted}
                size="small"
                disabled={isConnecting}
              />
              {isConnecting ? (
                <ActivityIndicator
                size="small"
                color={Theme.colors.secondary}
                style={{ marginLeft: 8 }}
                />
              ) : (
              <ThemedText style={{ marginLeft: 8 }}>
                Pay via external wallet
              </ThemedText>
              )}
            </View>

            {/* The Badge remains on the far right */}
            {payViaExternalWallet && externalAddress ? (
              <View style={styles.addressBadge}>
                <View style={styles.greenDot} />
                <ThemedText style={styles.addressText}>
                  {`${externalAddress.slice(0, 6)}...${externalAddress.slice(-4)}`}
                </ThemedText>
              </View>
            ) : null}
          </View>
          
          {payViaExternalWallet && (
            <Text style={{ color: Theme.colors.muted, marginTop: 8, fontSize: 12 }}>
              On placing order, you will be prompted to pay via your external wallet.
            </Text>
          )}
        </View>

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
              onColor="#30D158"
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
    backgroundColor: "transparent",
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
  toggleWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3A3A3C",
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#30D158",
    marginRight: 6,
    shadowColor: "#30D158",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  addressText: {
    fontSize: 12,
    color: "#AEAEB2",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
