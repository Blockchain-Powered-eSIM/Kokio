import React, { Children, Fragment } from "react";
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Palette } from "@/constants/Colors";
import { useColors } from "@/hooks/useColors";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { esimDisplayName } from "@/helpers/esimDisplay";
import { colorForStatus, labelForStatus } from "@/utils/orderStatus";
import type { ESimDocument, PlanHistoryEntry } from "@/utils/bff/esim";
import type { OrderListItem } from "@/utils/bff/order";
import { logger } from "@/utils/logger";

export type EnrichedOrder = OrderListItem & { esim?: ESimDocument };

const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colors.overlayMedium,
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      maxHeight: "88%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.muted,
      marginTop: 10,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 16,
      paddingBottom: 4,
    },
    headerSpacer: {
      width: 32,
    },
    headerText: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 12,
    },
    title: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.inactive,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    section: {
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: colors.inactive,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.muted,
      marginHorizontal: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowLabel: {
      fontSize: 14,
      color: colors.inactive,
    },
    rowValue: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
      textAlign: "right",
    },
    copyBody: {
      flex: 1,
    },
    copyLabel: {
      fontSize: 12,
      color: colors.inactive,
      marginBottom: 4,
    },
    copyValue: {
      fontSize: 13,
      lineHeight: 19,
      paddingTop: 2,
      color: colors.text,
      fontFamily: MONO,
    },
    inlineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    inlineValue: {
      fontSize: 13,
      lineHeight: 19,
      paddingTop: 2,
      color: colors.text,
    },
    historyMeta: {
      fontSize: 12,
      color: colors.inactive,
      marginTop: 2,
    },
  });

function openUrl(url: string) {
  Linking.openURL(url).catch((err) => logger.error("PURCHASE_LINK_OPEN_FAILED", { err }));
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const styles = useThemedStyles(createStyles);
  const rows = Children.toArray(children);
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
};

const InfoRow = ({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
};

export const LinkRow = ({ label, onPress }: { label: string; onPress: () => void }) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.row}
      accessibilityRole="link"
      accessibilityLabel={`Open ${label.toLowerCase()}`}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={[styles.rowValue, { color: colors.link }]}>View</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.link} />
      </View>
    </TouchableOpacity>
  );
};

export const CopyRow = ({
  label,
  value,
  displayValue,
  valueColor,
  variant = "card",
}: {
  label: string;
  value: string;
  // Shown in place of `value`; `value` is still what gets copied.
  displayValue?: string;
  valueColor?: string;
  // "inline" sits directly on a surface without the card's row padding.
  variant?: "card" | "inline";
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { copied, copy } = useCopyFeedback();
  const inline = variant === "inline";
  return (
    <TouchableOpacity
      onPress={() => copy(value)}
      style={inline ? styles.inlineRow : styles.row}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label}`}
    >
      <View style={styles.copyBody}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text
          style={[
            inline ? styles.inlineValue : styles.copyValue,
            valueColor ? { color: valueColor } : null,
          ]}
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

const HistoryRow = ({ entry }: { entry: PlanHistoryEntry }) => {
  const styles = useThemedStyles(createStyles);
  const dataText = entry.isUnlimited ? "Unlimited" : entry.data ? `${entry.data} GB` : null;
  const purchased = new Date(entry.purchaseDate).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const meta = [dataText, entry.validity ? `${entry.validity} days` : null, purchased]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.row}>
      <View style={styles.copyBody}>
        <Text style={[styles.rowValue, { textAlign: "left" }]} numberOfLines={1}>
          {entry.serviceRegionName ?? entry.planId}
        </Text>
        <Text style={styles.historyMeta}>{meta}</Text>
      </View>
    </View>
  );
};

interface PurchaseDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  order: EnrichedOrder;
  invoiceUrl: string | null;
  lpa: string | null;
  supportRef: string | null;
}

export default function PurchaseDetailsSheet({
  visible,
  onClose,
  order,
  invoiceUrl,
  lpa,
  supportRef,
}: PurchaseDetailsSheetProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const subtitle = order.esim ? esimDisplayName(order.esim) : (order.planId ?? null);
  const history = order.esim?.planHistory ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Purchase details</Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close purchase details"
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <Section title="Identifiers">
              {order.iccid ? <CopyRow label="ICCID" value={order.iccid} /> : null}
              {supportRef ? <CopyRow label="Reference" value={supportRef} /> : null}
              {lpa ? <CopyRow label="LPA string" value={lpa} /> : null}
            </Section>

            <Section title="Payment">
              {order.paymentMethod ? <InfoRow label="Method" value={order.paymentMethod} /> : null}
              {order.orderStatus ? (
                <InfoRow
                  label="Status"
                  value={labelForStatus(order.orderStatus)}
                  valueColor={colorForStatus(order.orderStatus)}
                />
              ) : null}
              {invoiceUrl ? <LinkRow label="Invoice" onPress={() => openUrl(invoiceUrl)} /> : null}
            </Section>

            <Section title="Plan history">
              {history.map((entry, index) => (
                <HistoryRow key={`${entry.planId}-${index}`} entry={entry} />
              ))}
            </Section>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
