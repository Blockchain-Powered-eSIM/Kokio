export const ROUTE_NAMES = {
  HOME: "index",
  SHOP: "(shop)",
  CHECKOUT: "checkout/[id]",
  WALLET: "(wallet)",
  PHONE: "phone",
  SETTINGS: "settings",
  BY_COUNTRY: "country/[id]",
  BY_REGION: "region/[id]",
  TOKENS:"tokens",
  TRANSACTIONS:"transactions",
  TRANSACTIONDETAILS:"transactionDetails"
};


export const TAB_BAR_ENABLED_ROUTES = [
  ROUTE_NAMES.HOME,
  ROUTE_NAMES.SHOP,
  `${ROUTE_NAMES.SHOP}/${ROUTE_NAMES.HOME}`,
  ROUTE_NAMES.WALLET,
  ROUTE_NAMES.PHONE,
  ROUTE_NAMES.SETTINGS,
  `${ROUTE_NAMES.WALLET}/${ROUTE_NAMES.TOKENS}`,
  `${ROUTE_NAMES.WALLET}/${ROUTE_NAMES.TRANSACTIONS}`,
  `${ROUTE_NAMES.WALLET}/${ROUTE_NAMES.HOME}`,
];
