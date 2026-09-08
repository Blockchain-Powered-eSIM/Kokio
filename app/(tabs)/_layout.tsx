import React from "react";
import { StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs, router } from "expo-router";

import { Theme } from "@/constants/Colors";
import { useNavBarInset } from "@/hooks/useBottomInset"; 
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { ROUTE_NAMES } from "@/constants/route.constants";
import { getRouteName, getIsTabBarVisible } from "@/helpers/navigator.helper";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import Header from "@/components/Header";

const createStyles = (colors: Palette) => StyleSheet.create({
  tabBar: {
    backgroundColor: colors.secondaryBackground,
    borderTopColor: colors.border,
    height: 60,
    paddingBottom: Theme.spacing.xs,
  },
  tabBarIcon: {
    marginTop: Theme.spacing.xs,
  },
});

function InstallationHeader() {
  return (
    <SafeAreaView edges={["top"]}>
      <Header
        title="Install eSIM"
        style={{ justifyContent: "center" }}
        hasBack
        goBackHandler={() => {
          router.navigate("/(tabs)/orders");
        }}
      />
    </SafeAreaView>
  );
}

// Feature flags for tab availability
// Set to true to enable the tab, false to disable (but keep visible)
const TAB_ENABLED = {
  WALLET: false, // Change to true to enable Wallet tab
};

// Disabled tab styling
const DISABLED_TAB_OPACITY = 0.3;

export default function TabLayout() {
  const navBarInset = useNavBarInset();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  return (
    <Tabs
      screenOptions={({ navigation }) => {
        const navigationState = navigation.getState();
        const routeName = getRouteName(navigationState);
        const tabBarVisible = getIsTabBarVisible(routeName);

        return {
          tabBarActiveTintColor: colors.highlight,
          tabBarInactiveTintColor: colors.inactive,
          tabBarStyle: tabBarVisible
          ? [
              styles.tabBar,
              {
                backgroundColor: colors.secondaryBackground,
                // iOS does not hav a nav bar to account against
                height: 60 + (Platform.OS === "android" ? navBarInset : 0),
                paddingBottom: Theme.spacing.xs + (Platform.OS === "android" ? navBarInset : 0),
              },
            ]
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
              color={TAB_ENABLED.WALLET ? color : colors.inactive}
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
        name={ROUTE_NAMES.ORDERS}
        options={{
          title: "Orders",
          headerShown: true,
          header: () => (
            <SafeAreaView edges={["top"]}>
              <Header title="Orders" style={{ justifyContent: "center" }} />
            </SafeAreaView>
          ),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "receipt" : "receipt-outline"}
              color={color}
              style={styles.tabBarIcon}
            />
          ),
        }}
      />
      <Tabs.Screen
        name={ROUTE_NAMES.PHONE}
        options={{
          href: null, // Hide from tab bar — moved into Settings as disabled "Contact"
          title: "Contacts",
          headerShown: true,
          header: () => (
            <SafeAreaView edges={["top"]}>
              <Header title="Contacts" style={{ justifyContent: "center" }} />
            </SafeAreaView>
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
      <Tabs.Screen
        name={ROUTE_NAMES.INSTALLATION}
        options={{
          href: null, // Hide from tab bar
          headerShown: true,
          header: () => <InstallationHeader />,
        }}
      />
    </Tabs>
  );
}
