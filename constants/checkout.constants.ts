export const RADIO_KEYS = {
  E_SIM_WALLET: "E_SIM_WALLET",
  CREDIT_CARD: "CREDIT_CARD",
  APPLE_PAY: "APPLE_PAY",
  // EXTERNAL_WALLET: "EXTERNAL_WALLET", // not fully working yet
  EXTERNAL_WALLET_BROWSER: "EXTERNAL_WALLET_BROWSER",
} as const;

export type RadioKey = (typeof RADIO_KEYS)[keyof typeof RADIO_KEYS];

export const PLAN_TYPES = {
  DATA: "DATA",
  DATA_CALLS_SMS: "DATA_CALLS_SMS",
} as const;

export type PlanType = (typeof PLAN_TYPES)[keyof typeof PLAN_TYPES];

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  [PLAN_TYPES.DATA]: "Data",
  [PLAN_TYPES.DATA_CALLS_SMS]: "Data+Calls+SMS",
};

type NetworkCoverage = {
  networks?: { name: string }[];
};

type EsimExtraDetail = {
  iconType?: string;
  iconName: string;
  key: string;
  label: string;
  formatter: (value: any) => string;
  isFlexColumn?: boolean;
  dataContainerStyles?: object;
};

export const ESIM_EXTRA_DETAILS: EsimExtraDetail[] = [
  {
    iconType: "MCI",
    iconName: "card-text-outline",
    key: "planType",
    label: "Plan Type",
    formatter: (value: string) => PLAN_TYPE_LABELS[value as PlanType] || value,
  },
  {
    iconType: "MCI",
    iconName: "plus-box-multiple-outline",
    key: "isTopupAvailable",
    label: "Top-Up Options",
    formatter: (value: boolean) => (value ? "Available" : "Not Available"),
  },
  {
    iconType: "MCI",
    iconName: "signal-cellular-outline",
    key: "countryWiseNetworkCoverages",
    label: "Network",
    formatter: (value: NetworkCoverage[]) =>
      value
        .reduce<string[]>((acc, item) => {
          const { networks } = item || {};
          return [...acc, ...(networks?.map((network) => network.name) || [])];
        }, [])
        .join(", "),
  },
  {
    iconType: "MCI",
    iconName: "ip-network-outline",
    key: "IP_ROUTING",
    label: "IP Routing",
    formatter: () => "N/A", // NOTE: Not currently received
  },
  {
    iconType: "MCI",
    iconName: "file-check-outline",
    key: "isAutoStart",
    label: "Activation Policy",
    formatter: (value: boolean) =>
      value
        ? "The validity period starts when the eSIM connects to any supported network/s."
        : "N/A",
    isFlexColumn: true,
    dataContainerStyles: { marginLeft: 22 },
  },
  // NOTE: Will be false currently
  {
    iconName: "person-circle-outline",
    key: "isKycRequired",
    label: "Identity Verification",
    formatter: (value: boolean) => (value ? "Required" : "Not Required"),
    isFlexColumn: true,
    dataContainerStyles: { marginLeft: 22 },
  },
  // NOTE: Not currently consumed
  {
    iconName: "information-outline",
    key: "ADDITIONAL_INFORMATION",
    label: "Additional Information",
    formatter: () => "N/A",
    isFlexColumn: true,
    dataContainerStyles: { marginLeft: 22 },
  },
];
