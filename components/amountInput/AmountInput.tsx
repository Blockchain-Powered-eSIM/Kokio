import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import CurrencyInput from "react-native-currency-input";

import { ThemedText } from "../ThemedText";
import { Theme } from "@/constants/Colors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CONTAINER_WIDTH = SCREEN_WIDTH - 24;

const AmountInput = ({
  value,
  onChangeValue,
}: {
  value: number | null;
  onChangeValue: (num: number | null) => void;
}) => {
  return (
    <View style={styles.buttonStyle}>
      <View>
        <ThemedText style={styles.labelText}>Amount</ThemedText>
        <CurrencyInput
          value={value}
          onChangeValue={onChangeValue}
          minValue={0}
          precision={0}
          delimiter=","
          separator="."
          style={styles.input}
        />
      </View>
      <View>
        <ThemedText style={styles.labelText}>Token</ThemedText>
        <View style={{ flexDirection: "row" }}>
          <ThemedText>USDC</ThemedText>
          <Image
            source={require("@/assets/images/usdc.png")}
            style={[styles.logoImage, { marginLeft: 8 }]}
          />
        </View>
      </View>
    </View>
  );
};

export default AmountInput;

const styles = StyleSheet.create({
  labelText: {
    color: Theme.colors.foreground,
    fontSize: 14,
  },
  buttonStyle: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: CONTAINER_WIDTH,
    backgroundColor: Theme.colors.inputBackground,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 0,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    fontSize: 18,
    color: Theme.colors.text,
  },
  logoImage: {
    width: 24,
    height: 24,
    objectFit: "contain",
  },
});
