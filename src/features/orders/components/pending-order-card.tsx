import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { labelForPaymentMethod } from "../order-status";
import { createStyles } from "../orders-styles";
import type { PendingOrderRecord } from "../hooks/use-pending-orders";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const PendingOrderCard = ({
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
