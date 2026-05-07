import type { components } from './generated/koKioBff';
import { unwrapBffResponse, unwrapBffResponseWithCorrelation } from './koKioBffClient';
import api from '@/services/httpService';

type CreateOrderRequest  = components['schemas']['CreateOrderRequest'];
type CreateOrderResponse = components['schemas']['CreateOrderResponse'];

export type InstallationDetails = components['schemas']['InstallationDetails'];

export type { CreateOrderRequest, CreateOrderResponse };

// ─── Extended response types ──────────────────────────────────────────────────

export type FiatOrderResponse = CreateOrderResponse & {
  stripeInvoiceId: string;
  clientSecret: string;
};

export type ExternalWalletOrderResponse = CreateOrderResponse & {
  moonpayChargeId: string;
  moonpayPaymentPageUrl: string;
};

// ─── Request types ────────────────────────────────────────────────────────────

type FiatOrderRequest = {
  catalogueId: string;
  currency: 'USD';
  isNewESim: boolean;
  eSimId?: string;
  coupon?: string | null;
  isCryptoPayment: false;
};

type ExternalWalletOrderRequest = {
  catalogueId: string;
  currency: 'USD';
  isNewESim: boolean;
  eSimId?: string;
  coupon?: string | null;
  isCryptoPayment: true;
  payeeAddress?: string;
};

// ─── Order functions ──────────────────────────────────────────────────────────

export function createOrder(body: CreateOrderRequest): Promise<CreateOrderResponse> {
  return unwrapBffResponse(api.post('/v1/order', body as Record<string, unknown>));
}

export function createFiatOrder(
  body: FiatOrderRequest,
): Promise<{ data: FiatOrderResponse; correlationId: string | null }> {
  return unwrapBffResponseWithCorrelation<FiatOrderResponse>(
    api.post('/v1/order', body as Record<string, unknown>),
  );
}

export function createExternalWalletOrder(
  body: ExternalWalletOrderRequest,
): Promise<{ data: ExternalWalletOrderResponse; correlationId: string | null }> {
  return unwrapBffResponseWithCorrelation<ExternalWalletOrderResponse>(
    api.post('/v1/order', body as Record<string, unknown>),
  );
}

export function getOrderStatus(correlationId: string): Promise<CreateOrderResponse> {
  return unwrapBffResponse<CreateOrderResponse>(api.get(`/v1/order/${correlationId}`));
}

export async function pollOrderStatus(
  correlationId: string,
  maxAttempts = 15,
  intervalMs = 2000,
  onStatusUpdate?: (orderStatus: string) => void,
): Promise<CreateOrderResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise<void>(r => setTimeout(r, intervalMs));
    const status = await getOrderStatus(correlationId);
    if (__DEV__) console.log(`[eSIM] poll #${i + 1} orderStatus=${status.orderStatus} paymentStatus=${status.paymentStatus}`);
    onStatusUpdate?.(status.orderStatus);
    if (status.orderStatus === 'COMPLETED') return status;
    if (status.paymentStatus === 'FAILED') throw new Error('Payment failed');
  }
  throw new Error('Order confirmation timed out');
}
