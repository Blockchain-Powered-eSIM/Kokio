import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import _get from "lodash/get";
import _map from "lodash/map";
import _chunk from "lodash/chunk";
import _filter from "lodash/filter";
import _lowerCase from "lodash/lowerCase";
import _includes from "lodash/includes";
import _trim from "lodash/trim";
import _reduce from "lodash/reduce";
import _size from "lodash/size";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Theme } from "@/constants/Colors";
import CountryFlag from "@/components/ui/CountryFlag";
import { useThemeColor } from "@/hooks/useThemeColor";
import appBootstrap from "@/utils/appBootstrap";
import {
  navigateToESIMsByCountry,
  navigateToESIMsByRegion,
} from "@/utils/general";

const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_WIDTH = SCREEN_WIDTH * 0.8;
const SPACING = 8;

const isSearchTextMatch = ({ searchText, item, keyExtractor }) =>
  _includes(_lowerCase(_get(item, keyExtractor)), searchText);

const CountryItemRender = ({ item }) => {
  const firstItem = _get(item, "0", {});
  const secondItem = _get(item, "1", {});

  return (
    <View style={styles.countryItem}>
      <TouchableOpacity
        onPress={navigateToESIMsByCountry(firstItem?.code)}
        style={styles.flagWrapper}
      >
        <CountryFlag
          isoCode={firstItem?.code}
          style={styles.flag}
          flagUrl={firstItem?.flag}
          size={80}
        />
        <ThemedText>{firstItem?.name}</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.flagWrapper}
        onPress={navigateToESIMsByCountry(secondItem?.code)}
      >
        <CountryFlag
          isoCode={secondItem?.code}
          style={styles.flag}
          flagUrl={secondItem?.flag}
          size={80}
        />
        <ThemedText>{secondItem?.name}</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const RegionEmptyListComponent = () => (
  <ThemedText
    style={[
      styles.regionItem,
      {
        textAlign: "center",
      },
    ]}
  >
    No regions found
  </ThemedText>
);

const RegionItemRender = ({
  item,
}: {
  item: { name?: string; code: string; flag: string };
}) => {
  return (
    <TouchableOpacity onPress={navigateToESIMsByRegion(item?.code)}>
      <ThemedView
        style={styles.regionItem}
        darkColor={Colors.dark.secondaryBackground}
      >
        <ThemedView
          darkColor={Colors.dark.secondaryBackground}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons
            name="globe-outline"
            size={16}
            color={useThemeColor({}, "foreground")}
            style={{ marginRight: 16 }}
          />
          <ThemedText>{item?.name}</ThemedText>
        </ThemedView>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={useThemeColor({}, "foreground")}
        />
      </ThemedView>
    </TouchableOpacity>
  );
};

const SearchResult = ({ searchText }: { searchText: string }) => {
  const countryConfig = appBootstrap.getCountryConfig;
  const regionConfig = appBootstrap.getRegionConfig;

  const sanitizedSearchText = _lowerCase(_trim(searchText));

  const countries = useMemo(
    () =>
      _reduce(
        countryConfig,
        (acc, item) => {
          if (
            isSearchTextMatch({
              searchText: sanitizedSearchText,
              item,
              keyExtractor: "name",
            })
          ) {
            acc.push(item);
          }
          return acc;
        },
        []
      ),
    [countryConfig, sanitizedSearchText]
  );

  const regions = useMemo(
    () =>
      _reduce(
        regionConfig,
        (acc, item) => {
          if (
            isSearchTextMatch({
              searchText: sanitizedSearchText,
              item,
              keyExtractor: "name",
            })
          ) {
            acc.push(item);
          }
          return acc;
        },
        []
      ),
    [regionConfig, sanitizedSearchText]
  );

  const [scrollOffset, setScrollOffset] = useState(0);
  const chunkedCountries = _chunk(countries, 2);
  const SNAP_INTERVAL = 160 + SPACING;
  const maxOffset = (chunkedCountries.length - 1) * SNAP_INTERVAL;

  const isAtStart = scrollOffset <= 0;
  const isAtEnd = scrollOffset >= maxOffset - SNAP_INTERVAL;

  const {} = useMemo;
  return (
    <ThemedView style={styles.container}>
      {_size(countries) ? (
        <ThemedView style={styles.countrySectionWrapper}>
          <View style={styles.carouselRow}>
            <Ionicons name="chevron-back" size={15} color={Colors.dark.text} style={{ opacity: isAtStart ? 0 : 1 }}/>
              <FlatList
                data={_chunk(countries, 2)}
                renderItem={CountryItemRender}
                keyExtractor={(item, index) => item?.code || index}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.countryListContainer}
                snapToInterval={160 + SPACING}
                decelerationRate="fast"
                ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
                onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.x)}
                scrollEventThrottle={16}
              />
            <Ionicons name="chevron-forward" size={15} color={Colors.dark.text} style={{ opacity: isAtEnd ? 0 : 1 }} />
          </View>
        </ThemedView>
      ) : null}
      <ThemedView style={styles.regionSectionWrapper}>
        <ThemedText style={styles.regionTitle}> Regions</ThemedText>
        <ThemedView style={styles.regionListContainer}>
          <FlatList
            data={regions}
            renderItem={RegionItemRender}
            keyExtractor={(item, index) => item?.code || index}
            ItemSeparatorComponent={() => <View style={{ height: SPACING }} />}
            ListEmptyComponent={RegionEmptyListComponent}
            showsVerticalScrollIndicator={false}
          />
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingRight: Theme.spacing.sm,
    paddingLeft: Theme.spacing.sm,
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  countrySectionWrapper: { marginTop: 12, marginHorizontal: 24 },
  regionSectionWrapper: {
    flex: 1,
    marginTop: 20,
    marginHorizontal: 24,
    marginBottom: 12,
    overflow: "hidden",
  },
  regionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.dark.secondaryBackground,
    justifyContent: "space-between",
    flexDirection: "row",
  },
  flag: {
    borderRadius: Theme.borderRadius.large,
  },
  countryListContainer: {
    paddingHorizontal: SPACING,
    marginTop: 12,
  },
  regionTitle: {
    marginBottom: 12,
    color: useThemeColor({}, "foreground"),
  },
  regionListContainer: {
    backgroundColor: Colors.dark.secondaryBackground,
    borderWidth: 1,
    borderRadius: 16,
    marginLeft: 20,
    overflow: "scroll",
  },
  countryItem: {
    width: ITEM_WIDTH,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  itemSeperator: { height: SPACING },
  flagWrapper: {
    alignItems: "center",
    gap: 8,
  },
  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default SearchResult;
