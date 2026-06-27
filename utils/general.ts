import { router } from "expo-router";

export const uuid = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;  
    const v = c == "x" ? r : (r & 0x3) | 0x8; // eslint-disable-line
    return v.toString(16);
  });

export const navigateToESIMsByRegion = (region: string) => (): void => {
  router.navigate(`/region/${region}`);
};

export const navigateToESIMsByCountry = (country: string) => (): void => {
  router.push(`/country/${country}`);
};
