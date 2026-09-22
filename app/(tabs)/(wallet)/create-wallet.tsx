import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";

import { ThemedText } from "@/components/ThemedText";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import SignupRequiredModal from "@/components/ui/SignupRequiredModal";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { DARK_TOKENS, LIGHT_TOKENS, type Palette } from "@/constants/Colors";
import { PASSKEY_LABEL } from "@/constants/passkey.constants";
import { useWalletDeployment, MissingSignupDataError } from "@/hooks/useWalletDeployment";
import { WALLET_DEPLOYMENT_STEP_LABELS } from "@/utils/bff/wallet";
import { useToast } from "@/contexts/ToastContext";
import { AuthError } from "@/utils/auth/errors";
import { logger } from "@/utils/logger";

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  { icon: "shield-checkmark-outline", title: "Own it", description: "Kokio can never move your funds" },
  { icon: "card-outline", title: "Card still works", description: "Nothing changes" },
  { icon: "layers-outline", title: "Every eSIM gets a wallet", description: "Top-ups without re-entering card details" },
];

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: 8,
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
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
  const { deployDeviceWallet, currentStep } = useWalletDeployment();
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

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <SignupRequiredModal visible={errorMessage === "signup"} onRelaunch={handleRelaunch} />
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back-outline" size={28} color={colors.headerText} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
        <View style={[styles.iconCircle, { backgroundColor: colors.walletAccent }]}>
          <Ionicons name="finger-print-outline" size={42} color={colors.primaryForeground} />
        </View>
        <ThemedText bold variant="xxl" style={{ marginTop: 22, lineHeight: 38 }}>
          Just {PASSKEY_LABEL}.
        </ThemedText>
        <ThemedText
          lightColor={LIGHT_TOKENS.text}
          darkColor={DARK_TOKENS.mutedForeground}
          style={{ marginTop: 12, lineHeight: 22 }}
        >
          Kokio wallet lives on this phone and signs with the {PASSKEY_LABEL} already in use.
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
              <ThemedText style={{ fontSize: 18, fontWeight: "700", color: colors.ctaForeground }}>
                {errorMessage === "retry" ? "Retry" : `Create with ${PASSKEY_LABEL}`}
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
        {isLoading && currentStep && (
          <ThemedText
            lightColor={LIGHT_TOKENS.mutedForeground}
            darkColor={DARK_TOKENS.mutedForeground}
            style={{ textAlign: "center", marginTop: 8 }}
          >
            {WALLET_DEPLOYMENT_STEP_LABELS[currentStep]}
          </ThemedText>
        )}
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
    </SafeAreaView>
  );
}
