import React, { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import CountryFlag from "@/components/ui/CountryFlag";
import SearchBar from "@/components/SearchInput";

type CountryNetworkEntry = {
  countryCode?: string;
  countryName?: string;
  networks?: { name?: string; type?: string }[];
};

const SEARCH_THRESHOLD = 3;

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 12,
    },
    searchWrapper: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    list: {
      flex: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Theme.colors.muted,
      gap: 12,
    },
    leftCol: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    countryName: {
      flex: 1,
      fontSize: 14,
      fontWeight: "500",
      color: Theme.colors.text,
    },
    rightCol: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 4,
    },
    networkTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Theme.colors.itemBackground,
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 3,
      gap: 3,
    },
    networkName: {
      fontSize: 12,
      color: Theme.colors.mutedForeground,
    },
    networkType: {
      fontSize: 10,
      fontWeight: "700",
      color: Theme.colors.highlight,
    },
    emptyText: {
      textAlign: "center",
      paddingVertical: 48,
      fontSize: 14,
      color: Theme.colors.mutedForeground,
    },
  });

const CoverageRow = ({
  entry,
  styles,
}: {
  entry: CountryNetworkEntry;
  styles: ReturnType<typeof createStyles>;
}) => {
  const networks = entry.networks ?? [];
  return (
    <View style={styles.row}>
      {/* Left: flag + country name */}
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

      {/* Right: network tags */}
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

export default function CoverageScreen() {
  const { isDark } = useTheme();
  // TODO: Fix the theming engine to deprecate this usage pattern
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styles = useMemo(() => createStyles(), [isDark]);
  const bg = useThemeColor({}, "background");
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
        entry.networks?.some((n) => n.name?.toLowerCase().includes(q))
    );
  }, [allEntries, query]);

  const showSearch = allEntries.length > SEARCH_THRESHOLD;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
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
        keyExtractor={(item, i) => item.countryCode ?? String(i)}
        renderItem={({ item }) => <CoverageRow entry={item} styles={styles} />}
        style={styles.list}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={8}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.emptyText}>No results for &quot;{query}&quot;</Text>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}
