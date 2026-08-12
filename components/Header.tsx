import { Pressable, View, ViewStyle, TextStyle } from "react-native";
import { useNavigation, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import _isFunction from "lodash/isFunction";

import { ThemedText } from "@/components/ThemedText";

import { useThemeColor } from "@/hooks/useThemeColor";
import { Theme } from "@/constants/Colors";

interface HeaderProps {
  title: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  containerStyle?: ViewStyle;
  hasBack?: boolean;
  goBackFallBack?: Parameters<typeof router.navigate>[0];
  goBackHandler?: () => void;
}

const Header = ({
  title,
  style = {},
  titleStyle = {},
  containerStyle = {},
  hasBack,
  goBackFallBack,
  goBackHandler,
}: HeaderProps) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (_isFunction(goBackHandler)) {
      goBackHandler();
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    if (goBackFallBack) {
      router.navigate(goBackFallBack);
    }
  };

  const iconColor = useThemeColor({}, "icon");
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
      {/* left — back button or empty spacer */}
      <View style={{ width: SIDE_WIDTH }}>
        {hasBack && (
          <Pressable
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="chevron-back-outline"
              size={28}
              color={iconColor}
            />
          </Pressable>
        )}
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

      {/* right spacer keeps title centred */}
      <View style={{ width: SIDE_WIDTH }} />
    </View>
  );
};

export default Header;
