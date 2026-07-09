import { useState, useEffect } from "react";
import { getServiceRegions } from "@/utils/bff/catalogue";
import { checkBffHealth } from "@/utils/bff/health";
import AppBootstrap from "@/utils/appBootstrap";
import { logger } from '@/utils/logger';

export default function useBootstrap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchHealthData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const healthy = await checkBffHealth();
      logger.debug('BFF_HEALTH_STATUS', healthy);
      if (!healthy) {
        logger.warn('BFF_HEALTH_NON_200');
      }
    } catch (err) {
      logger.error('BFF_HEALTH_QUERY_FAILED', { err });
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
      logger.error('BOOTSTRAP_FETCH_FAILED', { err });
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
