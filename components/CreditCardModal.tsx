import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import CheckoutInput from "./amountInput/CheckoutInput";
import ToggleSwitch from "toggle-switch-react-native";
import { ThemedText } from "./ThemedText";
import { Theme } from "@/constants/Colors";

interface CreditCardModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (cardData: {
    cardName: string;
    nameOnCard: string;
    cardNumber: string;
    expiration: string;
    cvv: string;
    saveCard: boolean;
  }) => void;
}

const CreditCardModal: React.FC<CreditCardModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [cardName, setCardName] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  const handlePlaceOrder = () => {
    onSubmit({ cardName, nameOnCard, cardNumber, expiration, cvv, saveCard });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* <StatusBar translucent backgroundColor="transparent" /> */}
        <BlurView intensity={100} tint="dark" style={styles.blurBackground}>
          <View style={styles.container}>
            {/* <ScrollView contentContainerStyle={styles.content}> */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Image
                source={require("@/assets/images/close.png")}
                style={styles.closeIcon}
              />
            </TouchableOpacity>

            <ThemedText bold style={styles.title}>
              Credit Card Payment
            </ThemedText>

            <View style={styles.inputWrapper}>
              <CheckoutInput
                label="Card Name"
                value={cardName}
                onChangeText={setCardName}
              />
            </View>

            <Image
              source={require("@/assets/images/credit-cards.png")}
              style={styles.cardIcon}
            />

            <View style={styles.inputWrapper}>
              <CheckoutInput
                label="Name on Card"
                value={nameOnCard}
                onChangeText={setNameOnCard}
              />
            </View>

            <View style={styles.inputWrapper}>
              <CheckoutInput
                label="Card Number"
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="number-pad"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                <CheckoutInput
                  label="MM / YYYY"
                  value={expiration}
                  onChangeText={setExpiration}
                  maxLength={7}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <CheckoutInput
                  label="CVV"
                  value={cvv}
                  onChangeText={setCvv}
                  maxLength={4}
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.saveCardRow}>
              <ToggleSwitch
                isOn={saveCard}
                onToggle={setSaveCard}
                onColor="#30D158"
                offColor={Theme.colors.muted}
                size="small"
              />
              <ThemedText style={styles.saveCardText}>
                Save my card securely on this device
              </ThemedText>
            </View>

            <Text style={styles.securityTitle}>Learn More About Security</Text>
            <Text style={styles.securityText}>
              Stripe has been audited by a PCI-certified auditor and is
              certified to PCI Service Provider Level 1. This is the most
              stringent level of certification available in the payments
              industry.
            </Text>

            <Image
              source={require("@/assets/images/stripe.png")}
              style={styles.stripeLogo}
            />

            {/* </ScrollView> */}
            </View>
            </BlurView>
            <TouchableOpacity
              style={styles.placeOrderButton}
              onPress={handlePlaceOrder}
              >
              <ThemedText style={styles.placeOrderButtonText}>Place Order</ThemedText>
            </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  blurBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.56)",
  },
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 8,
    paddingTop: 40,
    paddingBottom: 32,
    minHeight: Dimensions.get("window").height * 0.90,
  },
  content: {
    paddingBottom: 60,
  },
  closeButton: {
    position: "absolute",
    right: 8,
    top: Platform.OS === "ios" ? 40 : 20,
  },
  title: {
    fontSize: 24,
    lineHeight: 26,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
    marginTop: Platform.OS === "ios" ? 40 : 16,
  },
  closeIcon: {
    height: 32,
    width: 32,
  },
  cardIcon: {
    height: 32,
    width: 200,
    resizeMode: "contain",
    marginBottom: 12,
    marginLeft: 16,
  },
  inputWrapper: {
    borderRadius: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    marginBottom: 12,
  },
  saveCardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  saveCardText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 14,
    flexShrink: 1,
  },
  securityTitle: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 4,
    fontSize: 15,
    marginTop: 16,
  },
  securityText: {
    color: "#BDBDBD",
    fontSize: 13,
    marginBottom: 8,
  },
  stripeButton: {
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 8,
    padding: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  stripeButtonText: {
    color: "#fff",
    fontSize: 13,
  },
  placeOrderButton: {
    backgroundColor: "#FFD600",
    borderRadius: 32,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 58,
    marginHorizontal: 18,
    marginBottom: Platform.OS === "ios" ? 10 : 16,
  },
  placeOrderButtonText: {
    color: "#191919",
    fontSize: 16,
  },
  stripeLogo: {
    height: 35,
    width: 128,
  },
});

export default CreditCardModal;
