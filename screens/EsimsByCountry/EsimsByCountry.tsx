import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

import { Theme } from "@/constants/Colors";
import { useCatalogueByCountry } from "@/hooks/useCatalogue";
import { formatBffError } from "@/utils/bff/errors";
import { ThemedText } from "@/components/ThemedText";
import DataPackTabGroup from "@/components/DataPackTabGroup";

function EsimsByCountry() {
  const params = useLocalSearchParams();
  const countryCode = params?.id as string;
  const { data, isLoading, error, refetch } = useCatalogueByCountry(countryCode);

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

  return (
    <DataPackTabGroup
      esims={data.plans}
      containerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  retry: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryLabel: {
    textDecorationLine: "underline",
  },
});

export default React.memo(EsimsByCountry);
