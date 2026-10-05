import type { Esim } from "@/components/ESIMItem";
import type { CreateOrderRequest } from "@/utils/bff/order";

type EsimOrderPayloadParams = {
  eSimItem: Esim;
  discountCode: string;
  applyAsTopup: boolean;
  compatibleTopUpEsimRef: string | undefined;
};

type OrderPayload = CreateOrderRequest;

export function formatPlanLabel(plan?: Esim | null): string | undefined {
  if (!plan?.serviceRegionName) return undefined;
  const parts = [plan.serviceRegionName];
  if (plan.validity) parts.push(`${plan.validity} Days`);
  if (plan.isUnlimited) parts.push('Unlimited');
  else if (plan.data) parts.push(`${plan.data}GB`);
  return parts.join(' · ');
}

export const getEsimOrderPayload = ({
  eSimItem,
  discountCode,
  applyAsTopup,
  compatibleTopUpEsimRef,
}: EsimOrderPayloadParams): OrderPayload => ({
  catalogueId: eSimItem.catalogueId,
  isNewESim: true,
  coupon: discountCode || undefined,
  paymentMethod: "CRYPTO",
  ...(applyAsTopup && compatibleTopUpEsimRef
    ? { isNewESim: false, eSimRef: compatibleTopUpEsimRef }
    : {}),
});
