import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Text,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { openBrowserAsync } from "expo-web-browser";
import { type Hex } from "viem";
import { ThemedText } from "@/components/ThemedText";
import { BASE_SEPOLIA_TESTNET } from "@/constants/general.constants";
import { useKokio } from "@/hooks/useKokio";
import { useToast } from "@/contexts/ToastContext";
import { AuthError } from "@/utils/auth/errors";

// Salt used for smart account CREATE2 deployment - must match the value used at registration time.
const DEVICE_WALLET_SALT = 25042025n;

interface WalletSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
}

// Utility function to format wallet address
const formatWalletAddress = (
  address: string | undefined,
  startLength = 4,
  endLength = 4
) => {
  if (!address) return "";
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

const WalletSetupModal: React.FC<WalletSetupModalProps> = ({
  visible,
  onClose,
  onContinue,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [email, setEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | undefined>(
    undefined
  );
  const modalRef = React.useRef<Modal>(null);
  const { kokio, setupKokioUserWallet } = useKokio();
  const { showMessage } = useToast();

  const handleAddressPress = useCallback(async () => {
    if (walletAddress) {
      const url = `${BASE_SEPOLIA_TESTNET}/${walletAddress}`;
      try {
        await openBrowserAsync(url);
      } catch (error) {
        console.error("Error opening browser:", error);
      }
    }
  }, [walletAddress]);

  const handleContinue = useCallback(async () => {
    setIsLoading(true);
    setShowRetry(false);

    const { deviceWalletAddress, deviceUID, userPasskey, sdk } = kokio;

    console.log('[wallet] handleContinue state:', {
      deviceWalletAddress: !!deviceWalletAddress,
      deviceUID: !!deviceUID,
      hasX: !!userPasskey?.x,
      hasY: !!userPasskey?.y,
      sdkReady: !!sdk,
    });

    if (!deviceWalletAddress || !userPasskey?.x || !userPasskey?.y || !sdk) {
      console.warn('[wallet] guard failed — missing:', {
        deviceWalletAddress,
        x: userPasskey?.x,
        y: userPasskey?.y,
        sdk: !!sdk,
      });
      setShowRetry(true);
      setIsLoading(false);
      return;
    }

    try {
      setWalletAddress(deviceWalletAddress);

      // Reconstruct the smart account from the stored P-256 public key.
      // This computes the same counterfactual address the server derived at registration.
      const ownerKey: [Hex, Hex] = [userPasskey.x, userPasskey.y];
      const deviceWallet = await sdk.smartAccount.getSmartWallet(
        deviceUID,
        ownerKey,
        DEVICE_WALLET_SALT,
      );

      const deviceWalletClient = await sdk.smartAccount.getSmartWalletClient(deviceWallet);

      // A no-op userOp that includes the initCode on first send, deploying the contract.
      // This triggers Passkey.get() inside the SDK's _stamp() — the biometric prompt.
      await deviceWalletClient.sendUserOperation({
        uo: {
          target: deviceWalletClient.account.address,
          data: '0x',
          value: 0n,
        },
        overrides: { preVerificationGas: 0xeeee },
      });

      await setupKokioUserWallet(deviceUID, deviceWallet);
      setShowRecovery(true);
    } catch (err: unknown) {
      console.error('[wallet] deployment error:', err);
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
  }, [kokio, setupKokioUserWallet, showMessage]);

  const handleClose = useCallback(() => {
    setIsLoading(false);
    setShowRecovery(false);
    setShowRetry(false);
    setEmail("");
    setWalletAddress(undefined);
    onClose();
  }, [onClose]);

  const initialContent = useMemo(
    () => (
      <>
        <ThemedText bold style={styles.title}>
          Device Wallet
        </ThemedText>

        <Text style={styles.description}>
          Press "Continue" to setup your device wallet.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.laterButton} onPress={handleClose}>
            <Text style={styles.laterButtonText}>Later</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </>
    ),
    [handleClose, handleContinue]
  );

  const loadingContent = useMemo(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={90} color={Theme.colors.primary} />
        <Text style={styles.loadingText}>
          Please wait while your wallet is being deployed...
        </Text>
      </View>
    ),
    []
  );

  const retryContent = useMemo(
    () => (
      <>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={60}
            color={Theme.colors.destructive}
            style={styles.errorIcon}
          />
          <ThemedText bold style={styles.errorTitle}>
            Wallet Creation Failed
          </ThemedText>
          <Text style={styles.errorDescription}>
            There was an error creating your wallet. Please try again.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.laterButton} onPress={handleClose}>
            <Text style={styles.laterButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    ),
    [handleClose, handleContinue]
  );

  const handleRemindLater = useCallback(() => {
    setShowRecovery(false);
    setEmail("");
    setWalletAddress(undefined);
    onClose();
  }, [onClose]);

  const onChangeUserEmail = useCallback(async () => {
    // TODO: save recovery email via Kokio API once endpoint is available
    if (!email) return;
  }, [email]);

  const handleDone = useCallback(() => {
    // if email is provided, save it for recovery purpose
    onChangeUserEmail();
    setShowRecovery(false);
    setEmail("");
    onContinue();
  }, [onContinue]);

  const recoveryContent = useMemo(
    () => (
      <>
        <View style={styles.warningContainer}>
          <MaterialCommunityIcons
            name="comment-alert"
            size={32}
            color={Theme.colors.primary}
            style={styles.warningIconTopRight}
          />
          <Text style={styles.warningText}>
            If you no longer have your device, you'll need this email address or
            EOA to restore access to your wallet.
          </Text>
        </View>

        <View style={styles.recoveryCard}>
          <ThemedText bold style={styles.recoveryTitle}>
            Wallet Recovery
          </ThemedText>

          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>Address: </Text>
            <TouchableOpacity
              style={styles.clickableAddressContainer}
              onPress={handleAddressPress}
              disabled={!walletAddress}
            >
              <Text style={styles.addressText}>
                {formatWalletAddress(walletAddress)}
              </Text>
              {walletAddress && (
                <MaterialIcons
                  name="open-in-new"
                  size={16}
                  color={Theme.colors.foreground}
                  style={styles.linkIcon}
                />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.recoveryDescription}>
            You may optionally provide an email address or EOA for recovery
            purpose and to restore access to your device wallet
          </Text>

          <TextInput
            style={styles.emailInput}
            placeholder="Email id"
            placeholderTextColor={Theme.colors.accentForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.recoveryButtonContainer}>
          <TouchableOpacity
            style={styles.remindLaterButton}
            onPress={handleRemindLater}
          >
            <Text style={styles.remindLaterText}>Remind me later</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </>
    ),
    [email, handleRemindLater, handleDone, walletAddress]
  );

  const renderContent = () => {
    if (isLoading) return loadingContent;
    if (showRetry) return retryContent;
    if (showRecovery) return recoveryContent;
    return initialContent;
  };

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
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={[styles.contentContainerWrapper]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View
              style={[
                styles.contentContainer,
                showRecovery && styles.expandedContainer,
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Theme.colors.overlay,
    paddingTop: 0,
  },
  modalContainer: {
    backgroundColor: Theme.colors.modalBackground,
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
    backgroundColor: Theme.colors.background,
    borderRadius: 20,
    paddingTop: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: Theme.colors.text,
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: Theme.colors.foreground,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 48,
  },
  buttonContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Theme.colors.muted,
    marginTop: 28,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: Theme.colors.muted,
  },
  laterButtonText: {
    color: Theme.colors.foreground,
    fontSize: 16,
    fontWeight: "400",
  },
  continueButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  continueButtonText: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: Theme.colors.foreground,
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
    color: Theme.colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  errorDescription: {
    fontSize: 14,
    color: Theme.colors.foreground,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  warningContainer: {
    flexDirection: "row",
    backgroundColor: Theme.colors.background,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  warningText: {
    color: Theme.colors.text,
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  warningIconTopRight: {
    position: "absolute",
    top: -12,
    right: 14,
    zIndex: 1,
  },
  recoveryCard: {
    backgroundColor: Theme.colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  recoveryTitle: {
    fontSize: 18,
    color: Theme.colors.text,
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  clickableAddressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressText: {
    color: Theme.colors.foreground,
    fontSize: 14,
    marginRight: 8,
  },
  linkIcon: {
    marginLeft: 4,
  },
  recoveryDescription: {
    color: Theme.colors.foreground,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  emailInput: {
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    color: Theme.colors.text,
    fontSize: 16,
  },
  recoveryButtonContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  remindLaterButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
  },
  remindLaterText: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  doneButton: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
  },
  doneButtonText: {
    color: Theme.colors.cardForeground,
    fontSize: 16,
    fontWeight: "600",
  },
  expandedContainer: {
    paddingTop: 20,
    backgroundColor: "transparent",
  },
});

export default WalletSetupModal;
