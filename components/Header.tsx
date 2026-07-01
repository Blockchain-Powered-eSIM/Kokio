import { View } from "react-native";
import { useNavigation, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import _isFunction from "lodash/isFunction";

import { ThemedText } from "@/components/ThemedText";

import { useThemeColor } from "@/hooks/useThemeColor";
import { Theme } from "@/constants/Colors";

const Header = ({
  title,
  style = {},
  titleStyle = {},
  containerStyle = {},
  hasBack,
  goBackFallBack,
  goBackHandler,
}: any) => {
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
          <Ionicons
            name="chevron-back-outline"
            size={25}
            color={iconColor}
            onPress={handleBack}
          />
        )}
      </View>

      {/* centre — title */}
      <View style={{ flex: 1, alignItems: "center", ...style }}>
        <ThemedText
          style={{ color: headerTextColor, ...titleStyle }}
          className="text-[16px] font-Lexend"
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
