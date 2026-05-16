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
import { Theme } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";

interface CheckoutSuccessModalProps {
  visible: boolean;
  loading?: boolean;
  onClose?: () => void;
  onInstallESIM: () => void;
}

const CheckoutSuccessModal: React.FC<CheckoutSuccessModalProps> = ({
  visible,
  loading = false,
  onClose = () => {},
  onInstallESIM,
}) => {
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
  }, [visible, loading]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const loadingContent = useMemo(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={90} color={Theme.colors.highlight} />
        <ThemedText style={styles.loadingText}>Placing your order.</ThemedText>
        <ThemedText style={styles.loadingSubText}>
          Do not go back or close the app while loading...
        </ThemedText>
      </View>
    ),
    []
  );

  const successContent = useMemo(
    () => (
      <>
        <Animated.View style={[styles.successIcon, animatedIconStyle]}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={42}
            color={Theme.colors.success}
          />
        </Animated.View>

        <ThemedText bold style={[styles.title, { color: textColor }]}>
          Transaction Successful
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textColor }]}>
          It's now time to install your newly purchased eSIM.
        </ThemedText>

        <ThemedText style={styles.description}>
          If you are not abroad yet, no worries, the eSIM will only activate
          once connected to your destination network.
        </ThemedText>
      </>
    ),
    [animatedIconStyle]
  );

  const installButton = useMemo(
    () => (
      <TouchableOpacity style={[styles.installButton, { backgroundColor: Theme.colors.shopCta }]} onPress={onInstallESIM}>
        <ThemedText style={[styles.installButtonText, { color: Theme.colors.cardForeground }]}>Install eSIM</ThemedText>
      </TouchableOpacity>
    ),
    [onInstallESIM]
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
        <View style={[styles.modalContainer, { backgroundColor: Theme.colors.modalBackground }]}>
          <View style={styles.contentContainerWrapper}>
            <View style={[styles.contentContainer, { backgroundColor: Theme.colors.contentBackground }]}>
              {loading ? loadingContent : successContent}
            </View>
          </View>

          {!loading && installButton}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
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

export default CheckoutSuccessModal;
