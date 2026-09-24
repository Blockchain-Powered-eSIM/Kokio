import React, { useState } from "react";
import { View, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import CountryFlag from "@/components/ui/CountryFlag";
import { WalletHeroCard } from "@/components/wallet/WalletHeroCard";
import { useColors } from "@/hooks/useColors";
import { useEsims } from "@/hooks/useDeviceEsims";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useEsimTopupAccess, useToggleEsimTopup } from "@/hooks/useEsimTopupAccess";
import { useSetEsimLabel } from "@/hooks/useEsimLabel";
import { esimDocToDisplayItem } from "@/helpers/esimDisplay";
import { formatOnChainError } from "@/utils/formatOnChainError";

export default function EsimWalletScreen() {
  const colors = useColors();
  const { esimId } = useLocalSearchParams<{ esimId: string; name?: string }>();
  const { esims } = useEsims();

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
      {
        esimWalletAddress: walletAddress,
        nextValue: !topupAllowed,
        label: doc.label ?? display.serviceRegionName ?? undefined,
      },
      {
        onError: (err) => {
          setErrorMessage(formatOnChainError(err, "Something went wrong updating top-ups. Please try again."));
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
        <WalletHeroCard
          address={doc.esimId}
          balance={balance}
          isBalanceLoading={isBalanceLoading}
          compact
          balanceLabel="eSIM wallet balance"
          headerContent={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <CountryFlag size={34} flagUrl={display.serviceRegionFlag ?? ""} />
              <View style={{ flex: 1 }}>
                {isEditingLabel ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput
                      value={labelDraft}
                      onChangeText={setLabelDraft}
                      maxLength={50}
                      autoFocus
                      placeholder="Name this eSIM"
                      placeholderTextColor={colors.foreground}
                      style={{ flex: 1, fontSize: 15.5, fontWeight: "700", color: colors.text, padding: 0 }}
                    />
                    <TouchableOpacity
                      onPress={handleSaveLabel}
                      disabled={setLabel.isPending}
                      accessibilityRole="button"
                      accessibilityLabel="Save eSIM name"
                    >
                      {setLabel.isPending ? (
                        <ActivityIndicator size="small" color={colors.text} />
                      ) : (
                        <Ionicons name="checkmark" size={20} color={colors.success} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsEditingLabel(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel editing eSIM name"
                    >
                      <Ionicons name="close" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleStartEditLabel}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="Edit eSIM name"
                  >
                    <ThemedText bold variant="normal" lightColor={colors.text} darkColor={colors.text} numberOfLines={1}>
                      {doc.label ?? `${display.serviceRegionName ?? "eSIM"} · ${esimLabel}`}
                    </ThemedText>
                    <Ionicons name="pencil-outline" size={14} color={colors.text} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          footerContent={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 }}>
              <Ionicons name="link-outline" size={12} color={colors.foreground} />
              <ThemedText lightColor={colors.foreground} darkColor={colors.foreground} style={{ fontSize: 11.5 }}>
                Linked to your device wallet, which you own
              </ThemedText>
            </View>
          }
        />

        <ThemedView darkColor={colors.card} lightColor={colors.card} style={{ borderRadius: 21, padding: 16, marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <ThemedText bold style={{ fontSize: 15.5, color: colors.cardForeground }}>Allow top-ups from your device wallet</ThemedText>
              <ThemedText style={{ color: colors.cardForeground, fontSize: 12.5, marginTop: 3, lineHeight: 18 }}>
                Enabling this allows you to checkout faster while keeping your balances in one place.
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
                  borderWidth: 1.5, borderColor: colors.mutedForeground,
                  justifyContent: "center",
                  opacity: topupDisabled ? 0.6 : 1,
                }}
              >
                {isTopupMutating ? (
                  <View style={{
                    width: 22, height: 22, borderRadius: 999, backgroundColor: "#fff",
                    marginLeft: topupAllowed ? 21 : 3,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
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
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              marginBottom: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: colors.itemBackground,
            }}
          >
            <ThemedText style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: colors.mutedForeground }}>
              COMING SOON
            </ThemedText>
          </View>
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
              opacity: 0.5,
            }}
            disabled
            accessibilityRole="button"
            accessibilityLabel="Top up this eSIM, coming soon"
            accessibilityState={{ disabled: true }}
          >
            <ThemedText style={{ fontSize: 16, fontWeight: "700", color: colors.ctaForeground }}>
              Top up this eSIM
            </ThemedText>
          </TouchableOpacity>
        </View>
      </BottomActionBar>
    </View>
  );
}
