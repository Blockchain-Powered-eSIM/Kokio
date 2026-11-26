import React, { useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useEsimUsage } from "@/features/esim/hooks/use-esim-usage";
import type { ESimDocument } from "@/lib/api/bff/esim";
import ESIMItem from "@/components/ui/esim-item";
import type { Esim } from "@/components/ui/esim-item";
import EsimLabelEditor from "@/features/esim/components/esim-label-editor";
import { esimDisplayName, esimDocToDisplayItem } from "@/features/esim/esim-display";
import { colorForStatus, isUserActionableManualReview, labelForStatus } from "../order-status";
import { createStyles } from "../orders-styles";
import PurchaseDetailsSheet, { CopyRow, type EnrichedOrder } from "./purchase-details-sheet";

type ActivationStatus = ESimDocument["activationStatus"];

const ESIM_STATUS_LABEL: Record<ActivationStatus, string> = {
  RELEASED:    "Ready to Install",
  INSTALLED:   "Active",
  UNAVAILABLE: "Unavailable",
  DEACTIVATED: "Deactivated",
};

export const OrderCard = ({
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
                color={isDark ? colors.mutedForeground : colors.text}
                accessibilityLabel="Paid with Kokio wallet"
              />
            ) : null}
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={isDark ? colors.mutedForeground : colors.text}
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
