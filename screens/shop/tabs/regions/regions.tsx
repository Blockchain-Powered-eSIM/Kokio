import {
  StyleSheet,
  Image,
  View,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

import _map from "lodash/map";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import { REGION, REGION_CONFIG } from "@/constants/general.constants";

const MOCK_REGION_LIST = [
  REGION_CONFIG[REGION.ASIA],
  REGION_CONFIG[REGION.NORTH_AMERICA],
  REGION_CONFIG[REGION.SOUTH_AMERICA],
  REGION_CONFIG[REGION.AFRICA],
  REGION_CONFIG[REGION.EUROPE],
  REGION_CONFIG[REGION.AUSTRALIA],
];

export default function Regions({ list = MOCK_REGION_LIST }) {
  const navigateToESIMsByRegion = (region: any) => () => {
    router.navigate(`/region/${region}`);
  };

  const renderItem = ({ item, index }: any) => (
    <TouchableOpacity onPress={navigateToESIMsByRegion(item?.region)}>
      <View key={item?.region || index} style={styles.region}>
        <ThemedText style={styles.regionLabel} type="subtitle">
          {item?.label || ""}
        </ThemedText>
        <Image
          source={item?.imagePath}
          style={styles.regionImage}
          resizeMode="contain"
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.tabWrapper}>
      <FlatList data={list} renderItem={renderItem} style={{ width: "100%" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: Theme.spacing.xl,
    width: "100%",
  },
  region: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Theme.spacing.xl,
    width: "100%",
  },
  regionLabel: {
    paddingBottom: Theme.spacing.xl,
  },
  regionImage: {
    width: "100%",
  },
});
