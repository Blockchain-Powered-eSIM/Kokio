import _includes from "lodash/includes";
import type { NavigationState, PartialState } from "expo-router/react-navigation";

import { TAB_BAR_ENABLED_ROUTES } from "@/constants/route.constants";

type AnyNavigationState = NavigationState | PartialState<NavigationState> | undefined;

export const getRouteName = (navigationState: AnyNavigationState): string | undefined => {
  const currentRouteData = navigationState?.routes[(navigationState as NavigationState)?.index ?? 0];

  if (currentRouteData?.state) {
    return `${currentRouteData?.name || ""}/${getRouteName(currentRouteData.state as AnyNavigationState)}`;
  }

  return currentRouteData?.name;
};

export const getIsTabBarVisible = (routeName: string | undefined): boolean =>
  _includes(TAB_BAR_ENABLED_ROUTES, routeName);
