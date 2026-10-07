import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import _lowerCase from "lodash/lowerCase";
import _trim from "lodash/trim";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import DataPackTabGroup from "@/components/DataPackTabGroup";
import SearchInput from "@/components/SearchInput";
import { Theme } from "@/constants/Colors";
import { useColors } from "@/hooks/useColors";
import { useMultiCountryPlans } from "@/hooks/useMultiCountryPlans";
import appBootstrap, { type ServiceRegion } from "@/utils/appBootstrap";

const MAX_SUGGESTIONS = 8;

export default function MultiCountryPlans() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const countries = useMemo<ServiceRegion[]>(() => appBootstrap.getCountries ?? [], []);
  const countryNames = useMemo(
    () => new Map(countries.map((c) => [c.code, c.name])),
    [countries],
  );

  const normalisedQuery = _lowerCase(_trim(query));
  const suggestions = useMemo(() => {
    if (!normalisedQuery) return [];
    return countries
      .filter((c) => !selected.includes(c.code) && _lowerCase(c.name).includes(normalisedQuery))
      .slice(0, MAX_SUGGESTIONS);
  }, [countries, normalisedQuery, selected]);

  const { matches, isLoading, isError, refetch } = useMultiCountryPlans(selected);
  const fullMatches = matches.filter((m) => m.coveredCount === selected.length).length;

  const toggle = (code: string) =>
    setSelected((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );

  const summary =
    selected.length === 0
      ? "Pick the countries you'll travel to."
      : isLoading
        ? "Finding plans…"
        : fullMatches > 0
          ? `${fullMatches} ${fullMatches === 1 ? "plan covers" : "plans cover"} all ${selected.length} countries.`
          : `No plan covers all ${selected.length} countries. Closest matches are shown first.`;

  return (
    <ThemedView style={styles.container}>
      <SearchInput key={inputKey} placeholder="Search countries" onSearch={setQuery} onClear={setQuery} />

      {suggestions.length > 0 && (
        <View style={styles.chipRow}>
          {suggestions.map((c) => (
            <Pressable
              key={c.code}
              onPress={() => {
                toggle(c.code);
                setQuery("");
                setInputKey((key) => key + 1);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add ${c.name}`}
              style={[styles.chip, { backgroundColor: colors.surface }]}
            >
              <ThemedText>{c.name}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      {selected.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectedScroll}
          contentContainerStyle={styles.selectedRow}
        >
          {selected.map((code) => (
            <Pressable
              key={code}
              onPress={() => toggle(code)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${countryNames.get(code) ?? code}`}
              style={[styles.chip, { backgroundColor: colors.primary }]}
            >
              <ThemedText style={{ color: colors.primaryForeground }}>
                {countryNames.get(code) ?? code}
              </ThemedText>
              <Ionicons name="close" size={14} color={colors.primaryForeground} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ThemedText style={[styles.summary, { color: colors.mutedForeground }]}>{summary}</ThemedText>

      {selected.length > 0 && isError ? (
        <Pressable onPress={refetch} accessibilityRole="button" style={styles.retry}>
          <ThemedText style={styles.retryLabel}>Couldn&apos;t load plans. Try again</ThemedText>
        </Pressable>
      ) : null}

      {selected.length > 0 && (
        <DataPackTabGroup
          plans={matches.map((m) => m.plan)}
          isLoading={isLoading && matches.length === 0}
          containerStyle={styles.results}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Theme.spacing.sm,
    paddingTop: Theme.spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  selectedScroll: {
    flexGrow: 0,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  summary: {
    marginTop: 12,
    fontSize: 13,
  },
  retry: {
    marginTop: 8,
    alignSelf: "center",
  },
  retryLabel: {
    textDecorationLine: "underline",
  },
  results: {
    flex: 1,
    paddingHorizontal: 0,
  },
});
