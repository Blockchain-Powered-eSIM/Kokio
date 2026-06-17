import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
import { ThemedText } from "./ThemedText";
import { useKokio } from "@/hooks/useKokio";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";

type AuthMode = "choice" | "authenticating" | "error";

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 360,
    borderRadius: 25,
    padding: 24,
    alignItems: "center",
    backgroundColor: Theme.colors.modalBackground,
  },
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
    color: Theme.colors.text,
  },
  authSubtext: {
    fontSize: 13,
    marginTop: 12,
    fontWeight: "300",
    fontFamily: "Lexend-Light",
    textAlign: "center",
    color: Theme.colors.foreground,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "300",
    fontFamily: "Lexend-Light",
    marginTop: 12,
    color: Theme.colors.foreground,
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
    width: "100%",
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
    width: "100%",
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
  cancelText: {
    fontSize: 16,
    fontWeight: "300",
    fontFamily: "Lexend-Light",
    color: Theme.colors.link,
  },
});

export function AuthenticationModal() {
  const { isDark } = useTheme();
  const [mode, setMode] = useState<AuthMode>("choice");
  const [visible, setVisible] = useState(true);

  const { state, loginWithPasskey, signUpWithPasskey, recoverWithPasskey, clearError } =
    useAuthRelay();
  const { kokio, setupKokioRegistration, setupKokioRecovery, clearKokioUser } =
    useKokio();

  // Distinguishes a fresh browser / never-registered device (show New vs.
  // Existing choice) from a device that already completed passkey setup
  // (show a single Log In button). SecureStore is unavailable on web, so
  // this relies solely on the in-memory/persisted kokio context state.
  const isReturningUser = !!kokio.deviceWalletAddress;

  useEffect(() => {
    if (state.authenticated) {
      setVisible(false);
    } else {
      // This component stays mounted for the app's lifetime — only `visible`
      // toggles — so `mode` from a prior attempt (e.g. left at
      // "authenticating" after a successful login) would otherwise leak into
      // the next time the modal reopens (e.g. on logout).
      clearError();
      setMode("choice");
      setVisible(true);
    }
    // clearError intentionally omitted: it's recreated every provider render
    // and including it would re-trigger this effect on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.authenticated]);

  useEffect(() => {
    if (state.error) setMode("error");
  }, [state.error]);

  const handleNewUser = useCallback(async () => {
    clearError();
    setMode("authenticating");
    try {
      const data = await signUpWithPasskey({});
      if (data) {
        await setupKokioRegistration(
          data.deviceWalletAddress,
          data.deviceUniqueIdentifier,
          data.credentialId,
          data.publicKeyX,
          data.publicKeyY,
          data.rawSalt ?? ""
        );
        setVisible(false);
      } else {
        setMode("error");
      }
    } catch (e) {
      console.error("[auth/web] handleNewUser error", e);
      setMode("error");
    }
  }, [signUpWithPasskey, setupKokioRegistration, clearError]);

  const handleExistingUser = useCallback(async () => {
    clearError();
    setMode("authenticating");
    try {
      let effectiveAddress = kokio.deviceWalletAddress;
      // SecureStore is unavailable on web; rely on in-memory state only
      if (__DEV__)
        console.log(
          "[auth/web] handleExistingUser — path:",
          effectiveAddress ? "login" : "recover"
        );

      if (effectiveAddress) {
        const result = await loginWithPasskey();
        if (result === "success") {
          setVisible(false);
        } else if (result === "no-credential") {
          await clearKokioUser();
          clearError();
          const recovered = await recoverWithPasskey();
          if (recovered) {
            await setupKokioRecovery(
              recovered.deviceWalletAddress,
              recovered.credentialId
            );
            setVisible(false);
          } else {
            setMode("error");
          }
        } else {
          setMode("error");
        }
      } else {
        const recovered = await recoverWithPasskey();
        if (recovered) {
          await setupKokioRecovery(
            recovered.deviceWalletAddress,
            recovered.credentialId
          );
          setVisible(false);
        } else {
          setMode("error");
        }
      }
    } catch (e) {
      console.error("[auth/web] handleExistingUser error", e);
      setMode("error");
    }
  }, [loginWithPasskey, recoverWithPasskey, kokio, setupKokioRecovery, clearKokioUser, clearError]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Image
            source={require("@/assets/images/kokio-text.png")}
            style={styles.kokioImage}
          />
          <ThemedText style={styles.authRequiredText}>
            Authentication Required
          </ThemedText>
          <ThemedText style={styles.authSubtext}>
            {mode === "authenticating"
              ? "Verifying your identity…"
              : isReturningUser
              ? "Log in to continue"
              : "Choose how to get started"}
          </ThemedText>

          {mode === "authenticating" ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Theme.colors.highlight} />
              <ThemedText style={styles.loadingText}>Authenticating...</ThemedText>
            </View>
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
              setVisible(false);
            }}
            style={{ alignSelf: "flex-start", marginTop: 32, marginBottom: 8 }}
          >
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
