import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTurnkey } from "@turnkey/sdk-react-native";
import { useAuthRelay } from "@/hooks/useAuthRelayer";
import { useKokio } from "@/hooks/useKokio";
import { useRouter } from "expo-router";
import { isSupported } from "@turnkey/react-native-passkey-stamper";

const KOKIO_PASSKEY = "KOKIO_PASSKEY";

export default function AuthScreen() {
  const { signUpWithPasskey, loginWithPasskey, state } = useAuthRelay();
  const { user, session } = useTurnkey();
  const { kokio } = useKokio();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (user && session) {
      router.replace("/(tabs)");
    }
  }, [user, session]);

  // Check if passkeys are supported
  useEffect(() => {
    if (!isSupported()) {
      Alert.alert(
        "Unsupported Device",
        "Passkeys are not supported on this device. Please use a device that supports passkey authentication.",
        [{ text: "OK" }]
      );
    }
  }, []);

  const handleSignUp = useCallback(async () => {
    if (!isSupported()) {
      Alert.alert("Error", "Passkeys are not supported on this device");
      return;
    }

    setIsLoading(true);
    try {
      const response = await signUpWithPasskey({
        username: KOKIO_PASSKEY,
        email: undefined, // Email is optional and not required for signup
      });

      if (response?.authenticatorParams && response?.user) {
        // Save kokio user data and passkey
        kokio.setupKokioUserPasskey(response.user, {
          clientDataJson:
            response.authenticatorParams.attestation.clientDataJson,
          attestationObject:
            response.authenticatorParams.attestation.attestationObject,
          credentialId: response.authenticatorParams.attestation.credentialId,
          x:
            response.decodedAttestationObject?.decodedAttestationObjectCbor
              ?.x ?? "",
          y:
            response.decodedAttestationObject?.decodedAttestationObjectCbor
              ?.y ?? "",
        });

        // Navigate to main app
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert("Signup Failed", error.message || "Failed to create passkey");
    } finally {
      setIsLoading(false);
    }
  }, [signUpWithPasskey, kokio, router]);

  const handleLogin = useCallback(async () => {
    if (!isSupported()) {
      Alert.alert("Error", "Passkeys are not supported on this device");
      return;
    }

    setIsLoading(true);
    try {
      await loginWithPasskey();
      // Navigate to main app
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Failed",
        error.message || "Failed to authenticate with passkey"
      );
    } finally {
      setIsLoading(false);
    }
  }, [loginWithPasskey, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Kokio</Text>
            <Text style={styles.subtitle}>
              Secure authentication with passkeys
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            {!kokio.userData ? (
              // First time user - show signup
              <Pressable
                onPress={handleSignUp}
                disabled={isLoading}
                style={[styles.button, isLoading && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Creating Passkey..." : "Sign Up with Passkey"}
                </Text>
              </Pressable>
            ) : (
              // Returning user - show login
              <Pressable
                onPress={handleLogin}
                disabled={isLoading}
                style={[styles.button, isLoading && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Authenticating..." : "Login with Passkey"}
                </Text>
              </Pressable>
            )}
          </View>

          {state.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#FFE5E5",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    textAlign: "center",
  },
});
