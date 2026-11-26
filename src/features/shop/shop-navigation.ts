import { router } from "expo-router";

export const navigateToESIMsByRegion = (region: string) => (): void => {
  router.navigate(`/region/${region}`);
};

export const navigateToESIMsByCountry = (country: string) => (): void => {
  router.push(`/country/${country}`);
};
