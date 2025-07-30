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
        placeholderTextColor="#BDBDBD"
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
    backgroundColor: "rgba(58, 53, 31, 0.70)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    height: 72,
    justifyContent: "center",
  },
  label: {
    color: "rgba(142, 142, 147, 1)",
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    color: "rgba(142, 142, 147, 1)",
    fontSize: 20,
    padding: 0,
    margin: 0,
    fontFamily: "Lexend",
  },
});

export default CheckoutInput;
