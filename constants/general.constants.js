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

// Static mapping from ISO country code to the region code(s) it belongs to.
// Region codes must match the `code` field returned by the bootstrap API.
export const COUNTRY_TO_REGIONS = {
  // Asia
  AF: ["ASIA"], AM: ["ASIA"], AZ: ["ASIA"], BD: ["ASIA"], BN: ["ASIA"],
  BT: ["ASIA"], CN: ["ASIA"], GE: ["ASIA"], HK: ["ASIA"], ID: ["ASIA"],
  IN: ["ASIA"], JP: ["ASIA"], KG: ["ASIA"], KH: ["ASIA"], KP: ["ASIA"],
  KR: ["ASIA"], KZ: ["ASIA"], LA: ["ASIA"], LK: ["ASIA"], MM: ["ASIA"],
  MN: ["ASIA"], MO: ["ASIA"], MV: ["ASIA"], MY: ["ASIA"], NP: ["ASIA"],
  PH: ["ASIA"], PK: ["ASIA"], SG: ["ASIA"], TH: ["ASIA"], TJ: ["ASIA"],
  TL: ["ASIA"], TM: ["ASIA"], TW: ["ASIA"], UZ: ["ASIA"], VN: ["ASIA"],
  // Europe
  AD: ["EUROPE"], AL: ["EUROPE"], AT: ["EUROPE"], BA: ["EUROPE"], BE: ["EUROPE"],
  BG: ["EUROPE"], BY: ["EUROPE"], CH: ["EUROPE"], CY: ["EUROPE"], CZ: ["EUROPE"],
  DE: ["EUROPE"], DK: ["EUROPE"], EE: ["EUROPE"], ES: ["EUROPE"], FI: ["EUROPE"],
  FR: ["EUROPE"], GB: ["EUROPE"], GR: ["EUROPE"], HR: ["EUROPE"], HU: ["EUROPE"],
  IE: ["EUROPE"], IS: ["EUROPE"], IT: ["EUROPE"], LI: ["EUROPE"], LT: ["EUROPE"],
  LU: ["EUROPE"], LV: ["EUROPE"], MC: ["EUROPE"], MD: ["EUROPE"], ME: ["EUROPE"],
  MK: ["EUROPE"], MT: ["EUROPE"], NL: ["EUROPE"], NO: ["EUROPE"], PL: ["EUROPE"],
  PT: ["EUROPE"], RO: ["EUROPE"], RS: ["EUROPE"], RU: ["EUROPE"], SE: ["EUROPE"],
  SI: ["EUROPE"], SK: ["EUROPE"], SM: ["EUROPE"], TR: ["EUROPE"], UA: ["EUROPE"],
  VA: ["EUROPE"], XK: ["EUROPE"],
  // North America
  CA: ["NORTH_AMERICA"], MX: ["NORTH_AMERICA"], US: ["NORTH_AMERICA"],
  // South America
  AR: ["SOUTH_AMERICA"], BO: ["SOUTH_AMERICA"], BR: ["SOUTH_AMERICA"],
  CL: ["SOUTH_AMERICA"], CO: ["SOUTH_AMERICA"], EC: ["SOUTH_AMERICA"],
  GF: ["SOUTH_AMERICA"], GY: ["SOUTH_AMERICA"], PE: ["SOUTH_AMERICA"],
  PY: ["SOUTH_AMERICA"], SR: ["SOUTH_AMERICA"], UY: ["SOUTH_AMERICA"],
  VE: ["SOUTH_AMERICA"],
  // Africa
  AO: ["AFRICA"], BF: ["AFRICA"], BJ: ["AFRICA"], BI: ["AFRICA"], BW: ["AFRICA"],
  CD: ["AFRICA"], CF: ["AFRICA"], CG: ["AFRICA"], CI: ["AFRICA"], CM: ["AFRICA"],
  CV: ["AFRICA"], DJ: ["AFRICA"], DZ: ["AFRICA"], EG: ["AFRICA"], ER: ["AFRICA"],
  ET: ["AFRICA"], GA: ["AFRICA"], GH: ["AFRICA"], GM: ["AFRICA"], GN: ["AFRICA"],
  GQ: ["AFRICA"], GW: ["AFRICA"], KE: ["AFRICA"], KM: ["AFRICA"], LR: ["AFRICA"],
  LS: ["AFRICA"], LY: ["AFRICA"], MA: ["AFRICA"], MG: ["AFRICA"], ML: ["AFRICA"],
  MR: ["AFRICA"], MU: ["AFRICA"], MW: ["AFRICA"], MZ: ["AFRICA"], NA: ["AFRICA"],
  NE: ["AFRICA"], NG: ["AFRICA"], RW: ["AFRICA"], SC: ["AFRICA"], SD: ["AFRICA"],
  SL: ["AFRICA"], SN: ["AFRICA"], SO: ["AFRICA"], SS: ["AFRICA"], ST: ["AFRICA"],
  SZ: ["AFRICA"], TD: ["AFRICA"], TG: ["AFRICA"], TN: ["AFRICA"], TZ: ["AFRICA"],
  UG: ["AFRICA"], ZA: ["AFRICA"], ZM: ["AFRICA"], ZW: ["AFRICA"],
  // Middle East
  AE: ["MIDDLE_EAST"], BH: ["MIDDLE_EAST"], IQ: ["MIDDLE_EAST"], IR: ["MIDDLE_EAST"],
  IL: ["MIDDLE_EAST"], JO: ["MIDDLE_EAST"], KW: ["MIDDLE_EAST"], LB: ["MIDDLE_EAST"],
  OM: ["MIDDLE_EAST"], PS: ["MIDDLE_EAST"], QA: ["MIDDLE_EAST"], SA: ["MIDDLE_EAST"],
  SY: ["MIDDLE_EAST"], YE: ["MIDDLE_EAST"],
  // Oceania
  AU: ["OCEANIA"], CK: ["OCEANIA"], FJ: ["OCEANIA"], FM: ["OCEANIA"], KI: ["OCEANIA"],
  MH: ["OCEANIA"], NR: ["OCEANIA"], NU: ["OCEANIA"], NZ: ["OCEANIA"],
  PG: ["OCEANIA"], PW: ["OCEANIA"], SB: ["OCEANIA"], TK: ["OCEANIA"],
  TO: ["OCEANIA"], TV: ["OCEANIA"], VU: ["OCEANIA"], WS: ["OCEANIA"],
  // Caribbean
  AG: ["CARIBBEAN_ISLANDS"], BB: ["CARIBBEAN_ISLANDS"], BS: ["CARIBBEAN_ISLANDS"],
  BZ: ["CARIBBEAN_ISLANDS"], CU: ["CARIBBEAN_ISLANDS"], DM: ["CARIBBEAN_ISLANDS"],
  DO: ["CARIBBEAN_ISLANDS"], GD: ["CARIBBEAN_ISLANDS"], HT: ["CARIBBEAN_ISLANDS"],
  JM: ["CARIBBEAN_ISLANDS"], KN: ["CARIBBEAN_ISLANDS"], LC: ["CARIBBEAN_ISLANDS"],
  TT: ["CARIBBEAN_ISLANDS"], VC: ["CARIBBEAN_ISLANDS"],
};

export const OP_SEPOLIA_TESTNET =
  "https://sepolia-optimism.etherscan.io/address";

export const BASE_SEPOLIA_TESTNET = "https://sepolia.basescan.org/address";

// Chain ID required by Wallet Connect
export const WC_BASE_SEPOLIA = "eip155:84532";
