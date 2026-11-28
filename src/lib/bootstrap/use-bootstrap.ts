import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/query-client";
import { restoreServiceRegions, serviceRegionsQuery } from "./app-bootstrap";

// The root layout renders this before the query provider mounts, so the client is passed directly.
export default function useBootstrap() {
  const [restoreDone, setRestoreDone] = useState(false);

  useEffect(() => {
    restoreServiceRegions().then((restored) => {
      // With a saved list the app opens straight away and the fresh list replaces it when it arrives.
      // A failed refresh keeps the saved list, so its error is not shown.
      // staleTime 0 forces the fetch, since the restored list would otherwise count as fresh forever.
      if (restored) queryClient.fetchQuery({ ...serviceRegionsQuery, staleTime: 0 }).catch(() => {});
      setRestoreDone(true);
    });
  }, []);

  const { data, error, isFetching, refetch } = useQuery({ ...serviceRegionsQuery, enabled: restoreDone }, queryClient);
  return {
    isLoading: !restoreDone || (isFetching && !data),
    error: data || isFetching ? null : error,
    refresh: refetch,
  };
}

/** Countries and regions, with lookups by code. Undefined until the saved list is restored or the launch fetch succeeds. */
export function useServiceRegions() {
  return useQuery(serviceRegionsQuery, queryClient).data;
}
