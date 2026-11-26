import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import type { NavigationState, Route, SceneRendererProps } from "react-native-tab-view";

import { Theme } from "@/constants/Colors";
import { useColors } from "@/hooks/useColors";

const styles = StyleSheet.create({
  tabBarContainer: {
    width: "100%",
    alignSelf: "center",
  },
  tabBarStyle: {
    borderRadius: Theme.borderRadius.medium,
    flexDirection: "row",
    overflow: "hidden",
  },
  tabStyle: {
    flex: 1,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  tabBarText: {
    textAlign: "center",
    fontWeight: "500",
    zIndex: 1,
  },
  indicatorStyle: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Theme.borderRadius.medium,
    zIndex: 0,
  },
});

type TabBarProps = SceneRendererProps & { navigationState: NavigationState<Route> };

const TabBar = ({ navigationState, jumpTo }: TabBarProps) => {
  const colors = useColors();
  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBarStyle, { backgroundColor: colors.secondaryBackground }]}>
        {navigationState.routes.map((route, index) => {
          const label = route.title ?? route.key;
          const isFocused = navigationState.index === index;

          const onPress = () => {
            if (!isFocused) {
              jumpTo(route.key);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={route.accessibilityLabel}
              onPress={onPress}
              style={styles.tabStyle}
              activeOpacity={0.7}
            >
              {isFocused && <View style={[styles.indicatorStyle, { backgroundColor: colors.muted }]} />}
              <Text
                style={[
                  styles.tabBarText,
                  {
                    color: isFocused ? colors.text : colors.inactive,
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default TabBar;
