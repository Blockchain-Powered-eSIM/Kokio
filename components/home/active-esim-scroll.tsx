import React from "react";
import { View, Text, FlatList, StyleSheet, Dimensions } from "react-native";
import { router } from "expo-router";
import _isEmpty from "lodash/isEmpty";

import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { useEsims } from "@/hooks/useDeviceEsims";
import ESIMItem from "@/components/ESIMItem";
import type { ESimDocument } from "@/utils/bff/esim";
import { esimDocToDisplayItem } from "@/helpers/esimDisplay";

// ─── Constants ────────────────────────────────────────────────────────────────

// eSIMs visible to the user in the active scroll: provisioned (not yet installed) and installed (in use).
// UNAVAILABLE and DEACTIVATED are omitted.
const ACTIVE_STATUSES: Set<string> = new Set(['RELEASED', 'INSTALLED']);

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH   = SCREEN_WIDTH * 0.9;
const SPACING      = 8;

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
      color: colors.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.foreground,
      textAlign: "center",
    },
  });

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
        pathname: "/esim-detail",
        params: { esimId: doc.esimId },
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
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No active eSIMs
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.foreground }]}>
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
              item={esimDocToDisplayItem(item)}
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
