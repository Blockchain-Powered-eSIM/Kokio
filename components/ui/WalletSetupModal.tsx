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
import * as Updates from "expo-updates";
import { type Hex } from "viem";
import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/constants/Colors";
import { BASE_SEPOLIA_TESTNET } from "@/constants/general.constants";
import { useKokio } from "@/hooks/useKokio";
import { useToast } from "@/contexts/ToastContext";
import { AuthError } from "@/utils/auth/errors";
import { logger } from '@/utils/logger';

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
  signupPromptContainer: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
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

const WalletSetupModal: React.FC<WalletSetupModalProps> = ({
  visible,
  onClose,
  onContinue,
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
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
        logger.error('BROWSER_OPEN_FAILED', { error });
      }
    }
  }, [walletAddress]);

  const handleContinue = useCallback(async () => {
    setIsLoading(true);
    setShowRetry(false);

    const { deviceWalletAddress, deviceUID, userPasskey, rawSalt, sdk } = kokio;

    logger.debug('WALLET_CONTINUE_STATE', {
      deviceWalletAddress: !!deviceWalletAddress,
      deviceUID: !!deviceUID,
      hasX: !!userPasskey?.x,
      hasY: !!userPasskey?.y,
      hasRawSalt: !!rawSalt,
      sdkReady: !!sdk,
    });

    if (!deviceWalletAddress || !userPasskey?.x || !userPasskey?.y || !rawSalt || !sdk) {
      // These fields only ever come from completing passkey signup, never from
      // wallet deployment itself — missing them means the user hasn't signed
      // up yet (e.g. cancelled out of first-launch auth), not that deployment
      // failed. Send them to sign up instead of the generic failure/retry loop.
      logger.warn('WALLET_SETUP_GUARD_FAILED — Missing', {
        deviceWalletAddress,
        x: userPasskey?.x,
        y: userPasskey?.y,
        rawSalt: !!rawSalt,
        sdk: !!sdk,
      });
      setShowSignupPrompt(true);
      setIsLoading(false);
      return;
    }

    try {
      setWalletAddress(deviceWalletAddress);

      // Reconstruct the smart account from the stored P-256 public key.
      // This computes the same counterfactual address the server derived at registration.
      const ownerKey: [Hex, Hex] = [userPasskey.x, userPasskey.y];
      const salt = BigInt(rawSalt);

      logger.debug('GET_SMART_WALLET_INPUTS', {
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
      logger.debug('GET_SMART_WALLET_RESULT', {
        sdkAddress,
        serverAddress: deviceWalletAddress,
        match: sdkAddress?.toLowerCase() === deviceWalletAddress.toLowerCase(),
      });

      // A no-op userOp that includes the initCode on first send, deploying the contract.
      // This triggers Passkey.get() inside the SDK's _stamp() — the biometric prompt.
      /**
       * ERROR SIGNATURE HERE
       * components/ui/WalletSetupModal.tsx:307:50 - error TS2345: Argument of type '{ uo: { target: `0x${string}`; data: "0x"; value: bigint; }; overrides: { preVerificationGas: number; }; }' is not assignable to parameter of type 'SendUserOperationParameters<SmartContractAccount | undefined, UserOperationContext | undefined, keyof EntryPointRegistryBase<unknown>>'.
       * Property 'account' is missing in type '{ uo: { target: `0x${string}`; data: "0x"; value: bigint; }; overrides: { preVerificationGas: number; }; }' but required in type '{ account: SmartContractAccount<string, keyof EntryPointRegistryBase<unknown>>; }'.
       * 307       await deviceWalletClient.sendUserOperation({                                            ~
       * 308         uo: {
       *          ~~~~~~~~~~~~~
       *          ... 
       * 313              overrides: { preVerificationGas: 0xeeee },
       *          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       * 314       });
       *          ~~~~~~~
       *
       * node_modules/@aa-sdk/core/dist/types/account/smartContractAccount.d.ts:29:50
       * 29     account: TAccountOverride;
       *        ~~~~~~~
       *        'account' is declared here.
       *        components/ui/WalletSetupModal.tsx:309:19 - error TS18048: 'deviceWalletClient.account' is possibly 'undefined'.
       * 309           target: deviceWalletClient.account.address,
       */
      // @ts-expect-error Ownership with wallet features (ideally protected against empty accounts, but should be explicit)
      await deviceWalletClient.sendUserOperation({
        uo: {
          // error TS18048: 'deviceWalletClient.account' is possibly 'undefined'
          // @ts-expect-error
          target: deviceWalletClient.account.address,
          data: '0x',
          value: 0n,
        },
        overrides: { preVerificationGas: 0xeeee },
      });

      await setupKokioUserWallet(deviceUID, deviceWallet);
      setShowRecovery(true);
    } catch (err: unknown) {
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
  }, [kokio, setupKokioUserWallet, showMessage]);

  const handleClose = useCallback(() => {
    setIsLoading(false);
    setShowRecovery(false);
    setShowRetry(false);
    setShowSignupPrompt(false);
    setEoaAddress("");
    setWalletAddress(undefined);
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
          Please wait while your wallet is being deployed...
        </Text>
      </View>
    ),
    // styles have their own memo watching for changes based on theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const signupPromptContent = useMemo(
    () => (
      <View style={styles.signupPromptContainer}>
        <ThemedText bold style={[styles.errorTitle, { color: textColor }]}>
          Please sign-up to proceed
        </ThemedText>
        <TouchableOpacity
          style={[styles.singleButton, { backgroundColor: colors.primary }]}
          onPress={handleRelaunch}
        >
          <Text style={[styles.singleButtonText, { color: colors.cardForeground }]}>
            Let&apos;s go
          </Text>
        </TouchableOpacity>
      </View>
    ),
    // styles have their own memo watching for changes based on theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleRelaunch, textColor]
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

  const handleRemindLater = useCallback(() => {
    setShowRecovery(false);
    setEoaAddress("");
    setWalletAddress(undefined);
    onClose();
  }, [onClose]);

  const onSaveEOA = useCallback(async () => {
    // No BFF endpoint exists yet to persist a recovery EOA (see docs/tasks.md
    // for the backend ask) — don't let the user believe it was saved when it
    // wasn't; tell them plainly instead of silently closing as if it succeeded.
    if (!eoaAddress) return;
    showMessage("Recovery address saving isn't available yet — it wasn't saved. This will be added in a future update.", 'info');
  }, [eoaAddress, showMessage]);

  const handleDone = useCallback(() => {
    onSaveEOA();
    setShowRecovery(false);
    setEoaAddress("");
    onContinue();
  }, [onContinue, onSaveEOA]);

  const recoveryContent = useMemo(
    () => (
      <>
        <View style={[styles.warningContainer, { backgroundColor: colors.popover }]}>
          <MaterialCommunityIcons
            name="comment-alert"
            size={32}
            color={colors.primary}
            style={styles.warningIconTopRight}
          />
          <Text style={[styles.warningText, { color: textColor }]}>
            If you no longer have your device, you&#39;ll need this EOA to restore access to your wallet.
          </Text>
        </View>

        <View style={[styles.recoveryCard, { backgroundColor: colors.popover }]}>
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
                  color={colors.foreground}
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
            style={[styles.emailInput, { backgroundColor: colors.inputBackground, color: textColor }]}
            placeholder="EOA (Externally-owned Account)"
            placeholderTextColor={mutedColor}
            value={eoaAddress}
            onChangeText={setEoaAddress}
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.recoveryButtonContainer}>
          <TouchableOpacity
            style={[styles.remindLaterButton, { borderColor: colors.primary }]}
            onPress={handleRemindLater}
          >
            <Text style={[styles.remindLaterText, { color: colors.primary }]}>Remind me later</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.primary }]} onPress={handleDone}>
            <Text style={[styles.doneButtonText, { color: colors.cardForeground }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </>
    ),
    // styles have their own memo watching for changes based on theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eoaAddress, handleAddressPress, handleRemindLater, handleDone, walletAddress, foregroundColor]
  );

  const renderContent = () => {
    if (isLoading) return loadingContent;
    if (showSignupPrompt) return signupPromptContent;
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


export default WalletSetupModal;
