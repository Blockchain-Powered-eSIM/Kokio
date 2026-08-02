import React, { useCallback, useMemo } from "react";
import { View, Text, FlatList, StyleSheet, Dimensions } from "react-native";
import { router } from "expo-router";
import _isEmpty from "lodash/isEmpty";

import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useEsims } from "@/hooks/useDeviceEsims";
import type { ESimDocument, PlanHistoryEntry } from "@/utils/bff/esim";
import type { Esim } from "@/components/ESIMItem";
import ESIMItem from "@/components/ESIMItem";

// ─── Constants ────────────────────────────────────────────────────────────────

// eSIMs visible to the user in the active scroll: provisioned (not yet installed) and installed (in use).
// UNAVAILABLE and DEACTIVATED are omitted.
const ACTIVE_STATUSES: Set<string> = new Set(['RELEASED', 'INSTALLED']);

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH   = SCREEN_WIDTH * 0.9;
const SPACING      = 8;

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = () =>
  StyleSheet.create({
    container: {
      marginVertical: 12,
    },
    title: {
      fontSize: 16,
      color: Theme.colors.text,
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
      backgroundColor: Theme.colors.card,
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
      color: Theme.colors.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: Theme.colors.foreground,
      textAlign: "center",
    },
  });

// ─── ESimDocument -> ESim display adapter ──────────────────────────────────────
/**
 * Maps the server eSIM document to the minimal shape ESIMItem renders.
 * Uses the most-recent PlanHistoryEntry for plan metadata (data, validity, region name/flag).
 * The server snapshots these at fulfilment time so they are self-contained.
 * serviceRegionCode is not on ESimDocument; the flag renders via serviceRegionFlag when available.
 * ESIMItem accepts an absent serviceRegionCode since the guard was updated to accept flagUrl alone.
 */

function toDisplayItem(doc: ESimDocument): Esim {
  const entries: PlanHistoryEntry[] = doc.planHistory ?? [];
  const latest = entries[entries.length - 1] as PlanHistoryEntry | undefined;

  return {
    catalogueId:        '',          // not needed — display-only, no buy button
    actualSellingPrice: 0,           // not needed — display-only
    isUnlimited:        latest?.isUnlimited    ?? false,
    serviceRegionCode:  undefined,   // not on ESimDocument; flag renders via URL
    serviceRegionFlag:  latest?.serviceRegionFlag  ?? null,
    serviceRegionName:  latest?.serviceRegionName  ?? null,
    coverageType:       latest?.coverageType       ?? 'LOCAL',
    data:               latest?.data               ?? null,
    sms:                latest?.sms                ?? null,
    voice:              latest?.voice              ?? null,
    validity:           latest?.validity           ?? null,
    info:               null,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

// No props — self-fetching via useEsims().
const ActiveESIMsScroll = () => {
  const { isDark } = useTheme();
  // TODO: Fix the theming engine to deprecate this usage pattern
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styles = useMemo(() => createStyles(), [isDark]);

  const { esims, isLoading } = useEsims();

  const activeEsims = useMemo(
    () => esims.filter((e) => ACTIVE_STATUSES.has(e.activationStatus)),
    [esims],
  );

  // Navigate to the Orders tab, expanding the card for this eSIM.
  // Uses esimId as the expand key — orders.tsx matches on esimId.
  const handleESIMPress = useCallback((doc: ESimDocument) => {
    return () => {
      router.push({
        pathname: "/esim-detail",
        params: { esimId: doc.esimId },
      });
    };
  }, []);

  // Show the same empty-state card while loading and when no active eSIMs exist.
  // Silent on error — the user can check the Orders tab for the authoritative list.
  if (isLoading || _isEmpty(activeEsims)) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: Theme.colors.text }]}>eSIMs</Text>
        <View style={[styles.emptyCard, { backgroundColor: Theme.colors.card }]}>
          <Text style={styles.emptyIcon}>📶</Text>
          <Text style={[styles.emptyTitle, { color: Theme.colors.text }]}>
            No active eSIMs
          </Text>
          <Text style={[styles.emptySubtitle, { color: Theme.colors.foreground }]}>
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
            <ESIMItem
              item={toDisplayItem(item)}
              showBuyButton={false}
              onPress={handleESIMPress(item)}
            />
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
