import React, { useCallback, useMemo } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import _get from "lodash/get";

import { Theme } from "@/constants/Colors";
import CountryFlag from "@/components/ui/CountryFlag";
import DetailItem from "./ui/DetailItem";

export interface Esim {
  catalogueId: string;
  actualSellingPrice?: number;
  isUnlimited: boolean;
  serviceRegionCode: string;
  serviceRegionFlag: string;
  serviceRegionName: string;
  coverageType: string;
  data: number;
  sms: number | null;
  validity: number;
  voice: number | null;
}

const ESIMItem = ({
  item,
  showBuyButton,
  containerStyle = {},
  onPress,
}: {
  item: Esim;
  showBuyButton: Boolean;
  containerStyle?: Object;
  onPress?: () => void;
}) => {
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
          {/* <View style={[styles.flag, { backgroundColor: item.flagColor }]} /> */}
          {/* TODO: Use flag from API response and fallback to this if not present */}
          {item?.coverageType === "LOCAL" && item?.serviceRegionCode && (
            <CountryFlag
              style={[showBuyButton && styles.flag]}
              isoCode={item?.serviceRegionCode}
              flagUrl={item?.serviceRegionFlag}
              size={40}
            />
          )}
        </View>
        <View style={[styles.esimItem, { backgroundColor: Theme.colors.card }]}>
          <Text style={[styles.country, { color: Theme.colors.cardForeground }]}>{item.serviceRegionName}</Text>
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
              style={[styles.buyButton, { backgroundColor: Theme.colors.goldenYellow }]}
              onPress={handleBuyCTAClick(item.catalogueId)}
            >
              <DetailItem
                prefix="$"
                value={(item.actualSellingPrice || 0).toFixed(2)}
              />
              <View style={styles.buyButtonText}>
                <Ionicons name="cart-outline" size={20} color={Theme.colors.cardForeground} />
                {/* replaced "Buy" with "View" */}
                <Text style={[styles.details, { color: Theme.colors.cardForeground }]}>View</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </>
    ),
    [item, showBuyButton, handleBuyCTAClick]
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.esimItemContainer, containerStyle]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.esimItemContainer, containerStyle]}>{content}</View>
  );
};

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

export default ESIMItem;
