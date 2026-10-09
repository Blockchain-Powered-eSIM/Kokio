import React, { Children, Fragment, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

import type { Palette } from "@/constants/Colors";
import { ContactAvatar } from "@/components/wallet/ContactAvatar";
import { CopyRow } from "@/components/orders/PurchaseDetailsSheet";
import { PillButton } from "@/components/ui/PillButton";
import { BASE_SEPOLIA_TESTNET_TX } from "@/constants/general.constants";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { logger } from "@/utils/logger";

interface TransactionParams {
  id?: string;
  name?: string;
  walletId?: string;
  type?: string;
  statusLabel?: string;
  status?: string;
  amount?: string;
  ethAmount?: string;
  dateTime?: string;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
      gap: 24,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: colors.background,
    },
    emptyText: {
      fontFamily: "Lexend",
      fontSize: 14,
      color: colors.mutedForeground,
    },
    hero: {
      alignItems: "center",
      gap: 8,
    },
    walletBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    heroName: {
      fontFamily: "Lexend",
      fontSize: 16,
      color: colors.text,
    },
    heroAmount: {
      fontFamily: "Lexend-SemiBold",
      fontSize: 32,
      marginTop: 4,
    },
    heroSub: {
      fontFamily: "Lexend",
      fontSize: 14,
      color: colors.mutedForeground,
    },
    heroLabel: {
      fontFamily: "Lexend",
      fontSize: 14,
      color: colors.foreground,
    },
    pill: {
      marginTop: 4,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
    },
    pillText: {
      fontFamily: "Lexend-Medium",
      fontSize: 12,
      textTransform: "capitalize",
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontFamily: "Lexend-SemiBold",
      fontSize: 12,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: colors.inactive,
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
      fontFamily: "Lexend",
      fontSize: 14,
      color: colors.inactive,
    },
    rowValue: {
      flexShrink: 1,
      fontFamily: "Lexend-Medium",
      fontSize: 14,
      color: colors.text,
      textAlign: "right",
    },
  });

// Only a real on-chain transaction hash (32 bytes) can be opened on a block
// explorer. `tx.id` isn't always one - the local wallet-activity log (see
// utils/walletActivity.ts, feeding Transactions.tsx's list) stamps its own
// entries with a synthetic `${timestamp}-${random}` id, not a tx hash. Only
// a transaction reached straight from a just-completed send (sendToContact.tsx,
// which sets `id` to the real `receipt.receipt.transactionHash`) has a real one.
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

function parseTransaction(raw: string | undefined): TransactionParams | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as TransactionParams) : null;
  } catch {
    return null;
  }
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

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
};

const TransactionDetails = () => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { transaction } = useLocalSearchParams<{ transaction?: string | string[] }>();

  const transactionString = Array.isArray(transaction) ? transaction[0] : transaction;
  const tx = useMemo(() => parseTransaction(transactionString), [transactionString]);

  if (!tx) {
    return (
      <View style={styles.empty}>
        <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
        <Text style={styles.emptyText}>Transaction details unavailable</Text>
      </View>
    );
  }

  const received = tx.type === "received";
  const directionLabel = tx.statusLabel ?? tx.type;
  const status = tx.status?.toLowerCase();
  const isRealTxHash = !!tx.id && TX_HASH_PATTERN.test(tx.id);

  const handleOpenExplorer = async () => {
    if (!isRealTxHash) return;
    try {
      await WebBrowser.openBrowserAsync(`${BASE_SEPOLIA_TESTNET_TX}/${tx.id}`);
    } catch (error) {
      logger.error('BROWSER_OPEN_FAILED', { error });
    }
  };

  const pill =
    status === "completed"
      ? { text: colors.success, background: colors.successBackground }
      : status === "failed"
        ? { text: colors.destructive, background: colors.destructiveBackground }
        : status === "pending"
          ? { text: colors.warning, background: colors.surface }
          : { text: colors.mutedForeground, background: colors.surface };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {tx.name ? (
          <>
            <ContactAvatar seed={tx.name} alias={tx.name} size={64} />
            <Text style={styles.heroName}>{tx.name}</Text>
          </>
        ) : (
          <View style={styles.walletBadge}>
            <Ionicons name="wallet-outline" size={30} color={colors.foreground} />
          </View>
        )}
        {tx.amount ? (
          <Text style={[styles.heroAmount, { color: received ? colors.success : colors.text }]}>
            {tx.amount}
          </Text>
        ) : null}
        {tx.ethAmount ? <Text style={styles.heroSub}>{tx.ethAmount}</Text> : null}
        {directionLabel ? <Text style={styles.heroLabel}>{directionLabel}</Text> : null}
        {tx.status ? (
          <View style={[styles.pill, { backgroundColor: pill.background }]}>
            <Text style={[styles.pillText, { color: pill.text }]}>{tx.status}</Text>
          </View>
        ) : null}
      </View>

      <Section title="Details">
        {!tx.name && tx.walletId ? <CopyRow label="Wallet" value={tx.walletId} /> : null}
        {tx.dateTime ? <InfoRow label="Date and Time" value={tx.dateTime} /> : null}
        {tx.status ? <InfoRow label="Status" value={tx.status} /> : null}
        {tx.id ? <CopyRow label="Transaction ID" value={tx.id} /> : null}
      </Section>

      {isRealTxHash ? (
        <PillButton variant="outline" onPress={handleOpenExplorer}>
          View on block explorer
        </PillButton>
      ) : null}
    </ScrollView>
  );
};

export default TransactionDetails;
