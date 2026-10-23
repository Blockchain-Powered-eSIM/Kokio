import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import type { Palette } from "@/constants/Colors";
import { useReferral } from "@/hooks/useReferral";
import { heldCreditCents, useCreditBalance } from "@/hooks/useCreditHistory";
import { formatCents } from "@/utils/orderStatus";

// colors.success is a single bright green shared across themes; against a
// light, pale-tinted card it reads as nearly invisible, so light mode gets a
// darker shade of the same hue for contrast (same fix as the checkout promo card).
const LIGHT_SUCCESS_TEXT = "#1B8A42";

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: "700" },
    closeButton: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.inputBackground,
    },
    spacer: { width: 32 },
    content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
    centerFill: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
    heroCard: { borderRadius: 24, overflow: "hidden" },
    heroGradient: { alignItems: "center", padding: 24, gap: 10 },
    iconChip: {
      width: 48, height: 48, borderRadius: 24,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.primary + "26",
    },
    heroLabel: { fontSize: 13, color: colors.mutedForeground },
    code: {
      fontSize: 30, lineHeight: 44, fontWeight: "700", letterSpacing: 3,
      fontFamily: "monospace", marginTop: 4, paddingTop: 4,
    },
    heroActionsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
    heroAction: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    },
    heroActionFilled: { backgroundColor: colors.primary },
    heroActionOutline: { borderWidth: 1, borderColor: colors.primary },
    heroActionText: { fontSize: 14, fontWeight: "700" },
    statsRow: { flexDirection: "row", gap: 12 },
    statCard: {
      flex: 1, borderRadius: 16, padding: 14, gap: 6,
      backgroundColor: colors.inputBackground,
    },
    statIconChip: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: "center", justifyContent: "center",
    },
    statValue: { fontSize: 22, fontWeight: "700" },
    statLabel: { fontSize: 12, color: colors.mutedForeground },
    creditCard: {
      borderRadius: 16, padding: 14,
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.inputBackground,
    },
    creditTextBlock: { flex: 1, gap: 2 },
    creditTitle: { fontSize: 14, fontWeight: "700" },
    creditSubtitle: { fontSize: 12, color: colors.mutedForeground },
    pendingPill: {
      borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
      backgroundColor: colors.successBackground,
    },
    pendingPillText: { fontSize: 11, fontWeight: "700" },
    infoCard: {
      flexDirection: "row", gap: 10, borderRadius: 16, padding: 14,
      backgroundColor: colors.inputBackground,
    },
    infoText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.mutedForeground },
    retryButton: {
      marginTop: 4, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 10,
      backgroundColor: colors.primary,
    },
    retryButtonText: { fontSize: 14, fontWeight: "700", color: colors.primaryForeground },
  });

export default function ReferAndEarnModal() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const referral = useReferral();
  const credit = useCreditBalance();
  const { copied, copy } = useCopyFeedback();

  const code = referral.data?.referralCode;
  const held = credit.data ? heldCreditCents(credit.data) : 0;
  const successTextColor = isDark ? colors.success : LIGHT_SUCCESS_TEXT;

  const onCopy = useCallback(() => {
    if (code) copy(code);
  }, [code, copy]);

  const onShare = useCallback(async () => {
    if (!code) return;
    try {
      await Share.share({
        message: `Get 15% off your first Kokio eSIM order with my code ${code}.`,
      });
    } catch {
      return;
    }
  }, [code]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.spacer} />
        <ThemedText style={styles.headerTitle}>Refer & Earn</ThemedText>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close refer and earn"
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {referral.isLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : referral.isError || !referral.data ? (
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.destructive} />
          <ThemedText style={[styles.creditSubtitle, !isDark && { color: colors.text }]}>Could not load your referral details.</ThemedText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => referral.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <LinearGradient
              colors={[colors.primary + "1f", colors.surfaceElevated]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.iconChip}>
                <Ionicons name="gift-outline" size={24} color={colors.primary} />
              </View>
              <ThemedText style={styles.heroLabel}>Your referral code</ThemedText>
              <ThemedText selectable style={styles.code}>{referral.data.referralCode}</ThemedText>
              <View style={styles.heroActionsRow}>
                <TouchableOpacity
                  style={[styles.heroAction, styles.heroActionFilled]}
                  onPress={onCopy}
                  accessibilityRole="button"
                  accessibilityLabel="Copy referral code"
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={16}
                    color={colors.primaryForeground}
                  />
                  <ThemedText style={[styles.heroActionText, { color: colors.primaryForeground }]}>
                    {copied ? "Copied" : "Copy"}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.heroAction, styles.heroActionOutline]}
                  onPress={onShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share referral code"
                >
                  <Ionicons name="share-outline" size={16} color={colors.primary} />
                  <ThemedText style={[styles.heroActionText, { color: colors.primary }]}>Share</ThemedText>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconChip, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="hourglass-outline" size={16} color={colors.mutedForeground} />
              </View>
              <ThemedText style={styles.statValue}>{referral.data.pendingReferrals}</ThemedText>
              <ThemedText style={styles.statLabel}>Pending referrals</ThemedText>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconChip, { backgroundColor: colors.successBackground }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={successTextColor} />
              </View>
              <ThemedText style={styles.statValue}>{referral.data.rewardedReferrals}</ThemedText>
              <ThemedText style={styles.statLabel}>Rewarded referrals</ThemedText>
            </View>
          </View>

          {credit.data && (
            <View style={styles.creditCard}>
              <View style={[styles.iconChip, { width: 40, height: 40, borderRadius: 20 }]}>
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.creditTextBlock}>
                <ThemedText style={styles.creditTitle}>Store credit</ThemedText>
                <ThemedText style={styles.creditSubtitle}>
                  Available: {formatCents(credit.data.availableCents)}
                </ThemedText>
              </View>
              {held > 0 && (
                <View style={styles.pendingPill}>
                  <ThemedText style={[styles.pendingPillText, { color: successTextColor }]}>
                    {`+${formatCents(held)} pending`}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
            <ThemedText style={styles.infoText}>
              Friends get 15% off their first order, up to $25. You earn 10% of their first order value or $2.50 (whichever is higher) as
              store credit once their order completes.
            </ThemedText>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
