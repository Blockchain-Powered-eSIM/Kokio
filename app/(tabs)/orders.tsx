import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { ESimDocument, PlanHistoryEntry } from "@/utils/bff/esim";
import type { OrderListItem } from "@/utils/bff/order";
import { labelForStatus, colorForStatus } from "@/utils/orderStatus";
import ESIMItem from "@/components/ESIMItem";
import type { Esim } from "@/components/ESIMItem";
import { useEsims, useOrders } from "@/hooks/useDeviceEsims";

// ─── Types ────────────────────────────────────────────────────────────────────

// An OrderListItem enriched with its matched ESimDocument, joined by esimId.
type EnrichedOrder = OrderListItem & {
  esim?: ESimDocument;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Key used for FlatList and expand/collapse tracking.
const getOrderKey = (item: EnrichedOrder): string =>
  item.idempotencyKey ?? item.orderId ?? "";

// Builds the minimal Esim display shape from an ESimDocument for ESIMItem.
// Uses the most-recent PlanHistoryEntry for plan metadata.
function toDisplayItem(doc: ESimDocument): Esim {
  const entries: PlanHistoryEntry[] = doc.planHistory ?? [];
  const latest = entries[entries.length - 1] as PlanHistoryEntry | undefined;
  return {
    catalogueId:        '',
    actualSellingPrice: 0,
    isUnlimited:        latest?.isUnlimited   ?? false,
    serviceRegionCode:  undefined,
    serviceRegionFlag:  latest?.serviceRegionFlag ?? null,
    serviceRegionName:  latest?.serviceRegionName ?? null,
    coverageType:       latest?.coverageType      ?? 'LOCAL',
    data:               latest?.data              ?? null,
    sms:                latest?.sms               ?? null,
    voice:              latest?.voice             ?? null,
    validity:           latest?.validity          ?? null,
    info:               null,
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = () =>
  StyleSheet.create({
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
      color: Theme.colors.text,
      fontSize: 15,
      lineHeight: 24,
      opacity: 0.9,
      textAlign: "center",
      marginTop: 32,
    },
    detailSection: {
      borderRadius: 12,
      marginHorizontal: 4,
      marginTop: 2,
      marginBottom: 8,
      padding: 14,
    },
    actionRow: {
      flexDirection: "row",
      gap: 8,
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

const pdStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Theme.colors.overlayMedium,
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
    backgroundColor: Theme.colors.muted,
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
    borderBottomColor: Theme.colors.muted,
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
    borderBottomColor: Theme.colors.muted,
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
    borderBottomColor: Theme.colors.muted,
  },
});

// ─── CopyRow ──────────────────────────────────────────────────────────────────

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <TouchableOpacity onPress={handleCopy} style={pdStyles.copyRow} activeOpacity={0.7}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[pdStyles.copyLabel, { color: Theme.colors.inactive }]}>{label}</Text>
        <Text
          style={[pdStyles.copyValue, { color: Theme.colors.cardForeground }]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
      <Ionicons
        name={copied ? "checkmark-circle" : "copy-outline"}
        size={18}
        color={copied ? Theme.colors.success : Theme.colors.mutedForeground}
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
}: {
  visible: boolean;
  onClose: () => void;
  order: EnrichedOrder;
  invoiceUrl: string | null;
  lpa: string | null;
  supportRef: string | null;
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
      <View style={[pdStyles.sheet, { backgroundColor: Theme.colors.card }]}>
        <View style={pdStyles.sheetHeader}>
          <View style={pdStyles.pillHandle} />
        </View>
        <View style={pdStyles.titleRow}>
          <Text style={[pdStyles.title, { color: Theme.colors.cardForeground }]}>
            Purchase Details
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons
              name="close-circle-outline"
              size={24}
              color={Theme.colors.mutedForeground}
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
              <Text style={[pdStyles.infoLabel, { color: Theme.colors.inactive }]}>
                Payment Method
              </Text>
              <Text style={[pdStyles.infoValue, { color: Theme.colors.cardForeground }]}>
                {order.paymentMethod}
              </Text>
            </View>
          ) : null}

          {order.orderStatus ? (
            <View style={pdStyles.infoRow}>
              <Text style={[pdStyles.infoLabel, { color: Theme.colors.inactive }]}>Status</Text>
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
              <Text style={[pdStyles.infoLabel, { color: Theme.colors.inactive }]}>Invoice</Text>
              <Text style={{ color: Theme.colors.link, fontSize: 13, fontWeight: "500" }}>
                View invoice →
              </Text>
            </TouchableOpacity>
          ) : null}

          {order.esim?.planHistory?.length ? (
            <View>
              <Text style={[pdStyles.sectionLabel, { color: Theme.colors.inactive }]}>
                Plan History
              </Text>
              {order.esim.planHistory.map((entry, i) => (
                <View key={i} style={pdStyles.planHistoryRow}>
                  <Text style={{ color: Theme.colors.cardForeground, fontSize: 13 }}>
                    {entry.planId}
                  </Text>
                  <Text style={{ color: Theme.colors.inactive, fontSize: 12 }}>
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
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  // const router = useRouter();
  const [showPurchaseDetails, setShowPurchaseDetails] = useState(false);

  const statusColor = colorForStatus(order.orderStatus);

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
  const displayItem: Esim | null = order.esim ? toDisplayItem(order.esim) : null;

  return (
    <View style={styles.orderCardWrapper}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
        {displayItem ? (
          <ESIMItem item={displayItem} showBuyButton={false} />
        ) : (
          // Fallback header for orders without a linked eSIM document
          <View style={{ padding: 12 }}>
            <Text style={{ color: Theme.colors.text, fontWeight: "600" }}>
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
                  { backgroundColor: Theme.colors.goldenYellow + "22" },
                ]}
              >
                <Text
                  style={[styles.orderStatusText, { color: Theme.colors.goldenYellow }]}
                >
                  Under Review
                </Text>
              </View>
            ) : null}
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={Theme.colors.mutedForeground}
              style={{ marginLeft: "auto" }}
            />
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.detailSection, { backgroundColor: Theme.colors.surface }]}>
          <View style={styles.actionRow}>
            {lpa && onInstall ? (
              <TouchableOpacity
                onPress={() => onInstall(lpa)}
                style={[styles.actionBtn, { backgroundColor: Theme.colors.primary }]}
              >
                <Ionicons name="download-outline" size={15} color="white" />
                <Text style={styles.installBtnText}>Install eSIM</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => setShowPurchaseDetails(true)}
              style={[styles.actionBtn, { borderWidth: 1, borderColor: Theme.colors.muted }]}
            >
              <Ionicons name="receipt-outline" size={15} color={Theme.colors.text} />
              <Text style={[styles.detailsBtnText, { color: Theme.colors.text }]}>
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
      />
    </View>
  );
};

// ─── OrdersScreen ─────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const router = useRouter();
  const bg = useThemeColor({}, "background");
  const { expandOrderId } = useLocalSearchParams<{ expandOrderId?: string }>();

  const { esims, isLoading: esimsLoading } = useEsims();
  const { orders, isLoading: ordersLoading } = useOrders();

  const isLoading = esimsLoading || ordersLoading;

  // Join orders with their matching ESimDocument by esimId.
  const enrichedOrders = useMemo<EnrichedOrder[]>(() => {
    const esimMap = new Map<string, ESimDocument>(esims.map((e) => [e.esimId, e]));
    return orders.map((order) => ({
      ...order,
      esim: order.esimId ? esimMap.get(order.esimId) : undefined,
    }));
  }, [orders, esims]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Collapse all cards when leaving the Orders tab.
  useFocusEffect(
    useCallback(() => {
      return () => setExpandedId(null);
    }, []),
  );

  // Auto-expand the card referenced by the URL param.
  // Matches on idempotencyKey, orderId, or esimId
  useEffect(() => {
    if (!expandOrderId || enrichedOrders.length === 0) return;
    const matched = enrichedOrders.find(
      (o) =>
        o.idempotencyKey === expandOrderId ||
        o.orderId        === expandOrderId ||
        o.esimId         === expandOrderId,
    );
    if (matched) setExpandedId(getOrderKey(matched));
  }, [expandOrderId, enrichedOrders]);

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
          <ThemedText style={styles.emptyText}>No orders yet.</ThemedText>
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
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
