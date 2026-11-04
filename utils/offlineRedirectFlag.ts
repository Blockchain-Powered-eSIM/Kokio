import { ROUTE_NAMES } from "@/constants/route.constants";

let skipNextOfflineRedirect = false;

export function setSkipNextOfflineRedirect(value: boolean): void {
  skipNextOfflineRedirect = value;
}

export function getSkipNextOfflineRedirect(): boolean {
  return skipNextOfflineRedirect;
}

// usePathname() returns "/Offline" while ROUTE_NAMES.OFFLINE is "Offline".
export function isOfflinePath(pathname: string | null | undefined): boolean {
  return !!pathname && pathname.replace(/^\//, "") === ROUTE_NAMES.OFFLINE;
}

interface OfflineExitRouter {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: any) => void;
}

let exitLatched = false;

// The NetInfo listener and the screen's own buttons can both try to leave in
// the same tick, and pathname lags the dispatch, so a second back() would pop
// the screen the user was returned to.
export function leaveOfflineScreen(router: OfflineExitRouter): void {
  if (exitLatched) return;
  exitLatched = true;
  setTimeout(() => {
    exitLatched = false;
  }, 800);

  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}
