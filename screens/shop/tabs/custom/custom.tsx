import DataPackTabGroup from "@/components/DataPackTabGroup";
import { useCustomEsims } from "@/queries/e-sims";

export default function Custom() {
  const { data: esims, isFetching } = useCustomEsims();

  return <DataPackTabGroup esims={esims} isLoading={isFetching} />;
}
