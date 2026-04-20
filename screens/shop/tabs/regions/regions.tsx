import {
  StyleSheet,
  Image,
  View,
  FlatList,
  TouchableOpacity,
} from "react-native";

import _get from "lodash/get";
import _map from "lodash/map";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import { REGION_CONFIG } from "@/constants/general.constants";
import appBootstrap from "@/utils/appBootstrap";
import { navigateToESIMsByRegion } from "@/utils/general";

export default function Regions() {
  const list = appBootstrap.getRegions;

  const renderItem = ({ item, index }: any) => {
    const imagePath = _get(REGION_CONFIG, [item?.code, "imagePath"]);
    return (
      <TouchableOpacity onPress={navigateToESIMsByRegion(item?.code)}>
        <View key={item?.code || index} style={styles.region}>
          <ThemedText style={styles.regionLabel} type="subtitle">
            {item?.name || ""}
          </ThemedText>
          <Image
            source={imagePath}
            style={styles.regionImage}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabWrapper}>
      <FlatList
        data={list}
        renderItem={renderItem}
        style={{ width: "100%", backgroundColor: "transparent" }}
        keyExtractor={(item, index) => item?.code || index}
      />
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
    backgroundColor: "transparent",
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
