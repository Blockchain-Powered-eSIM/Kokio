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

export function AuthenticationModal() {
  const [loading, setLoading] = useState<boolean>(false);
  const sheetRef = useRef<BottomSheet>(null);

  const { state, loginWithPasskey, signUpWithPasskey, clearError } = useAuthRelay();
  const {
    kokio,
    setupKokioRegistration,
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
          tint="systemChromeMaterialDark"
          experimentalBlurMethod="none"
          style={{
            flex: 1,
            overflow: "hidden",
          }}
        />
      </BottomSheetBackdrop>
    ),
    []
  );

  const loginOrSignUpWithPasskey = useCallback(async () => {
    clearError();
    setLoading(true);
    try {
      if (kokio.deviceWalletAddress) {
        const success = await loginWithPasskey();
        if (success) {
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
        }
      } else {
        const data = await signUpWithPasskey({});
        if (data) {
          await setupKokioRegistration(data.deviceWalletAddress, data.deviceUniqueIdentifier, data.credentialId, data.publicKeyX, data.publicKeyY);
          sheetRef.current?.close({ duration: 250, easing: Easing.out(Easing.quad) });
        }
      }
    } catch (e) {
      console.error("Passkey flow error", e);
    } finally {
      setLoading(false);
    }
  }, [signUpWithPasskey, loginWithPasskey, kokio, setupKokioRegistration, clearError]);

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
        <ThemedText style={styles.loadingText}>Authenticating...</ThemedText>
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
      backgroundStyle={{ backgroundColor: "rgba(24, 24, 27, 0.97)" }}
    >
      <BottomSheetView style={{ alignItems: "center", flex: 1, padding: 20 }}>
        <Image
          source={require("@/assets/images/kokio-text.png")}
          style={styles.kokioImage}
        />
        <ThemedText style={styles.authRequiredText}>
          Authentication Required
        </ThemedText>
        <ThemedText style={styles.authSubtext}>
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
            <ThemedText style={styles.authTouchText}>
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
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  kokioImage: {
    height: 60,
    marginTop: 10,
    resizeMode: "contain",
  },
  authRequiredText: {
    fontSize: 24,
    fontWeight: "300",
    color: "white",
    fontFamily: "Lexend-Light",
    marginTop: 32,
  },
  authSubtext: {
    fontSize: 13,
    marginTop: 12,
    fontWeight: "300",
    color: "white",
    fontFamily: "Lexend-Light",
  },
  authTouchText: {
    fontSize: 13,
    fontWeight: "300",
    color: "white",
    fontFamily: "Lexend-Light",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "300",
    color: "white",
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
    color: "#64D2FF",
  },
  errorText: {
    fontSize: 13,
    color: "#FF3B30",
    fontFamily: "Lexend-Light",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 24,
  },
});
