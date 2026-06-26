import { useEffect } from "react";
import { router } from "expo-router";

import _map from "lodash/map";

export default function useHideTabBar() {
  useEffect(() => {
    router?.setParams({ isTabBarVisible: 0 });
  }, [router]);
}
