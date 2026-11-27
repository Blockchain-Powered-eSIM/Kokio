import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/query-client";
import { serviceRegionsQuery } from "./app-bootstrap";

// The root layout renders this before the query provider mounts, so the client is passed directly.
export default function useBootstrap() {
  const { data, error, isFetching, refetch } = useQuery(serviceRegionsQuery, queryClient);
  return {
    isLoading: isFetching && !data,
    error: isFetching ? null : error,
    refresh: refetch,
  };
}

/** Countries and regions, with lookups by code. Undefined until the launch fetch succeeds. */
export function useServiceRegions() {
  return useQuery(serviceRegionsQuery, queryClient).data;
}
