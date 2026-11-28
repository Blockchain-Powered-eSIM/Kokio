import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";

import { Theme } from "@/theme/colors";
import { useCatalogueByCountry } from "./hooks/use-catalogue";
import { formatBffError } from "@/lib/api/bff/errors";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import DataPackTabGroup from "./components/data-pack-tab-group";
import { useShopFilters } from "./shop-filters-context";
import { applyShopFilters } from "./shop-filters";
import { useToast } from "@/providers/toast-context";
import { useCatalogueBackup } from "./hooks/use-catalogue-backup";
import { mergeBackupPlans } from "./merge-backup-plans";
import { filterPlansByNetwork, getNetworkOptions } from "./plan-networks";
import NetworkFilterChips from "./components/network-filter-chips";
import BackupPlansFooter from "./components/backup-plans-footer";

function EsimsByCountryContent({ countryCode }: { countryCode: string }) {
  const { data, isLoading, error, refetch } = useCatalogueByCountry(countryCode);
  const { filters, isActive, clearFilters } = useShopFilters();
  const { showMessage } = useToast();

  const [showBackup, setShowBackup] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const backup = useCatalogueBackup(countryCode, showBackup);

  const merged = useMemo(
    () => mergeBackupPlans(data?.plans, showBackup ? backup.data?.plans : undefined),
    [data?.plans, showBackup, backup.data?.plans]
  );

  const networkOptions = useMemo(
    () => getNetworkOptions(merged.plans, countryCode),
    [merged.plans, countryCode]
  );

  // Derived so a stale selection (e.g. after options change) never filters to nothing.
  const effectiveNetwork = useMemo(
    () =>
      selectedNetwork !== null &&
      networkOptions.some((n) => n.toLowerCase() === selectedNetwork.toLowerCase())
        ? selectedNetwork
        : null,
    [selectedNetwork, networkOptions]
  );

  const filteredPlans = useMemo(
    () =>
      applyShopFilters(filterPlansByNetwork(merged.plans, countryCode, effectiveNetwork), filters),
    [merged.plans, countryCode, effectiveNetwork, filters]
  );

  const backupLoaded = showBackup && backup.isSuccess;
  const addedCount = merged.addedCount;
  const backupExhausted = backupLoaded && addedCount === 0;
  const toastedRef = useRef(false);

  // Ref guard keeps the toast to once per load; it re-arms when the backup query leaves success (retry).
  useEffect(() => {
    if (!backupExhausted) {
      toastedRef.current = false;
      return;
    }
    if (toastedRef.current) return;
    toastedRef.current = true;
    showMessage("No more plans", "info");
  }, [backupExhausted, backup.dataUpdatedAt, showMessage]);

  const handleBackupPress = () => {
    if (!showBackup) {
      setShowBackup(true);
    } else {
      backup.refetch();
    }
  };

  const handleClearFilters = () => {
    clearFilters();
    setSelectedNetwork(null);
  };

  if (isLoading) {
    return <DataPackTabGroup plans={[]} isLoading containerStyle={styles.container} />;
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{formatBffError(error)}</ThemedText>
        <TouchableOpacity onPress={() => refetch()} style={styles.retry}>
          <ThemedText style={styles.retryLabel}>Try again</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  if (!data?.plans.length) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>No plans available</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.content}>
      <NetworkFilterChips
        options={networkOptions}
        selected={effectiveNetwork}
        onSelect={setSelectedNetwork}
        containerStyle={styles.chips}
      />
      <DataPackTabGroup
        plans={filteredPlans}
        containerStyle={styles.container}
        filtersActive={isActive || effectiveNetwork !== null}
        onClearFilters={handleClearFilters}
        footer={
          backupLoaded || backupExhausted ? null : (
            <BackupPlansFooter
              onPress={handleBackupPress}
              isLoading={showBackup && backup.isFetching}
              isError={showBackup && backup.isError}
            />
          )
        }
      />
    </ThemedView>
  );
}

// Keyed by country so backup/network state resets on route param change.
function EsimsByCountry() {
  const params = useLocalSearchParams();
  const countryCode = params?.id as string;
  return <EsimsByCountryContent key={countryCode} countryCode={countryCode} />;
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  chips: {
    flexGrow: 0,
    marginTop: Theme.spacing.lg,
  },
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

export default EsimsByCountry;
