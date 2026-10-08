import React from "react";
import { View, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import CountryFlag, { type CoverageType } from "@/components/ui/CountryFlag";
import EsimLabelEditor from "@/components/esim/EsimLabelEditor";
import { TestnetBadge, WalletHeroCard } from "@/components/wallet/WalletHeroCard";
import { useColors } from "@/hooks/useColors";
import { useEsims } from "@/hooks/useDeviceEsims";
import { esimDocToDisplayItem } from "@/helpers/esimDisplay";

export default function EsimWalletScreen() {
  const colors = useColors();
  const { esimId } = useLocalSearchParams<{ esimId: string; name?: string }>();
  const { esims } = useEsims();

  const doc = esims.find((e) => e.esimId === esimId);

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
          compact
          showBalance={false}
          showCopy={false}
          headerContent={
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <EsimLabelEditor doc={doc} color={colors.text} textStyle={{ fontSize: 15.5 }} />
                </View>
                <TestnetBadge />
              </View>
              <View style={{ marginTop: 12 }}>
                <CountryFlag
                  size={68}
                  flagUrl={display.serviceRegionFlag ?? ""}
                  coverageType={display.coverageType as CoverageType}
                  serviceRegionName={display.serviceRegionName}
                />
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

    </View>
  );
}
