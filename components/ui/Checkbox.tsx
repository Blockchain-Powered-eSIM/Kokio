import React, { useCallback } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColor } from "@/hooks/useThemeColor";

interface CheckboxProps {
  checked: boolean;
  onChange: (newValue: boolean) => void;
  disabled?: boolean;
}

// Always white in both themes by design — unlike most surfaces, this isn't
// meant to follow the "card" token, which is intentionally yellow in dark mode.
const CHECKBOX_BACKGROUND = "#FFFFFF";

const Checkbox = ({ checked, onChange, disabled = false }: CheckboxProps) => {
  const border = useThemeColor({}, "mutedForeground");

  const handleCheckboxChange = useCallback(() => {
    if (disabled) return;
    onChange(!checked);
  }, [onChange, checked, disabled]);

  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      accessibilityState={{ checked, disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.checkboxBase,
        { backgroundColor: CHECKBOX_BACKGROUND, borderColor: border },
        disabled && styles.checkboxDisabled,
      ]}
      onPress={handleCheckboxChange}
    >
      {checked && (
        <Ionicons name="checkmark-sharp" size={16} color={border} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  checkboxBase: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 2,
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
});

export default Checkbox;
