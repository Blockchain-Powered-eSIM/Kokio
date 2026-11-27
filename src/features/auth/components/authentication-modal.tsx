import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { DEVICE_WALLET_ADDRESS_KEY } from "@/lib/storage/keys";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useBottomInset } from "@/hooks/use-bottom-inset";
import { isAccountDeletedCached, subscribeAccountDeleted } from '@/lib/auth/account-deleted';
import { useAuthRelay } from "@/hooks/use-auth-relayer";
import { useIsReturningUser } from "../hooks/use-is-returning-user";
import { createStyles } from "../authentication-modal-styles";
import { ThemedText } from "@/components/themed-text";
import { useKokio } from "@/hooks/use-kokio";
import { BlurView } from "expo-blur";
import { Easing } from "react-native-reanimated";
import { useTheme } from "@/providers/theme-context";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useColors } from "@/hooks/use-colors";
import { logger } from '@/lib/logger';

type AuthMode = "choice" | "authenticating" | "error";

export function AuthenticationModal() {
  const { isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const bottomInset = useBottomInset(20);

  const [mode, setMode] = useState<AuthMode>("choice");
  const [accountDeleted, setAccountDeleted] = useState(isAccountDeletedCached());
  const [localError, setLocalError] = useState("");
  const sheetRef = useRef<BottomSheet>(null);

  const { state, loginWithPasskey, signUpWithPasskey, recoverWithPasskey, clearError } =
    useAuthRelay();
  const { kokio, setupKokioRegistration, setupKokioRecovery, clearKokioUser } =
    useKokio();
  
  const resetErrors = useCallback(() => {
    clearError();
    setLocalError("");
  }, [clearError]);

  const isReturningUser = useIsReturningUser(kokio.deviceWalletAddress);

  useEffect(() => subscribeAccountDeleted(setAccountDeleted), []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={1}
        disappearsOnIndex={-1}
        pressBehavior={"none"}
      >
        <BlurView
          intensity={100}
          tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterial"}
          blurMethod="none"
          style={{ flex: 1, overflow: "hidden" }}
        />
      </BottomSheetBackdrop>
    ),
    [isDark]
  );

  const handleNewUser = useCallback(async () => {
    resetErrors();
    setMode("authenticating");
    let succeeded = false;
    try {
      const data = await signUpWithPasskey({});
      logger.debug('AUTH_SIGNUP_RESULT', data ? { deviceWalletAddress: data.deviceWalletAddress } : null);
      if (data) {
        await setupKokioRegistration(
          data.deviceWalletAddress,
          data.deviceUniqueIdentifier,
          data.credentialId,
          data.publicKeyX,
          data.publicKeyY,
          data.rawSalt ?? ""
        );
        succeeded = true;
        sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
      }
    } catch (e) {
      logger.error('AUTH_SIGNUP_FAILED', { err: e });
    } finally {
      if (!succeeded) setMode("error");
    }
  }, [signUpWithPasskey, setupKokioRegistration, resetErrors]);

  const handleExistingUser = useCallback(async () => {
    resetErrors();
    setMode("authenticating");
    let succeeded = false;
    try {
      const effectiveAddress =
        kokio.deviceWalletAddress ||
        (await SecureStore.getItemAsync(DEVICE_WALLET_ADDRESS_KEY));
      logger.debug('AUTH_EXISTING_PATH', { path: effectiveAddress ? 'login' : 'recover' });

      if (effectiveAddress) {
        const result = await loginWithPasskey();
        logger.debug('AUTH_LOGIN_RESULT', { result });
        if (result === "success") {
          succeeded = true;
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
        } else if (result === "no-credential") {
          // Passkey deleted — fall back to recovery
          await clearKokioUser();
          resetErrors();
          const recovered = await recoverWithPasskey();
          if (recovered && recovered !== "cancelled") {
            await setupKokioRecovery(
              recovered.deviceWalletAddress,
              recovered.credentialId
            );
            succeeded = true;
            sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
          }
        }
      } else {
        let recovered = await recoverWithPasskey();
        logger.debug('AUTH_RECOVER_RESULT', { recovered });
        // Retry once on a failure, but not when the user cancelled the prompt.
        if (recovered === null) {
          recovered = await recoverWithPasskey();
          logger.debug('AUTH_RECOVER_RESULT', { recovered });
        }
        if (recovered && recovered !== "cancelled") {
          await setupKokioRecovery(
            recovered.deviceWalletAddress,
            recovered.credentialId
          );
          succeeded = true;
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
        } else if (recovered === null) {
          // No discoverable Kokio passkey on this device: it never registered,
          // or the passkey was deleted from the password manager.
          setLocalError(
            "No Kokio passkey found on this device. Tap New User to create an account."
          );
        }
      }
    } catch (e) {
      logger.error('AUTH_LOGIN_FAILED', { err: e });
    } finally {
      if (!succeeded) setMode("error");
    }
  }, [
    loginWithPasskey,
    recoverWithPasskey,
    kokio,
    setupKokioRecovery,
    clearKokioUser,
    resetErrors,
  ]);

  useEffect(() => {
    if (state.authenticated) {
      sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
    } else {
      // This component stays mounted for the app's lifetime — the sheet is only
      // expanded/closed, never unmounted — so `mode` from a prior attempt
      // (e.g. left at "authenticating" after a successful login) would
      // otherwise leak into the next time the modal reopens (e.g. on logout).
      // TODO: Fix this lint error
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetErrors();
      setMode("choice");
      sheetRef.current?.expand({ duration: 250, easing: Easing.in(Easing.quad) });
    }
    // resetErrors intentionally omitted: it's recreated every provider render
    // and including it would re-trigger this effect (and re-animate the
    // sheet) on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.authenticated]);

  useEffect(() => {
    // TODO: Fix this lint error
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.error) setMode("error");
  }, [state.error]);

  const loadingContent = (
    <View style={styles.loadingContainer}>
      <ActivityIndicator
        size={70}
        style={styles.loadingImage}
        color={colors.highlight}
      />
      {mode === "authenticating" && (
        <ThemedText style={[styles.loadingText, { color: colors.foreground }]}>
          Authenticating...
        </ThemedText>
      )}
    </View>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      handleComponent={null}
      enablePanDownToClose={false}
      animateOnMount={true}
      style={{ borderRadius: 25, flex: 1 }}
      backgroundStyle={{ backgroundColor: colors.modalBackground }}
    >
      <BottomSheetView style={{ alignItems: "center", flex: 1, paddingTop: 20, paddingHorizontal: 20, paddingBottom: bottomInset }}>
        <Image
          source={require("@/assets/images/kokio-text.png")}
          style={styles.kokioImage}
        />
        <ThemedText style={[styles.authRequiredText, { color: colors.text }]}>
          {accountDeleted ? "Account Deleted" : "Authentication Required"}
        </ThemedText>

        {accountDeleted ? (
          <>
            <ThemedText style={[styles.deletedBody, { color: colors.foreground }]}>
              This account has been deleted and cannot be restored. If your Kokio passkey
              is still on this device, remove it from your password manager as it no longer
              grants access to anything.
            </ThemedText>
            <ThemedText style={[styles.deletedBody, { color: colors.foreground }]}>
              To use Kokio again, create a new account. This generates a new passkey and a
              new wallet.
            </ThemedText>

            {mode === "authenticating" ? (
              loadingContent
            ) : (
              <View style={styles.loginButtonRow}>
                {/* handleNewUser — not signUpWithPasskey directly: it supplies the
                    {} argument and runs setupKokioRegistration, and its success path
                    clears the deleted flag via clearAccountDeleted(). */}
                <Pressable style={styles.loginButton} onPress={handleNewUser}>
                  <Text style={styles.primaryButtonText}>Create New Account</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <>
            <ThemedText style={[styles.authSubtext, { color: colors.foreground }]}>
              {mode === "authenticating"
                ? "Verifying your identity…"
                : isReturningUser === null
                ? "Checking this device…"
                : isReturningUser
                ? "Log in to continue"
                : "Choose how to get started"}
            </ThemedText>

            {mode === "authenticating" || isReturningUser === null ? (
              loadingContent
            ) : isReturningUser ? (
              <View style={styles.loginButtonRow}>
                <Pressable style={styles.loginButton} onPress={handleExistingUser}>
                  <Text style={styles.primaryButtonText}>Log In</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                <Pressable style={styles.primaryButton} onPress={handleNewUser}>
                  <Text style={styles.primaryButtonText}>New User</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleExistingUser}>
                  <Text style={styles.secondaryButtonText}>Existing User</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {mode === "error" && !!(localError || state.error) && (
          <Text style={styles.errorText}>{localError || state.error}</Text>
        )}

        <Pressable
          disabled={mode === "authenticating"}
          onPress={() => {
            resetErrors();
            setMode("choice");
            sheetRef.current?.close({
              duration: 250,
              easing: Easing.out(Easing.quad),
            });
          }}
          style={{ alignSelf: "flex-start", marginTop: 32, marginBottom: 32 }}
        >
          <ThemedText style={[styles.cancelText, { color: colors.link }]}>
            Cancel
          </ThemedText>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}
