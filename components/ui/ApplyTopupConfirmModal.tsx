import React from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/constants/Colors";

interface ApplyTopupConfirmModalProps {
  visible: boolean;
  /** Display name of the existing eSIM this plan would be applied to. */
  esimLabel: string;
  onConfirm: () => void;
  onBuyNew: () => void;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: colors.contentBackground,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  iconRow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: "100%",
    opacity: 0.3,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.muted,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

export function ApplyTopupConfirmModal({ visible, esimLabel, onConfirm, onBuyNew }: ApplyTopupConfirmModalProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onBuyNew}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconRow}>
            <Ionicons name="swap-horizontal" size={28} color={colors.success} />
          </View>

          <ThemedText bold style={styles.title}>Apply as Top Up</ThemedText>

          <ThemedText style={styles.body}>
            {`Confirm to apply this plan as a top up on ${esimLabel}.`}
          </ThemedText>

          <View style={styles.divider} />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onBuyNew} accessibilityRole="button">
              <ThemedText style={styles.buttonText}>Buy a new eSIM</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onConfirm} accessibilityRole="button">
              <ThemedText style={styles.buttonText}>Confirm</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default ApplyTopupConfirmModal;
