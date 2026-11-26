import { useEffect, useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { SceneMap, TabView } from "react-native-tab-view";
import { useNavigation } from "expo-router";

import _debounce from "lodash/debounce";

import { ThemedView } from "@/components/themed-view";
import { Theme } from "@/theme/colors";
import { useTheme } from "@/providers/theme-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import SearchInput from "@/components/search-input";
import TabBar from "./components/tab-bar";
import ShopFilterButton from "./components/shop-filter-button";
import { useShopFilters } from "./shop-filters-context";

import Countries from "./components/countries-tab";
import Global from "./components/global-tab";
import Regions from "./components/regions-tab";
import SearchResult from "./components/search-results";
import Custom from "./components/custom-tab";

const TOP_TAB_ROUTES = [
  { key: "Countries", title: "Countries" },
  { key: "Regions", title: "Regions" },
  { key: "Global", title: "Global" },
  { key: "Custom", title: "Special" },
];

const renderScene = SceneMap({
  Countries,
  Regions,
  Global,
  Custom,
});

const TabsNavigator = () => {
  const { isDark } = useTheme();
  const bg = useThemeColor({}, "background");
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  return (
    <TabView
      navigationState={{ index, routes: TOP_TAB_ROUTES }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
      renderTabBar={(props) => <TabBar {...props} />}
      style={{ backgroundColor: isDark ? "transparent" : bg }}
    />
  );
};

const Shop = () => {
  const [searchText, setSearchText] = useState<string>("");
  const [topTabResetKey, setTopTabResetKey] = useState(0);
  const [searchResetKey, setSearchResetKey] = useState(0);
  const navigation = useNavigation();
  const { isActive: filtersActive, openFilterSheet } = useShopFilters();

  const debouncedOnSearch = useMemo(() => _debounce(setSearchText, 500), []);

  useEffect(() => () => debouncedOnSearch.cancel(), [debouncedOnSearch]);

  // tabPress bubbles up to the nearest ancestor tab navigator (the bottom
  // Tabs), so this fires whenever the Shop tab icon is pressed — including
  // when switching back into Shop from a different tab. Remounting
  // TabsNavigator (via the key bump) resets it to its first screen
  // (Countries) instead of silently keeping whatever top-tab (Regions/
  // Global/Special) was last active, and the search is cleared with it.
  useEffect(() => {
    // "tabPress" isn't in expo-router's generic NavigationProp event map
    // (it's specific to tab navigators, which this screen isn't directly),
    // but it still bubbles up correctly to the ancestor Tabs navigator at runtime.
    const unsubscribe = (navigation as any).addListener("tabPress", () => {
      debouncedOnSearch.cancel();
      setSearchText("");
      setSearchResetKey((key) => key + 1);
      setTopTabResetKey((key) => key + 1);
    });
    return unsubscribe;
  }, [navigation, debouncedOnSearch]);

  return (
    <ThemedView style={styles.shopContainer}>
      <ThemedView style={styles.searchRow}>
        <SearchInput
          key={searchResetKey}
          onSearch={debouncedOnSearch}
          onClear={setSearchText}
          containerStyle={styles.searchInput}
        />
        {/* The sheet itself is mounted at the Shop stack's _layout.tsx level,
            not here — see ShopFilterSheet's comment for why: this screen's
            MaterialTopTabNavigator (Countries/Regions/Global/Special) below
            re-layouts on every top-tab switch, which previously desynced the
            sheet and left it stuck mid-open. openFilterSheet() reaches that
            higher-mounted instance through ShopFiltersContext. */}
        <ShopFilterButton isActive={filtersActive} onPress={openFilterSheet} />
      </ThemedView>
      <ThemedView style={styles.container}>
        {searchText ? (
          <SearchResult searchText={searchText} />
        ) : (
          <TabsNavigator key={topTabResetKey} />
        )}
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 12 },
  shopContainer: {
    paddingRight: Theme.spacing.sm,
    paddingLeft: Theme.spacing.sm,
    flex: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
  },
});

export default Shop;
