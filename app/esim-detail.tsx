import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { useEsims } from "@/hooks/useDeviceEsims";
import { useEsimUsage } from "@/hooks/useEsimUsage";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import type { ESimDocument, PlanHistoryEntry } from "@/utils/bff/esim";
import { logger } from "@/utils/logger";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Derive the LPA string from an ESimDocument's smdpAddress + matchingId.
function buildLpa(doc: ESimDocument): string | null {
  if (doc.smdpAddress && doc.matchingId) {
    return `LPA:1$${doc.smdpAddress}$${doc.matchingId}`;
  }
  return doc.installationDetails?.qrcode ?? null;
}

// Apple eSIM provisioning deep-link — iOS only.
function buildAppleUrl(lpa: string): string {
  return `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${lpa}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    safeArea:       { flex: 1 },
    header: {
      flexDirection:     "row",
      alignItems:        "center",
      justifyContent:    "space-between",
      paddingHorizontal: 16,
      paddingVertical:   12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.muted,
    },
    headerLeft:    { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    headerFlag:    { width: 32, height: 22, borderRadius: 3 },
    headerRegion: {
      fontSize:   17,
      fontWeight: "600",
      color:      colors.text,
      flexShrink: 1,
    },
    chip: {
      borderRadius:      12,
      paddingHorizontal: 10,
      paddingVertical:   3,
    },
    chipText:      { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
    closeButton:   { padding: 4 },
    scroll:        { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },

    // Section card
    section: {
      backgroundColor: colors.surface,
      borderRadius:    14,
      padding:         14,
      gap:             10,
    },
    sectionTitle: {
      fontSize:     12,
      fontWeight:   "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color:         colors.mutedForeground,
      marginBottom:  2,
    },

    // Usage bar
    usageBarTrack: {
      height:       8,
      borderRadius: 4,
      backgroundColor: colors.muted,
      overflow:     "hidden",
    },
    usageBarFill: {
      height:       8,
      borderRadius: 4,
    },
    usageRow: {
      flexDirection:  "row",
      justifyContent: "space-between",
      alignItems:     "center",
    },
    usageLabel:  { fontSize: 13, color: colors.mutedForeground },
    usageValue:  { fontSize: 13, fontWeight: "600", color: colors.text },
    usageExpiry: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },

    // Degraded state
    degradedBox: {
      flexDirection:   "row",
      alignItems:      "center",
      gap:             8,
      backgroundColor: "rgba(255,149,0,0.1)",
      borderRadius:    8,
      padding:         10,
    },
    degradedText: { flex: 1, fontSize: 13, color: colors.warning },

    // Copy row
    copyRow: {
      flexDirection:  "row",
      alignItems:     "center",
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.muted,
    },
    copyLabel: {
      fontSize:      11,
      fontWeight:    "600",
      letterSpacing: 0.3,
      textTransform: "uppercase",
      color:         colors.mutedForeground,
      marginBottom:  2,
    },
    copyValue: {
      fontSize:      13,
      color:         colors.text,
      fontFamily:    Platform.OS === "ios" ? "Menlo" : "monospace",
    },

    // QR
    qrContainer: { alignItems: "center", paddingVertical: 8 },

    // Apple install button — iOS only
    appleBtn: {
      flexDirection:   "row",
      alignItems:      "center",
      justifyContent:  "center",
      gap:             8,
      backgroundColor: colors.primary,
      borderRadius:    12,
      paddingVertical: 12,
    },
    appleBtnText: { fontSize: 15, fontWeight: "600", color: colors.primaryForeground },

    // Plan history entry
    historyEntry: {
      paddingVertical:   8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.muted,
      gap:               4,
    },
    historyEntryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    historyPlanId:   { fontSize: 13, fontWeight: "500", color: colors.text, flexShrink: 1 },
    historyDate:     { fontSize: 12, color: colors.mutedForeground },
    historyAllowance:{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 },

    // Row — icon + label
    iconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconRowText: { fontSize: 13, color: colors.text },

    // Buttons
    primaryBtn: {
      flexDirection:   "row",
      alignItems:      "center",
      justifyContent:  "center",
      gap:             8,
      backgroundColor: colors.primary,
      borderRadius:    14,
      paddingVertical: 14,
      marginTop:       4,
    },
    primaryBtnText: { fontSize: 16, fontWeight: "600", color: colors.primaryForeground },
    outlineBtn: {
      flexDirection:   "row",
      alignItems:      "center",
      justifyContent:  "center",
      gap:             8,
      borderWidth:     1,
      borderColor:     colors.muted,
      borderRadius:    14,
      paddingVertical: 14,
    },
    outlineBtnText: { fontSize: 16, fontWeight: "500", color: colors.text },

    // Not found
    notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    notFoundText: { fontSize: 15, color: colors.mutedForeground },
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

const Chip = ({ label, color }: { label: string; color: string }) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.chip, { backgroundColor: color + "22" }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
};

const CopyRow = ({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { copied, copy } = useCopyFeedback();

  return (
    <TouchableOpacity
      onPress={() => copy(value)}
      style={[styles.copyRow, last && { borderBottomWidth: 0 }]}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text style={styles.copyValue} numberOfLines={2}>
          {value}
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EsimDetailScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const bg = useThemeColor({}, "background");
  const router = useRouter();

  const { esimId } = useLocalSearchParams<{ esimId: string }>();

  // Read ESimDocument from the React Query cache populated by useEsims().
  // No additional network call (card press implies the eSIM is in the active list).
  const { esims } = useEsims();
  const doc = esims.find((e) => e.esimId === esimId)

  const { usage, isLoading: usageLoading, isError: isFetchError, usageUnavailable, refetch: refetchUsage } =
    useEsimUsage(esimId);

  const history = doc?.planHistory ?? [];
  const latest: PlanHistoryEntry | undefined = history[history.length - 1];

  const lpa        = doc ? buildLpa(doc) : null;
  const appleUrl   = lpa ? buildAppleUrl(lpa) : null;

  const handleAppleInstall = async () => {
    if (!appleUrl) return;
    try {
      await Linking.openURL(appleUrl);
    } catch (err) {
      logger.error('ESIM_APPLE_INSTALL_FAILED', { err });
    }
  };

  const handleViewOrder = () => {
    router.back();
    // Small delay so the modal dismiss animation completes before navigation.
    setTimeout(() => {
      router.navigate({
        pathname: "/(tabs)/orders",
        params: { expandOrderId: esimId },
      });
    }, 300);
  };

  // ─── Status chip config ───────────────────────────────────────────────────────
  
  type ActivationStatus = ESimDocument["activationStatus"];
  
  const ACTIVATION_LABEL: Record<ActivationStatus, string> = {
    RELEASED:    "Ready to Install",
    INSTALLED:   "Active",
    UNAVAILABLE: "Unavailable",
    DEACTIVATED: "Deactivated",
  };
  
  const ACTIVATION_COLOR: Record<ActivationStatus, string> = {
    RELEASED:    colors.info,
    INSTALLED:   colors.success,
    UNAVAILABLE: colors.warning,
    DEACTIVATED: colors.destructive,
  };
  
  type BundleStatus = PlanHistoryEntry["bundleStatus"];
  
  const BUNDLE_LABEL: Record<BundleStatus, string> = {
    QUEUED:   "Queued",
    ACTIVE:   "Active",
    FINISHED: "Finished",
    EXPIRED:  "Expired",
    UNKNOWN:  "Unknown",
  };
  
  const BUNDLE_COLOR: Record<BundleStatus, string> = {
    QUEUED:   colors.info,
    ACTIVE:   colors.success,
    FINISHED: colors.warning,
    EXPIRED:  colors.destructive,
    UNKNOWN:  colors.mutedForeground,
  };
  
  // ── Usage bar colour ──────────────────────────────────────────────────────

  const usageBarColor = useMemo(() => {
    if (!usage?.remaining || !usage?.total) return colors.primary;
    const ratio = usage.remaining / usage.total;
    if (ratio > 0.4) return colors.success;
    if (ratio > 0.15) return colors.warning;
    return colors.destructive;
  }, [usage, colors]);

  const usageFillPct = useMemo(() => {
    if (!usage?.remaining || !usage?.total) return 0;
    return Math.min(100, (usage.remaining / usage.total) * 100);
  }, [usage]);

  // ── Guard: document not found ─────────────────────────────────────────────

  if (!doc) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]} edges={["top", "bottom"]}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} />
          <Text style={styles.notFoundText}>eSIM not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: colors.link, fontSize: 14 }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = ACTIVATION_COLOR[doc.activationStatus];
  const statusLabel = ACTIVATION_LABEL[doc.activationStatus];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]} edges={["top", "bottom"]}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {latest?.serviceRegionFlag ? (
            <Image
              source={{ uri: latest.serviceRegionFlag }}
              style={styles.headerFlag}
              resizeMode="cover"
            />
          ) : null}
          <Text style={styles.headerRegion} numberOfLines={1}>
            {latest?.serviceRegionName ?? doc.planId}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Chip label={statusLabel} color={statusColor} />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close eSIM detail"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={26} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Live usage ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Remaining</Text>

          {usageLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : isFetchError ? (
            // Network/auth error — the BFF call itself failed
            <View style={styles.degradedBox}>
              <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
              <Text style={styles.degradedText}>Could not fetch live usage.</Text>
              <TouchableOpacity onPress={refetchUsage} hitSlop={8}>
                <Text style={{ color: colors.link, fontSize: 13 }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : usageUnavailable ? (
            // 200 response but vendor returned an error for this eSIM
            <View style={styles.degradedBox}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
              <Text style={styles.degradedText}>
                Live usage data is temporarily unavailable.
              </Text>
              <TouchableOpacity onPress={refetchUsage} hitSlop={8}>
                <Text style={{ color: colors.link, fontSize: 13 }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : usage?.isUnlimited ? (
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Data</Text>
              <Text style={[styles.usageValue, { color: colors.success }]}>Unlimited</Text>
            </View>
          ) : (
            <>
              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>Data</Text>
                <Text style={styles.usageValue}>
                  {usage?.remaining != null ? `${usage.remaining.toFixed(2)} GB` : "—"}
                  {usage?.total != null ? ` / ${usage.total} GB` : ""}
                </Text>
              </View>
              {/* Data bar — only when we have both values */}
              {usage?.remaining != null && usage?.total != null && (
                <View style={styles.usageBarTrack}>
                  <View
                    style={[
                      styles.usageBarFill,
                      { width: `${usageFillPct}%`, backgroundColor: usageBarColor },
                    ]}
                  />
                </View>
              )}
            </>
          )}

          {/* Voice / SMS — only when the plan includes them */}
          {!usageLoading && !isFetchError && !usageUnavailable && (
            <>
              {usage?.voice != null && (
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>Voice</Text>
                  <Text style={styles.usageValue}>{usage.voice} mins</Text>
                </View>
              )}
              {usage?.sms != null && (
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>SMS</Text>
                  <Text style={styles.usageValue}>{usage.sms}</Text>
                </View>
              )}
              {usage?.expiresAt ? (
                <Text style={styles.usageExpiry}>
                  Expires {new Date(usage.expiresAt).toLocaleDateString(undefined, {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </Text>
              ) : null}
            </>
          )}

          {/* Fallback: show purchased allowances from the usage response when
              vendor usage figures are unavailable. Sourced from usage.total
              (active bundle total, reflecting topup stacking) and
              usage.expiresAt (live expiry). Falls back to PlanHistoryEntry
              only when the usage response itself is absent (isFetchError). */}
          {(usageUnavailable || isFetchError) && (
            <View style={{ marginTop: 8, gap: 6 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Purchased Allowances</Text>

              {/* Prefer usage.total / usage.isUnlimited when the 200 arrived
                  (usageUnavailable); fall back to PlanHistoryEntry when the
                  fetch failed entirely (isFetchError && no usage object). */}
              {(usage?.isUnlimited ?? latest?.isUnlimited) ? (
                <Text style={styles.usageValue}>Unlimited data</Text>
              ) : (
                <>
                  {/* Data — prefer usage.total (accounts for topup stacking) */}
                  {(usage?.total ?? latest?.data) != null && (
                    <View style={styles.usageRow}>
                      <Text style={styles.usageLabel}>Data</Text>
                      <Text style={styles.usageValue}>
                        {(usage?.total ?? latest?.data)} GB
                      </Text>
                    </View>
                  )}
                  {/* Voice / SMS — usage response carries remaining only;
                      fall back to PlanHistoryEntry snapshot for the total. */}
                  {(usage?.voice ?? latest?.voice) != null && (
                    <View style={styles.usageRow}>
                      <Text style={styles.usageLabel}>Voice</Text>
                      <Text style={styles.usageValue}>
                        {(usage?.voice ?? latest?.voice)} mins
                      </Text>
                    </View>
                  )}
                  {(usage?.sms ?? latest?.sms) != null && (
                    <View style={styles.usageRow}>
                      <Text style={styles.usageLabel}>SMS</Text>
                      <Text style={styles.usageValue}>
                        {(usage?.sms ?? latest?.sms)}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Expiry — prefer live expiresAt from usage response */}
              {(usage?.expiresAt ?? null) ? (
                <Text style={styles.usageExpiry}>
                  Expires {new Date(usage!.expiresAt!).toLocaleDateString(undefined, {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </Text>
              ) : latest?.validity != null ? (
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>Validity</Text>
                  <Text style={styles.usageValue}>{latest.validity} days</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* ── Installation ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Installation</Text>

          {lpa ? (
            <>
              <View style={styles.qrContainer}>
                <QRCode value={lpa} size={180} backgroundColor="white" color="black" />
              </View>
              <CopyRow label="ICCID" value={doc.iccid} />
              <CopyRow label="LPA String" value={lpa} last />
              {Platform.OS === "ios" && appleUrl && (
                <TouchableOpacity
                  style={[styles.appleBtn, { marginTop: 8 }]}
                  onPress={handleAppleInstall}
                  accessibilityRole="button"
                  accessibilityLabel="Install eSIM on this iPhone"
                >
                  <Ionicons name="phone-portrait-outline" size={18} color={colors.primaryForeground} />
                  <Text style={styles.appleBtnText}>Install on this iPhone</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <CopyRow label="ICCID" value={doc.iccid} last />
              <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>
                QR code not yet available. Check back after the eSIM is fully provisioned.
              </Text>
            </>
          )}
        </View>

        {/* ── Plan history ─────────────────────────────────────────────────── */}
        {doc.planHistory && doc.planHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan History</Text>
            {[...doc.planHistory].reverse().map((entry, i) => (
              <View
                key={`${entry.orderId}-${i}`}
                style={[
                  styles.historyEntry,
                  i === doc.planHistory!.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.historyEntryTop}>
                  <Text style={styles.historyPlanId} numberOfLines={1}>
                    {entry.planId}
                  </Text>
                  <Chip
                    label={BUNDLE_LABEL[entry.bundleStatus]}
                    color={BUNDLE_COLOR[entry.bundleStatus]}
                  />
                </View>
                <Text style={styles.historyDate}>
                  {new Date(entry.purchaseDate).toLocaleDateString(undefined, {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                  {entry.validity ? ` · ${entry.validity} days` : ""}
                </Text>
                <Text style={styles.historyAllowance}>
                  {entry.isUnlimited
                    ? "Unlimited data"
                    : [
                        entry.data != null && `${entry.data} GB`,
                        entry.voice != null && `${entry.voice} mins`,
                        entry.sms != null && `${entry.sms} SMS`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Coverage ─────────────────────────────────────────────────────── */}
        {/*
          Coverage data (countryWiseNetworkCoverages) is catalogue-owned and is
          not snapshotted onto PlanHistoryEntry or ESimDocument by the BFF.
          This section is hidden until the BFF snapshots serviceRegionCode on
          PlanHistoryEntry, enabling a catalogue cross-reference at render time
          without a brittle region-name lookup.
        */}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleViewOrder}
          accessibilityRole="button"
          accessibilityLabel="View order details"
        >
          <Ionicons name="receipt-outline" size={18} color={colors.primaryForeground} />
          <Text style={styles.primaryBtnText}>View Order</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
