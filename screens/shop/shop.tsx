import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";

import _get from "lodash/get";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Theme } from "@/constants/Colors";

import Countries from "./tabs/countries";
import Global from "./tabs/global";
import Regions from "./tabs/regions";

const ROUTES = [
  { key: "Countries", title: "Countries" },
  { key: "Regions", title: "Regions" },
  { key: "Global", title: "Global" },
];

const TabBarLabel = ({ route: tabRoute, focused }: any) => (
  <ThemedText style={[styles.tabBarText, !focused && styles.inactiveTab]}>
    {_get(tabRoute, "title", "")}
  </ThemedText>
);

const renderScene = SceneMap({
  Countries: Countries,
  Regions: Regions,
  Global: Global,
});

export default function Shop() {
  const [index, setIndex] = useState<number>(0);

  return (
    <ThemedView style={styles.shopContainer}>
      <TabView
        navigationState={{ index, routes: ROUTES }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={(args) => (
          <TabBar
            {...args}
            style={styles.tabBarStyle}
            renderLabel={TabBarLabel}
            indicatorStyle={styles.indicatorStyle}
            tabStyle={styles.tabStyle}
            contentContainerStyle={styles.tabBarContentContainer}
          />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabBarStyle: {
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: Theme.borderRadius.medium,
  },
  tabStyle: {
    padding: 0,
    minHeight: 30,
  },
  tabBarContentContainer: {
    justifyContent: "space-around",
  },
  inactiveTab: {
    color: Colors.dark.inactive,
  },
  tabBarText: {
    color: Colors.dark.text,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  indicatorStyle: {
    display: "none",
  },
  shopContainer: {
    paddingRight: Theme.spacing.sm,
    paddingLeft: Theme.spacing.sm,
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
});
