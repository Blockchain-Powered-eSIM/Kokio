import type { ReactNode } from "react";
import { View, ViewStyle, TextStyle } from "react-native";

import { ThemedText } from "@/components/ThemedText";

import { useThemeColor } from "@/hooks/useThemeColor";
import { Theme } from "@/constants/Colors";

interface HeaderProps {
  title: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  containerStyle?: ViewStyle;
  rightElement?: ReactNode;
  leftElement?: ReactNode;
}

const Header = ({
  title,
  style = {},
  titleStyle = {},
  containerStyle = {},
  rightElement,
  leftElement,
}: HeaderProps) => {
  const headerTextColor = useThemeColor({}, "headerText");
  const backgroundColor = useThemeColor({}, "background");

  const SIDE_WIDTH = 40;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Theme.spacing.md,
        paddingVertical: Theme.spacing.sm,
        backgroundColor,
        ...containerStyle,
      }}
    >
      {/* left slot keeps the title centred when empty */}
      <View style={leftElement ? { minWidth: SIDE_WIDTH, alignItems: "flex-start" } : { width: SIDE_WIDTH }}>
        {leftElement}
      </View>

      {/* centre — title */}
      <View style={{ flex: 1, alignItems: "center", ...style }}>
        <ThemedText
          style={{ color: headerTextColor, ...titleStyle }}
          className="text-[18px] font-Lexend"
        >
          {title || ""}
        </ThemedText>
      </View>

      {/* right — custom element or empty spacer keeps title centred */}
      <View
        style={
          rightElement
            ? { minWidth: SIDE_WIDTH, alignItems: "flex-end" }
            : { width: SIDE_WIDTH }
        }
      >
        {rightElement}
      </View>
    </View>
  );
};

export default Header;
