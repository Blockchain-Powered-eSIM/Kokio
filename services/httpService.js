import axios from "axios";
import qs from "qs";

import _get from "lodash/get";

import { uuid } from "@/utils/general";

const REQUEST_TIMEOUT_MS_SHORT = 30000;

const EMPTY_OBJECT = {};

const HTTP_STATUS_CODE = {
  UNAUTHORIZED: 401,
};

const defaultConfig = {
  timeout: REQUEST_TIMEOUT_MS_SHORT,
  paramsSerializer: (params) => qs.stringify(params),
};

function errorHandler(error) {
  const response = _get(error, "response");
  const statusCode = _get(response, "status");
  if (statusCode === HTTP_STATUS_CODE.UNAUTHORIZED) {
    logOutUser();
  }

  return Promise.reject(error.response);
}

const successHandler = (response) => {
  const responseData = _get(response, "data");
  return responseData;
};

const getDefaultHeaders = () => {
  return {
    "x-correlation-id": uuid(),
  };
};

// export `axios` instance with config as `api` object
const api = ((args) => {
  const instance = axios.create();
  // intercept response before actual handling in invoked action creator
  // this to serve response/error handling across application
  instance.interceptors.response.use(successHandler, errorHandler);

  // returning abstract methods of axios
  return {
    getHeaders() {
      return getDefaultHeaders();
    },
    getBaseURL() {
      return process.env.EXPO_PUBLIC_API_BASE_URL;
    },
    getConfig() {
      const baseURL = this.getBaseURL();
      const headers = this.getHeaders();
      return {
        baseURL,
        headers,
        ...args,
      };
    },
    get(url, params = EMPTY_OBJECT, config = this.getConfig()) {
      return instance.get(url, { ...config, params });
    },
    post(url, data = EMPTY_OBJECT, config = this.getConfig()) {
      return instance.post(url, data, config);
    },
    put(url, data = EMPTY_OBJECT, config = this.getConfig()) {
      return instance.put(url, data, config);
    },
    delete(url, config = this.getConfig(), options = EMPTY_OBJECT) {
      return instance.delete(url, config);
    },
  };
})(defaultConfig);

export default api;
