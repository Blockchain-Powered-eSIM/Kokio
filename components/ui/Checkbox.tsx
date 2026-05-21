import React, { useCallback } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColor } from "@/hooks/useThemeColor";

interface CheckboxProps {
  checked: boolean;
  onChange: (newValue: boolean) => void;
}

const Checkbox = ({ checked, onChange }: CheckboxProps) => {
  const bg = useThemeColor({}, "card");
  const border = useThemeColor({}, "mutedForeground");

  const handleCheckboxChange = useCallback(() => {
    console.log(onChange, !checked);
    onChange(!checked);
  }, [onChange, checked]);

  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      style={[styles.checkboxBase, { backgroundColor: bg, borderColor: border }]}
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
  checkboxPressed: {
    opacity: 0.8, // Adds a feedback effect on press
  },
});

export default Checkbox;
