import { useNavigation } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import _isFunction from "lodash/isFunction";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

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
      navigation.navigate(goBackFallBack);
    }
  };

  return (
    <ThemedView
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        margin: Theme.spacing.sm,
        position: "relative",
        ...containerStyle,
      }}
    >
      {hasBack && (
        <Ionicons
          name="chevron-back-outline"
          size={24}
          color={useThemeColor({}, "icon")}
          style={{ marginRight: Theme.spacing.sm, position: "absolute", zIndex: 1 }}
          onPress={handleBack}
        />
      )}
      <ThemedView
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          ...(hasBack && { paddingLeft: -Theme.spacing.xl }),
          ...style,
        }}
      >
        <ThemedText
          style={{ color: useThemeColor({}, "headerText"), ...titleStyle }}
        >
          {title || ""}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
};

export default Header;
