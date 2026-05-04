import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

import DataPackTabGroup from "@/components/DataPackTabGroup";
import { ThemedText } from "@/components/ThemedText";
import { useCatalogue } from "@/hooks/useCatalogue";
import { formatBffError } from "@/utils/bff/errors";

export default function Global() {
  const { data, isLoading, error, refetch } = useCatalogue({ serviceRegionCode: "GLOBAL" });

  if (isLoading) {
    return <ActivityIndicator style={styles.center} />;
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

  return <DataPackTabGroup esims={data.plans} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  retry: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  retryLabel: { textDecorationLine: "underline" },
});
