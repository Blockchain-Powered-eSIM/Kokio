import React, { useMemo } from "react";
import {
  TextInput,
  StyleSheet,
  View,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ThemedText } from "../ThemedText";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";

interface CheckoutInputProps extends TextInputProps {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const createStyles = () => StyleSheet.create({
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

const CheckoutInput: React.FC<CheckoutInputProps> = ({
  label,
  containerStyle,
  value,
  ...props
}) => {
  const { isDark } = useTheme();
  // TODO: Fix the theming engine to deprecate this usage pattern
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styles = useMemo(() => createStyles(), [isDark]);
  return (
    <View style={[styles.inner, containerStyle]}>
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


export default CheckoutInput;
