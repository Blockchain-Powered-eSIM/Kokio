import api from "./httpService";

const API_PATHS = {
  BOOTSTRAP: "/v1/catalogue/service-regions",
  HEALTH: "v1/health"
};

export const fetchBootstrapDataAPI = () => api.get(API_PATHS.BOOTSTRAP);
export const healthCheck = () => api.get(API_PATHS.HEALTH);