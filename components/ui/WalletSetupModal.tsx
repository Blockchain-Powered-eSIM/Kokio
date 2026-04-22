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
import { SmartContractAccount } from "@aa-sdk/core";
import { ThemedText } from "@/components/ThemedText";
import { BASE_SEPOLIA_TESTNET } from "@/constants/general.constants";
import { useKokio } from "@/hooks/useKokio";
import { useTurnkey } from "@turnkey/sdk-react-native";
import { useToast } from "@/contexts/ToastContext";
import { AuthError } from "@/utils/auth/errors";

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
  const { updateUser } = useTurnkey();
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

    const address = kokio.deviceWalletAddress;
    if (!address) {
      setShowRetry(true);
      setIsLoading(false);
      return;
    }

    try {
      setWalletAddress(address);
      await setupKokioUserWallet(
        kokio.deviceUID,
        { address } as unknown as SmartContractAccount
      );
      setShowRecovery(true);
    } catch (err: unknown) {
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
  }, [kokio.deviceWalletAddress, kokio.deviceUID, setupKokioUserWallet, showMessage]);

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
        <ActivityIndicator size={90} color="#FF9500" />
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
            color="#FF3B30"
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
    if (!email) return;
    try {
      return await updateUser({ email });
    } catch (e) {
      showMessage("Failed to save recovery email. You can update it later in settings.", "error");
    }
  }, [email, showMessage]);

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
            color="#FF9500"
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
                  color="#AEAEB2"
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
            placeholderTextColor="#8E8E93"
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingTop: 0,
  },
  modalContainer: {
    backgroundColor: "rgba(60, 60, 60, 0.9)",
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
    backgroundColor: "#242427",
    borderRadius: 20,
    paddingTop: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: "#AEAEB2",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 48,
  },
  buttonContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#48484A",
    marginTop: 28,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#48484A",
  },
  laterButtonText: {
    color: "#AEAEB2",
    fontSize: 16,
    fontWeight: "400",
  },
  continueButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#FF9500",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#AEAEB2",
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
    color: "white",
    textAlign: "center",
    marginBottom: 12,
  },
  errorDescription: {
    fontSize: 14,
    color: "#AEAEB2",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  warningContainer: {
    flexDirection: "row",
    backgroundColor: "#242427",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  warningText: {
    color: "white",
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
    backgroundColor: "#242427",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  recoveryTitle: {
    fontSize: 18,
    color: "white",
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
    color: "#AEAEB2",
    fontSize: 14,
    marginRight: 8,
  },
  linkIcon: {
    marginLeft: 4,
  },
  recoveryDescription: {
    color: "#AEAEB2",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  emailInput: {
    backgroundColor: "#7676803D",
    borderRadius: 8,
    padding: 12,
    color: "white",
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
    borderColor: "#FF9500",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
  },
  remindLaterText: {
    color: "#FF9500",
    fontSize: 16,
    fontWeight: "500",
  },
  doneButton: {
    flex: 1,
    backgroundColor: "#FF9500",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
  },
  doneButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "600",
  },
  expandedContainer: {
    paddingTop: 20,
    backgroundColor: "transparent",
  },
});

export default WalletSetupModal;
