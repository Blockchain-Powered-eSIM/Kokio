import { useState, useEffect } from "react";
import { getServiceRegions } from "@/utils/bff/catalogue";
import { checkBffHealth } from "@/utils/bff/health";
import AppBootstrap from "@/utils/appBootstrap";

export default function useBootstrap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchHealthData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const healthy = await checkBffHealth();
      console.log("Health status", healthy);
      if (!healthy) {
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
      const { countries, regions } = await getServiceRegions();
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
