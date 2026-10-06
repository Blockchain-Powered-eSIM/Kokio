import { router } from "expo-router";
import { HeaderBackButton } from "expo-router/react-navigation";
import type { NativeStackNavigationOptions } from "expo-router/native-stack";
import type { ColorValue } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

type HeaderLeftProps = Parameters<NonNullable<NativeStackNavigationOptions["headerLeft"]>>[0];

interface HeaderBackControlProps {
  onPress?: () => void;
  tintColor?: ColorValue;
}

// Single back control for the app: chevron only, no label, themed by the navigation header tint.
export function HeaderBackControl({ onPress, tintColor }: HeaderBackControlProps) {
  return (
    <HeaderBackButton
      displayMode="minimal"
      tintColor={tintColor as string | undefined}
      onPress={onPress ?? (() => router.back())}
      accessibilityLabel="Go back"
    />
  );
}

// A headerLeft function replaces the default back button, so the chevron must be rendered here whenever there is a previous screen.
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerBackTitle: "",
  headerLeft: ({ canGoBack, tintColor }: HeaderLeftProps) =>
    canGoBack ? <HeaderBackControl tintColor={tintColor} /> : null,
};

// Native headers match the custom Header component: same background, text colour and Lexend title.
export function useStackHeaderOptions(): NativeStackNavigationOptions {
  const background = useThemeColor({}, "background");
  const headerText = useThemeColor({}, "headerText");
  return {
    ...stackScreenOptions,
    headerTitleAlign: "center",
    headerStyle: { backgroundColor: background },
    headerTintColor: headerText,
    headerTitleStyle: { fontFamily: "Lexend", fontSize: 18, color: headerText },
  };
}
