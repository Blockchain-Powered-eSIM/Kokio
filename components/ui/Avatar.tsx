import React, { useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import { Theme } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";

const createStyles = () => StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.colors.success,
    overflow: "hidden",
  },
  initials: {
    color: Theme.colors.text,
    fontWeight: "bold",
  },
});

const Avatar = ({
  imageUri,
  name,
  size = 50,
}: {
  imageUri?: ImageSourcePropType;
  name: string;
  size?: number;
}) => {
  const { isDark } = useTheme();
  // TODO: Fix the theming engine to deprecate this usage pattern
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const styles = useMemo(() => createStyles(), [isDark]);
  const twoLetters = name
    ? name.charAt(0).toUpperCase() + (name.charAt(1) || "").toLowerCase()
    : "NA";

  return (
    <View
      style={[
        styles.container,
        { height: size, width: size, borderRadius: size / 2 },
      ]}
    >
      {imageUri ? (
        <Image
          source={imageUri}
          style={{ height: size, width: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size / 2 }]}>
          {twoLetters}
        </Text>
      )}
    </View>
  );
};


export default Avatar;
