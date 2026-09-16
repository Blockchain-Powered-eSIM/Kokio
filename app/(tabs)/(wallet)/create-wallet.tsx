import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";

import { ThemedText } from "@/components/ThemedText";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { DARK_TOKENS, LIGHT_TOKENS, type Palette } from "@/constants/Colors";
import { PASSKEY_LABEL } from "@/constants/passkey.constants";
import { useWalletDeployment, MissingSignupDataError } from "@/hooks/useWalletDeployment";
import { useToast } from "@/contexts/ToastContext";
import { AuthError } from "@/utils/auth/errors";
import { logger } from "@/utils/logger";

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  { icon: "shield-checkmark-outline", title: "You own it", description: "Kokio can never move your funds" },
  { icon: "card-outline", title: "Card still works", description: "Nothing you do today changes" },
  { icon: "layers-outline", title: "Each eSIM gets a wallet", description: "Top-ups without re-entering a card" },
];

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    marginTop: 18,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function CreateWalletScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const router = useRouter();
  const { deployDeviceWallet } = useWalletDeployment();
  const { showMessage } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRelaunch = useCallback(() => {
    Updates.reloadAsync().catch((err) => {
      logger.error('APP_RELOAD_FAILED', { err });
    });
  }, []);

  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await deployDeviceWallet();
      router.dismissAll();
      router.navigate("/(tabs)/(wallet)" as any);
    } catch (err: unknown) {
      if (err instanceof MissingSignupDataError) {
        setErrorMessage("signup");
        return;
      }
      logger.error('WALLET_DEPLOYMENT_FAILED', { err });
      const message = err instanceof AuthError
        ? err.userMessage
        : err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      showMessage(message, 'error');
      setErrorMessage("retry");
    } finally {
      setIsLoading(false);
    }
  }, [deployDeviceWallet, router, showMessage]);

  if (errorMessage === "signup") {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <ThemedText bold variant="xl" style={{ textAlign: "center" }}>Please sign up to proceed</ThemedText>
        <TouchableOpacity
          style={{
            width: "100%",
            minHeight: 50,
            borderRadius: 999,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 20,
            backgroundColor: colors.ctaBackground,
          }}
          onPress={handleRelaunch}
          accessibilityRole="button"
          accessibilityLabel="Let's go"
        >
          <ThemedText style={{ fontSize: 16, fontWeight: "700", color: colors.ctaForeground }}>
            Let&apos;s go
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
        <View style={[styles.iconCircle, { backgroundColor: colors.walletAccent }]}>
          <Ionicons name="finger-print-outline" size={42} color={colors.primaryForeground} />
        </View>
        <ThemedText bold variant="xxl" style={{ marginTop: 22, lineHeight: 38 }}>
          No seed phrase.{"\n"}Just {PASSKEY_LABEL}.
        </ThemedText>
        <ThemedText
          lightColor={LIGHT_TOKENS.text}
          darkColor={DARK_TOKENS.mutedForeground}
          style={{ marginTop: 12, lineHeight: 22 }}
        >
          Your Kokio wallet lives on this phone and signs with the passkey you already use. Nothing to write down.
        </ThemedText>

        {BENEFITS.map((b) => (
          <View key={b.title} style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Ionicons name={b.icon} size={20} color={colors.walletAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText bold>{b.title}</ThemedText>
              <ThemedText
                lightColor={LIGHT_TOKENS.text}
                darkColor={DARK_TOKENS.mutedForeground}
                style={{ marginTop: 2 }}
              >
                {b.description}
              </ThemedText>
            </View>
          </View>
        ))}

        {errorMessage === "retry" && (
          <ThemedText style={{ color: colors.destructive, marginTop: 18 }}>
            There was an error creating your wallet. Please try again.
          </ThemedText>
        )}
      </ScrollView>

      <BottomActionBar>
        <TouchableOpacity
          style={{
            width: "100%",
            minHeight: 50,
            borderRadius: 999,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: isLoading ? 0.5 : 1,
            backgroundColor: colors.ctaBackground,
          }}
          disabled={isLoading}
          onPress={handleCreate}
          accessibilityRole="button"
          accessibilityLabel={errorMessage === "retry" ? "Retry" : `Create with ${PASSKEY_LABEL}`}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.ctaForeground} />
          ) : (
            <>
              <Ionicons name="finger-print-outline" size={20} color={colors.ctaForeground} />
              <ThemedText style={{ fontSize: 16, fontWeight: "700", color: colors.ctaForeground }}>
                {errorMessage === "retry" ? "Retry" : `Create with ${PASSKEY_LABEL}`}
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 4 }}
        >
          <ThemedText
            lightColor={LIGHT_TOKENS.text}
            darkColor={DARK_TOKENS.mutedForeground}
            style={{ fontWeight: "600" }}
          >
            Keep using my card
          </ThemedText>
        </TouchableOpacity>
      </BottomActionBar>
    </View>
  );
}
