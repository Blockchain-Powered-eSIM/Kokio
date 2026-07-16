import React, { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import CountryFlag from "@/components/ui/CountryFlag";
import SearchBar from "@/components/SearchInput";

// ─── Types ────────────────────────────────────────────────────────────────────

type CountryNetworkEntry = {
  countryCode?: string;
  countryName?:  string;
  networks?:     { name?: string; type?: string }[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SEARCH_THRESHOLD = 3;

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = () =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection:  "row",
      alignItems:     "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical:   12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Theme.colors.muted,
    },
    headerTitle: {
      fontSize:   17,
      fontWeight: "600",
      color:      Theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    spacer: {
      width: 32,
    },
    searchWrapper: {
      paddingHorizontal: 16,
      paddingTop:        8,
      paddingBottom:     4,
    },
    list: {
      flex: 1,
    },
    row: {
      flexDirection:     "row",
      alignItems:        "flex-start",
      paddingVertical:   14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Theme.colors.muted,
      gap:               12,
    },
    leftCol: {
      flex:           1,
      flexDirection:  "row",
      alignItems:     "center",
      gap:            8,
    },
    countryName: {
      flex:       1,
      fontSize:   14,
      fontWeight: "500",
      color:      Theme.colors.text,
    },
    rightCol: {
      flex:            1,
      flexDirection:   "row",
      flexWrap:        "wrap",
      justifyContent:  "flex-end",
      alignItems:      "center",
      gap:             4,
    },
    networkTag: {
      flexDirection:   "row",
      alignItems:      "center",
      backgroundColor: Theme.colors.itemBackground,
      borderRadius:    5,
      paddingHorizontal: 7,
      paddingVertical:   3,
      gap:             3,
    },
    networkName: {
      fontSize: 12,
      color:    Theme.colors.mutedForeground,
    },
    networkType: {
      fontSize:   10,
      fontWeight: "700",
      color:      Theme.colors.highlight,
    },
    emptyText: {
      textAlign:    "center",
      paddingVertical: 48,
      fontSize:     14,
      color:        Theme.colors.mutedForeground,
    },
  });

// ─── CoverageRow ──────────────────────────────────────────────────────────────

const CoverageRow = ({
  entry,
  styles,
}: {
  entry:  CountryNetworkEntry;
  styles: ReturnType<typeof createStyles>;
}) => {
  const networks = entry.networks ?? [];
  return (
    <View style={styles.row}>
      <View style={styles.leftCol}>
        {entry.countryCode ? (
          <CountryFlag isoCode={entry.countryCode} size={18} />
        ) : (
          <View style={{ width: 30, height: 18 }} />
        )}
        <Text style={styles.countryName} numberOfLines={2}>
          {entry.countryName ?? entry.countryCode ?? "—"}
        </Text>
      </View>
      <View style={styles.rightCol}>
        {networks.length === 0 ? (
          <Text style={styles.networkName}>—</Text>
        ) : (
          networks.map((net, i) => (
            <View key={i} style={styles.networkTag}>
              <Text style={styles.networkName}>{net.name}</Text>
              {net.type ? (
                <Text style={styles.networkType}>{net.type}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CoverageModal() {
  const { isDark } = useTheme();
  const styles     = useMemo(createStyles, [isDark]);
  const bg         = useThemeColor({}, "background");
  const router     = useRouter();

  const { data: rawData } = useLocalSearchParams<{ data: string }>();
  const [query, setQuery] = useState("");

  const allEntries = useMemo<CountryNetworkEntry[]>(() => {
    try {
      return JSON.parse(rawData ?? "[]");
    } catch {
      return [];
    }
  }, [rawData]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allEntries;
    const q = query.toLowerCase();
    return allEntries.filter(
      (entry) =>
        entry.countryName?.toLowerCase().includes(q) ||
        entry.countryCode?.toLowerCase().includes(q) ||
        entry.networks?.some((n) => n.name?.toLowerCase().includes(q)),
    );
  }, [allEntries, query]);

  const showSearch = allEntries.length > SEARCH_THRESHOLD;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: bg }]}
      edges={["top", "bottom"]}
    >
      {/* Header — inline since this is a root-stack modal with no layout header */}
      <View style={styles.header}>
        {/* Spacer keeps title centred */}
        <View style={styles.spacer} />
        <Text style={styles.headerTitle}>Network Coverage</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close coverage"
          hitSlop={8}
        >
          <Ionicons
            name="close-circle"
            size={26}
            color={Theme.colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchWrapper}>
          <SearchBar
            placeholder="Search country or network…"
            onSearch={setQuery}
            onClear={() => setQuery("")}
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <CoverageRow entry={item} styles={styles} />
        )}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {query ? `No results for "${query}"` : "No coverage data available"}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}
