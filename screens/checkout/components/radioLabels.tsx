import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";

const ESimWallet = () => {
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>Device Wallet</ThemedText>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <ThemedText style={[styles.textContent, styles.smallText]}>
          Balance
        </ThemedText>
        <ThemedText style={styles.textContent}>0.00</ThemedText>
        <Image
          source={require("@/assets/images/usdc.png")}
          style={[styles.logoImage, { marginLeft: 8 }]}
        />
      </View>
    </View>
  );
};

const CreditCard = () => {
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>Credit Card</ThemedText>
      <Image
        source={require("@/assets/images/credit-cards.png")}
        style={styles.creditCards}
      />
    </View>
  );
};

const ApplePay = () => {
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>Apple Pay</ThemedText>
      <Image
        source={require("@/assets/images/apple-logo.png")}
        style={styles.logoImage}
      />
    </View>
  );
};

export { ESimWallet, ApplePay, CreditCard };

const styles = StyleSheet.create({
  labelContainer: {
    flex: 1,
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textContent: {
    color: Theme.colors.foreground,
  },
  smallText: {
    fontSize: 12,
    lineHeight: 20,
    marginRight: 4,
  },
  creditCards: {
    width: 140,
    height: 24,
    objectFit: "contain",
  },
  logoImage: {
    width: 24,
    height: 24,
    objectFit: "contain",
  },
});
