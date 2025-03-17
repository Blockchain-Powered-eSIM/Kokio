import React from "react";
import { Tabs } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { StyleSheet } from "react-native";
import { Theme, createStyles } from "@/constants/Colors";
import { ROUTE_NAMES } from "@/constants/route.constants";
import { getRouteName, getIsTabBarVisible } from "@/helpers/navigator.helper";

const styles = createStyles(StyleSheet);

export default function TabLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tabs
        screenOptions={({ navigation, route }) => {
          const navigationState = navigation.getState();
          const routeName = getRouteName(navigationState);
          const tabBarVisible = getIsTabBarVisible(routeName);

          return {
            tabBarActiveTintColor: Theme.colors.highlight,
            tabBarInactiveTintColor: Theme.colors.inactive,
            tabBarStyle: tabBarVisible ? styles.tabBar : { display: "none" },
            tabBarShowLabel: false,
            headerShown: false,
          };
        }}
      >
        <Tabs.Screen
          name={ROUTE_NAMES.HOME}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "home" : "home-outline"}
                color={color}
                style={styles.tabBarIcon}
              />
            ),
          }}
        />
        <Tabs.Screen
          name={ROUTE_NAMES.SHOP}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "cart" : "cart-outline"}
                color={color}
                style={styles.tabBarIcon}
              />
            ),
          }}
        />
        <Tabs.Screen
          name={ROUTE_NAMES.WALLET}
          options={{
            headerShown:false,
            title: "eSIM Wallet",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "wallet" : "wallet-outline"}
                color={color}
                style={styles.tabBarIcon}
              />
            ),
          }}
        />
        <Tabs.Screen
          name={ROUTE_NAMES.PHONE}
          options={{
            title: "eSIMs",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "call" : "call-outline"}
                color={color}
                style={styles.tabBarIcon}
              />
            ),
          }}
        />
        <Tabs.Screen
          name={ROUTE_NAMES.SETTINGS}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon
                name={focused ? "menu" : "menu-outline"}
                color={color}
                style={styles.tabBarIcon}
              />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
