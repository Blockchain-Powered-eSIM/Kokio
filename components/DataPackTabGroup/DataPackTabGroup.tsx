import { useMemo, useState } from "react";
import { StyleSheet, FlatList, Pressable, StyleProp, View, ViewStyle } from "react-native";

import _get from "lodash/get";
import _groupBy from "lodash/groupBy";
import _isEmpty from "lodash/isEmpty";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Theme } from "@/constants/Colors";
import { useColors } from "@/hooks/useColors";
import { useBottomInset } from "@/hooks/useBottomInset";
import EsimItemSkeleton from "@/components/EsimItemSkeleton";
import { useToast } from "@/contexts/ToastContext";

import ESIMItem, { Esim } from "../ESIMItem";

const TAB_KEYS = {
  DATA: "DATA",
  DATA_CALLS_SMS: "DATA_CALLS_SMS",
};

const EmptyListComponent = ({
  filtersActive,
  onClearFilters,
}: {
  filtersActive: boolean;
  onClearFilters?: () => void;
}) => {
  const colors = useColors();

  if (!filtersActive) {
    return <ThemedText style={styles.emptyText}>No Plans found</ThemedText>;
  }

  return (
    <ThemedView style={styles.emptyFilteredContainer}>
      <ThemedText style={styles.emptyText}>No plans match your filters</ThemedText>
      {!!onClearFilters && (
        <Pressable
          onPress={onClearFilters}
          style={styles.clearFiltersButton}
          accessibilityRole="button"
          accessibilityLabel="Clear filters"
        >
          <ThemedText style={{ color: colors.link }}>Clear filters</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
};

const ESIMsFlatListComponent = ({
  esims,
  isLoading,
  filtersActive,
  onClearFilters,
}: {
  esims: Esim[];
  isLoading: boolean;
  filtersActive: boolean;
  onClearFilters?: () => void;
}) => {
  const bottomInset = useBottomInset();
  return isLoading ? (
    <FlatList
      data={[1, 2, 3, 4, 5]}
      renderItem={() => (
        <EsimItemSkeleton containerStyle={styles.eSimItemContainer} />
      )}
      keyExtractor={(_, index) => index.toString()}
      contentContainerStyle={[styles.flatListContainer, { paddingBottom: bottomInset }]}
      style={{ backgroundColor: "transparent" }}
    />
  ) : (
    <FlatList
      data={esims}
      renderItem={({ item }) => (
        <ESIMItem
          item={item}
          showBuyButton
          containerStyle={styles.eSimItemContainer}
        />
      )}
      keyExtractor={(item, index) => item.catalogueId || index.toString()}
      contentContainerStyle={[styles.flatListContainer, { paddingBottom: bottomInset }]}
      ListEmptyComponent={() => (
        <EmptyListComponent filtersActive={filtersActive} onClearFilters={onClearFilters} />
      )}
      style={{ backgroundColor: "transparent" }}
    />
  );
};
const ESIMsFlatList = ESIMsFlatListComponent;

const PlanTypeHeader = () => {
  const colors = useColors();
  const { showMessage } = useToast();
  return (
    <View style={headerStyles.container}>
      <View style={[headerStyles.pill, { backgroundColor: colors.secondaryBackground }]}>
        <View style={[headerStyles.tab, headerStyles.activeIndicator, { backgroundColor: colors.muted }]}>
          <ThemedText style={[headerStyles.tabText, { color: colors.text }]}>Data</ThemedText>
        </View>
        <Pressable
          style={headerStyles.tab}
          accessibilityRole="button"
          accessibilityLabel="Data+Calls+SMS (disabled)"
          onPress={() => showMessage("Coming Soon!", "info")}
        >
          <ThemedText style={[headerStyles.tabText, headerStyles.disabledTabText, { color: colors.inactive }]}>
            Data+Calls+SMS
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

function DataPackTabGroup({
  plans,
  containerStyle,
  isLoading = false,
  filtersActive = false,
  onClearFilters,
}: {
  plans: Esim[];
  containerStyle?: StyleProp<ViewStyle>;
  isLoading?: boolean;
  filtersActive?: boolean;
  onClearFilters?: () => void;
}) {
  const { plansByData, plansByDataCallsSMS } = useMemo(() => {
    const plansGroupedByPlanType = _groupBy(plans, "planType");
    const plansByData = _get(plansGroupedByPlanType, TAB_KEYS.DATA);
    const plansByDataCallsSMS = _get(
      plansGroupedByPlanType,
      TAB_KEYS.DATA_CALLS_SMS
    );
    return { plansByData, plansByDataCallsSMS };
  }, [plans]);

  const showingBothGroups = useMemo(
    () => !_isEmpty(plansByData) && !_isEmpty(plansByDataCallsSMS),
    [plansByData, plansByDataCallsSMS]
  );

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      {showingBothGroups && <PlanTypeHeader />}
      <ESIMsFlatList
        esims={plansByData || plansByDataCallsSMS}
        isLoading={isLoading}
        filtersActive={filtersActive}
        onClearFilters={onClearFilters}
      />
    </ThemedView>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "center",
    marginBottom: Theme.spacing.sm,
  },
  pill: {
    borderRadius: Theme.borderRadius.medium,
    flexDirection: "row",
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  activeIndicator: {
    borderRadius: Theme.borderRadius.medium,
  },
  tabText: {
    textAlign: "center",
    fontWeight: "500",
  },
  disabledTabText: {
    opacity: 0.5,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Theme.spacing.sm,
  },
  flatListContainer: {
    paddingTop: Theme.spacing.xs,
    display: "flex",
    flexDirection: "column",
    gap: Theme.spacing.sm,
  },
  eSimItemContainer: {
    paddingHorizontal: 8,
  },
  emptyText: {
    textAlign: "center",
    paddingTop: 42,
    flex: 1,
  },
  emptyFilteredContainer: {
    flex: 1,
    alignItems: "center",
  },
  clearFiltersButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});

export default DataPackTabGroup;
