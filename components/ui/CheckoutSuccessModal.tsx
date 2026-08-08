import React, { useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/constants/Colors";

interface CheckoutSuccessModalProps {
  visible: boolean;
  loading?: boolean;
  onClose?: () => void;
  variant?: "install" | "topup";
  onInstallESIM?: () => void;
  onDone?: () => void;
  /** Label of the plan just purchased, e.g. "United Arab Emirates · 7 Days · 1GB" — topup variant only. */
  topupFromLabel?: string;
  /** Label of the existing eSIM the top-up was applied to — topup variant only. */
  topupToLabel?: string;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    paddingTop: 0,
  },
  modalContainer: {
    paddingHorizontal: 16,
    alignItems: "center",
    width: "100%",
    flex: 1,
  },
  contentContainerWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  contentContainer: {
    width: "80%",
    borderRadius: 20,
    padding: 24,
    paddingTop: 32,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 22,
  },
  loadingSubText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  successIcon: {
    borderRadius: 24,
    position: "absolute",
    top: -22,
    right: 30,
    zIndex: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  installButton: {
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: "100%",
    marginBottom: 16,
  },
  installButtonText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

const CheckoutSuccessModal: React.FC<CheckoutSuccessModalProps> = ({
  visible,
  loading = false,
  onClose = () => {},
  variant = "install",
  onInstallESIM,
  onDone,
  topupFromLabel,
  topupToLabel,
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const isDark = useTheme();
  const textColor = useThemeColor({}, "text");

  const scale = useSharedValue(0);

  useEffect(() => {
    if (visible && !loading) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 200 }),
        withRepeat(
          withSequence(
            withTiming(1.1, { duration: 800 }),
            withTiming(1, { duration: 800 })
          ),
          -1,
          true
        )
      );
    } else {
      scale.value = 0;
    }
  }, [visible, loading, scale]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const loadingContent = useMemo(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={90} color={colors.highlight} />
        <ThemedText style={styles.loadingText}>Placing your order.</ThemedText>
        <ThemedText style={styles.loadingSubText}>
          Do not go back or close the app while loading...
        </ThemedText>
      </View>
    ),
    // All missing dependencies are of style attributes which are in their on useMemo() call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const successContent = useMemo(
    () => (
      <>
        <Animated.View style={[styles.successIcon, animatedIconStyle]}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={42}
            color={colors.success}
          />
        </Animated.View>

        <ThemedText bold style={[styles.title, { color: textColor }]}>
          {variant === "topup" ? "Top-up Successful" : "Transaction Successful"}
        </ThemedText>

        {variant === "topup" ? (
          <ThemedText style={[styles.subtitle, { color: textColor }]}>
            {`Top-up of ${topupFromLabel ?? "your new plan"} is applied to ${topupToLabel ?? "your eSIM"}.`}
          </ThemedText>
        ) : (
          <>
            <ThemedText style={[styles.subtitle, { color: textColor }]}>
              It&#39;s now time to install your newly purchased eSIM.
            </ThemedText>

            <ThemedText style={styles.description}>
              If you are not abroad yet, no worries, the eSIM will only activate
              once connected to your destination network.
            </ThemedText>
          </>
        )}
      </>
    ),
    // All missing dependencies are of style attributes which are in their on useMemo() call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [animatedIconStyle, textColor, variant, topupFromLabel, topupToLabel]
  );

  const actionButton = useMemo(
    () => (
      <TouchableOpacity
        style={[styles.installButton, { backgroundColor: colors.shopCta }]}
        onPress={variant === "topup" ? onDone : onInstallESIM}
      >
        <ThemedText style={[styles.installButtonText, { color: colors.cardForeground }]}>
          {variant === "topup" ? "Done" : "Install eSIM"}
        </ThemedText>
      </TouchableOpacity>
    ),
    // All missing dependencies are of style attributes which are in their on useMemo() call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onInstallESIM, onDone, variant]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: isDark ? colors.modalBackground : "transparent" }]}>
          <View style={styles.contentContainerWrapper}>
            <View style={[styles.contentContainer, { backgroundColor: colors.contentBackground }]}>
              {loading ? loadingContent : successContent}
            </View>
          </View>

          {!loading && actionButton}
        </View>
      </View>
    </Modal>
  );
};


export default CheckoutSuccessModal;
