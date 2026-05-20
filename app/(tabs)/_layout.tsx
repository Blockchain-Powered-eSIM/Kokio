import React from "react";
import { Tabs, router } from "expo-router";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { StyleSheet } from "react-native";
import { Theme, createStyles } from "@/constants/Colors";
import { ROUTE_NAMES } from "@/constants/route.constants";
import { getRouteName, getIsTabBarVisible } from "@/helpers/navigator.helper";
import Header from "@/components/Header";
import { SafeAreaView } from "react-native-safe-area-context";

const styles = createStyles(StyleSheet);

// Feature flags for tab availability
// Set to true to enable the tab, false to disable (but keep visible)
const TAB_ENABLED = {
  WALLET: false, // Change to true to enable Wallet tab
  PHONE: false, // Change to true to enable Phone tab
};

// Disabled tab styling
const DISABLED_TAB_OPACITY = 0.3;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ navigation }) => {
        const navigationState = navigation.getState();
        const routeName = getRouteName(navigationState);
        const tabBarVisible = getIsTabBarVisible(routeName);

        return {
          tabBarActiveTintColor: Theme.colors.highlight,
          tabBarInactiveTintColor: Theme.colors.inactive,
          tabBarStyle: tabBarVisible
            ? [styles.tabBar, { backgroundColor: Theme.colors.secondaryBackground }]
            : { display: "none" },
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
          headerShown: false,
          title: "eSIM Wallet",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "wallet" : "wallet-outline"}
              color={TAB_ENABLED.WALLET ? color : Theme.colors.inactive}
              style={[
                styles.tabBarIcon,
                !TAB_ENABLED.WALLET && { opacity: DISABLED_TAB_OPACITY },
              ]}
            />
          ),
        }}
        // NOTE: Remove when tab is enabled
        listeners={{
          tabPress: (e) => {
            if (!TAB_ENABLED.WALLET) {
              e.preventDefault();
            }
          },
        }}
      />
      <Tabs.Screen
        name={ROUTE_NAMES.PHONE}
        options={{
          title: "Contacts",
          headerShown: true,
          header: () => (
            <SafeAreaView edges={["top"]}>
              <Header title="Contacts" style={{ justifyContent: "center" }} />
            </SafeAreaView>
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "call" : "call-outline"}
              color={TAB_ENABLED.PHONE ? color : Theme.colors.inactive}
              style={[
                styles.tabBarIcon,
                !TAB_ENABLED.PHONE && { opacity: DISABLED_TAB_OPACITY },
              ]}
            />
          ),
        }}
        // NOTE: Remove when tab is enabled
        listeners={{
          tabPress: (e) => {
            if (!TAB_ENABLED.PHONE) {
              e.preventDefault();
            }
          },
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
      <Tabs.Screen
        name={ROUTE_NAMES.INSTALLATION}
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          header: () => (
            <SafeAreaView edges={["top"]}>
              <Header
                title="Install eSIM"
                style={{ justifyContent: "center" }}
                hasBack
                goBackHandler={() => {
                  // Reset the Shop stack by navigating to its root, then go to Home
                  router.push("/(tabs)/(shop)");
                  router.navigate("/(tabs)");
                }}
              />
            </SafeAreaView>
          ),
        }}
      />
    </Tabs>
  );
}
