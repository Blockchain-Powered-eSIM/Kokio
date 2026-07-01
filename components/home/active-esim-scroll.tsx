import React, { useCallback, useMemo } from "react";
import { View, Text, FlatList, StyleSheet, Dimensions } from "react-native";
import { router } from "expo-router";
import _isEmpty from "lodash/isEmpty";
import _get from "lodash/get";

import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { StoredPurchasedESIM } from "@/providers/kokioProvider";

import ESIMItem from "../ESIMItem";

// Only show eSIMs that have been provisioned or are active — exclude payment/processing/failed states
const PROVISIONED_STATUSES = new Set([
  "ACTIVE",
  "CREATED",
  "SUSPENDED",
  "ESIM_PROVISIONED",
  "ESIM_PROVISIONED_PENDING_CHAIN",
  "COMPLETED",
]);

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH = SCREEN_WIDTH * 0.9;
const SPACING = 8;

const createStyles = () => StyleSheet.create({
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
});

const ActiveESIMsScroll = ({
  purchasedESIMs,
}: {
  purchasedESIMs: StoredPurchasedESIM[];
}) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);

  const activeESIMs = useMemo(
    () => purchasedESIMs.filter((e) => PROVISIONED_STATUSES.has(e.transactionData?.orderStatus ?? "")),
    [purchasedESIMs]
  );

  const handleESIMPress = useCallback((purchasedESIM: StoredPurchasedESIM) => {
    return () => {
      const expandId =
        _get(purchasedESIM, "transactionData.correlationId", "") ||
        _get(purchasedESIM, "transactionData.orderId", "");
      router.navigate({
        pathname: "/(tabs)/orders",
        params: { expandOrderId: expandId },
      });
    };
  }, []);

  if (_isEmpty(activeESIMs)) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: Theme.colors.text }]}>eSIMs</Text>
        <View style={[styles.emptyCard, { backgroundColor: Theme.colors.card }]}>
          <Text style={styles.emptyIcon}>📶</Text>
          <Text style={[styles.emptyTitle, { color: Theme.colors.text }]}>No active eSIMs</Text>
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
        data={activeESIMs}
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <ESIMItem
              item={item?.eSimItem}
              showBuyButton={false}
              onPress={handleESIMPress(item)}
            />
          </View>
        )}
        keyExtractor={(item, index) =>
          item?.transactionData?.orderId ||
          item?.transactionData?.correlationId ||
          String(index)
        }
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
