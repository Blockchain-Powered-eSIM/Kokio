import type { components } from './generated/koKioBff';
import { unwrapBffResponse, unwrapBffResponseWithCorrelation } from './koKioBffClient';
import api from '@/services/httpService';

type CreateOrderRequest  = components['schemas']['CreateOrderRequest'];
type CreateOrderResponse = components['schemas']['CreateOrderResponse'];
type OrderStatusResponse = components['schemas']['OrderStatusResponse'];

export type InstallationDetails = components['schemas']['InstallationDetails'];

export type { CreateOrderRequest, CreateOrderResponse, OrderStatusResponse };

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
  esimId?: string;
  coupon?: string;
  isCryptoPayment: false;
};

type ExternalWalletOrderRequest = {
  catalogueId: string;
  currency: 'USD';
  isNewESim: boolean;
  esimId?: string;
  coupon?: string;
  isCryptoPayment: true;
  payeeAddress?: string;
  successRedirectUrl?: string;
};

// ─── Order functions ──────────────────────────────────────────────────────────

export function createOrder(body: CreateOrderRequest): Promise<CreateOrderResponse> {
  return unwrapBffResponse(api.post('/v1/order', body as Record<string, unknown>));
}

export function createCryptoOrder(
  body: CreateOrderRequest,
): Promise<{ data: CreateOrderResponse; correlationId: string | null }> {
  return unwrapBffResponseWithCorrelation<CreateOrderResponse>(
    api.post('/v1/order', body as Record<string, unknown>),
  );
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

export function getOrderStatus(idempotencyKey: string): Promise<OrderStatusResponse> {
  return unwrapBffResponse<OrderStatusResponse>(api.get(`/v1/order/${idempotencyKey}`));
}

export async function pollOrderStatus(
  idempotencyKey: string,
  maxAttempts = 15,
  intervalMs = 2000,
  onStatusUpdate?: (orderStatus: string) => void,
): Promise<OrderStatusResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise<void>(r => setTimeout(r, intervalMs));
    const status = await getOrderStatus(idempotencyKey);
    if (__DEV__) console.log(`[eSIM] poll #${i + 1}:`, JSON.stringify(status, null, 2));
    onStatusUpdate?.(status.orderStatus);
    if (status.orderStatus === 'COMPLETED' || status.installationDetails?.qrcode) return status;
  }
  throw new Error('Order confirmation timed out');
}
