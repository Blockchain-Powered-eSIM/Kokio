export const COUNTRY = {
  INDIA: "INDIA",
  SINGAPORE: "SINGAPORE",
  UNITED_KINGDOM: "UNITED_KINGDOM",
  COSTA_RICA: "COSTA_RICA",
  UNITED_STATES: "UNITED_STATES",
  YEMEN: "YEMEN",
  AUSTRALIA: "AUSTRALIA",
  JAPAN: "JAPAN",
  FRANCE: "FRANCE",
  BRAZIL: "BRAZIL",
  CANADA: "CANADA",
  SOUTH_AFRICA: "SOUTH_AFRICA",
  CHINA: "CHINA",
  GERMANY: "GERMANY",
  RUSSIA: "RUSSIA",
  MEXICO: "MEXICO",
};

export const COUNTRY_CONFIG = {
  [COUNTRY.INDIA]: { isoCode: "IN", label: "India", name: "INDIA" },
  [COUNTRY.SINGAPORE]: { isoCode: "SG", label: "Singapore", name: "SINGAPORE" },
  [COUNTRY.UNITED_KINGDOM]: {
    isoCode: "GB",
    label: "United Kingdom",
    name: "UNITED_KINGDOM",
  },
  [COUNTRY.YEMEN]: { isoCode: "YE", label: "Yemen", name: "YEMEN" },
  [COUNTRY.COSTA_RICA]: {
    isoCode: "CR",
    label: "Costa Rica",
    name: "COSTA_RICA",
  },
  [COUNTRY.UNITED_STATES]: {
    isoCode: "US",
    label: "United States",
    name: "UNITED_STATES",
  },
  [COUNTRY.AUSTRALIA]: { isoCode: "AU", label: "Australia", name: "AUSTRALIA" },
  [COUNTRY.JAPAN]: { isoCode: "JP", label: "Japan", name: "JAPAN" },
  [COUNTRY.FRANCE]: { isoCode: "FR", label: "France", name: "FRANCE" },
  [COUNTRY.BRAZIL]: { isoCode: "BR", label: "Brazil", name: "BRAZIL" },
  [COUNTRY.CANADA]: { isoCode: "CA", label: "Canada", name: "CANADA" },
  [COUNTRY.SOUTH_AFRICA]: {
    isoCode: "ZA",
    label: "South Africa",
    name: "SOUTH_AFRICA",
  },
  [COUNTRY.CHINA]: { isoCode: "CN", label: "China", name: "CHINA" },
  [COUNTRY.GERMANY]: { isoCode: "DE", label: "Germany", name: "GERMANY" },
  [COUNTRY.RUSSIA]: { isoCode: "RU", label: "Russia", name: "RUSSIA" },
  [COUNTRY.MEXICO]: { isoCode: "MX", label: "Mexico", name: "MEXICO" },
};

export const REGION = {
  ASIA: "ASIA",
  NORTH_AMERICA: "NORTH_AMERICA",
  SOUTH_AMERICA: "SOUTH_AMERICA",
  AFRICA: "AFRICA",
  EUROPE: "EUROPE",
  AUSTRALIA: "AUSTRALIA",
};

export const REGION_CONFIG = {
  [REGION.ASIA]: {
    imagePath: require("@/assets/images/asia.png"),
    label: "Asia",
    region: "ASIA",
  },
  [REGION.NORTH_AMERICA]: {
    imagePath: require("@/assets/images/north-america.png"),
    label: "North America",
    region: "NORTH_AMERICA",
  },
  [REGION.SOUTH_AMERICA]: {
    imagePath: require("@/assets/images/south-america.png"),
    label: "South America",
    region: "SOUTH_AMERICA",
  },
  [REGION.AFRICA]: {
    imagePath: require("@/assets/images/africa.png"),
    label: "Africa",
    region: "AFRICA",
  },
  [REGION.EUROPE]: {
    imagePath: require("@/assets/images/europe.png"),
    label: "Europe",
    region: "EUROPE",
  },
  [REGION.AUSTRALIA]: {
    imagePath: require("@/assets/images/australia.png"),
    label: "Australia",
    region: "AUSTRALIA",
  },
};
