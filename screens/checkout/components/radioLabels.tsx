import React from "react";
import { Image, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";

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

const ESimWallet = () => {
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>Device Wallet</ThemedText>
      <ThemedText style={[styles.textContent, styles.smallText]}>
        Coming soon
      </ThemedText>
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

const ExternalWallet = () => {
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>External Wallet</ThemedText>
      <Image
        source={require("@/assets/images/usdc.png")}
        style={[styles.logoImage, { marginLeft: 8 }]}
      />
    </View>
  );
};

const ExternalWalletBrowser = () => {
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>External Wallet (via Moonpay)</ThemedText>
      <Image
        source={require("@/assets/images/usdc.png")}
        style={[styles.logoImage, { marginLeft: 8 }]}
      />
    </View>
  );
};

export { ESimWallet, ApplePay, CreditCard, ExternalWallet, ExternalWalletBrowser };
