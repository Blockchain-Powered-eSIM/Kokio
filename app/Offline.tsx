import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import _isNull from "lodash/isNull";
import NetInfo from "@react-native-community/netinfo";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Theme } from "@/constants/Colors";
import { useToast } from "@/contexts/ToastContext";
import { setSkipNextOfflineRedirect } from "@/utils/offlineRedirectFlag";

const OfflineScreen: React.FC = () => {
  const router = useRouter();

  const handleRetry = useCallback(async () => {
    const state = await NetInfo.fetch();

    // Handle null state (network status still being determined)
    if (_isNull(state.isInternetReachable)) {
      return;
    }

    const isOnline = !!state.isConnected && !!state.isInternetReachable;

    if (isOnline) {
      router.replace("/");
    } else {
      alert(
        "Still Offline , Please check your internet connection and try again."
      );
    }
  }, [router]);

  const handleContinue = useCallback(() => {
    setSkipNextOfflineRedirect(true);
    router.replace("/");
  }, [router]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/kokio.png")}
        style={styles.logo}
      />

      <ThemedText style={styles.heading} bold>
        You’re Offline!
      </ThemedText>

      <ThemedText style={styles.description} variant="sm">
        A connection is needed to purchase and install an eSIM or make eSIM
        wallet transactions, but you can still use the app with limited
        functionalities.
      </ThemedText>

      <Image
        source={require("../assets/images/nonetwork.png")}
        style={styles.illustration}
        resizeMode="contain"
      />

      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>Retry Connection</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueButtonText}>Continue to App</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 142,
    height: 33,
    marginBottom: 54,
    marginTop: 21,
    resizeMode: "contain",
  },
  heading: {
    color: Theme.colors.text,
    fontSize: 35,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 36,
  },
  description: {
    color: Theme.colors.text,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 56,
  },
  illustration: {
    width: 319,
    height: 326,
    marginTop: 46,
    marginBottom: 40,
  },
  retryButton: {
    backgroundColor: Colors.dark.card,
    borderRadius: 30,
    alignSelf: "stretch",
    marginHorizontal: 56,
    marginBottom: 16,
    alignItems: "center",
    paddingVertical: 11,
  },
  retryButtonText: {
    color: Theme.colors.cardForeground,
    fontSize: 16,
    fontFamily: "Lexend",
  },
  continueButton: {
    borderColor: Colors.dark.card,
    borderWidth: 2,
    borderRadius: 30,
    paddingVertical: 11,
    alignSelf: "stretch",
    marginHorizontal: 56,
    alignItems: "center",
  },
  continueButtonText: {
    color: Colors.dark.card,
    fontSize: 16,
    fontFamily: "Lexend",
  },
});

export default OfflineScreen;
