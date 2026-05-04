import type { Esim } from "@/components/ESIMItem";
import type { CreateOrderRequest } from "@/utils/bff/order";

type EsimOrderPayloadParams = {
  eSimItem: Esim;
  deviceWalletId: string | undefined;
  discountCode: string;
  applyAsTopup: boolean;
  compatibleTopUpEsimId: string | undefined;
};

type OrderPayload = Omit<CreateOrderRequest, 'payeeAddress' | 'txnHash' | 'tokenName' | 'network'>;

export const getEsimOrderPayload = ({
  eSimItem,
  discountCode,
  applyAsTopup,
  compatibleTopUpEsimId,
}: EsimOrderPayloadParams): OrderPayload => ({
  catalogueId: eSimItem.catalogueId,
  currency: "USD",
  isNewESim: true,
  coupon: discountCode || null,
  isCryptoPayment: true,
  ...(applyAsTopup && compatibleTopUpEsimId
    ? { isNewESim: false, eSimId: compatibleTopUpEsimId }
    : {}),
});
