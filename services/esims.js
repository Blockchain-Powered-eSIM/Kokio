import api from "./httpService";

const API_PATHS = {
  FETCH_ESIMS: "/v1/catalogue",
};

export const fetchEsimsCatalogue = (payload) =>
  api.get(API_PATHS.FETCH_ESIMS, payload);
