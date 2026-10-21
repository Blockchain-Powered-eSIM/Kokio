import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/constants/Colors";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onRequestClose?: () => void;
  primaryColor?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  modalContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flex: 1,
  },
  contentContainer: {
    width: "80%",
    borderRadius: 20,
    paddingTop: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  buttonContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 28,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRightWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "400",
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export function ConfirmModal({
  visible, title, body, primaryLabel, secondaryLabel,
  onPrimary, onSecondary, onRequestClose, primaryColor, loading, children,
}: ConfirmModalProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const textColor = useThemeColor({}, "text");
  const foregroundColor = useThemeColor({}, "foreground");
  const mutedColor = useThemeColor({}, "muted");
  const accentColor = primaryColor ?? colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : (onRequestClose ?? onSecondary)}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.contentContainer, { backgroundColor: colors.popover }]}>
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            <Text style={[styles.body, { color: foregroundColor }]}>{body}</Text>
            {children}
            <View style={[styles.buttonContainer, { borderTopColor: mutedColor }]}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderRightColor: mutedColor }]}
                onPress={onSecondary}
                disabled={loading}
                accessibilityRole="button"
              >
                <Text style={[styles.secondaryButtonText, { color: foregroundColor }]}>{secondaryLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onPrimary}
                disabled={loading}
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <Text style={[styles.primaryButtonText, { color: accentColor }]}>{primaryLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default ConfirmModal;
