import { useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";

import _get from "lodash/get";

import { Theme } from "@/constants/Colors";
import { REGION_CONFIG } from "@/constants/general.constants";
import { useEsimsByRegion } from "@/queries/e-sims";

import DataPackTabGroup from "@/components/DataPackTabGroup";

export default function EsimsByRegion() {
  const params = useLocalSearchParams();
  const region = _get(REGION_CONFIG, [params?.id, "region"]);
  const { data: esims, ...rest } = useEsimsByRegion(region, {
    enabled: !!region,
  });

  return (
    <DataPackTabGroup esims={esims} containerStyle={styles.containerStyle} />
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    paddingHorizontal: Theme.spacing.sm,
  },
});
