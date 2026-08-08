import React from "react";
import {
  TextInput,
  StyleSheet,
  View,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ThemedText } from "../ThemedText";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/constants/Colors";

interface CheckoutInputProps extends TextInputProps {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  blurContainer: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
  },
  inner: {
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    height: 72,
    justifyContent: "center",
  },
  label: {
    color: colors.accentForeground,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    color: colors.accentForeground,
    fontSize: 20,
    padding: 0,
    margin: 0,
    fontFamily: "Lexend",
  },
});

const CheckoutInput: React.FC<CheckoutInputProps> = ({
  label,
  containerStyle,
  value,
  ...props
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  return (
    <View style={[styles.inner, containerStyle]}>
      <ThemedText light style={styles.label}>{label}</ThemedText>
      <TextInput
        {...props}
        value={value}
        style={styles.input}
        placeholder=""
        placeholderTextColor={colors.foreground}
      />
    </View>
  );
};


export default CheckoutInput;
