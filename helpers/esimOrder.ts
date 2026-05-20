import type { Esim } from "@/components/ESIMItem";
import type { CreateOrderRequest } from "@/utils/bff/order";

type EsimOrderPayloadParams = {
  eSimItem: Esim;
  deviceWalletId: string | undefined;
  discountCode: string;
  applyAsTopup: boolean;
  compatibleTopUpEsimId: string | undefined;
};

type OrderPayload = CreateOrderRequest;

export const getEsimOrderPayload = ({
  eSimItem,
  discountCode,
  applyAsTopup,
  compatibleTopUpEsimId,
}: EsimOrderPayloadParams): OrderPayload => ({
  catalogueId: eSimItem.catalogueId,
  isNewESim: true,
  coupon: discountCode || undefined,
  isCryptoPayment: true,
  ...(applyAsTopup && compatibleTopUpEsimId
    ? { isNewESim: false, esimId: compatibleTopUpEsimId }
    : {}),
});
