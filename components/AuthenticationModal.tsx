import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
import { ThemedText } from "./ThemedText";
import { useKokio } from "@/hooks/useKokio";
import { BlurView } from "expo-blur";
import { Easing } from "react-native-reanimated";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { logger } from '@/utils/logger';

type AuthMode = "choice" | "authenticating" | "error";

const createStyles = () =>
  StyleSheet.create({
    kokioImage: {
      height: 60,
      marginTop: 10,
      resizeMode: "contain",
    },
    authRequiredText: {
      fontSize: 24,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
      marginTop: 32,
    },
    authSubtext: {
      fontSize: 13,
      marginTop: 12,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
      textAlign: "center",
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    loadingImage: {
      height: 80,
      marginTop: 24,
      marginBottom: 5,
      resizeMode: "contain",
    },
    loadingText: {
      fontSize: 13,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
    },
    cancelText: {
      fontSize: 16,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
    },
    errorText: {
      fontSize: 13,
      color: Theme.colors.destructive,
      fontFamily: "Lexend-Light",
      textAlign: "center",
      marginTop: 12,
      paddingHorizontal: 24,
    },
    buttonRow: {
      width: "100%",
      marginTop: 32,
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
    },
    loginButtonRow: {
      width: "100%",
      marginTop: 32,
      alignItems: "center",
    },
    loginButton: {
      width: "55%",
      minWidth: 180,
      height: 52,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Theme.colors.highlight,
    },
    primaryButton: {
      flex: 1,
      maxWidth: 160,
      height: 52,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Theme.colors.highlight,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      fontFamily: "Lexend-Light",
      color: "#000000",
    },
    secondaryButton: {
      flex: 1,
      maxWidth: 160,
      height: 52,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: Theme.colors.foreground,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: "300",
      fontFamily: "Lexend-Light",
      color: Theme.colors.foreground,
    },
  });

export function AuthenticationModal() {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const [mode, setMode] = useState<AuthMode>("choice");
  const sheetRef = useRef<BottomSheet>(null);

  const { state, loginWithPasskey, signUpWithPasskey, recoverWithPasskey, clearError } =
    useAuthRelay();
  const { kokio, setupKokioRegistration, setupKokioRecovery, clearKokioUser } =
    useKokio();

  // Distinguishes a fresh install / never-registered device (show New vs.
  // Existing choice) from a device that already completed passkey setup
  // (show a single Log In button — no need to ask again on every cold launch).
  // null = not yet determined (only true before the one-off SecureStore check
  // below resolves on cold launch).
  const [isReturningUser, setIsReturningUser] = useState<boolean | null>(
    kokio.deviceWalletAddress ? true : null
  );
  // Once we've established the truth once (cold-launch SecureStore check, or
  // kokio context already had an address), kokio.deviceWalletAddress becoming
  // falsy is a deliberate "Logout and Clear Data" — trust it immediately
  // instead of re-checking SecureStore, which would briefly show the stale
  // "Log In" button before flipping to the New/Existing choice.
  const hasResolvedOnce = useRef(!!kokio.deviceWalletAddress);

  useEffect(() => {
    if (kokio.deviceWalletAddress) {
      hasResolvedOnce.current = true;
      setIsReturningUser(true);
      return;
    }
    if (hasResolvedOnce.current) {
      setIsReturningUser(false);
      return;
    }
    let cancelled = false;
    SecureStore.getItemAsync("deviceWalletAddress").then((stored) => {
      if (!cancelled) {
        hasResolvedOnce.current = true;
        setIsReturningUser(!!stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [kokio.deviceWalletAddress]);

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
    clearError();
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
  }, [signUpWithPasskey, setupKokioRegistration, clearError]);

  const handleExistingUser = useCallback(async () => {
    clearError();
    setMode("authenticating");
    let succeeded = false;
    try {
      const effectiveAddress =
        kokio.deviceWalletAddress ||
        (await SecureStore.getItemAsync("deviceWalletAddress"));
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
          clearError();
          const recovered = await recoverWithPasskey();
          if (recovered) {
            await setupKokioRecovery(
              recovered.deviceWalletAddress,
              recovered.credentialId
            );
            succeeded = true;
            sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
          }
        }
      } else {
        const recovered = await recoverWithPasskey();
        logger.debug('AUTH_RECOVER_RESULT', { recovered });
        if (recovered) {
          await setupKokioRecovery(
            recovered.deviceWalletAddress,
            recovered.credentialId
          );
          succeeded = true;
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
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
    clearError,
  ]);

  useEffect(() => {
    if (state.authenticated) {
      sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
    } else {
      // This component stays mounted for the app's lifetime — the sheet is only
      // expanded/closed, never unmounted — so `mode` from a prior attempt
      // (e.g. left at "authenticating" after a successful login) would
      // otherwise leak into the next time the modal reopens (e.g. on logout).
      clearError();
      setMode("choice");
      sheetRef.current?.expand({ duration: 250, easing: Easing.in(Easing.quad) });
    }
    // clearError intentionally omitted: it's recreated every provider render
    // and including it would re-trigger this effect (and re-animate the
    // sheet) on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.authenticated]);

  useEffect(() => {
    if (state.error) setMode("error");
  }, [state.error]);

  const loadingContent = useMemo(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size={70}
          style={styles.loadingImage}
          color={Theme.colors.highlight}
        />
        {mode === "authenticating" && (
          <ThemedText style={[styles.loadingText, { color: Theme.colors.foreground }]}>
            Authenticating...
          </ThemedText>
        )}
      </View>
    ),
    [styles, mode]
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
      backgroundStyle={{ backgroundColor: Theme.colors.modalBackground }}
    >
      <BottomSheetView style={{ alignItems: "center", flex: 1, padding: 20 }}>
        <Image
          source={require("@/assets/images/kokio-text.png")}
          style={styles.kokioImage}
        />
        <ThemedText style={[styles.authRequiredText, { color: Theme.colors.text }]}>
          Authentication Required
        </ThemedText>
        <ThemedText style={[styles.authSubtext, { color: Theme.colors.foreground }]}>
          {mode === "authenticating"
            ? "Verifying your identity…"
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

        {!!state.error && mode === "error" && (
          <Text style={styles.errorText}>{state.error}</Text>
        )}

        <Pressable
          disabled={mode === "authenticating"}
          onPress={() => {
            clearError();
            setMode("choice");
            sheetRef.current?.close({
              duration: 250,
              easing: Easing.out(Easing.quad),
            });
          }}
          style={{ alignSelf: "flex-start", marginTop: 32, marginBottom: 32 }}
        >
          <ThemedText style={[styles.cancelText, { color: Theme.colors.link }]}>
            Cancel
          </ThemedText>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}
