import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

const createStyles = () => StyleSheet.create({
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
  },
  authTouchText: {
    fontSize: 13,
    fontWeight: "300",
    fontFamily: "Lexend-Light",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "300",
    fontFamily: "Lexend-Light",
  },
  contentImage: {
    height: 80,
    marginTop: 24,
    marginBottom: 5,
    resizeMode: "contain",
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
});

export function AuthenticationModal() {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const [loading, setLoading] = useState<boolean>(false);
  const sheetRef = useRef<BottomSheet>(null);

  const { state, loginWithPasskey, signUpWithPasskey, recoverWithPasskey, clearError } = useAuthRelay();
  const {
    kokio,
    setupKokioRegistration,
    setupKokioRecovery,
    clearKokioUser,
  } = useKokio();

  // renders
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
          style={{
            flex: 1,
            overflow: "hidden",
          }}
        />
      </BottomSheetBackdrop>
    ),
    [isDark]
  );

  const loginOrSignUpWithPasskey = useCallback(async () => {
    clearError();
    setLoading(true);
    if (__DEV__) console.log('[auth] loginOrSignUpWithPasskey — path:', kokio.deviceWalletAddress ? 'login' : 'recover-or-register');
    try {
      if (kokio.deviceWalletAddress) {
        // Normal login — device is already registered on this install
        const result = await loginWithPasskey();
        if (__DEV__) console.log('[auth] loginWithPasskey result:', result);
        if (result === 'success') {
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
        } else if (result === 'no-credential') {
          // Passkey was deleted from the password manager — treat as a new user:
          // clear all local device state and fall through to fresh registration.
          if (__DEV__) console.log('[auth] passkey deleted — clearing state, re-registering');
          await clearKokioUser();
          clearError();
          const data = await signUpWithPasskey({});
          if (__DEV__) console.log('[auth] re-registration result:', data ? { deviceWalletAddress: data.deviceWalletAddress } : null);
          if (data) {
            await setupKokioRegistration(data.deviceWalletAddress, data.deviceUniqueIdentifier, data.credentialId, data.publicKeyX, data.publicKeyY, data.rawSalt ?? '');
            sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
          }
        }
        // 'error' — error message already dispatched by loginWithPasskey, nothing to do
      } else {
        // No local state — try to recover an existing passkey first (reinstall case).
        // recoverWithPasskey returns null on any failure (no passkey found, user
        // cancelled) so we fall through to fresh registration.
        const recovered = await recoverWithPasskey();
        if (__DEV__) console.log('[auth] recoverWithPasskey result:', recovered ? { credentialId: recovered.credentialId, deviceWalletAddress: recovered.deviceWalletAddress } : null);
        if (recovered) {
          await setupKokioRecovery(recovered.deviceWalletAddress, recovered.credentialId);
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
          return;
        }
        // No existing passkey found — register a new account
        const data = await signUpWithPasskey({});
        if (__DEV__) console.log('[auth] signUpWithPasskey result:', data ? { deviceWalletAddress: data.deviceWalletAddress, hasRawSalt: !!data.rawSalt, hasPublicKeyX: !!data.publicKeyX, hasPublicKeyY: !!data.publicKeyY } : null);
        if (data) {
          await setupKokioRegistration(data.deviceWalletAddress, data.deviceUniqueIdentifier, data.credentialId, data.publicKeyX, data.publicKeyY, data.rawSalt ?? '');
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
        }
      }
    } catch (e) {
      console.error("Passkey flow error", e);
    } finally {
      setLoading(false);
    }
  }, [signUpWithPasskey, loginWithPasskey, recoverWithPasskey, kokio, setupKokioRegistration, setupKokioRecovery, clearKokioUser, clearError]);

  useEffect(() => {
    if (state.authenticated) {
      sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
    } else {
      sheetRef.current?.expand({ duration: 250, easing: Easing.in(Easing.quad) });
    }
  }, [state.authenticated]);

  const loadingContent = useMemo(
    () => (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size={70}
          style={styles.contentImage}
          color={Theme.colors.highlight}
        />
        <ThemedText style={[styles.loadingText, { color: Theme.colors.foreground }]}>Authenticating...</ThemedText>
      </View>
    ),
    []
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
          Secure your account using your fingerprint
        </ThemedText>
        {loading ? (
          loadingContent
        ) : (
          <Pressable onPress={loginOrSignUpWithPasskey}>
            <Image
              source={require("@/assets/images/fingerprint.png")}
              style={styles.contentImage}
            />
            <ThemedText style={[styles.authTouchText, { color: Theme.colors.foreground }]}>
              Touch the fingerprint sensor
            </ThemedText>
          </Pressable>
        )}
        {!!state.error && !loading && (
          <Text style={styles.errorText}>{state.error}</Text>
        )}
        <Pressable
          disabled={loading}
          onPress={() =>
            sheetRef.current?.close({
              duration: 250,
              easing: Easing.out(Easing.quad),
            })
          }
          style={{ alignSelf: "flex-start", marginTop: 64, marginBottom: 32 }}
        >
          <ThemedText style={[styles.cancelText, { color: Theme.colors.link }]}>Cancel</ThemedText>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

