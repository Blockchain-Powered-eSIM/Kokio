// @deprecated Use utils/bff/catalogue.ts, utils/bff/order.ts, utils/bff/esim.ts,
//             utils/bff/coupon.ts instead. Remove in BFF-601.
import api from "./httpService";

const API_PATHS = {
  FETCH_ESIMS: "/v1/catalogue?vendor=VENDOR1", //TODO remove VENDOR1 before app build
  ORDER: "/v1/order",
  VALIDATE_COUPON: (couponCode: string) => `/v1/coupon/${couponCode}`,
  ESIM_COMPATIBILITY: "/v1/esim/compatibility",
} as const;

export const fetchEsimsCatalogue = (payload: Record<string, unknown>): Promise<unknown> =>
  api.get(API_PATHS.FETCH_ESIMS, payload);

export const eSimOderCheckout = (payload: Record<string, unknown>): Promise<any> =>
  api.post(API_PATHS.ORDER, payload);

export const validateCoupon = (couponCode: string): Promise<unknown> =>
  api.get(API_PATHS.VALIDATE_COUPON(couponCode));

/** @deprecated Use checkEsimCompatibility from utils/bff/esim.ts */
export const checkEsimTopUpCompatibility = ({
  deviceId,
  planId,
  esimId,
}: {
  deviceId?: string;
  planId: string;
  esimId?: string;
}): Promise<unknown> => {
  const params = { deviceId, planId, ...(esimId && { esimId }) };
  return api.get(API_PATHS.ESIM_COMPATIBILITY, params);
};
