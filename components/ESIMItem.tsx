import React, { useCallback, useMemo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Theme } from "@/constants/Colors";
import { useColors } from "@/hooks/useColors";
import CountryFlag from "@/components/ui/CountryFlag";
import DetailItem from "./ui/DetailItem";

export interface Esim {
  catalogueId: string;
  actualSellingPrice: number;
  isUnlimited: boolean;
  // Optional: not present on display items built from ESimDocument/PlanHistoryEntry.
  serviceRegionCode?: string;
  serviceRegionFlag?: string | null;
  serviceRegionName?: string | null;
  coverageType: string;
  data?: number | null;
  sms?: number | null;
  validity: number | null;
  voice?: number | null;
  planType?: "DATA" | "DATA_CALLS_SMS";
  isTopupAvailable?: boolean;
  isAutoStart?: boolean;
  isKycRequired?: boolean;
  info?: string | null;
  countryWiseNetworkCoverages?: {
    countryCode?: string;
    countryName?: string;
    networks?: { name?: string; type?: string }[];
  }[];
}

const styles = StyleSheet.create({
  esimItemContainer: {
    marginTop: Theme.spacing.lg,
  },
  horizontalPadding: {
    paddingHorizontal: 8,
  },
  esimItem: {
    borderRadius: 21,
    padding: 16,
    gap: 8,
    width: "100%",
  },
  flagContainer: {
    position: "absolute",
    top: -12,
    right: 40,
    zIndex: 10,
  },
  flag: {
    width: 85,
    height: 50,
    borderRadius: 4,
  },
  country: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 5,
    paddingRight: 90,
  },
  detailsContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  details: {
    fontSize: 14,
    fontWeight: "800",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  buyButton: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.large,
    marginTop: Theme.spacing.sm,
  },
  buyButtonText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: Theme.spacing.md,
  },
});

const ESIMItem = ({
  item,
  showBuyButton,
  containerStyle = {},
  onPress,
  footer,
}: {
  item: Esim;
  showBuyButton: boolean;
  containerStyle?: object;
  onPress?: () => void;
  // Optional extra content rendered below the plan details. Used by the home
  // page eSIM component to show install affordances / remaining data.
  footer?: React.ReactNode;
}) => {
  const colors = useColors();

  const handleBuyCTAClick = useCallback(
    (id: string) => () => {
      router.navigate({
        pathname: `/checkout/[id]`,
        params: {
          id,
          item: JSON.stringify(item),
        },
      });
    },
    [item]
  );

  const content = useMemo(
    () => (
      <>
        <View style={styles.flagContainer}>
          {item?.coverageType === "LOCAL" &&
            (item?.serviceRegionCode || item?.serviceRegionFlag) && (
              <CountryFlag
                style={[showBuyButton && styles.flag]}
                isoCode={item?.serviceRegionCode ?? ""}
                //@ts-expect-error - null values are handled in the component
                flagUrl={item?.serviceRegionFlag}
                size={40}
              />
            )}
        </View>
        <View style={[styles.esimItem, { backgroundColor: colors.card }]}>
          <Text style={[styles.country, { color: colors.cardForeground }]}>
            {item.serviceRegionName}
          </Text>
          <View style={styles.detailsContainer}>
            <DetailItem
              iconName="calendar-outline"
              value={item.validity}
              suffix="Days"
            />
            <DetailItem
              iconName="cellular-outline"
              value={item.isUnlimited ? "Unlimited" : item.data}
              suffix={item.isUnlimited ? "" : "GB"}
            />
            <DetailItem
              iconName="call-outline"
              value={item.voice}
              suffix="Mins"
            />
            <DetailItem
              iconName="chatbox-outline"
              value={item.sms}
              suffix="SMS"
            />
          </View>
          {showBuyButton && (
            <TouchableOpacity
              style={[styles.buyButton, { backgroundColor: colors.shopCta }]}
              onPress={handleBuyCTAClick(item.catalogueId)}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.serviceRegionName || "plan"} for $${(item.actualSellingPrice || 0).toFixed(2)}`}
            >
              <DetailItem
                prefix="$"
                value={(item.actualSellingPrice || 0).toFixed(2)}
              />
              <View style={styles.buyButtonText}>
                <Ionicons name="cart-outline" size={20} color={colors.cardForeground} />
                <Text style={[styles.details, { color: colors.cardForeground }]}>View</Text>
              </View>
            </TouchableOpacity>
          )}
          {footer}
        </View>
      </>
    ),
    [item, showBuyButton, handleBuyCTAClick, colors, footer]
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.esimItemContainer, containerStyle]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item?.serviceRegionName || "eSIM"} plan`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.esimItemContainer, containerStyle]}>{content}</View>
  );
};

export default ESIMItem;
