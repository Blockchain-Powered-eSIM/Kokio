import React, { useMemo } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import _lowerCase from "lodash/lowerCase";
import _trim from "lodash/trim";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Theme } from "@/constants/Colors";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import CountryFlag from "@/components/ui/CountryFlag";
import RegionalSearchRow from "@/components/shop/RegionalSearchRow";
import GlobalSearchRow from "@/components/shop/GlobalSearchRow";
import appBootstrap, { type ServiceRegion } from "@/utils/appBootstrap";
import {
  navigateToESIMsByCountry,
  navigateToESIMsByRegion,
} from "@/utils/general";
import { COUNTRY_TO_REGIONS } from "@/constants/general.constants";

const GLOBAL_ITEM = { code: "GLOBAL", name: "Global" };

const SPACING = 8;
const GRID_COLUMNS = 2;
const GRID_VISIBLE_ROWS = 2;
const GRID_COLUMN_GAP = 16;
const GRID_ITEM_WIDTH = (Dimensions.get("window").width * 0.9 - GRID_COLUMN_GAP) / GRID_COLUMNS;
// Flag (80) + label + its own marginBottom, so the grid clips to exactly
// GRID_VISIBLE_ROWS and the rest of the screen (regions, multi-country row)
// stays visible below it - more results scroll within the grid itself.
const GRID_ROW_HEIGHT = 150;

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
  },
  countrySectionWrapper: {
    marginTop: 12,
    width: "90%",
    alignSelf: "center",
  },
  countryCell: {
    width: GRID_ITEM_WIDTH,
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  countryColumnWrapper: {
    gap: GRID_COLUMN_GAP,
  },
  countryName: {
    textAlign: "center",
    paddingTop: Theme.spacing.sm,
    width: GRID_ITEM_WIDTH - 8,
  },
  flag: {
    borderRadius: Theme.borderRadius.large,
    backgroundColor: "transparent",
  },
  regionSectionWrapper: {
    flex: 1,
    marginTop: 20,
    marginBottom: 12,
  },
  multiCountryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  multiCountryText: {
    flex: 1,
    gap: 2,
  },
  regionTitle: {
    marginBottom: 12,
    color: colors.text,
  },
});

// `_lowerCase` also deburrs (strips diacritics) on both sides, so a two-letter
// unaccented search still matches a country name that starts with an
// accented form of those letters (e.g. "sa" -> "São Tomé").
// Rank 0 = name starts with the query, rank 1 = query appears inside the name,
// null = no match. Two-letter queries only match prefixes.
const matchRank = (name: string, query: string): number | null => {
  const value = _lowerCase(name);
  if (value.startsWith(query)) return 0;
  if (query.length > 2 && value.includes(query)) return 1;
  return null;
};

const rankedByName = <T extends ServiceRegion>(items: T[], query: string): T[] =>
  items
    .flatMap((item) => {
      const rank = matchRank(item.name, query);
      return rank === null ? [] : [{ item, rank }];
    })
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name))
    .map(({ item }) => item);

const CountryCell = ({ item }: { item: ServiceRegion }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity
      onPress={navigateToESIMsByCountry(item.code)}
      style={styles.countryCell}
      accessibilityRole="button"
      accessibilityLabel={item.name || "Country"}
    >
      <CountryFlag
        isoCode={item.code}
        style={styles.flag}
        flagUrl={item.flag}
        size={80}
      />
      <ThemedText numberOfLines={2} style={styles.countryName}>
        {item.name}
      </ThemedText>
    </TouchableOpacity>
  );
};

const CountryEmptyListComponent = () => (
  <ThemedText style={{ paddingVertical: 8, paddingHorizontal: 12, textAlign: "center" }}>
    No countries found
  </ThemedText>
);

const RegionEmptyListComponent = () => (
  <ThemedText style={{ paddingVertical: 8, paddingHorizontal: 12, textAlign: "center" }}>
    No regions found
  </ThemedText>
);

const RegionItemRender = ({ item }: { item: ServiceRegion }) => {
  if (item.code === GLOBAL_ITEM.code) {
    return <GlobalSearchRow onPress={navigateToESIMsByRegion(item.code)} />;
  }
  return (
    <RegionalSearchRow
      name={item.name}
      onPress={navigateToESIMsByRegion(item.code)}
    />
  );
};

const SearchResult = ({ searchText }: { searchText: string }) => {
  const countryConfig = appBootstrap.getCountryConfig;
  const regionConfig = appBootstrap.getRegionConfig;
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  const query = _lowerCase(_trim(searchText));

  const { countries, regions } = useMemo(() => {
    if (!query) return { countries: [], regions: [] };

    const matchedCountries = rankedByName(Object.values(countryConfig ?? {}), query);

    const regionCodesFromCountries = new Set(
      matchedCountries.flatMap((country) => COUNTRY_TO_REGIONS[country.code] ?? [])
    );
    const regionCandidates: ServiceRegion[] = [...Object.values(regionConfig ?? {}), GLOBAL_ITEM];
    const nameMatchedRegions = rankedByName(regionCandidates, query);
    const nameMatchedCodes = new Set(nameMatchedRegions.map((region) => region.code));
    const countryMatchedRegions = regionCandidates
      .filter((region) =>
        !nameMatchedCodes.has(region.code) &&
        (region.code === GLOBAL_ITEM.code
          ? matchedCountries.length > 0
          : regionCodesFromCountries.has(region.code))
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      countries: matchedCountries,
      regions: [...nameMatchedRegions, ...countryMatchedRegions],
    };
  }, [countryConfig, regionConfig, query]);

  const visibleRows = Math.min(Math.ceil(countries.length / GRID_COLUMNS), GRID_VISIBLE_ROWS);
  const gridHeight = visibleRows * GRID_ROW_HEIGHT;

  return (
    <ThemedView style={styles.container}>
      {countries.length ? (
        <ThemedView style={styles.countrySectionWrapper}>
          <FlatList
            data={countries}
            numColumns={GRID_COLUMNS}
            renderItem={({ item }) => <CountryCell item={item} />}
            columnWrapperStyle={styles.countryColumnWrapper}
            keyExtractor={(item, index) => String(item?.code || index)}
            style={{ height: gridHeight }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            ListEmptyComponent={CountryEmptyListComponent}
          />
        </ThemedView>
      ) : null}
      <ThemedView style={styles.regionSectionWrapper}>
        <TouchableOpacity
          onPress={() => router.push("/multi-country")}
          accessibilityRole="button"
          accessibilityLabel="Find plans for several countries"
          style={[styles.multiCountryRow, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="layers-outline" size={20} color={colors.text} />
          <View style={styles.multiCountryText}>
            <ThemedText bold>Plans for several countries</ThemedText>
            <ThemedText style={{ color: colors.mutedForeground, fontSize: 13 }}>
              Find one plan that covers your whole trip
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.regionTitle}>Regions</ThemedText>
        <FlatList
          data={regions}
          renderItem={({ item }) => <RegionItemRender item={item} />}
          keyExtractor={(item) => String(item.code)}
          ItemSeparatorComponent={() => <View style={{ height: SPACING }} />}
          ListEmptyComponent={RegionEmptyListComponent}
          showsVerticalScrollIndicator={false}
        />
      </ThemedView>
    </ThemedView>
  );
};

export default SearchResult;
