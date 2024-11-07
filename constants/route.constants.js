export const ROUTE_NAMES = {
  HOME: "index",
  SHOP: "(shop)",
  CHECKOUT: "checkout/[id]",
  WALLET: "wallet",
  PHONE: "phone",
  SETTINGS: "settings",
  BY_COUNTRY: "country/[id]",
  BY_REGION: "region/[id]",
};

export const TAB_BAR_ENABLED_ROUTES = [
  ROUTE_NAMES.HOME,
  ROUTE_NAMES.SHOP,
  `${ROUTE_NAMES.SHOP}/${ROUTE_NAMES.HOME}`,
  ROUTE_NAMES.WALLET,
  ROUTE_NAMES.PHONE,
  ROUTE_NAMES.SETTINGS,
];
