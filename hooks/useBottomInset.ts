import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme } from "@/constants/Colors";

const BUTTON_NAV_INSET_THRESHOLD = 32;

/**
 * Bottom safe-area inset for edge-to-edge layouts, floored so gesture-nav devices still work.
 * Usage: for any bottom-anchored surface.
 *
 * @param floor Minimum padding (px). Defaults to Theme.spacing.md (16).
 *              Pass 0 for the raw inset when the container already reserves its own height (e.g. the tab bar).
 *              Pass the container's own base padding when composing on top of it (e.g. a sheet).
 */
export function useBottomInset(floor: number = Theme.spacing.md): number {
  const { bottom } = useSafeAreaInsets();
  return Math.max(bottom, floor);
}

/**
 * Bottom reservation for persistent bottom chrome that must clear
 * the opaque 3-button nav bar but should sit flush under gesture nav.
 *
 * NOTE: 
 * This is a heuristic by necessity — nav type isn't exposed by safe-area-context. 
 * Inset magnitude is a reliable-enough proxy.
 */
export function useNavBarInset(): number {
  const { bottom } = useSafeAreaInsets();
  return bottom >= BUTTON_NAV_INSET_THRESHOLD ? bottom : 0;
}
