import api from "./httpService";

const API_PATHS = {
  BOOTSTRAP: "/v1/catalogue/service-regions",
  HEALTH: "v1/health",
} as const;

export const fetchBootstrapDataAPI = (): Promise<unknown> => api.get(API_PATHS.BOOTSTRAP);
export const healthCheck = (): Promise<unknown> => api.get(API_PATHS.HEALTH);
