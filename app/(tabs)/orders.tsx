import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useKokio } from "@/hooks/useKokio";
import type { StoredPurchasedESIM } from "@/providers/kokioProvider";
import { getAllEsims, getEsim } from "@/utils/bff/esim";
import type { ESimDocument } from "@/utils/bff/esim";
import { getOrderStatus } from "@/utils/bff/order";
import type { OrderStatusResponse } from "@/utils/bff/order";
import { labelForStatus, colorForStatus } from "@/utils/orderStatus";
import ESIMItem from "@/components/ESIMItem";

type EnrichedOrder = StoredPurchasedESIM & {
  liveEsim?: ESimDocument;
  liveStatus?: OrderStatusResponse;
};

const createStyles = () => StyleSheet.create({
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
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
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyText: {
    color: Theme.colors.text,
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 32,
  },
});

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <TouchableOpacity onPress={handleCopy} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
      <Text style={{ color: Theme.colors.mutedForeground, fontSize: 11, flex: 1 }} numberOfLines={1}>
        {label}: <Text style={{ color: Theme.colors.foreground }}>{value}</Text>
      </Text>
      <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? Theme.colors.success : Theme.colors.mutedForeground} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
};

const OrderCard = ({ order, onInstall }: { order: EnrichedOrder; onInstall?: (lpa: string) => void }) => {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const [expanded, setExpanded] = useState(false);
  const { eSimItem, transactionData, liveEsim, liveStatus } = order;
  const statusColor = colorForStatus(transactionData.orderStatus);

  const lpa = liveEsim?.smdpAddress && liveEsim?.matchingId
    ? `LPA:1$${liveEsim.smdpAddress}$${liveEsim.matchingId}`
    : transactionData.installationDetails?.qrcode ?? null;

  const invoiceUrl = liveStatus?.stripeInvoiceUrl ?? null;
  const flagged = liveStatus?.flaggedForManualReview ?? false;
  const supportRef = transactionData.correlationId ?? transactionData.orderId;

  return (
    <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.85} style={styles.orderCardWrapper}>
      <ESIMItem item={eSimItem} showBuyButton={false} />
      <View style={styles.orderMeta}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {transactionData.orderStatus ? (
            <View style={[styles.orderStatusBadge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.orderStatusText, { color: statusColor }]}>
                {labelForStatus(transactionData.orderStatus)}
              </Text>
            </View>
          ) : null}
          {flagged ? (
            <View style={[styles.orderStatusBadge, { backgroundColor: Theme.colors.goldenYellow + '22' }]}>
              <Text style={[styles.orderStatusText, { color: Theme.colors.goldenYellow }]}>Under Review</Text>
            </View>
          ) : null}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Theme.colors.mutedForeground} style={{ marginLeft: 'auto' }} />
        </View>

        {expanded ? (
          <View style={{ marginTop: 10, gap: 2 }}>
            {transactionData.iccid ? <CopyRow label="ICCID" value={transactionData.iccid} /> : null}
            {supportRef ? <CopyRow label="Ref" value={supportRef} /> : null}
            {transactionData.paymentMethod ? (
              <Text style={{ color: Theme.colors.mutedForeground, fontSize: 11, marginTop: 6 }}>
                Payment: {transactionData.paymentMethod}
              </Text>
            ) : null}
            {invoiceUrl ? (
              <TouchableOpacity onPress={() => Linking.openURL(invoiceUrl)} style={{ marginTop: 8 }}>
                <Text style={{ color: Theme.colors.highlight, fontSize: 12 }}>View invoice →</Text>
              </TouchableOpacity>
            ) : null}
            {lpa ? (
              <>
                <CopyRow label="LPA" value={lpa} />
                {onInstall ? (
                  <TouchableOpacity onPress={() => onInstall(lpa)} style={{ marginTop: 8 }}>
                    <Text style={{ color: Theme.colors.highlight, fontSize: 12 }}>Install eSIM →</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : null}
            {liveEsim?.planHistory?.length ? (
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: Theme.colors.mutedForeground, fontSize: 11, marginBottom: 4 }}>Plan history</Text>
                {liveEsim.planHistory.map((entry, i) => (
                  <Text key={i} style={{ color: Theme.colors.foreground, fontSize: 11, marginBottom: 2 }}>
                    {entry.planId}  ·  {entry.validity}d  ·  {new Date(entry.purchaseDate).toLocaleDateString()}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default function OrdersScreen() {
  const { isDark } = useTheme();
  const styles = useMemo(createStyles, [isDark]);
  const { kokio } = useKokio();
  const router = useRouter();
  const bg = useThemeColor({}, "background");
  const orders = kokio.purchasedESIMs;
  const [enrichedOrders, setEnrichedOrders] = useState<EnrichedOrder[]>(orders);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchLive = async () => {
      setIsFetching(true);
      try {
        const liveEsims = await getAllEsims();
        const liveMap: Record<string, ESimDocument> = {};
        liveEsims.forEach(e => { liveMap[e.esimId] = e; });

        const merged = await Promise.all(orders.map(async (order): Promise<EnrichedOrder> => {
          const { transactionData } = order;

          // For orders with a known esimId, attach live ESimDocument
          if (transactionData.esimId && liveMap[transactionData.esimId]) {
            const live = liveMap[transactionData.esimId];
            const liveStatus = transactionData.correlationId
              ? await getOrderStatus(transactionData.correlationId).catch(() => undefined)
              : undefined;
            return {
              ...order,
              liveEsim: live,
              liveStatus,
              transactionData: {
                ...transactionData,
                iccid: live.iccid ?? transactionData.iccid,
                orderStatus: live.activationStatus ?? transactionData.orderStatus,
                planId: live.planId ?? transactionData.planId,
                installationDetails: live.installationDetails ?? transactionData.installationDetails,
              },
            };
          }

          // For pending/processing orders, re-fetch status via correlationId
          if (transactionData.correlationId && !transactionData.installationDetails?.qrcode) {
            try {
              const latest = await getOrderStatus(transactionData.correlationId);
              const liveEsim = latest.esimId
                ? liveMap[latest.esimId] ?? await getEsim(latest.esimId).catch(() => undefined)
                : undefined;
              return {
                ...order,
                liveEsim,
                liveStatus: latest,
                transactionData: {
                  ...transactionData,
                  orderId: latest.orderId || transactionData.orderId,
                  iccid: latest.iccid ?? transactionData.iccid,
                  orderStatus: latest.orderStatus ?? transactionData.orderStatus,
                  esimId: latest.esimId ?? transactionData.esimId,
                  installationDetails: liveEsim?.installationDetails ?? latest.installationDetails ?? transactionData.installationDetails,
                },
              };
            } catch {
              return order;
            }
          }

          return order;
        }));

        if (!cancelled) setEnrichedOrders(merged);
      } catch {
        // live fetch failed — show stored data as-is
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };
    fetchLive();
    return () => { cancelled = true; };
  }, [orders]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["bottom"]}>
      <ThemedView style={styles.container}>
        {isFetching ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Theme.colors.secondary} />
          </View>
        ) : enrichedOrders.length === 0 ? (
          <ThemedText style={styles.emptyText}>No orders yet.</ThemedText>
        ) : (
          <FlatList
            data={enrichedOrders}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <OrderCard
                order={item}
                onInstall={(lpa) => router.push({ pathname: '/(tabs)/installation', params: { qrcode: lpa } })}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
