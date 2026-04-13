import { useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";

import _get from "lodash/get";

import { Theme } from "@/constants/Colors";
import { useEsimsByRegion } from "@/queries/e-sims";
import appBootstrap from "@/utils/appBootstrap";

import DataPackTabGroup from "@/components/DataPackTabGroup";

export default function EsimsByRegion() {
  const params = useLocalSearchParams();
  const regionConfig = appBootstrap.getRegionConfig;
  const region = _get(regionConfig, [params?.id, "code"]) || params?.id;
  const { data: esims, isFetching } = useEsimsByRegion(region, {
    enabled: !!region,
  });

  return (
    <DataPackTabGroup
      esims={esims}
      containerStyle={styles.containerStyle}
      isLoading={isFetching}
    />
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    paddingHorizontal: Theme.spacing.sm,
  },
});
