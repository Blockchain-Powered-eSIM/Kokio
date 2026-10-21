import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { labelForStatus, colorForStatus, labelForPaymentMethod, isUserActionableManualReview } from "@/utils/orderStatus";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { useEsimUsage } from "@/hooks/useEsimUsage";
import type { ESimDocument } from "@/utils/bff/esim";
import ESIMItem from "@/components/ESIMItem";
import EsimLabelEditor from "@/components/esim/EsimLabelEditor";
import PurchaseDetailsSheet, { CopyRow, type EnrichedOrder } from "@/components/orders/PurchaseDetailsSheet";
import type { Esim } from "@/components/ESIMItem";
import { esimDisplayName, esimDocToDisplayItem } from "@/helpers/esimDisplay";
import { openInstallation } from "@/helpers/esimInstall";
import { useEsims, useOrders } from "@/hooks/useDeviceEsims";
import { usePendingOrders } from "@/hooks/usePendingOrders";
import type { PendingOrderRecord } from "@/hooks/usePendingOrders";
import { CancelOrderConfirmModal } from "@/components/ui/CancelOrderConfirmModal";
import { cancelOrder } from "@/utils/bff/order";
import { BffError, formatBffError, resolveBffErrorMessage } from "@/utils/bff/errors";
import { logger } from "@/utils/logger";

// ─── eSIM activation-status labeling ─────────────────────────────────────────

type ActivationStatus = ESimDocument["activationStatus"];

const ESIM_STATUS_LABEL: Record<ActivationStatus, string> = {
  RELEASED:    "Ready to Install",
  INSTALLED:   "Active",
  UNAVAILABLE: "Unavailable",
  DEACTIVATED: "Deactivated",
};

// ─── Types ────────────────────────────────────────────────────────────────────

// An OrderListItem enriched with its matched ESimDocument, joined by eSimRef.

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Key used for FlatList and expand/collapse tracking.
const getOrderKey = (item: EnrichedOrder): string =>
  item.idempotencyKey ?? item.orderId ?? "";

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: Palette) => StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      paddingTop: 10,
      paddingBottom: 0,
    },
    orderCardWrapper: {
      marginBottom: 4,
    },
    orderMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    orderStatusBadge: {
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    orderStatusText: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    emptyText: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 24,
      opacity: 0.9,
      textAlign: "center",
      marginTop: 32,
    },
    refreshHint: {
      color: colors.inactive,
      fontSize: 12,
      textAlign: "center",
      marginTop: 24,
      marginBottom: 12,
    },
    detailSection: {
      borderRadius: 12,
      marginHorizontal: 4,
      marginTop: 2,
      marginBottom: 8,
      padding: 14,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
    },
    summaryLabel: {
      fontSize: 13,
    },
    summaryValue: {
      fontSize: 13,
      fontWeight: "600",
    },
    usageBarTrack: {
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      marginTop: -2,
      marginBottom: 6,
    },
    usageBarFill: {
      height: 8,
      borderRadius: 4,
    },
    actionRow: {
      alignSelf: "stretch",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    walletBtn: {
      position: "absolute",
      right: 14,
      bottom: 14,
      width: 46,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    actionBtn: {
      width: "48%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    installBtnText: {
      color: "white",
      fontSize: 14,
      fontWeight: "600",
    },
    detailsBtnText: {
      fontSize: 14,
      fontWeight: "500",
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      marginHorizontal: 4,
      marginTop: 4,
      marginBottom: 8,
    },
    pendingCard: {
      borderRadius: 12,
      marginHorizontal: 4,
      marginBottom: 10,
      padding: 14,
    },
    pendingHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    pendingLabel: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 2,
    },
    pendingMeta: {
      fontSize: 12,
    },
    pendingBadge: {
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    pendingBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    pendingHint: {
      marginTop: 10,
      gap: 2,
    },
    pendingHintText: {
      fontSize: 12,
      lineHeight: 17,
    },
    pendingActionsRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    pendingActionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    pendingActionText: {
      fontSize: 13,
      fontWeight: "500",
    },
  });

// ─── PendingOrderCard ─────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const PendingOrderCard = ({
  record,
  onDismiss,
}: {
  record: PendingOrderRecord;
  onDismiss: () => void;
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { copied, copy } = useCopyFeedback();

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Order ${record.correlationId}`);
    const body = encodeURIComponent(
      `My order has been processing for a while.\n\nReference: ${record.correlationId}`,
    );
    Linking.openURL(`mailto:contact@kokio.app?subject=${subject}&body=${body}`);
  };

  return (
    <View style={[styles.pendingCard, { backgroundColor: colors.surface }]}>
      <View style={styles.pendingHeaderRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.pendingLabel, { color: colors.text }]} numberOfLines={1}>
            {record.planLabel ?? "Your eSIM order"}
          </Text>
          <Text style={[styles.pendingMeta, { color: colors.inactive }]}>
            {labelForPaymentMethod(record.paymentMethod)} · {timeAgo(record.createdAt)}
          </Text>
        </View>
        <View style={[styles.pendingBadge, { backgroundColor: colors.warning + "22" }]}>
          <Text style={[styles.pendingBadgeText, { color: colors.warning }]}>Processing</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => copy(record.correlationId)}
        style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}
        activeOpacity={0.7}
      >
        <Text style={[styles.pendingMeta, { color: colors.inactive, flex: 1 }]} numberOfLines={1}>
          Reference: {record.correlationId}
        </Text>
        <Ionicons
          name={copied ? "checkmark-circle" : "copy-outline"}
          size={16}
          color={copied ? colors.success : colors.mutedForeground}
        />
      </TouchableOpacity>

      <View style={styles.pendingHint}>
        <Text style={[styles.pendingHintText, { color: colors.inactive }]}>
          Haven&apos;t received your eSIM after a few minutes?
        </Text>
        <Text style={[styles.pendingHintText, { color: colors.inactive }]}>
          Reach out with this reference ID.
        </Text>
      </View>

      <View style={styles.pendingActionsRow}>
        <TouchableOpacity
          onPress={handleContactSupport}
          style={[styles.pendingActionBtn, { borderColor: colors.muted }]}
        >
          <Ionicons name="mail-outline" size={14} color={colors.text} />
          <Text style={[styles.pendingActionText, { color: colors.text }]}>Contact Support</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDismiss}
          style={[styles.pendingActionBtn, { borderColor: colors.muted }]}
        >
          <Text style={[styles.pendingActionText, { color: colors.mutedForeground }]}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── OrderCard ────────────────────────────────────────────────────────────────

const OrderCard = ({
  order,
  onInstall,
  isExpanded,
  onToggle,
}: {
  order: EnrichedOrder;
  onInstall?: (lpa: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const [showPurchaseDetails, setShowPurchaseDetails] = useState(false);

  const statusColor = colorForStatus(order.orderStatus);

  const isInstalled = order.esim?.activationStatus === "INSTALLED";
  const esimWalletId = order.esim?.esimId ?? null;

  const openEsimWallet = () => {
    if (!esimWalletId || !order.esim) return;
    router.push({
      pathname: "/(tabs)/(wallet)/esim-wallet",
      params: { esimId: esimWalletId, name: esimDisplayName(order.esim) },
    });
  };

  const ESIM_STATUS_COLOR: Record<ActivationStatus, string> = {
    RELEASED:    colors.info,
    INSTALLED:   colors.success,
    UNAVAILABLE: colors.warning,
    DEACTIVATED: colors.destructive,
  };

  const canHaveUsage =
    order.esim?.activationStatus === "RELEASED" || order.esim?.activationStatus === "INSTALLED";
  const { usage, isLoading: usageLoading, isError: usageIsError, usageUnavailable } =
    useEsimUsage(isExpanded && canHaveUsage ? order.eSimRef : undefined);

  // True once the vendor returns real usage data, not just activationStatus.
  const hasConfirmedInstall = isInstalled || (!!usage && usage.usageError == null);

  const remainingDataText = !hasConfirmedInstall
    ? "—"
    : usageLoading
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

  // LPA string: prefer the smdpAddress+matchingId pair from the live eSIM doc
  // (authoritative); fall back to the qrcode stored on installationDetails.
  const lpa =
    order.esim?.smdpAddress && order.esim?.matchingId
      ? `LPA:1$${order.esim.smdpAddress}$${order.esim.matchingId}`
      : order.esim?.installationDetails?.qrcode ?? null;

  const invoiceUrl = order.stripeInvoiceUrl ?? null;
  const flagged    = isUserActionableManualReview(order.flaggedForManualReview, order.manualReviewReason);
  // idempotencyKey is the correlation id equivalent on OrderListItem.
  const supportRef = order.idempotencyKey ?? order.orderId ?? null;

  // Display card: built from the linked ESimDocument when available.
  // Falls back to a minimal placeholder when the eSIM doc hasn't been provisioned yet
  const displayItem: Esim | null = order.esim ? esimDocToDisplayItem(order.esim) : null;

  return (
    <View style={styles.orderCardWrapper}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
        {displayItem && order.esim ? (
          <ESIMItem
            item={displayItem}
            showBuyButton={false}
            title={<EsimLabelEditor doc={order.esim} color={colors.cardForeground} />}
          />
        ) : (
          // Fallback header for orders without a linked eSIM document
          <View style={{ padding: 12 }}>
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              {order.planId ?? "Order"}
            </Text>
          </View>
        )}

        <View style={styles.orderMeta}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            {order.orderStatus ? (
              <View
                style={[styles.orderStatusBadge, { backgroundColor: statusColor + "22" }]}
              >
                <Text style={[styles.orderStatusText, { color: statusColor }]}>
                  {labelForStatus(order.orderStatus)}
                </Text>
              </View>
            ) : null}
            {flagged ? (
              <View
                style={[
                  styles.orderStatusBadge,
                  { backgroundColor: colors.goldenYellow + "22" },
                ]}
              >
                <Text
                  style={[styles.orderStatusText, { color: colors.goldenYellow }]}
                >
                  Under Review
                </Text>
              </View>
            ) : null}
            {order.paymentMethod === "DEVICE_WALLET" ? (
              <Ionicons
                name="wallet-outline"
                size={14}
                color={colors.mutedForeground}
                accessibilityLabel="Paid with device wallet"
              />
            ) : null}
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.mutedForeground}
              style={{ marginLeft: "auto" }}
            />
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
          {order.esim ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.inactive }]}>
                  Data Remaining
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
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
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.inactive }]}>
                  Status
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: ESIM_STATUS_COLOR[order.esim.activationStatus] },
                  ]}
                >
                  {ESIM_STATUS_LABEL[order.esim.activationStatus]}
                </Text>
              </View>
            </>
          ) : null}
          {lpa && !hasConfirmedInstall && Platform.OS === "android" ? (
            <CopyRow
              label="LPA String"
              value={lpa}
              displayValue="Install using this Code in SIM settings"
              valueColor={isDark ? "white" : undefined}
              variant="inline"
            />
          ) : null}

          <View style={styles.actionRow}>
            {lpa && onInstall && !hasConfirmedInstall ? (
              <TouchableOpacity
                onPress={() => onInstall(lpa)}
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="download-outline" size={15} color="white" />
                <Text style={styles.installBtnText}>Install eSIM</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => setShowPurchaseDetails(true)}
              style={[
                styles.actionBtn,
                hasConfirmedInstall
                  ? { backgroundColor: colors.primary }
                  : { borderWidth: 1, borderColor: colors.muted },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={15}
                color={hasConfirmedInstall ? "white" : colors.text}
              />
              <Text
                style={[
                  hasConfirmedInstall ? styles.installBtnText : styles.detailsBtnText,
                  { color: hasConfirmedInstall ? "white" : colors.text },
                ]}
              >
                Purchase Details
              </Text>
            </TouchableOpacity>
          </View>

          {isInstalled && esimWalletId ? (
            <TouchableOpacity
              onPress={openEsimWallet}
              style={[styles.walletBtn, { backgroundColor: colors.primary, borderWidth: 0 }]}
              accessibilityRole="button"
              accessibilityLabel="Open eSIM wallet"
              hitSlop={6}
            >
              <Ionicons name="wallet-outline" size={18} color="white" />
            </TouchableOpacity>
          ) : isInstalled ? (
            // esim.esimId (the on-chain wallet address) is backfilled only as
            // part of device-wallet deployment during fulfilment, so it can
            // stay null for a while after the eSIM itself is installed - show
            // that it's in progress rather than silently showing nothing.
            <View
              style={[styles.walletBtn, { borderColor: colors.mutedForeground }]}
              accessibilityLabel="eSIM wallet is being set up"
            >
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          ) : null}
        </View>
      )}

      <PurchaseDetailsSheet
        visible={showPurchaseDetails}
        onClose={() => setShowPurchaseDetails(false)}
        order={order}
        invoiceUrl={invoiceUrl}
        lpa={lpa}
        supportRef={supportRef}
      />
    </View>
  );
};

// ─── OrdersScreen ─────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
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
            <Text style={styles.refreshHint}>Swipe down to refresh</Text>
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
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            ListHeaderComponent={
              pendingOrders.length > 0 ? (
                <View>
                  <Text style={[styles.sectionHeader, { color: colors.inactive }]}>
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
                    <Text style={[styles.sectionHeader, { color: colors.inactive }]}>
                      History
                    </Text>
                  ) : null}
                </View>
              ) : undefined
            }
            ListFooterComponent={<Text style={styles.refreshHint}>Swipe down to refresh</Text>}
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
