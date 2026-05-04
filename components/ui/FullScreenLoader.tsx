import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

interface FullScreenLoaderProps {
  color?: string;
  containerStyle?: string;
}

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  color = useThemeColor({}, "highlight"),
  containerStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: useThemeColor({}, "background"),
  },
});

export default FullScreenLoader;
