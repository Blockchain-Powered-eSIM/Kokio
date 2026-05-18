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
import { Theme } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { BASE_SEPOLIA_TESTNET } from "@/constants/general.constants";
import { useKokio } from "@/hooks/useKokio";
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
  const [eoaAddress, setEoaAddress] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | undefined>(
    undefined
  );
  const modalRef = React.useRef<Modal>(null);
  const { kokio, setupKokioUserWallet } = useKokio();
  const { showMessage } = useToast();
  const textColor = useThemeColor({}, "text");
  const foregroundColor = useThemeColor({}, "foreground");
  const mutedColor = useThemeColor({}, "muted");

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

    const { deviceWalletAddress, deviceUID, userPasskey, rawSalt, sdk } = kokio;

    console.log('[wallet] handleContinue state:', {
      deviceWalletAddress: !!deviceWalletAddress,
      deviceUID: !!deviceUID,
      hasX: !!userPasskey?.x,
      hasY: !!userPasskey?.y,
      hasRawSalt: !!rawSalt,
      sdkReady: !!sdk,
    });

    if (!deviceWalletAddress || !userPasskey?.x || !userPasskey?.y || !rawSalt || !sdk) {
      console.warn('[wallet] guard failed — missing:', {
        deviceWalletAddress,
        x: userPasskey?.x,
        y: userPasskey?.y,
        rawSalt: !!rawSalt,
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
      const salt = BigInt(rawSalt);

      console.log('[wallet] getSmartWallet inputs:', {
        deviceUID,
        ownerKeyX: userPasskey.x,
        ownerKeyY: userPasskey.y,
        rawSalt,
        saltBigInt: salt.toString(),
        saltHex: '0x' + salt.toString(16).padStart(64, '0'),
        serverAddress: deviceWalletAddress,
      });

      const deviceWallet = await sdk.smartAccount.getSmartWallet(
        deviceUID,
        ownerKey,
        salt,
      );

      const deviceWalletClient = await sdk.smartAccount.getSmartWalletClient(deviceWallet);

      const sdkAddress = deviceWalletClient.account?.address;
      console.log('[wallet] getSmartWallet result:', {
        sdkAddress,
        serverAddress: deviceWalletAddress,
        match: sdkAddress?.toLowerCase() === deviceWalletAddress.toLowerCase(),
      });

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
    setEoaAddress("");
    setWalletAddress(undefined);
    onClose();
  }, [onClose]);

  const initialContent = useMemo(
    () => (
      <>
        <ThemedText bold style={[styles.title, { color: textColor }]}>
          Device Wallet
        </ThemedText>

        <Text style={[styles.description, { color: foregroundColor }]}>
          Press "Continue" to setup your device wallet.
        </Text>

        <View style={[styles.buttonContainer, { borderTopColor: mutedColor }]}>
          <TouchableOpacity style={[styles.laterButton, { borderRightColor: mutedColor }]} onPress={handleClose}>
            <Text style={[styles.laterButtonText, { color: foregroundColor }]}>Later</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={[styles.continueButtonText, { color: Theme.colors.primary }]}>Continue</Text>
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
        <Text style={[styles.loadingText, { color: foregroundColor }]}>
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
            <Text style={[styles.continueButtonText, { color: Theme.colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    ),
    [handleClose, handleContinue]
  );

  const handleRemindLater = useCallback(() => {
    setShowRecovery(false);
    setEoaAddress("");
    setWalletAddress(undefined);
    onClose();
  }, [onClose]);

  const onSaveEOA = useCallback(async () => {
    // TODO: save recovery EOA via Kokio API once endpoint is available
    if (!eoaAddress) return;
  }, [eoaAddress]);

  const handleDone = useCallback(() => {
    onSaveEOA();
    setShowRecovery(false);
    setEoaAddress("");
    onContinue();
  }, [onContinue, onSaveEOA]);

  const recoveryContent = useMemo(
    () => (
      <>
        <View style={[styles.warningContainer, { backgroundColor: Theme.colors.popover }]}>
          <MaterialCommunityIcons
            name="comment-alert"
            size={32}
            color={Theme.colors.primary}
            style={styles.warningIconTopRight}
          />
          <Text style={[styles.warningText, { color: textColor }]}>
            If you no longer have your device, you'll need this EOA to restore access to your wallet.
          </Text>
        </View>

        <View style={[styles.recoveryCard, { backgroundColor: Theme.colors.popover }]}>
          <ThemedText bold style={styles.recoveryTitle}>
            Wallet Recovery
          </ThemedText>

          <View style={styles.addressContainer}>
            <Text style={[styles.addressText, { color: foregroundColor }]}>Address: </Text>
            <TouchableOpacity
              style={styles.clickableAddressContainer}
              onPress={handleAddressPress}
              disabled={!walletAddress}
            >
              <Text style={[styles.addressText, { color: foregroundColor }]}>
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

          <Text style={[styles.recoveryDescription, { color: foregroundColor }]}>
            You may optionally provide an EOA for recovery
            purpose and to restore access to your device wallet
          </Text>

          <TextInput
            style={[styles.emailInput, { backgroundColor: Theme.colors.inputBackground, color: textColor }]}
            placeholder="EOA (Externally-owned Account)"
            placeholderTextColor={Theme.colors.accentForeground}
            value={eoaAddress}
            onChangeText={setEoaAddress}
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.recoveryButtonContainer}>
          <TouchableOpacity
            style={[styles.remindLaterButton, { borderColor: Theme.colors.primary }]}
            onPress={handleRemindLater}
          >
            <Text style={[styles.remindLaterText, { color: Theme.colors.primary }]}>Remind me later</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.doneButton, { backgroundColor: Theme.colors.primary }]} onPress={handleDone}>
            <Text style={[styles.doneButtonText, { color: Theme.colors.cardForeground }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </>
    ),
    [eoaAddress, handleRemindLater, handleDone, walletAddress]
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
        <View style={[styles.modalContainer, { backgroundColor: Theme.colors.walletModalBackground }]}>
          <KeyboardAvoidingView
            style={[styles.contentContainerWrapper]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View
              style={[
                styles.contentContainer,
                { backgroundColor: Theme.colors.popover },
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
  warningContainer: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  warningText: {
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  recoveryTitle: {
    fontSize: 18,
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
    fontSize: 14,
    marginRight: 8,
  },
  linkIcon: {
    marginLeft: 4,
  },
  recoveryDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  emailInput: {
    borderRadius: 8,
    padding: 12,
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
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
  },
  remindLaterText: {
    fontSize: 16,
    fontWeight: "500",
  },
  doneButton: {
    flex: 1,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  expandedContainer: {
    paddingTop: 20,
    backgroundColor: "transparent",
  },
});

export default WalletSetupModal;
