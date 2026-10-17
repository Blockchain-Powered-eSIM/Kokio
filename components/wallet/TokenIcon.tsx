import React from "react";
import { View, Image, type ImageSourcePropType } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";

interface TokenIconProps {
  symbol: string;
  icon?: ImageSourcePropType;
  size?: number;
}

/**
 * A custom-added token has no bundled icon asset - falls back to a plain
 * monogram circle (first letter of its symbol) instead of a broken image.
 */
export function TokenIcon({ symbol, icon, size = 40 }: TokenIconProps) {
  const colors = useColors();

  if (icon) {
    return <Image source={icon} style={{ width: size, height: size }} />;
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceElevated,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ThemedText bold style={{ fontSize: size * 0.4 }}>
        {symbol.charAt(0).toUpperCase()}
      </ThemedText>
    </View>
  );
}

export default TokenIcon;
