import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import DataPackTabGroup from "./data-pack-tab-group";
import { ThemedText } from "@/components/ThemedText";
import { useCatalogue } from "../hooks/use-catalogue";
import { formatBffError } from "@/lib/api/bff/errors";
import { useShopFilters } from "../shop-filters-context";
import { applyShopFilters } from "../shop-filters";

export default function Global() {
  const { data, isLoading, error, refetch } = useCatalogue({ serviceRegionCode: "GLOBAL" });
  const { filters, isActive, clearFilters } = useShopFilters();

  const filteredPlans = useMemo(
    () => applyShopFilters(data?.plans, filters),
    [data?.plans, filters]
  );

  if (isLoading) {
    return <DataPackTabGroup plans={[]} isLoading />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <ThemedText>{formatBffError(error)}</ThemedText>
        <TouchableOpacity onPress={() => refetch()} style={styles.retry}>
          <ThemedText style={styles.retryLabel}>Try again</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data?.plans.length) {
    return (
      <View style={styles.center}>
        <ThemedText>No plans available</ThemedText>
      </View>
    );
  }

  return (
    <DataPackTabGroup
      plans={filteredPlans}
      filtersActive={isActive}
      onClearFilters={clearFilters}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  retry: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  retryLabel: { textDecorationLine: "underline" },
});
