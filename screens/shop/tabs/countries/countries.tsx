import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  Dimensions,
  type ListRenderItem
} from "react-native";

import _map from "lodash/map";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import CountryFlag from "@/components/ui/CountryFlag";
import { Theme } from "@/constants/Colors";
import appBootstrap, { type ServiceRegion } from "@/utils/appBootstrap";
import { navigateToESIMsByCountry } from "@/utils/general";


const COLUMN_COUNT = 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
const COLUMN_GAP = 16;
const ITEM_WIDTH = (SCREEN_WIDTH * 0.9 - COLUMN_GAP) / COLUMN_COUNT;

const EmptyListComponent = () => (
  <ThemedText style={{ textAlign: "center", flex: 1, paddingTop: 42 }}>
    No countries found
  </ThemedText>
);

export default function Countries() {
  const list = appBootstrap.getCountries;

  const renderItem: ListRenderItem<ServiceRegion> = ({ item, index }: any) => (
    <TouchableOpacity
      onPress={navigateToESIMsByCountry(item?.code)}
      style={{ width: ITEM_WIDTH, alignItems: "center" }}
      accessibilityRole="button"
      accessibilityLabel={item?.name || "Country"}
    >
      <View key={item?.code || index} style={styles.country}>
        <CountryFlag
          style={styles.flag}
          isoCode={item?.code}
          flagUrl={item?.flag}
          size={80}
        />
        <ThemedText style={styles.countryLabel}>{item?.name || ""}</ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.tabWrapper}>
      <ThemedText style={styles.tabTitle}>{"Popular Destinations"}</ThemedText>
      <View style={styles.countriesWrapper}>
        <FlatList
          data={list}
          numColumns={2}
          renderItem={renderItem}
          columnWrapperStyle={styles.columnWrapperStyle}
          keyExtractor={(item, index) => String(item?.code || index)}
          contentContainerStyle={{ paddingBottom: 100 }}
          style={{ backgroundColor: "transparent" }}
          ListEmptyComponent={EmptyListComponent}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabTitle: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  tabWrapper: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 12,
  },
  countriesWrapper: {
    width: "90%",
    flex: 1,
  },
  country: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Theme.spacing.md,
  },
  countryLabel: {
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
    textAlign: "center", 
    width: ITEM_WIDTH - 8,
  },
  flag: {
    borderRadius: Theme.borderRadius.medium * 2,
    backgroundColor: "transparent",
  },
  columnWrapperStyle: {
    flexDirection: "row",
    marginBottom: Theme.spacing.md,
    gap: COLUMN_GAP,
  },
});
