import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  FlatList,
  Linking,
  Modal,
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
import { labelForStatus, colorForStatus } from "@/utils/orderStatus";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { useEsimUsage } from "@/hooks/useEsimUsage";
import type { ESimDocument } from "@/utils/bff/esim";
import type { OrderListItem } from "@/utils/bff/order";
import ESIMItem from "@/components/ESIMItem";
import type { Esim } from "@/components/ESIMItem";
import { esimDocToDisplayItem } from "@/helpers/esimDisplay";
import { useEsims, useOrders } from "@/hooks/useDeviceEsims";

// ─── eSIM activation-status labeling ─────────────────────────────────────────

type ActivationStatus = ESimDocument["activationStatus"];

const ESIM_STATUS_LABEL: Record<ActivationStatus, string> = {
  RELEASED:    "Ready to Install",
  INSTALLED:   "Active",
  UNAVAILABLE: "Unavailable",
  DEACTIVATED: "Deactivated",
};

// ─── Types ────────────────────────────────────────────────────────────────────

// An OrderListItem enriched with its matched ESimDocument, joined by esimId.
type EnrichedOrder = OrderListItem & {
  esim?: ESimDocument;
};

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
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    actionBtn: {
      flex: 1,
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
  });

// ─── Purchase Details Modal styles ────────────────────────────────────────────

const purchaseStyles = (colors: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlayMedium,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  pillHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.muted,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.muted,
  },
  copyLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  copyValue: {
    fontSize: 13,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.muted,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 4,
  },
  planHistoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.muted,
  },
});

// ─── CopyRow ──────────────────────────────────────────────────────────────────

const CopyRow = ({
  label,
  value,
  displayValue,
  valueColor,
}: {
  label: string;
  value: string;
  // Text shown in place of `value` (which is still what gets copied) — used
  // when the raw value (e.g. an LPA string) is unhelpful to show as-is.
  displayValue?: string;
  // Overrides the default value text color (colors.cardForeground) — used
  // when a caller renders this row against a background other than colors.card.
  valueColor?: string;
}) => {
  const pdStyles = useThemedStyles(purchaseStyles);
  const colors = useColors();
  const { copied, copy } = useCopyFeedback();
  return (
    <TouchableOpacity onPress={() => copy(value)} style={pdStyles.copyRow} activeOpacity={0.7}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[pdStyles.copyLabel, { color: colors.inactive }]}>{label}</Text>
        <Text
          style={[pdStyles.copyValue, { color: valueColor ?? colors.cardForeground }]}
          numberOfLines={2}
        >
          {displayValue ?? value}
        </Text>
      </View>
      <Ionicons
        name={copied ? "checkmark-circle" : "copy-outline"}
        size={18}
        color={copied ? colors.success : colors.mutedForeground}
      />
    </TouchableOpacity>
  );
};

// ─── PurchaseDetailsModal ─────────────────────────────────────────────────────

const PurchaseDetailsModal = ({
  visible,
  onClose,
  order,
  invoiceUrl,
  lpa,
  supportRef,
  colors,
  pdStyles,
}: {
  visible: boolean;
  onClose: () => void;
  order: EnrichedOrder;
  invoiceUrl: string | null;
  lpa: string | null;
  supportRef: string | null;
  colors: Palette;
  pdStyles: ReturnType<typeof purchaseStyles>;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <View style={pdStyles.overlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        activeOpacity={1}
      />
      <View style={[pdStyles.sheet, { backgroundColor: colors.card }]}>
        <View style={pdStyles.sheetHeader}>
          <View style={pdStyles.pillHandle} />
        </View>
        <View style={pdStyles.titleRow}>
          <Text style={[pdStyles.title, { color: colors.cardForeground }]}>
            Purchase Details
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons
              name="close-circle-outline"
              size={24}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {order.iccid ? <CopyRow label="ICCID" value={order.iccid} /> : null}
          {supportRef ? <CopyRow label="Reference" value={supportRef} /> : null}
          {lpa ? <CopyRow label="LPA String" value={lpa} /> : null}

          {order.paymentMethod ? (
            <View style={pdStyles.infoRow}>
              <Text style={[pdStyles.infoLabel, { color: colors.inactive }]}>
                Payment Method
              </Text>
              <Text style={[pdStyles.infoValue, { color: colors.cardForeground }]}>
                {order.paymentMethod}
              </Text>
            </View>
          ) : null}

          {order.orderStatus ? (
            <View style={pdStyles.infoRow}>
              <Text style={[pdStyles.infoLabel, { color: colors.inactive }]}>Status</Text>
              <Text
                style={[pdStyles.infoValue, { color: colorForStatus(order.orderStatus) }]}
              >
                {labelForStatus(order.orderStatus)}
              </Text>
            </View>
          ) : null}

          {invoiceUrl ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(invoiceUrl)}
              style={pdStyles.infoRow}
            >
              <Text style={[pdStyles.infoLabel, { color: colors.inactive }]}>Invoice</Text>
              <Text style={{ color: colors.link, fontSize: 13, fontWeight: "500" }}>
                View invoice →
              </Text>
            </TouchableOpacity>
          ) : null}

          {order.esim?.planHistory?.length ? (
            <View>
              <Text style={[pdStyles.sectionLabel, { color: colors.inactive }]}>
                Plan History
              </Text>
              {order.esim.planHistory.map((entry, i) => (
                <View key={i} style={pdStyles.planHistoryRow}>
                  <Text style={{ color: colors.cardForeground, fontSize: 13 }}>
                    {entry.planId}
                  </Text>
                  <Text style={{ color: colors.inactive, fontSize: 12 }}>
                    {entry.validity}d · {new Date(entry.purchaseDate).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

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
  const pdStyles = useThemedStyles(purchaseStyles);
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();
  const [showPurchaseDetails, setShowPurchaseDetails] = useState(false);

  const statusColor = colorForStatus(order.orderStatus);

  const isInstalled = order.esim?.activationStatus === "INSTALLED";

  const ESIM_STATUS_COLOR: Record<ActivationStatus, string> = {
    RELEASED:    colors.info,
    INSTALLED:   colors.success,
    UNAVAILABLE: colors.warning,
    DEACTIVATED: colors.destructive,
  };

  // Remaining data is only meaningful once installed, and fetched only for the
  // expanded card, not for every card in the list.
  const { usage, isLoading: usageLoading, isError: usageIsError, usageUnavailable } =
    useEsimUsage(isExpanded && isInstalled ? order.esimId ?? undefined : undefined);

  const remainingDataText = !isInstalled
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
  const flagged    = order.flaggedForManualReview ?? false;
  // idempotencyKey is the correlation id equivalent on OrderListItem.
  const supportRef = order.idempotencyKey ?? order.orderId ?? null;

  // Display card: built from the linked ESimDocument when available.
  // Falls back to a minimal placeholder when the eSIM doc hasn't been provisioned yet
  const displayItem: Esim | null = order.esim ? esimDocToDisplayItem(order.esim) : null;

  return (
    <View style={styles.orderCardWrapper}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
        {displayItem ? (
          <ESIMItem item={displayItem} showBuyButton={false} />
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
          {order.iccid ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.inactive }]}>ICCID</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {order.iccid}
              </Text>
            </View>
          ) : null}

          {lpa && !isInstalled && Platform.OS === "android" ? (
            <CopyRow
              label="LPA String"
              value={lpa}
              displayValue="Install using this Code in SIM settings"
              valueColor={isDark ? "white" : undefined}
            />
          ) : null}

          <View style={styles.actionRow}>
            {lpa && onInstall ? (
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
              style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.muted }]}
            >
              <Ionicons name="receipt-outline" size={15} color={colors.text} />
              <Text style={[styles.detailsBtnText, { color: colors.text }]}>
                Purchase Details
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <PurchaseDetailsModal
        visible={showPurchaseDetails}
        onClose={() => setShowPurchaseDetails(false)}
        order={order}
        invoiceUrl={invoiceUrl}
        lpa={lpa}
        supportRef={supportRef}
        colors={colors}
        pdStyles={pdStyles}
      />
    </View>
  );
};

// ─── OrdersScreen ─────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const bg = useThemeColor({}, "background");
  const { expandOrderId } = useLocalSearchParams<{ expandOrderId?: string }>();

  const { esims, isLoading: esimsLoading, refetch: refetchEsims } = useEsims();
  const { orders, isLoading: ordersLoading, refetch: refetchOrders } = useOrders();

  const isLoading = esimsLoading || ordersLoading;

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchEsims(), refetchOrders()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchEsims, refetchOrders]);

  // Join orders with their matching ESimDocument by esimId.
  const enrichedOrders = useMemo<EnrichedOrder[]>(() => {
    const esimMap = new Map<string, ESimDocument>(esims.map((e) => [e.esimId, e]));
    return orders.map((order) => ({
      ...order,
      esim: order.esimId ? esimMap.get(order.esimId) : undefined,
    }));
  }, [orders, esims]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Default: the eSIM targeted via expandOrderId (e.g. tapped from Home) if
  // present, otherwise the top-most order — open until the user selects a
  // different one. Re-derived on every arrival at this tab (and as data
  // loads), matching on idempotencyKey, orderId, or esimId.
  useFocusEffect(
    useCallback(() => {
      if (enrichedOrders.length === 0) return;
      const matched = expandOrderId
        ? enrichedOrders.find(
            (o) =>
              o.idempotencyKey === expandOrderId ||
              o.orderId        === expandOrderId ||
              o.esimId         === expandOrderId,
          )
        : undefined;
      setExpandedId(getOrderKey(matched ?? enrichedOrders[0]));
    }, [expandOrderId, enrichedOrders]),
  );

  const handleInstall = useCallback((lpa: string) => {
    // Parse LPA string: LPA:1$<smdpAddress>$<matchingId>
    const parts = lpa.split("$");
    const qrcode = lpa;
    const appleInstallationUrl = parts[1] && parts[2]
      ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${lpa}`
      : "";
    router.navigate({
      pathname: "/(tabs)/installation",
      params: { qrcode, appleInstallationUrl, iccid: "", orderId: "" },
    });
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["bottom"]}>
      <ThemedView style={styles.container}>
        {isLoading ? (
          <ThemedText style={styles.emptyText}>Loading orders…</ThemedText>
        ) : enrichedOrders.length === 0 ? (
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
                onInstall={handleInstall}
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
    </SafeAreaView>
  );
}
