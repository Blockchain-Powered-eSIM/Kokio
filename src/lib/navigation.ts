import _includes from "lodash/includes";
import type { NavigationProp, NavigationState, ParamListBase, PartialState } from "expo-router/react-navigation";

import { TAB_BAR_ENABLED_ROUTES } from "@/lib/constants/routes";

type AnyNavigationState = NavigationState | PartialState<NavigationState> | undefined;

/**
 * Navigation object that can listen for "tabPress". The event comes from the
 * bottom Tabs navigator, which the generic useNavigation() type does not know about.
 */
export type TabPressNavigation = NavigationProp<
  ParamListBase,
  string,
  string | undefined,
  NavigationState,
  object,
  { tabPress: { data: undefined; canPreventDefault: true } }
>;

export const getRouteName = (navigationState: AnyNavigationState): string | undefined => {
  const currentRouteData = navigationState?.routes[(navigationState as NavigationState)?.index ?? 0];

  if (currentRouteData?.state) {
    return `${currentRouteData?.name || ""}/${getRouteName(currentRouteData.state as AnyNavigationState)}`;
  }

  return currentRouteData?.name;
};

export const getIsTabBarVisible = (routeName: string | undefined): boolean =>
  _includes(TAB_BAR_ENABLED_ROUTES, routeName);

export const getRouteNameFromSegments = (segments: readonly string[]): string | undefined => {
  if (segments[0] !== "(tabs)") return undefined;
  return segments.slice(1).join("/") || "index";
};
