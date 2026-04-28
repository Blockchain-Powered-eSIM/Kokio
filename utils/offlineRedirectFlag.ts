let skipNextOfflineRedirect = false;

export function setSkipNextOfflineRedirect(value: boolean): void {
  skipNextOfflineRedirect = value;
}

export function getSkipNextOfflineRedirect(): boolean {
  return skipNextOfflineRedirect;
}
