import {
  StyleSheet,
  Image,
  View,
  FlatList,
  TouchableOpacity,
  type ListRenderItem
} from "react-native";

import _get from "lodash/get";
import _map from "lodash/map";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Theme } from "@/constants/Colors";
import { REGION_CONFIG } from "@/constants/general.constants";
import appBootstrap, { type ServiceRegion } from "@/utils/appBootstrap";
import { navigateToESIMsByRegion } from "@/utils/general";

const EmptyListComponent = () => (
  <ThemedText style={{ textAlign: "center", flex: 1, paddingTop: 42 }}>
    No regions found
  </ThemedText>
);

export default function Regions() {
  const list = appBootstrap.getRegions;

  const renderItem: ListRenderItem<ServiceRegion> = ({ item, index }: any) => {
    const imagePath = _get(REGION_CONFIG, [item?.code, "imagePath"]);
    return (
      <TouchableOpacity
        onPress={navigateToESIMsByRegion(item?.code)}
        accessibilityRole="button"
        accessibilityLabel={item?.name || "Region"}
      >
        <View key={item?.code || index} style={styles.region}>
          <ThemedText style={styles.regionLabel} variant="xl">
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
    <ThemedView style={styles.tabWrapper}>
      <FlatList
        data={list}
        renderItem={renderItem}
        style={{ width: "100%", backgroundColor: "transparent" }}
        keyExtractor={(item, index) => String(item?.code || index)}
        ListEmptyComponent={EmptyListComponent}
      />
    </ThemedView>
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
