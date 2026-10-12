import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  BackHandler,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { openAppSettings } from "@/utils/openAppSettings";
import { markWelcomeBackSeen } from "@/utils/auth/returningUserProbe";
import { logger } from "@/utils/logger";

const BODY_COPY =
  "Kokio has officially launched, and every account starts fresh. Used Kokio before? Delete your old " +
  "passkey from your device's password manager, then continue below. New here? Just continue. " +
  "Either way, your installed eSIMs keep working. Thanks for being here.";

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
    fontSize: 35,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 36,
  },
  description: {
    color: colors.text,
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
  primaryButton: {
    backgroundColor: colors.card,
    borderRadius: 30,
    alignSelf: "stretch",
    marginHorizontal: 56,
    marginBottom: 16,
    alignItems: "center",
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: colors.cardForeground,
    fontSize: 16,
    fontFamily: "Lexend",
  },
  secondaryButton: {
    borderColor: colors.card,
    borderWidth: 2,
    borderRadius: 30,
    paddingVertical: 11,
    alignSelf: "stretch",
    marginHorizontal: 56,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.card,
    fontSize: 16,
    fontFamily: "Lexend",
  },
});

const WelcomeBackScreen: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  // Dismiss only via "Let's go!" so the seen-flag always gets set.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const handleLetsGo = useCallback(async () => {
    try {
      await markWelcomeBackSeen();
    } catch (err) {
      logger.error("WELCOME_BACK_LETS_GO_FAILED", { err });
    }
    router.replace("/");
  }, [router]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/kokio.png")}
        style={styles.logo}
      />

      <ThemedText style={styles.heading} bold>
        We&apos;ve Launched!
      </ThemedText>

      <ThemedText style={styles.description} variant="sm">
        {BODY_COPY}
      </ThemedText>

      <Image
        source={require("../assets/images/nonetwork.png")}
        style={styles.illustration}
        resizeMode="contain"
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleLetsGo}>
        <Text style={styles.primaryButtonText}>Let&apos;s go!</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={openAppSettings}>
        <Text style={styles.secondaryButtonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

export default WelcomeBackScreen;
