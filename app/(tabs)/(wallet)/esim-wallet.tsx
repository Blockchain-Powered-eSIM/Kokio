import React, { useRef } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import CountryFlag from "@/components/ui/CountryFlag";
import { TopupSheet } from "@/components/wallet/sheets/TopupSheet";
import { useColors } from "@/hooks/useColors";
import { useEsims } from "@/hooks/useDeviceEsims";
import { esimDocToDisplayItem } from "@/helpers/esimDisplay";
import { shortenAddress } from "@/utils/address";
import { getMockEsimWalletStats } from "./mockWalletData";

export default function EsimWalletScreen() {
  const colors = useColors();
  const { esimId } = useLocalSearchParams<{ esimId: string; name?: string }>();
  const { esims } = useEsims();
  const topupSheetRef = useRef<BottomSheet>(null);

  const doc = esims.find((e) => e.esimId === esimId);
  if (!doc) {
    return (
      <ThemedView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <ThemedText>This eSIM wallet couldn&apos;t be found.</ThemedText>
      </ThemedView>
    );
  }

  const display = esimDocToDisplayItem(doc);
  const stats = getMockEsimWalletStats(doc.esimId);
  const esimLabel = display.data ? `${display.data} GB` : "Unlimited";
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
        <ThemedView darkColor={colors.surface} lightColor={colors.surface} style={{ borderRadius: 21, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <CountryFlag size={38} flagUrl={display.serviceRegionFlag ?? ""} />
            <View style={{ flex: 1 }}>
              <ThemedText bold variant="normal">{display.serviceRegionName ?? "eSIM"} · {esimLabel}</ThemedText>
              <ThemedText style={{ color: colors.mutedForeground, fontSize: 12.5, marginTop: 1 }}>
                {shortenAddress(doc.esimId)}
              </ThemedText>
            </View>
          </View>
          <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
            <ThemedText style={{ color: colors.mutedForeground, fontSize: 13 }}>Wallet balance</ThemedText>
            <ThemedText bold style={{ fontSize: 32, marginTop: 2 }}>${stats.balance}</ThemedText>
          </View>
        </ThemedView>

        <ThemedView darkColor={colors.surface} lightColor={colors.surface} style={{ borderRadius: 21, padding: 16, marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <ThemedText bold style={{ fontSize: 15.5 }}>Allow top-ups from your device wallet</ThemedText>
              <ThemedText style={{ color: colors.mutedForeground, fontSize: 12.5, marginTop: 3, lineHeight: 18 }}>
                When this eSIM runs low, it can draw funds from your device wallet without asking again.
              </ThemedText>
            </View>
            <View style={{
              width: 46, height: 28, borderRadius: 999, marginTop: 2,
              backgroundColor: stats.topupAllowed ? colors.walletAccent : colors.muted,
              justifyContent: "center",
            }}>
              <View style={{
                width: 22, height: 22, borderRadius: 999, backgroundColor: "#fff",
                marginLeft: stats.topupAllowed ? 21 : 3,
              }} />
            </View>
          </View>
        </ThemedView>

        <ThemedView darkColor={colors.surface} lightColor={colors.surface} style={{ borderRadius: 21, paddingHorizontal: 16, marginTop: 14 }}>
          {meta.map(([k, v], i) => (
            <View
              key={k}
              style={{
                flexDirection: "row", justifyContent: "space-between", paddingVertical: 14,
                borderBottomWidth: i < meta.length - 1 ? 1 : 0, borderBottomColor: colors.border,
              }}
            >
              <ThemedText style={{ color: colors.mutedForeground, fontSize: 14 }}>{k}</ThemedText>
              <ThemedText bold style={{ fontSize: 14 }}>{v}</ThemedText>
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
