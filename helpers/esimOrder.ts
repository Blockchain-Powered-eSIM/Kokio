import type { Esim } from "@/components/ESIMItem";
import type { CreateOrderRequest } from "@/utils/bff/order";

type EsimOrderPayloadParams = {
  eSimItem: Esim;
  discountCode: string;
  applyAsTopup: boolean;
  compatibleTopUpEsimRef: string | undefined;
};

type OrderPayload = CreateOrderRequest;

export const getEsimOrderPayload = ({
  eSimItem,
  discountCode,
  applyAsTopup,
  compatibleTopUpEsimRef,
}: EsimOrderPayloadParams): OrderPayload => ({
  catalogueId: eSimItem.catalogueId,
  isNewESim: true,
  coupon: discountCode || undefined,
  isCryptoPayment: true,
  ...(applyAsTopup && compatibleTopUpEsimRef
    ? { isNewESim: false, eSimRef: compatibleTopUpEsimRef }
    : {}),
});
