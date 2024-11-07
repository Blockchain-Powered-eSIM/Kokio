import {
  StyleSheet,
  Image,
  Platform,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Link, router } from "expo-router";

import _map from "lodash/map";

import { ThemedText } from "@/components/ThemedText";
import CountryFlag from "@/components/ui/CountryFlag";
import useHideTabBar from "@/hooks/useHideTabBar";
import { Colors, Theme } from "@/constants/Colors";
import { COUNTRY, COUNTRY_CONFIG } from "@/constants/general.constants";

const MOCK_COUNTRIES_LIST = [
  COUNTRY_CONFIG[COUNTRY.INDIA],
  COUNTRY_CONFIG[COUNTRY.SINGAPORE],
  COUNTRY_CONFIG[COUNTRY.UNITED_KINGDOM],
  COUNTRY_CONFIG[COUNTRY.YEMEN],
  COUNTRY_CONFIG[COUNTRY.COSTA_RICA],
  COUNTRY_CONFIG[COUNTRY.UNITED_STATES],
  COUNTRY_CONFIG[COUNTRY.AUSTRALIA],
  COUNTRY_CONFIG[COUNTRY.JAPAN],
  COUNTRY_CONFIG[COUNTRY.FRANCE],
  COUNTRY_CONFIG[COUNTRY.BRAZIL],
  COUNTRY_CONFIG[COUNTRY.CANADA],
  COUNTRY_CONFIG[COUNTRY.SOUTH_AFRICA],
  COUNTRY_CONFIG[COUNTRY.CHINA],
  COUNTRY_CONFIG[COUNTRY.GERMANY],
  COUNTRY_CONFIG[COUNTRY.RUSSIA],
  COUNTRY_CONFIG[COUNTRY.MEXICO],
];

export default function Countries({ list = MOCK_COUNTRIES_LIST }) {
  const navigateToESIMsByCountry = (country: any) => () => {
    router.push(`/country/${country}`);
  };

  const renderItem = ({ item, index }: any) => (
    <TouchableOpacity onPress={navigateToESIMsByCountry(item?.name)}>
      <View key={item?.isoCode || index} style={styles.country}>
        <CountryFlag style={styles.flag} isoCode={item?.isoCode} size={60} />
        <ThemedText style={styles.countryLabel}>{item?.label || ""}</ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
      <View style={styles.tabWrapper}>
        <ThemedText style={styles.tabTitle}>{"Popular Countries"}</ThemedText>
        <View style={styles.countriesWrapper}>
          <FlatList
            data={list}
            numColumns={2}
            renderItem={renderItem}
            columnWrapperStyle={styles.columnWrapperStyle}
          />
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  tabTitle: {
    paddingTop: 12,
    paddingBottom: 24,
    color: Colors.dark.text,
  },
  tabWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  countriesWrapper: {
    width: "100%",
  },
  country: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Theme.spacing.md,
  },
  countryLabel: {
    color: Colors.dark.text,
    paddingTop: Theme.spacing.sm,
  },
  flag: {
    borderRadius: Theme.borderRadius.medium,
  },
  columnWrapperStyle: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
});
