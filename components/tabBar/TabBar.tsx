import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";

import { Theme } from "@/constants/Colors";

const TabBar = ({ state, descriptors, navigation }: MaterialTopTabBarProps) => {
  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBarStyle, { backgroundColor: Theme.colors.secondaryBackground }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabStyle}
              activeOpacity={0.7}
            >
              {isFocused && <View style={[styles.indicatorStyle, { backgroundColor: Theme.colors.muted }]} />}
              <Text
                style={[
                  styles.tabBarText,
                  {
                    color: isFocused ? Theme.colors.text : Theme.colors.inactive,
                  },
                ]}
              >
                {label as string}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

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

export default TabBar;
