import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs";
import type { MaterialTopTabBarProps } from "expo-router/js-top-tabs";
import { useFocusEffect, useNavigation } from "expo-router";

import _debounce from "lodash/debounce";

import { ThemedView } from "@/components/ThemedView";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import SearchInput from "@/components/SearchInput";
import TabBar from "@/components/tabBar";
import { ShopFilterButton } from "@/components/ShopFilterControl";
import { useShopFilters } from "@/contexts/ShopFiltersContext";

import Countries from "./tabs/countries";
import Global from "./tabs/global";
import Regions from "./tabs/regions";
import SearchResult from "./searchResult";
import Custom from "./tabs/custom";

const Tab = createMaterialTopTabNavigator();

const TabsNavigator = () => {
  const { isDark } = useTheme();
  const bg = useThemeColor({}, "background");
  return (
    <Tab.Navigator
      tabBar={(props: MaterialTopTabBarProps) => <TabBar {...props} />}
      screenOptions={{ sceneStyle: { backgroundColor: isDark ? "transparent" : bg } }}
    >
      <Tab.Screen
        name="Countries"
        component={Countries}
        options={{ tabBarLabel: "Countries" }}
      />
      <Tab.Screen
        name="Regions"
        component={Regions}
        options={{ tabBarLabel: "Regions" }}
      />
      <Tab.Screen
        name="Global"
        component={Global}
        options={{ tabBarLabel: "Global" }}
      />
      <Tab.Screen
        name="Custom"
        component={Custom}
        options={{ tabBarLabel: "Special" }}
      />
    </Tab.Navigator>
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
  // Global/Special) was last active.
  useEffect(() => {
    // "tabPress" isn't in expo-router's generic NavigationProp event map
    // (it's specific to tab navigators, which this screen isn't directly),
    // but it still bubbles up correctly to the ancestor Tabs navigator at runtime.
    const unsubscribe = (navigation as any).addListener("tabPress", () => {
      setTopTabResetKey((key) => key + 1);
    });
    return unsubscribe;
  }, [navigation]);

  // Resets the search term whenever this screen regains focus — covers
  // returning from a purchase flow or anywhere else in the app, not just a
  // bottom-tab press. Remounting SearchInput (via the key bump) is required
  // since it keeps its own uncontrolled text state internally.
  useFocusEffect(
    useCallback(() => {
      setSearchText("");
      setSearchResetKey((key) => key + 1);
    }, [])
  );

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
