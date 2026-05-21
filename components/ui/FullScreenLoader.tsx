import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Theme } from "@/constants/Colors";

interface FullScreenLoaderProps {
  color?: string;
  containerStyle?: object;
}

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  color,
  containerStyle,
}) => {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: Theme.colors.background },
        containerStyle,
      ]}
    >
      <ActivityIndicator size="large" color={color ?? Theme.colors.highlight} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default FullScreenLoader;
