import _keyBy from "lodash/keyBy";
import type { components } from "@/utils/bff/generated/koKioBff";

type ServiceRegion = components["schemas"]["ServiceRegion"];

type AppBootstrapInstance = {
  initialized: boolean;
  countries?: ServiceRegion[];
  regions?: ServiceRegion[];
  countryConfig?: Record<string, ServiceRegion>;
  regionConfig?: Record<string, ServiceRegion>;
};

// Create a singleton instance
let instance: AppBootstrapInstance = {
  initialized: false,
};

class AppBootstrap {
  constructor({ countries, regions }: { countries?: ServiceRegion[]; regions?: ServiceRegion[] } = {}) {
    if (!instance.initialized) {
      instance = {
        initialized: false,
        countries,
        regions,
        countryConfig: _keyBy(countries, "code"),
        regionConfig: _keyBy(regions, "code"),
      };
    }
  }

  static set setCountries(countries: ServiceRegion[]) {
    instance.countries = countries;
    instance.countryConfig = _keyBy(countries, "code");
  }

  static set setRegions(regions: ServiceRegion[]) {
    instance.regions = regions;
    instance.regionConfig = _keyBy(regions, "code");
  }

  static get getRegions(): ServiceRegion[] | undefined {
    return instance.regions;
  }

  static get getRegionConfig(): Record<string, ServiceRegion> | undefined {
    return instance.regionConfig;
  }

  static get getCountries(): ServiceRegion[] | undefined {
    return instance.countries;
  }

  static get getCountryConfig(): Record<string, ServiceRegion> | undefined {
    return instance.countryConfig;
  }

  static get isInitialized(): boolean {
    return instance.initialized;
  }
}

export default AppBootstrap;
