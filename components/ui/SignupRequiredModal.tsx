import React from "react";
import { Modal, View, TouchableOpacity, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";

interface SignupRequiredModalProps {
  visible: boolean;
  onRelaunch: () => void;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    paddingTop: 0,
  },
  modalContainer: {
    alignItems: "center",
    width: "100%",
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.walletModalBackground,
  },
  contentContainer: {
    width: "80%",
    borderRadius: 20,
    paddingTop: 32,
    backgroundColor: colors.popover,
  },
  signupPromptContainer: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  singleButton: {
    alignSelf: "stretch",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  singleButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

// Same "Please sign-up to proceed" prompt used at checkout (WalletSetupModal's
// signupPromptContent) — extracted so Create Wallet can show it as a popup
// too, instead of a full-screen takeover.
const SignupRequiredModal: React.FC<SignupRequiredModalProps> = ({ visible, onRelaunch }) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRelaunch}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.contentContainer}>
            <View style={styles.signupPromptContainer}>
              <ThemedText bold style={styles.errorTitle}>
                Please sign-up to proceed
              </ThemedText>
              <TouchableOpacity
                style={[styles.singleButton, { backgroundColor: colors.primary }]}
                onPress={onRelaunch}
              >
                <ThemedText style={[styles.singleButtonText, { color: colors.cardForeground }]}>
                  Let&apos;s go
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SignupRequiredModal;
