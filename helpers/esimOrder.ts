import type { Esim } from "@/components/ESIMItem";

type EsimOrderPayloadParams = {
  eSimItem: Esim;
  deviceWalletId: string | undefined;
  discountCode: string;
  applyAsTopup: boolean;
  compatibleTopUpEsimId: string | undefined;
};

export const getEsimOrderPayload = ({
  eSimItem,
  deviceWalletId,
  discountCode,
  applyAsTopup,
  compatibleTopUpEsimId,
}: EsimOrderPayloadParams) => ({
  deviceId: deviceWalletId,
  catalogueId: eSimItem?.catalogueId,
  amount: eSimItem?.actualSellingPrice,
  currency: "USD", // TODO: check if need to be dynamic
  isNewESim: true, // True if new esim and false if topup
  coupon: discountCode,
  isCryptoPayment: true,
  ...(applyAsTopup && compatibleTopUpEsimId
    ? { isNewESim: false, esimId: compatibleTopUpEsimId }
    : {}),
});
