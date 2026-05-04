import React, { useCallback } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";

interface CheckboxProps {
  checked: boolean;
  onChange: (newValue: boolean) => void;
}

const Checkbox = ({ checked, onChange }: CheckboxProps) => {
  const handleCheckboxChange = useCallback(() => {
    console.log(onChange, !checked);
    onChange(!checked);
  }, [onChange, checked]);

  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      style={styles.checkboxBase}
      onPress={handleCheckboxChange}
    >
      {checked && (
        <Ionicons
          name="checkmark-sharp"
          size={16}
          color={Colors.dark.mutedForeground}
        />
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
    backgroundColor: Colors.dark.background,
    borderColor: Colors.dark.mutedForeground,
  },
  checkboxPressed: {
    opacity: 0.8, // Adds a feedback effect on press
  },
});

export default Checkbox;
