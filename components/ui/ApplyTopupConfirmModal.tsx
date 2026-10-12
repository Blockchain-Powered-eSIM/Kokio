import React from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useThemedStyles } from "@/hooks/useThemedStyles";
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
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    backgroundColor: colors.contentBackground,
  },
  title: {
    fontSize: 17,
    lineHeight: 23,
    textAlign: "center",
    color: colors.foreground,
    marginBottom: 20,
  },
  confirmButton: {
    borderRadius: 32,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.primary,
    marginBottom: 10,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  buyNewButton: {
    borderRadius: 32,
    paddingVertical: 12,
    alignItems: "center",
  },
  buyNewButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
  },
});

export function ApplyTopupConfirmModal({ visible, esimLabel, onConfirm, onBuyNew }: ApplyTopupConfirmModalProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onBuyNew} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ThemedText style={styles.title}>
            {`Confirm to apply this plan as a top up on ${esimLabel}`}
          </ThemedText>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} accessibilityRole="button">
            <ThemedText style={styles.confirmButtonText}>Confirm</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyNewButton} onPress={onBuyNew} accessibilityRole="button">
            <ThemedText style={styles.buyNewButtonText}>Buy a new eSIM</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default ApplyTopupConfirmModal;
