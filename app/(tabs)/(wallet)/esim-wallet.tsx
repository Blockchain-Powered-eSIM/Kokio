import React, { useRef, useState } from "react";
import { View, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import CountryFlag from "@/components/ui/CountryFlag";
import { TopupSheet } from "@/components/wallet/sheets/TopupSheet";
import { useColors } from "@/hooks/useColors";
import { useEsims } from "@/hooks/useDeviceEsims";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useEsimTopupAccess, useToggleEsimTopup } from "@/hooks/useEsimTopupAccess";
import { useSetEsimLabel } from "@/hooks/useEsimLabel";
import { esimDocToDisplayItem } from "@/helpers/esimDisplay";
import { shortenAddress } from "@/utils/address";

export default function EsimWalletScreen() {
  const colors = useColors();
  const { esimId } = useLocalSearchParams<{ esimId: string; name?: string }>();
  const { esims } = useEsims();
  const topupSheetRef = useRef<BottomSheet>(null);

  const doc = esims.find((e) => e.esimId === esimId);
  // esimId is stable across the lifetime of this screen (route param), so calling
  // these hooks unconditionally with a possibly-null doc.esimId keeps hook
  // order stable across the early returns below.
  const { balance, isLoading: isBalanceLoading } = useWalletBalance(doc?.esimId ?? undefined);
  const { topupAllowed, isLoading: isTopupLoading } = useEsimTopupAccess(doc?.esimId ?? undefined);
  const toggleTopup = useToggleEsimTopup();
  const setLabel = useSetEsimLabel();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");

  if (!doc) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <ThemedText>This eSIM wallet couldn&apos;t be found.</ThemedText>
      </ThemedView>
    );
  }

  if (!doc.esimId) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <ThemedText>This eSIM doesn&apos;t have a wallet yet.</ThemedText>
      </ThemedView>
    );
  }

  const display = esimDocToDisplayItem(doc);
  const esimLabel = display.data ? `${display.data} GB` : "Unlimited";

  const isTopupMutating = toggleTopup.isPending;
  // Unknown current value (loading/error) means we cannot compute a sane
  // next value, so the pill is disabled until a real boolean is read.
  const topupDisabled = isTopupLoading || isTopupMutating || topupAllowed === undefined;

  // Local alias so the narrowed (non-null) type survives into the closure
  // below — TypeScript doesn't retain property narrowing across callbacks.
  const walletAddress = doc.esimId;

  const handleToggleTopup = () => {
    if (topupDisabled) return;
    setErrorMessage(null);
    toggleTopup.mutate(
      { esimWalletAddress: walletAddress, nextValue: !topupAllowed },
      {
        onError: (err) => {
          setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        },
      },
    );
  };
  const handleStartEditLabel = () => {
    setLabelDraft(doc.label ?? "");
    setIsEditingLabel(true);
  };

  const handleSaveLabel = () => {
    const trimmed = labelDraft.trim();
    if (!trimmed) {
      setIsEditingLabel(false);
      return;
    }
    setLabel.mutate(
      { eSimRef: doc.eSimRef, label: trimmed },
      { onSuccess: () => setIsEditingLabel(false) },
    );
  };

  const deployedDate = doc.createdAt
    ? new Date(doc.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "-";

  const meta: [string, string][] = [
    ["Owned by", "Device wallet"],
    ["Network", "Base"],
    ["Deployed", deployedDate],
    ["Attached eSIM", `${esimLabel} · ${display.serviceRegionName ?? ""}`],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <ThemedView darkColor={colors.card} lightColor={colors.card} style={{ borderRadius: 21, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <CountryFlag size={38} flagUrl={display.serviceRegionFlag ?? ""} />
            <View style={{ flex: 1 }}>
              {isEditingLabel ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    value={labelDraft}
                    onChangeText={setLabelDraft}
                    maxLength={50}
                    autoFocus
                    placeholder="Name this eSIM"
                    placeholderTextColor={colors.mutedForeground}
                    style={{ flex: 1, fontSize: 15.5, fontWeight: "700", color: colors.cardForeground, padding: 0 }}
                  />
                  <TouchableOpacity
                    onPress={handleSaveLabel}
                    disabled={setLabel.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Save eSIM name"
                  >
                    {setLabel.isPending ? (
                      <ActivityIndicator size="small" color={colors.cardForeground} />
                    ) : (
                      <Ionicons name="checkmark" size={20} color={colors.success} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsEditingLabel(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing eSIM name"
                  >
                    <Ionicons name="close" size={20} color={colors.cardForeground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleStartEditLabel}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Edit eSIM name"
                >
                  <ThemedText bold variant="normal" style={{ color: colors.cardForeground }} numberOfLines={1}>
                    {doc.label ?? `${display.serviceRegionName ?? "eSIM"} · ${esimLabel}`}
                  </ThemedText>
                  <Ionicons name="pencil-outline" size={14} color={colors.cardForeground} />
                </TouchableOpacity>
              )}
              <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5, marginTop: 1 }}>
                {shortenAddress(doc.esimId)}
              </ThemedText>
            </View>
          </View>
          <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
            <ThemedText style={{ color: colors.cardForeground, fontSize: 13 }}>Wallet balance</ThemedText>
            {isBalanceLoading ? (
              <ActivityIndicator size="small" color={colors.cardForeground} style={{ marginTop: 8, alignSelf: "flex-start" }} />
            ) : (
              <ThemedText bold style={{ fontSize: 32, marginTop: 2, color: colors.cardForeground }}>{balance === undefined ? "—" : `$${balance}`}</ThemedText>
            )}
          </View>
        </ThemedView>

        <ThemedView darkColor={colors.card} lightColor={colors.card} style={{ borderRadius: 21, padding: 16, marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <ThemedText bold style={{ fontSize: 15.5, color: colors.cardForeground }}>Allow top-ups from your device wallet</ThemedText>
              <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5, marginTop: 3, lineHeight: 18 }}>
                When this eSIM runs low, it can draw funds from your device wallet without asking again.
              </ThemedText>
            </View>
            {isTopupLoading ? (
              <ActivityIndicator size="small" color={colors.cardForeground} style={{ marginTop: 2 }} />
            ) : (
              <Pressable
                onPress={handleToggleTopup}
                disabled={topupDisabled}
                accessibilityRole="switch"
                accessibilityState={{ checked: topupAllowed === true, disabled: topupDisabled }}
                accessibilityLabel={
                  topupAllowed === undefined
                    ? "Top-up permission unavailable"
                    : topupAllowed
                      ? "Turn off top-ups from your device wallet"
                      : "Turn on top-ups from your device wallet"
                }
                style={{
                  width: 46, height: 28, borderRadius: 999, marginTop: 2,
                  backgroundColor: topupAllowed ? colors.walletAccent : colors.muted,
                  justifyContent: "center",
                  opacity: topupDisabled ? 0.6 : 1,
                }}
              >
                {isTopupMutating ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <View style={{
                    width: 22, height: 22, borderRadius: 999, backgroundColor: "#fff",
                    marginLeft: topupAllowed ? 21 : 3,
                  }} />
                )}
              </Pressable>
            )}
          </View>
          {errorMessage && (
            <ThemedText style={{ color: colors.destructive, marginTop: 10, fontSize: 12.5 }}>
              {errorMessage}
            </ThemedText>
          )}
        </ThemedView>

        <ThemedView darkColor={colors.card} lightColor={colors.card} style={{ borderRadius: 21, paddingHorizontal: 16, marginTop: 14 }}>
          {meta.map(([k, v], i) => (
            <View
              key={k}
              style={{
                flexDirection: "row", justifyContent: "space-between", paddingVertical: 14,
                borderBottomWidth: i < meta.length - 1 ? 1 : 0, borderBottomColor: colors.border,
              }}
            >
              <ThemedText style={{ color: colors.cardForeground, fontSize: 14 }}>{k}</ThemedText>
              <ThemedText bold style={{ fontSize: 14, color: colors.cardForeground }}>{v}</ThemedText>
            </View>
          ))}
        </ThemedView>
      </ScrollView>

      <BottomActionBar>
        <TouchableOpacity
          style={{
            width: "100%",
            minHeight: 50,
            borderRadius: 999,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.ctaBackground,
          }}
          onPress={() => topupSheetRef.current?.snapToIndex(0)}
          accessibilityRole="button"
          accessibilityLabel="Top up this eSIM"
        >
          <ThemedText style={{ fontSize: 16, fontWeight: "700", color: colors.ctaForeground }}>
            Top up this eSIM
          </ThemedText>
        </TouchableOpacity>
      </BottomActionBar>

      <TopupSheet ref={topupSheetRef} esimName={display.serviceRegionName ?? "this eSIM"} />
    </View>
  );
}
