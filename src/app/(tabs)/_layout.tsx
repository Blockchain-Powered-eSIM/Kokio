import React from "react";
import { StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs, router, useSegments } from "expo-router";

import { Theme } from "@/theme/colors";
import { useNavBarInset } from "@/hooks/use-bottom-inset";
import { useColors } from "@/hooks/use-colors";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import type { Palette } from "@/theme/colors";
import { ROUTE_NAMES } from "@/lib/constants/routes";
import { getRouteNameFromSegments, getIsTabBarVisible } from "@/lib/navigation";
import { TabBarIcon } from "@/components/navigation/tab-bar-icon";
import Header from "@/components/header";
import { HeaderBackControl } from "@/components/navigation/stack-header";

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

export default function TabLayout() {
  const navBarInset = useNavBarInset();
  const headerBackground = useThemeColor({}, "background");
  const headerText = useThemeColor({}, "headerText");
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const segments = useSegments();
  const tabBarVisible = getIsTabBarVisible(getRouteNameFromSegments(segments));
  return (
    <Tabs
      screenOptions={() => {
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
              color={color}
              style={styles.tabBarIcon}
            />
          ),
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
          // In Expo Router 58, `href: null` marks the tab `hidden`, and a focused hidden tab is redirected to the initial tab (Home)
          tabBarItemStyle: { display: "none" },
          headerShown: true,
          title: "Install eSIM",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: headerBackground },
          headerTintColor: headerText,
          headerTitleStyle: { fontFamily: "Lexend", fontSize: 18, color: headerText },
          headerLeft: ({ tintColor }) => (
            <HeaderBackControl
              tintColor={tintColor}
              onPress={() => router.navigate("/(tabs)/orders")}
            />
          ),
        }}
      />
    </Tabs>
  );
}
