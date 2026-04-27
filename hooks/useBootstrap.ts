import { useState, useEffect } from "react";
import { fetchBootstrapDataAPI, healthCheck } from "@/services/general";
import AppBootstrap from "@/utils/appBootstrap";
import type { components } from "@/utils/bff/generated/koKioBff";

type ServiceRegion = components["schemas"]["ServiceRegion"];

export default function useBootstrap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchHealthData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await healthCheck();
      console.log("Health status", response);
      if ((response as any)?.success !== true) {
        console.error("Non 200 status");
      }
    } catch (err) {
      console.error("Failed to query BFF", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBootstrapData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchBootstrapDataAPI();
      const { countries, regions } = (response as any)?.data as {
        countries?: ServiceRegion[];
        regions?: ServiceRegion[];
      } || {};
      new AppBootstrap({ countries, regions });
    } catch (err) {
      console.error("Failed to fetch bootstrap data:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch bootstrap data on mount
  useEffect(() => {
    fetchHealthData(); // TODO : add UI component to display errors to user
    fetchBootstrapData();
  }, []);

  return {
    isLoading,
    error,
    refresh: fetchBootstrapData,
  };
}
