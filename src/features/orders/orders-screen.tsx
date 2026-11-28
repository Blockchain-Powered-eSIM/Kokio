import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { FlatList, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useColors } from "@/hooks/use-colors";
import { useTheme } from "@/providers/theme-context";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import type { ESimDocument } from "@/lib/api/bff/esim";
import { openInstallation } from "@/features/esim/esim-install";
import { useEsims } from "@/features/esim/hooks/use-esims";
import { cancelOrder } from "@/lib/api/bff/order";
import { BffError, formatBffError, resolveBffErrorMessage } from "@/lib/api/bff/errors";
import { logger } from "@/lib/logger";
import { createStyles } from "./orders-styles";
import { useOrders } from "./hooks/use-orders";
import { usePendingOrders } from "./hooks/use-pending-orders";
import type { PendingOrderRecord } from "./hooks/use-pending-orders";
import PurchaseDetailsSheet, { type EnrichedOrder } from "./components/purchase-details-sheet";
import { CancelOrderConfirmModal } from "./components/cancel-order-confirm-modal";
import { OrderCard } from "./components/order-card";
import { PendingOrderCard } from "./components/pending-order-card";

// Key used for FlatList and expand/collapse tracking.
const getOrderKey = (item: EnrichedOrder): string =>
  item.idempotencyKey ?? item.orderId ?? "";

export default function OrdersScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();
  const bg = useThemeColor({}, "background");
  const { expandOrderId } = useLocalSearchParams<{ expandOrderId?: string }>();

  const { esims, isLoading: esimsLoading, refetch: refetchEsims } = useEsims();
  const { orders, isLoading: ordersLoading, refetch: refetchOrders } = useOrders();
  const { pendingOrders, refetch: refetchPendingOrders, dismiss: dismissPendingOrder } = usePendingOrders();

  const isLoading = esimsLoading || ordersLoading;

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchEsims(), refetchOrders(), refetchPendingOrders()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchEsims, refetchOrders, refetchPendingOrders]);

  // Self-healing: once the server's terminal list catches up with a
  // client-tracked pending order, the local entry is redundant — drop it.
  useEffect(() => {
    if (pendingOrders.length === 0 || orders.length === 0) return;
    const terminalKeys = new Set(orders.map((o) => o.idempotencyKey).filter(Boolean));
    pendingOrders
      .filter((p) => terminalKeys.has(p.correlationId))
      .forEach((p) => dismissPendingOrder(p.correlationId));
  }, [pendingOrders, orders, dismissPendingOrder]);

  // Join orders with their matching ESimDocument by eSimRef.
  const enrichedOrders = useMemo<EnrichedOrder[]>(() => {
    const esimMap = new Map<string, ESimDocument>(esims.map((e) => [e.eSimRef, e]));
    return orders.map((order) => ({
      ...order,
      esim: order.eSimRef ? esimMap.get(order.eSimRef) : undefined,
    }));
  }, [orders, esims]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // One sheet for the whole list. The last order is kept after closing so the slide-out animation still has content.
  const [details, setDetails] = useState<{ order: EnrichedOrder; lpa: string | null } | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Default: the eSIM targeted via expandOrderId (e.g. tapped from Home) if
  // present, otherwise the top-most order — open until the user selects a
  // different one. Re-derived on every arrival at this tab (and as data
  // loads), matching on idempotencyKey, orderId, or eSimRef.
  useFocusEffect(
    useCallback(() => {
      if (enrichedOrders.length === 0) return;
      const matched = expandOrderId
        ? enrichedOrders.find(
            (o) =>
              o.idempotencyKey === expandOrderId ||
              o.orderId        === expandOrderId ||
              o.eSimRef        === expandOrderId,
          )
        : undefined;
      setExpandedId(getOrderKey(matched ?? enrichedOrders[0]));
    }, [expandOrderId, enrichedOrders]),
  );

  const [cancelTarget, setCancelTarget] = useState<PendingOrderRecord | null>(null);
  const [cancelMode, setCancelMode] = useState<"confirm" | "notCancellable">("confirm");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const cancelInFlightRef = useRef(false);

  const closeCancelModal = useCallback(() => {
    setCancelTarget(null);
    setCancelMode("confirm");
    setCancelError(null);
  }, []);

  const openCancelModal = useCallback((record: PendingOrderRecord) => {
    setCancelMode("confirm");
    setCancelError(null);
    setCancelTarget(record);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    if (cancelInFlightRef.current) return;
    cancelInFlightRef.current = true;
    const { correlationId } = cancelTarget;
    setCancelLoading(true);
    setCancelError(null);
    try {
      await cancelOrder(correlationId);
      dismissPendingOrder(correlationId);
      closeCancelModal();
    } catch (err) {
      if (err instanceof BffError && err.httpStatus === 404 && err.code === "ORDER_NOT_FOUND") {
        dismissPendingOrder(correlationId);
        closeCancelModal();
      } else if (err instanceof BffError && err.httpStatus === 409 && err.code === "ORDER_NOT_CANCELLABLE") {
        setCancelMode("notCancellable");
      } else {
        logger.debug("ORDER_CANCEL_FAILED", { code: err instanceof BffError ? err.code : undefined });
        setCancelError(formatBffError(err));
      }
    } finally {
      cancelInFlightRef.current = false;
      setCancelLoading(false);
    }
  }, [cancelTarget, dismissPendingOrder, closeCancelModal]);

  const handleHideCancelTarget = useCallback(() => {
    if (cancelTarget) dismissPendingOrder(cancelTarget.correlationId);
    closeCancelModal();
  }, [cancelTarget, dismissPendingOrder, closeCancelModal]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["bottom"]}>
      <ThemedView style={styles.container}>
        {isLoading ? (
          <ThemedText style={styles.emptyText}>Loading orders…</ThemedText>
        ) : enrichedOrders.length === 0 && pendingOrders.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.text}
              />
            }
          >
            <ThemedText style={styles.emptyText}>No orders yet.</ThemedText>
            <Text style={[styles.refreshHint, !isDark && { color: colors.text }]}>Swipe down to refresh</Text>
          </ScrollView>
        ) : (
          <FlatList
            data={enrichedOrders}
            keyExtractor={getOrderKey}
            renderItem={({ item }) => (
              <OrderCard
                order={item}
                onInstall={openInstallation}
                isExpanded={expandedId === getOrderKey(item)}
                onToggle={() =>
                  setExpandedId((prev) =>
                    prev === getOrderKey(item) ? null : getOrderKey(item),
                  )
                }
                onShowDetails={(lpa) => {
                  setDetails({ order: item, lpa });
                  setDetailsVisible(true);
                }}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            ListHeaderComponent={
              pendingOrders.length > 0 ? (
                <View>
                  <Text style={[styles.sectionHeader, { color: isDark ? colors.inactive : colors.text }]}>
                    Processing
                  </Text>
                  {pendingOrders.map((record) => (
                    <PendingOrderCard
                      key={record.correlationId}
                      record={record}
                      onDismiss={() => openCancelModal(record)}
                    />
                  ))}
                  {enrichedOrders.length > 0 ? (
                    <Text style={[styles.sectionHeader, { color: isDark ? colors.inactive : colors.text }]}>
                      History
                    </Text>
                  ) : null}
                </View>
              ) : undefined
            }
            ListFooterComponent={<Text style={[styles.refreshHint, !isDark && { color: colors.text }]}>Swipe down to refresh</Text>}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.text}
              />
            }
          />
        )}
      </ThemedView>
      {details ? (
        <PurchaseDetailsSheet
          visible={detailsVisible}
          onClose={() => setDetailsVisible(false)}
          order={details.order}
          lpa={details.lpa}
        />
      ) : null}
      <CancelOrderConfirmModal
        visible={cancelTarget !== null}
        mode={cancelMode}
        loading={cancelLoading}
        errorMessage={cancelError}
        notCancellableMessage={resolveBffErrorMessage("ORDER_NOT_CANCELLABLE", 409)}
        onKeep={closeCancelModal}
        onConfirm={handleConfirmCancel}
        onHide={handleHideCancelTarget}
      />
    </SafeAreaView>
  );
}
