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
  MIDDLE_EAST: "MIDDLE_EAST",
  OCEANIA: "OCEANIA",
  CARIBBEAN_ISLANDS: "CARIBBEAN_ISLANDS",
};

export const REGION_CONFIG = {
  [REGION.ASIA]: {
    imagePath: require("@/assets/images/asia.png"),
  },
  [REGION.NORTH_AMERICA]: {
    imagePath: require("@/assets/images/north-america.png"),
  },
  [REGION.SOUTH_AMERICA]: {
    imagePath: require("@/assets/images/south-america.png"),
  },
  [REGION.AFRICA]: {
    imagePath: require("@/assets/images/africa.png"),
  },
  [REGION.EUROPE]: {
    imagePath: require("@/assets/images/europe.png"),
  },
  [REGION.OCEANIA]: {
    imagePath: require("@/assets/images/australia.png"),
  },
  [REGION.MIDDLE_EAST]: {
    imagePath: require("@/assets/images/australia.png"),
  },
  [REGION.CARIBBEAN_ISLANDS]: {
    imagePath: require("@/assets/images/australia.png"),
  },
};

export const OP_SEPOLIA_TESTNET =
  "https://sepolia-optimism.etherscan.io/address";

export const BASE_SEPOLIA_TESTNET = "https://sepolia.basescan.org/address";

// Chain ID required by Wallet Connect
export const WC_BASE_SEPOLIA = "eip155:84532";
