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
      gap: 12,
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
      if (__DEV__)
        console.log(
          "[auth] signUpWithPasskey result:",
          data ? { deviceWalletAddress: data.deviceWalletAddress } : null
        );
      if (data) {
        succeeded = true;
        await setupKokioRegistration(
          data.deviceWalletAddress,
          data.deviceUniqueIdentifier,
          data.credentialId,
          data.publicKeyX,
          data.publicKeyY,
          data.rawSalt ?? ""
        );
        sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
      }
    } catch (e) {
      console.error("[auth] handleNewUser error", e);
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
      if (__DEV__)
        console.log(
          "[auth] handleExistingUser — path:",
          effectiveAddress ? "login" : "recover"
        );

      if (effectiveAddress) {
        const result = await loginWithPasskey();
        if (__DEV__) console.log("[auth] loginWithPasskey result:", result);
        if (result === "success") {
          succeeded = true;
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
        } else if (result === "no-credential") {
          // Passkey deleted — fall back to recovery
          await clearKokioUser();
          clearError();
          const recovered = await recoverWithPasskey();
          if (recovered) {
            succeeded = true;
            await setupKokioRecovery(
              recovered.deviceWalletAddress,
              recovered.credentialId
            );
            sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
          }
        }
      } else {
        const recovered = await recoverWithPasskey();
        if (__DEV__)
          console.log(
            "[auth] recoverWithPasskey result:",
            recovered ? { credentialId: recovered.credentialId } : null
          );
        if (recovered) {
          succeeded = true;
          await setupKokioRecovery(
            recovered.deviceWalletAddress,
            recovered.credentialId
          );
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
        }
      }
    } catch (e) {
      console.error("[auth] handleExistingUser error", e);
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
      sheetRef.current?.expand({ duration: 250, easing: Easing.in(Easing.quad) });
    }
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
        <ThemedText style={[styles.loadingText, { color: Theme.colors.foreground }]}>
          Authenticating...
        </ThemedText>
      </View>
    ),
    [styles]
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
            : "Choose how to get started"}
        </ThemedText>

        {mode === "authenticating" ? (
          loadingContent
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
