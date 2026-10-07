import React, { useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  TouchableOpacity,
  type LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import _chunk from "lodash/chunk";
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
const ARROW_SIZE = 32;

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
  },
  countrySectionWrapper: { marginTop: 12 },
  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  carouselTrack: {
    flex: 1,
  },
  countryColumn: {
    flexDirection: "row",
  },
  countryCell: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  countryName: {
    textAlign: "center",
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
  carouselArrow: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    borderRadius: ARROW_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
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

const CountryColumn = ({ item, width }: { item: ServiceRegion[]; width: number }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.countryColumn, { width }]}>
      {item.map((country) => (
        <TouchableOpacity
          key={country.code}
          onPress={navigateToESIMsByCountry(country.code)}
          style={styles.countryCell}
          accessibilityRole="button"
          accessibilityLabel={country.name || "Country"}
        >
          <CountryFlag
            isoCode={country.code}
            style={styles.flag}
            flagUrl={country.flag}
            size={80}
          />
          <ThemedText numberOfLines={2} style={styles.countryName}>
            {country.name}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
};

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

  const { countries, regions, chunkedCountries } = useMemo(() => {
    if (!query) return { countries: [], regions: [], chunkedCountries: [] };

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
      chunkedCountries: _chunk(matchedCountries, 2),
    };
  }, [countryConfig, regionConfig, query]);

  const [trackWidth, setTrackWidth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const snapInterval = trackWidth + SPACING;
  const maxOffset = Math.max(0, (chunkedCountries.length - 1) * snapInterval);

  const isAtStart = scrollOffset <= 0;
  const isAtEnd = scrollOffset >= maxOffset - snapInterval;

  const scrollByOnePage = (direction: 1 | -1) => {
    const target = Math.min(
      Math.max(scrollOffset + direction * snapInterval, 0),
      maxOffset
    );
    carouselRef.current?.scrollToOffset({ offset: target, animated: true });
    setScrollOffset(target);
  };

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <ThemedView style={styles.container}>
      {countries.length ? (
        <ThemedView style={styles.countrySectionWrapper}>
          <View style={styles.carouselRow}>
            <TouchableOpacity
              onPress={() => scrollByOnePage(-1)}
              disabled={isAtStart}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Scroll countries left"
              style={[
                styles.carouselArrow,
                { backgroundColor: colors.surfaceElevated, opacity: isAtStart ? 0 : 1 },
              ]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.highlight} />
            </TouchableOpacity>
            <View style={styles.carouselTrack} onLayout={onTrackLayout}>
              {trackWidth > 0 ? (
                <FlatList
                  ref={carouselRef}
                  data={chunkedCountries}
                  renderItem={({ item }) => <CountryColumn item={item} width={trackWidth} />}
                  keyExtractor={(item, index) => String(item?.[0]?.code || index)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={snapInterval}
                  decelerationRate="fast"
                  ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
                  onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.x)}
                  scrollEventThrottle={16}
                />
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => scrollByOnePage(1)}
              disabled={isAtEnd}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Scroll countries right"
              style={[
                styles.carouselArrow,
                { backgroundColor: colors.surfaceElevated, opacity: isAtEnd ? 0 : 1 },
              ]}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.highlight} />
            </TouchableOpacity>
          </View>
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
