import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

import _debounce from "lodash/debounce";

import { ThemedView } from "@/components/ThemedView";
import { Theme } from "@/constants/Colors";
import SearchInput from "@/components/SearchInput";
import TabBar from "@/components/tabBar";

import Countries from "./tabs/countries";
import Global from "./tabs/global";
import Regions from "./tabs/regions";
import SearchResult from "./searchResult";
import Custom from "./tabs/custom";

const Tab = createMaterialTopTabNavigator();

const TabsNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      sceneContainerStyle={{ backgroundColor: "transparent" }}
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

  const debouncedOnSearch = _debounce(setSearchText, 500);

  return (
    <ThemedView style={styles.shopContainer}>
      <SearchInput onSearch={debouncedOnSearch} onClear={setSearchText} />
      <ThemedView style={styles.container}>
        {searchText ? (
          <SearchResult searchText={searchText} />
        ) : (
          <TabsNavigator />
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
});

export default React.memo(Shop);
