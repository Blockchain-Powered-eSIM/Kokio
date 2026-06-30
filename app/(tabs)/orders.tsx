import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import _get from "lodash/get";
import { openBrowserAsync } from "expo-web-browser";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useKokio } from "@/hooks/useKokio";
import type { StoredPurchasedESIM, StoredTransactionData } from "@/providers/kokioProvider";
import { getAllEsims, getEsim } from "@/utils/bff/esim";
import type { ESimDocument } from "@/utils/bff/esim";
import { labelForStatus, colorForStatus } from "@/utils/orderStatus";
import ESIMItem from "@/components/ESIMItem";
import { ESIM_EXTRA_DETAILS } from "@/constants/checkout.constants";

type EnrichedOrder = StoredPurchasedESIM & {
  liveEsim?: ESimDocument;
};

// ── Styles ────────────────────────────────────────────────────────────────────

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
    extraDetailsContainer: {
      gap: 10,
      marginBottom: 14,
    },
    extraDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    extraDetailLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    extraDetailLabelText: {
      fontSize: 13,
    },
    extraDetailValue: {
      fontSize: 13,
      fontWeight: "500",
      maxWidth: "55%",
      textAlign: "right",
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
      fontSize: 13,
      fontWeight: "600",
    },
    detailsBtnText: {
      fontSize: 13,
      fontWeight: "600",
    },
    supportBar: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    supportBarLabel: {
      fontSize: 12,
      marginBottom: 8,
      textAlign: "center",
    },
    supportBtns: {
      flexDirection: "row",
      gap: 10,
    },
    supportBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
    },
    supportBtnText: {
      fontSize: 13,
      fontWeight: "600",
    },
  });

// ── Purchase Details modal stylesheet ─────────────────────────────────────────

const pdStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "75%",
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: 10,
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
    paddingVertical: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
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

// ── CopyRow ───────────────────────────────────────────────────────────────────

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
        <Text style={[pdStyles.copyValue, { color: Theme.colors.cardForeground }]} numberOfLines={2}>
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

// ── PurchaseDetailsModal ──────────────────────────────────────────────────────

const PurchaseDetailsModal = ({
  visible,
  onClose,
  transactionData,
  liveEsim,
  invoiceUrl,
  lpa,
  supportRef,
}: {
  visible: boolean;
  onClose: () => void;
  transactionData: StoredTransactionData;
  liveEsim?: ESimDocument;
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
      <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
      <View style={[pdStyles.sheet, { backgroundColor: Theme.colors.card }]}>
        <View style={pdStyles.sheetHeader}>
          <View style={pdStyles.pillHandle} />
        </View>
        <View style={pdStyles.titleRow}>
          <Text style={[pdStyles.title, { color: Theme.colors.cardForeground }]}>
            Purchase Details
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={24} color={Theme.colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
          {transactionData.iccid ? <CopyRow label="ICCID" value={transactionData.iccid} /> : null}
          {supportRef ? <CopyRow label="Reference" value={supportRef} /> : null}
          {lpa ? <CopyRow label="LPA String" value={lpa} /> : null}

          {transactionData.paymentMethod ? (
            <View style={pdStyles.infoRow}>
              <Text style={[pdStyles.infoLabel, { color: Theme.colors.inactive }]}>
                Payment Method
              </Text>
              <Text style={[pdStyles.infoValue, { color: Theme.colors.cardForeground }]}>
                {transactionData.paymentMethod}
              </Text>
            </View>
          ) : null}

          {transactionData.orderStatus ? (
            <View style={pdStyles.infoRow}>
              <Text style={[pdStyles.infoLabel, { color: Theme.colors.inactive }]}>Status</Text>
              <Text
                style={[pdStyles.infoValue, { color: colorForStatus(transactionData.orderStatus) }]}
              >
                {labelForStatus(transactionData.orderStatus)}
              </Text>
            </View>
          ) : null}

          {invoiceUrl ? (
            <TouchableOpacity onPress={() => Linking.openURL(invoiceUrl)} style={pdStyles.infoRow}>
              <Text style={[pdStyles.infoLabel, { color: Theme.colors.inactive }]}>Invoice</Text>
              <Text style={{ color: Theme.colors.highlight, fontSize: 13, fontWeight: "500" }}>
                View invoice →
              </Text>
            </TouchableOpacity>
          ) : null}

          {liveEsim?.planHistory?.length ? (
            <View>
              <Text style={[pdStyles.sectionLabel, { color: Theme.colors.inactive }]}>
                Plan History
              </Text>
              {liveEsim.planHistory.map((entry, i) => (
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

// ── OrderCard ─────────────────────────────────────────────────────────────────

const OrderCard = ({
  order,
  onInstall,
  expandOrderId,
}: {
  order: EnrichedOrder;
  onInstall?: (lpa: string) => void;
  expandOrderId?: string;
}) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showPurchaseDetails, setShowPurchaseDetails] = useState(false);

  useEffect(() => {
    if (!expandOrderId) return;
    const { correlationId, orderId } = order.transactionData;
    if (expandOrderId === correlationId || expandOrderId === orderId) {
      setExpanded(true);
    }
  }, [expandOrderId, order.transactionData]);

  const { eSimItem, transactionData, liveEsim } = order;
  const statusColor = colorForStatus(transactionData.orderStatus);

  const lpa =
    liveEsim?.smdpAddress && liveEsim?.matchingId
      ? `LPA:1$${liveEsim.smdpAddress}$${liveEsim.matchingId}`
      : transactionData.installationDetails?.qrcode ?? null;

  const invoiceUrl = transactionData.stripeInvoiceUrl ?? null;
  const flagged = transactionData.flaggedForManualReview ?? false;
  const supportRef = transactionData.correlationId ?? transactionData.orderId;

  const extraDetailRows = useMemo(() => {
    return ESIM_EXTRA_DETAILS.filter((item) => {
      if (["IP_ROUTING", "ADDITIONAL_INFORMATION", "countryWiseNetworkCoverages"].includes(item.key))
        return false;
      const raw = _get(eSimItem, item.key);
      if (raw === null || raw === undefined) return false;
      const formatted = item.formatter?.(raw);
      return formatted && formatted !== "N/A";
    });
  }, [eSimItem]);

  const coverageCount = eSimItem.countryWiseNetworkCoverages?.length ?? 0;

  return (
    <View style={styles.orderCardWrapper}>
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.85}
      >
        <ESIMItem item={eSimItem} showBuyButton={false} />
        <View style={styles.orderMeta}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            {transactionData.orderStatus ? (
              <View style={[styles.orderStatusBadge, { backgroundColor: statusColor + "22" }]}>
                <Text style={[styles.orderStatusText, { color: statusColor }]}>
                  {labelForStatus(transactionData.orderStatus)}
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
                <Text style={[styles.orderStatusText, { color: Theme.colors.goldenYellow }]}>
                  Under Review
                </Text>
              </View>
            ) : null}
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={Theme.colors.mutedForeground}
              style={{ marginLeft: "auto" }}
            />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.detailSection, { backgroundColor: Theme.colors.surface }]}>
          {(extraDetailRows.length > 0 || coverageCount > 0) && (
            <View style={styles.extraDetailsContainer}>
              {extraDetailRows.map((item, idx) => {
                const raw = _get(eSimItem, item.key);
                const formatted = item.formatter?.(raw);
                return (
                  <View key={idx} style={styles.extraDetailRow}>
                    <View style={styles.extraDetailLabel}>
                      <Ionicons
                        name={item.iconName as any}
                        size={15}
                        color={Theme.colors.inactive}
                      />
                      <Text
                        style={[styles.extraDetailLabelText, { color: Theme.colors.inactive }]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    <Text
                      style={[styles.extraDetailValue, { color: Theme.colors.text }]}
                      numberOfLines={2}
                    >
                      {formatted}
                    </Text>
                  </View>
                );
              })}
              {coverageCount > 0 && (
                <View style={styles.extraDetailRow}>
                  <View style={styles.extraDetailLabel}>
                    <Ionicons name="cellular-outline" size={15} color={Theme.colors.inactive} />
                    <Text style={[styles.extraDetailLabelText, { color: Theme.colors.inactive }]}>
                      Coverage
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/(shop)/coverage",
                        params: {
                          data: JSON.stringify(eSimItem.countryWiseNetworkCoverages),
                        },
                      })
                    }
                    style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: Theme.colors.text }}>
                      {coverageCount} {coverageCount === 1 ? "country" : "countries"}
                    </Text>
                    <Ionicons name="chevron-forward" size={13} color={Theme.colors.text} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

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
        transactionData={transactionData}
        liveEsim={liveEsim}
        invoiceUrl={invoiceUrl}
        lpa={lpa}
        supportRef={supportRef}
      />
    </View>
  );
};

// ── OrdersScreen ──────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const { kokio } = useKokio();
  const router = useRouter();
  const bg = useThemeColor({}, "background");
  const { expandOrderId } = useLocalSearchParams<{ expandOrderId?: string }>();
  const orders = kokio.purchasedESIMs;
  const [enrichedOrders, setEnrichedOrders] = useState<EnrichedOrder[]>(orders);

  useEffect(() => {
    setEnrichedOrders(orders);
  }, [orders]);

  useEffect(() => {
    let cancelled = false;
    const fetchLive = async () => {
      try {
        const liveEsims = await getAllEsims();
        const liveMap = new Map<string, ESimDocument>(liveEsims.map(e => [e.esimId, e]));

        orders.forEach(async (order, i) => {
          const { transactionData } = order;

          // Resolve live eSIM doc — try the map first, fall back to direct fetch
          let live = transactionData.esimId ? liveMap.get(transactionData.esimId) : undefined;
          if (!live && transactionData.esimId) {
            live = await getEsim(transactionData.esimId).catch(() => undefined);
          }
          if (!live) return; // nothing new to add

          const enriched: EnrichedOrder = {
            ...order,
            liveEsim: live,
            transactionData: {
              ...transactionData,
              iccid: live.iccid ?? transactionData.iccid,
              orderStatus: live.activationStatus ?? transactionData.orderStatus,
              planId: live.planId ?? transactionData.planId,
              installationDetails: live.installationDetails ?? transactionData.installationDetails,
            },
          };

          if (!cancelled) {
            setEnrichedOrders((prev) => {
              const next = [...prev];
              next[i] = enriched;
              return next;
            });
          }
        });
      } catch {
        // live fetch failed — stored data already shown
      }
    };
    fetchLive();
    return () => {
      cancelled = true;
    };
  }, [orders]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["bottom"]}>
      <ThemedView style={styles.container}>
        {enrichedOrders.length === 0 ? (
          <ThemedText style={styles.emptyText}>No orders yet.</ThemedText>
        ) : (

          <FlatList
            data={enrichedOrders}
            keyExtractor={(item) =>
              item.transactionData.correlationId ??
              item.transactionData.orderId ??
              item.transactionData.iccid ??
              Math.random().toString()
            }
            renderItem={({ item }) => (
              <OrderCard
                order={item}
                expandOrderId={expandOrderId}
                onInstall={(lpa) =>
                  router.push({ pathname: "/(tabs)/installation", params: { qrcode: lpa } })
                }
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        )}
      </ThemedView>

      <View
        style={[
          styles.supportBar,
          { backgroundColor: Theme.colors.card, borderTopColor: Theme.colors.muted },
        ]}
      >
        <Text style={[styles.supportBarLabel, { color: Theme.colors.inactive }]}>
          Need help with your eSIM?
        </Text>
        <View style={styles.supportBtns}>
          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:contact@kokio.app")}
            style={[styles.supportBtn, { backgroundColor: Theme.colors.surface }]}
          >
            <Ionicons name="mail-outline" size={15} color={Theme.colors.text} />
            <Text style={[styles.supportBtnText, { color: Theme.colors.text }]}>Email Us</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openBrowserAsync("https://t.me/+Ru38DI2V69IyY2Y9")}
            style={[styles.supportBtn, { backgroundColor: Theme.colors.surface }]}
          >
            <Ionicons name="paper-plane-outline" size={15} color={Theme.colors.text} />
            <Text style={[styles.supportBtnText, { color: Theme.colors.text }]}>Telegram</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
