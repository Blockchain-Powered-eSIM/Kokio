import { createContext, useContext, useMemo } from "react";
import { StyleSheet, FlatList, StyleProp, ViewStyle } from "react-native";
import { createMaterialTopTabNavigator } from "expo-router/js-top-tabs";
import type { MaterialTopTabBarProps } from "expo-router/js-top-tabs";

import _get from "lodash/get";
import _groupBy from "lodash/groupBy";
import _isEmpty from "lodash/isEmpty";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Theme } from "@/constants/Colors";
import EsimItemSkeleton from "@/components/EsimItemSkeleton";
import { useToast } from "@/contexts/ToastContext";

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
const ESIMsFlatList = ESIMsFlatListComponent;

/**
 * Tab scene data is supplied via context so DataTab / DataCallsSMSTab can live at module scope with stable identities.
 * Inline (render-local) components passed to Tab.Screen's `component` remount the scene on every parent render,
 * losing FlatList scroll and re-initialising the list.
 * Hoisting + context keeps identity stable and turns data changes into in-place re-renders, not remounts.
 */
type TabSceneData = {
  plansByData: Esim[];
  plansByDataCallsSMS: Esim[];
  isLoading: boolean;
};

const TabSceneDataContext = createContext<TabSceneData>({
  plansByData: [],
  plansByDataCallsSMS: [],
  isLoading: false,
});

const DataTab = () => {
  const { plansByData, isLoading } = useContext(TabSceneDataContext);
  return (
    <ThemedView style={styles.tabScene}>
      <ESIMsFlatList esims={plansByData} isLoading={isLoading} />
    </ThemedView>
  );
};

const DataCallsSMSTab = () => {
  const { plansByDataCallsSMS, isLoading } = useContext(TabSceneDataContext);
  return (
    <ThemedView style={styles.tabScene}>
      <ESIMsFlatList esims={plansByDataCallsSMS} isLoading={isLoading} />
    </ThemedView>
  );
};

function DataPackTabGroup({
  plans,
  containerStyle,
  isLoading = false,
}: {
  plans: Esim[];
  containerStyle?: StyleProp<ViewStyle>;
  isLoading?: boolean;
}) {
  const { showMessage } = useToast();
  const { plansByData, plansByDataCallsSMS } = useMemo(() => {
    const plansGroupedByPlanType = _groupBy(plans, "planType");
    const plansByData = _get(plansGroupedByPlanType, TAB_KEYS.DATA);
    const plansByDataCallsSMS = _get(
      plansGroupedByPlanType,
      TAB_KEYS.DATA_CALLS_SMS
    );
    return { plansByData, plansByDataCallsSMS };
  }, [plans]);

  const tabSceneData = useMemo(
    () => ({ plansByData, plansByDataCallsSMS, isLoading }),
    [plansByData, plansByDataCallsSMS, isLoading]
  );

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      {_isEmpty(plansByData) || _isEmpty(plansByDataCallsSMS) ? (
        <ESIMsFlatList
          esims={plansByData || plansByDataCallsSMS}
          isLoading={isLoading}
        />
      ) : (
        <TabSceneDataContext.Provider value={tabSceneData}>
          <Tab.Navigator
            tabBar={(props: MaterialTopTabBarProps) => <TabBar {...props} />}
            screenOptions={{ sceneStyle: { backgroundColor: "transparent" } }}
          >
            <Tab.Screen name="Data" component={DataTab} options={{ tabBarLabel: "Data" }} />
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
                  e.preventDefault();
                  showMessage("Coming Soon!", "info");
                },
              }}
            />
          </Tab.Navigator>
        </TabSceneDataContext.Provider>
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

export default DataPackTabGroup;
