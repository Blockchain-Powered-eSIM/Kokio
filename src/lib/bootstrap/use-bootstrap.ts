import { useState, useEffect } from "react";
import { getServiceRegions } from "@/lib/api/bff/catalogue";
import { checkBffHealth } from "@/lib/api/bff/health";
import AppBootstrap from "./app-bootstrap";
import { logger } from '@/lib/logger';

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealthData();
    fetchBootstrapData();
  }, []);

  return {
    isLoading,
    error,
    refresh: fetchBootstrapData,
  };
}
