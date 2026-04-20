import React from "react";
import {
  TextInput,
  StyleSheet,
  View,
  Text,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ThemedText } from "../ThemedText";
import { Theme } from "@/constants/Colors";

interface CheckoutInputProps extends TextInputProps {
  label: string;
  style?: StyleProp<ViewStyle>;
}

const CheckoutInput: React.FC<CheckoutInputProps> = ({
  label,
  style,
  value,
  ...props
}) => {
  return (
    <View style={styles.inner}>
      <ThemedText light style={styles.label}>{label}</ThemedText>
      <TextInput
        {...props}
        value={value}
        style={styles.input}
        placeholder=""
        placeholderTextColor={Theme.colors.foreground}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
  },
  inner: {
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    height: 72,
    justifyContent: "center",
  },
  label: {
    color: Theme.colors.accentForeground,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    color: Theme.colors.accentForeground,
    fontSize: 20,
    padding: 0,
    margin: 0,
    fontFamily: "Lexend",
  },
});

export default CheckoutInput;
