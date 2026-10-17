import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/constants/Colors";
import { useToast } from "@/contexts/ToastContext";
import { AuthError } from "@/utils/auth/errors";
import { useWalletDeployment, MissingSignupDataError } from "@/hooks/useWalletDeployment";
import { logger } from '@/utils/logger';
import SignupRequiredModal from "@/components/ui/SignupRequiredModal";

interface WalletSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
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
  },
  contentContainerWrapper: {
    flex: 1,
    justifyContent: "center",
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
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 48,
  },
  buttonContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 28,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRightWidth: 1,
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: "400",
  },
  continueButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },
  errorContainer: {
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  errorDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
});

const WalletSetupModal: React.FC<WalletSetupModalProps> = ({
  visible,
  onClose,
  onContinue,
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);
  const [showSubmitted, setShowSubmitted] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const modalRef = React.useRef<Modal>(null);
  const { deployDeviceWallet } = useWalletDeployment();
  const { showMessage } = useToast();
  const textColor = useThemeColor({}, "text");
  const foregroundColor = useThemeColor({}, "foreground");
  const mutedColor = useThemeColor({}, "muted");

  const handleContinue = useCallback(async () => {
    setIsLoading(true);
    setShowRetry(false);

    try {
      const result = await deployDeviceWallet();
      if (result.status === 'already_deployed') {
        // Already confirmed on-chain right now - nothing more to show,
        // close straight back to checkout with the device wallet selected.
        onContinue();
        return;
      }
      setShowSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof MissingSignupDataError) {
        setShowSignupPrompt(true);
        return;
      }
      logger.error('WALLET_DEPLOYMENT_FAILED', { err });
      const message = err instanceof AuthError
        ? err.userMessage
        : err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      showMessage(message, 'error');
      setShowRetry(true);
    } finally {
      setIsLoading(false);
    }
  }, [deployDeviceWallet, onContinue, showMessage]);

  const handleClose = useCallback(() => {
    setIsLoading(false);
    setShowSubmitted(false);
    setShowRetry(false);
    setShowSignupPrompt(false);
    onClose();
  }, [onClose]);

  // Step-up only signs an already-registered user back in — it can't help
  // someone who never completed passkey signup. Relaunching restarts the JS
  // context from scratch, which is what actually gets them back in front of
  // the auth modal (it auto-expands on mount whenever state.authenticated is
  // still false).
  const handleRelaunch = useCallback(() => {
    handleClose();
    Updates.reloadAsync().catch((err) => {
      logger.error('APP_RELOAD_FAILED', { err });
    });
  }, [handleClose]);

  const initialContent = useMemo(
    () => (
      <>
        <ThemedText bold style={[styles.title, { color: textColor }]}>
          Device Wallet
        </ThemedText>

        <Text style={[styles.description, { color: foregroundColor }]}>
          Press &quot;Continue&quot; to setup your device wallet.
        </Text>

        <View style={[styles.buttonContainer, { borderTopColor: mutedColor }]}>
          <TouchableOpacity style={[styles.laterButton, { borderRightColor: mutedColor }]} onPress={handleClose}>
            <Text style={[styles.laterButtonText, { color: foregroundColor }]}>Later</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={[styles.continueButtonText, { color: colors.primary }]}>Continue</Text>
          </TouchableOpacity>
        </View>
      </>
    ),
    // styles have their own memo watching for changes based on theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleClose, handleContinue, foregroundColor, textColor]
  );

  const loadingContent = useMemo(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={90} color={colors.primary} />
        <Text style={[styles.loadingText, { color: foregroundColor }]}>
          Requesting your wallet...
        </Text>
      </View>
    ),
    // styles have their own memo watching for changes based on theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [foregroundColor]
  );

  const retryContent = useMemo(
    () => (
      <>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={60}
            color={colors.destructive}
            style={styles.errorIcon}
          />
          <ThemedText bold style={[styles.errorTitle, { color: textColor }]}>
            Wallet Creation Failed
          </ThemedText>
          <Text style={[styles.errorDescription, { color: foregroundColor }]}>
            There was an error creating your wallet. Please try again.
          </Text>
        </View>

        <View style={[styles.buttonContainer, { borderTopColor: mutedColor }]}>
          <TouchableOpacity style={[styles.laterButton, { borderRightColor: mutedColor }]} onPress={handleClose}>
            <Text style={[styles.laterButtonText, { color: foregroundColor }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={[styles.continueButtonText, { color: colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    ),
    // styles have their own memo watching for changes based on theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleClose, handleContinue, foregroundColor, textColor]
  );

  const handleSubmittedDone = useCallback(() => {
    setShowSubmitted(false);
    onContinue();
  }, [onContinue]);

  const submittedContent = useMemo(
    () => (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={60}
          color={colors.primary}
          style={styles.errorIcon}
        />
        <ThemedText bold style={[styles.errorTitle, { color: textColor }]}>
          Wallet request submitted
        </ThemedText>
        <Text style={[styles.errorDescription, { color: foregroundColor }]}>
          This can take a few minutes to complete on-chain. Feel free to keep browsing, we will let you know once it is ready.
        </Text>
        <View style={[styles.buttonContainer, { borderTopColor: mutedColor, marginTop: 20 }]}>
          <TouchableOpacity style={styles.continueButton} onPress={handleSubmittedDone}>
            <Text style={[styles.continueButtonText, { color: colors.primary }]}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    // styles have their own memo watching for changes based on theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSubmittedDone, foregroundColor, textColor]
  );

  const renderContent = () => {
    if (isLoading) return loadingContent;
    if (showRetry) return retryContent;
    if (showSubmitted) return submittedContent;
    return initialContent;
  };

  if (showSignupPrompt) {
    return <SignupRequiredModal visible={visible} onRelaunch={handleRelaunch} />;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
      ref={modalRef}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.walletModalBackground }]}>
          <KeyboardAvoidingView
            style={[styles.contentContainerWrapper]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View
              style={[
                styles.contentContainer,
                { backgroundColor: colors.popover },
              ]}
            >
              {renderContent()}
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};


export default WalletSetupModal;
