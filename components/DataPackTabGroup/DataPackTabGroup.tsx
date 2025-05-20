import React, { useState } from "react";
import { StyleSheet, FlatList } from "react-native";
import { TabView, TabBar } from "react-native-tab-view";
import _get from "lodash/get";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Theme } from "@/constants/Colors";

import ESIMItem, { Esim } from "../ESIMItem";

const TAB_KEYS = {
  DATA: "DATA",
  DATA_CALLS_SMS: "DATA_CALLS_SMS",
};

const ROUTES = [
  { key: TAB_KEYS.DATA, title: "Data" },
  { key: TAB_KEYS.DATA_CALLS_SMS, title: "Data+Calls+SMS" },
];

const ESIMsFlatList = ({ esims }: { esims: Esim[] }) => {
  return (
    <FlatList
      data={esims}
      renderItem={({ item }) => (
        <ESIMItem
          item={item}
          showBuyButton
          containerStyle={styles.eSimItemContainer}
        />
      )}
      keyExtractor={(item) => item.catalogueId}
      contentContainerStyle={styles.flatListContainer}
    />
  );
};

const TabBarLabel = ({ route: tabRoute, focused }: any) => (
  <ThemedText style={[styles.tabBarText, !focused && styles.inactiveTab]}>
    {_get(tabRoute, "title", "")}
  </ThemedText>
);

export default function DataPackTabGroup({
  esims,
  containerStyle,
}: {
  esims: Esim[];
  containerStyle?: any;
}) {
  const [index, setIndex] = useState<number>(0);

  const renderScene = ({ route }: any) => {
    switch (route.key) {
      case TAB_KEYS.DATA:
        return <ESIMsFlatList esims={esims} />;
      case TAB_KEYS.DATA_CALLS_SMS:
        return <ESIMsFlatList esims={esims} />;
      default:
        return null;
    }
  };

  return (
    <ThemedView style={[styles.container, containerStyle]}>
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
  tabBarContentContainer: {
    justifyContent: "space-around",
  },
  tabBarStyle: {
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: Theme.borderRadius.medium,
  },
  tabStyle: {
    padding: 0,
    minHeight: 30,
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
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: Theme.spacing.sm,
  },
  flatListContainer: {
    paddingTop: Theme.spacing.xs,
    display: "flex",
    flexDirection: "column",
    gap: Theme.spacing.sm,
  },
  eSimItemContainer: {
    paddingHorizontal: 8,
  },
});
