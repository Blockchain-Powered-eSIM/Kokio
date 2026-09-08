import React from "react";
import { View, Text, FlatList, StyleSheet, Dimensions, Platform, TouchableOpacity, Linking } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import _isEmpty from "lodash/isEmpty";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { useEsims } from "@/hooks/useDeviceEsims";
import { useEsimUsage } from "@/hooks/useEsimUsage";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import ESIMItem from "@/components/ESIMItem";
import type { ESimDocument } from "@/utils/bff/esim";
import { esimDocToDisplayItem } from "@/helpers/esimDisplay";
import { logger } from "@/utils/logger";

// ─── Constants ────────────────────────────────────────────────────────────────

// eSIMs visible to the user in the active scroll: provisioned (not yet installed) and installed (in use).
// UNAVAILABLE and DEACTIVATED are omitted.
const ACTIVE_STATUSES: Set<string> = new Set(['RELEASED', 'INSTALLED']);

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH   = SCREEN_WIDTH * 0.9;
const SPACING      = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// LPA string: prefer the smdpAddress+matchingId pair from the live eSIM doc
// (authoritative); fall back to the qrcode stored on installationDetails.
function buildLpa(doc: ESimDocument): string | null {
  if (doc.smdpAddress && doc.matchingId) {
    return `LPA:1$${doc.smdpAddress}$${doc.matchingId}`;
  }
  return doc.installationDetails?.qrcode ?? null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      marginVertical: 12,
    },
    title: {
      fontSize: 16,
      color: colors.text,
      paddingLeft: 20,
    },
    listContainer: {
      paddingHorizontal: SPACING,
    },
    itemWrapper: {
      width: ITEM_WIDTH,
    },
    emptyCard: {
      marginHorizontal: SPACING,
      marginTop: 8,
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    emptyIcon: {
      fontSize: 24,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.cardForeground,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.cardForeground,
      textAlign: "center",
    },
    footer: {
      marginTop: 8,
    },
    quickInstallBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    quickInstallText: {
      fontSize: 14,
      fontWeight: "600",
      color: "white",
    },
    lpaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    lpaText: {
      flex: 1,
      fontSize: 12,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    remainingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    remainingLabel: {
      fontSize: 13,
    },
    remainingValue: {
      fontSize: 13,
      fontWeight: "600",
    },
    usageBarTrack: {
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 6,
    },
    usageBarFill: {
      height: 8,
      borderRadius: 4,
    },
  });

// ─── HomeEsimCard ─────────────────────────────────────────────────────────────

// Extends ESIMItem, for the home page only, with install affordances (iOS
// "Quick install" button / Android LPA string) when not yet installed, or
// remaining data when installed. Mirrors the Orders page dropdown (4a.1).
const HomeEsimCard = ({
  doc,
  onPress,
}: {
  doc: ESimDocument;
  onPress: () => void;
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();
  const { copied, copy } = useCopyFeedback();

  const isInstalled = doc.activationStatus === "INSTALLED";
  const lpa = buildLpa(doc);

  // Remaining data is only needed once the eSIM is installed.
  const { usage, isLoading: usageLoading, isError: usageIsError, usageUnavailable } =
    useEsimUsage(isInstalled ? doc.esimId : undefined);

  const remainingDataText = usageLoading
    ? "Loading…"
    : usageIsError || usageUnavailable
      ? "Unavailable"
      : usage?.isUnlimited
        ? "Unlimited"
        : usage?.remaining != null
          ? `${usage.remaining.toFixed(2)} GB`
          : "—";

  // Usage bar: green above 40% remaining, amber above 15%, red below.
  const usageRatio = usage?.remaining && usage?.total ? usage.remaining / usage.total : null;
  const usageBarColor =
    usageRatio == null
      ? colors.primary
      : usageRatio > 0.4
        ? colors.success
        : usageRatio > 0.15
          ? colors.warning
          : colors.destructive;
  const usageFillPct = usageRatio == null ? 0 : Math.min(100, usageRatio * 100);

  const handleQuickInstall = async () => {
    if (!lpa) return;
    const appleUrl = `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${lpa}`;
    try {
      await Linking.openURL(appleUrl);
    } catch (err) {
      logger.error("ESIM_QUICK_INSTALL_FAILED", { err });
    }
  };

  const footer = isInstalled ? (
    <View style={styles.footer}>
      <View style={styles.remainingRow}>
        <Text
          style={[
            styles.remainingLabel,
            { color: isDark ? "rgba(0, 0, 0, 0.6)" : colors.mutedForeground },
          ]}
        >
          Data Remaining
        </Text>
        <Text style={[styles.remainingValue, { color: colors.cardForeground }]}>
          {remainingDataText}
        </Text>
      </View>
      {!usage?.isUnlimited && usage?.remaining != null && usage?.total != null ? (
        <View style={[styles.usageBarTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.usageBarFill,
              { width: `${usageFillPct}%`, backgroundColor: usageBarColor },
            ]}
          />
        </View>
      ) : null}
    </View>
  ) : !lpa ? null : Platform.OS === "ios" ? (
    <TouchableOpacity
      style={[styles.footer, styles.quickInstallBtn, { backgroundColor: colors.primary }]}
      onPress={handleQuickInstall}
      accessibilityRole="button"
      accessibilityLabel="Quick install this eSIM"
    >
      <Ionicons name="download-outline" size={15} color="white" />
      <Text style={styles.quickInstallText}>Quick install</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      style={[styles.footer, styles.lpaRow, { backgroundColor: isDark ? "white" : colors.muted }]}
      onPress={() => copy(lpa)}
      accessibilityRole="button"
      accessibilityLabel="Copy LPA install string"
    >
      <Text style={[styles.lpaText, { color: colors.cardForeground }]} numberOfLines={2}>
        Install using this Code in SIM settings
      </Text>
      <Ionicons
        name={copied ? "checkmark-circle" : "copy-outline"}
        size={16}
        color={colors.cardForeground}
      />
    </TouchableOpacity>
  );

  return (
    <ESIMItem
      item={esimDocToDisplayItem(doc)}
      showBuyButton={false}
      onPress={onPress}
      footer={footer}
    />
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

// No props — self-fetching via useEsims().
const ActiveESIMsScroll = () => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  const { esims, isLoading } = useEsims();

  const activeEsims = esims.filter((e) =>
    ACTIVE_STATUSES.has(e.activationStatus),
  );

  // Navigate to the Orders tab, expanding the card for this eSIM.
  // Uses esimId as the expand key — orders.tsx matches on esimId.
  const handleESIMPress = (doc: ESimDocument) => {
    return () => {
      router.push({
        pathname: "/(tabs)/orders",
        params: { expandOrderId: doc.esimId },
      });
    };
  };

  // Show the same empty-state card while loading and when no active eSIMs exist.
  // Silent on error — the user can check the Orders tab for the authoritative list.
  if (isLoading || _isEmpty(activeEsims)) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>eSIMs</Text>
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <Text style={styles.emptyIcon}>📶</Text>
          <Text style={[styles.emptyTitle, { color: colors.cardForeground }]}>
            No active eSIMs
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.cardForeground }]}>
            Your purchased eSIMs will appear here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>eSIMs</Text>
      <FlatList
        data={activeEsims}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <HomeEsimCard doc={item} onPress={handleESIMPress(item)} />
          </View>
        )}
        keyExtractor={(item) => item.esimId}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        snapToInterval={ITEM_WIDTH + SPACING}
        decelerationRate="fast"
        ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
      />
    </View>
  );
};

export default ActiveESIMsScroll;
