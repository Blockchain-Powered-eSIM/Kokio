import React, { useMemo } from "react";
import { StyleSheet, FlatList } from "react-native";
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs";

import _get from "lodash/get";
import _groupBy from "lodash/groupBy";
import _isEmpty from "lodash/isEmpty";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Theme } from "@/constants/Colors";
import EsimItemSkeleton from "@/components/EsimItemSkeleton";

import ESIMItem, { Esim } from "../ESIMItem";
import TabBar from "../tabBar";

const Tab = createMaterialTopTabNavigator();

const TAB_KEYS = {
  DATA: "DATA",
  DATA_CALLS_SMS: "DATA_CALLS_SMS",
};

const EmptyListComponent = () => (
  <ThemedText
    style={{
      textAlign: "center",
      flex: 1,
      paddingTop: 42,
    }}
  >
    No Plans found
  </ThemedText>
);

const ESIMsFlatListComponent = ({ esims, isLoading }: { esims: Esim[]; isLoading: boolean }) => {
  return isLoading ? (
    <FlatList
      data={[1, 2, 3, 4, 5]}
      renderItem={() => (
        <EsimItemSkeleton containerStyle={styles.eSimItemContainer} />
      )}
      keyExtractor={(_, index) => index.toString()}
      contentContainerStyle={styles.flatListContainer}
      style={{ backgroundColor: "transparent" }}
    />
  ) : (
    <FlatList
      data={esims}
      renderItem={({ item }) => (
        <ESIMItem
          item={item}
          showBuyButton
          containerStyle={styles.eSimItemContainer}
        />
      )}
      keyExtractor={(item, index) => item.catalogueId || index.toString()}
      contentContainerStyle={styles.flatListContainer}
      ListEmptyComponent={EmptyListComponent}
      style={{ backgroundColor: "transparent" }}
    />
  );
};
const ESIMsFlatList = React.memo(ESIMsFlatListComponent);

function DataPackTabGroup({
  esims,
  containerStyle,
  isLoading,
}: {
  esims: Esim[];
  containerStyle?: any;
  isLoading?: any;
}) {
  const { eSimsByData, eSimsByDataCallsSMS } = useMemo(() => {
    const eSimsGroupedByPlanType = _groupBy(esims, "planType");
    const eSimsByData = _get(eSimsGroupedByPlanType, TAB_KEYS.DATA);
    const eSimsByDataCallsSMS = _get(
      eSimsGroupedByPlanType,
      TAB_KEYS.DATA_CALLS_SMS
    );
    return { eSimsByData, eSimsByDataCallsSMS };
  }, [esims]);

  const DataTab = () => (
    <ThemedView style={styles.tabScene}>
      <ESIMsFlatList esims={eSimsByData} isLoading={isLoading} />
    </ThemedView>
  );
  const DataCallsSMSTab = () => (
    <ThemedView style={styles.tabScene}>
      <ESIMsFlatList esims={eSimsByDataCallsSMS} isLoading={isLoading} />
    </ThemedView>
  );

  const TabsNavigator = () => {
    return (
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ sceneStyle: { backgroundColor: "transparent" } }}
      >
        <Tab.Screen
          name="Data"
          component={DataTab}
          options={{ tabBarLabel: "Data" }}
        />
        {/* NOTE: DATA_CALLS_SMS is disabled until needed */}
        <Tab.Screen
          name="DataCallsSMS"
          component={DataCallsSMSTab}
          options={{
            tabBarLabel: "Data+Calls+SMS",
            tabBarAccessibilityLabel: "Data+Calls+SMS (disabled)",
            tabBarLabelStyle: [styles.tabBarText, styles.disabledTabText, { color: Theme.colors.inactive }],
          }}
          listeners={{
            tabPress: (e) => {
              // Prevent default action to disable the tab
              e.preventDefault();
            },
          }}
        />
      </Tab.Navigator>
    );
  };

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      {_isEmpty(eSimsByData) || _isEmpty(eSimsByDataCallsSMS) ? (
        <ESIMsFlatList
          esims={eSimsByData || eSimsByDataCallsSMS}
          isLoading={isLoading}
        />
      ) : (
        <TabsNavigator />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabBarText: {
    textAlign: "center",
    paddingVertical: 2,
    fontSize: 14,
    fontWeight: "500",
  },
  disabledTabText: {
    opacity: 0.5,
  },
  container: {
    flex: 1,
    paddingTop: Theme.spacing.sm,
  },
  tabScene: {
    flex: 1,
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

export default React.memo(DataPackTabGroup);
