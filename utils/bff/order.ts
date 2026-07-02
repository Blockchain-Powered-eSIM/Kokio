import type { components } from './generated/koKioBff';
import { unwrapBffResponse, unwrapBffResponseWithCorrelation } from './koKioBffClient';
import api from '@/services/httpService';
import { v4 as uuidv4 } from 'uuid';

type CreateOrderRequest  = components['schemas']['CreateOrderRequest'];
type CreateOrderResponse = components['schemas']['CreateOrderResponse'];
type OrderStatusResponse = components['schemas']['OrderStatusResponse'];
type OrderListItem       = components['schemas']['OrderListItem'];
type OrderListResponse   = components['schemas']['OrderListResponse'];

export type InstallationDetails = components['schemas']['InstallationDetails'];

export type { CreateOrderRequest, CreateOrderResponse, OrderStatusResponse, OrderListItem, OrderListResponse };


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
): Promise<{ data: CreateOrderResponse; correlationId: string }> {
  const idempotencyKey = uuidv4();
  return unwrapBffResponseWithCorrelation<CreateOrderResponse>(
    api.post('/v1/order', body as Record<string, unknown>, {
      headers: { 'x-correlation-id': idempotencyKey },
    }),
  ).then((r) => ({ ...r, correlationId: idempotencyKey }));
}

export function createFiatOrder(
  body: FiatOrderRequest,
): Promise<{ data: FiatOrderResponse; correlationId: string | null }> {
  const idempotencyKey = uuidv4();
  return unwrapBffResponseWithCorrelation<FiatOrderResponse>(
    api.post('/v1/order', body as Record<string, unknown>, {
      headers: { 'x-correlation-id': idempotencyKey },
    }),
  ).then((r) => ({ ...r, correlationId: idempotencyKey }));
}

export function createExternalWalletOrder(
  body: ExternalWalletOrderRequest,
): Promise<{ data: ExternalWalletOrderResponse; correlationId: string | null }> {
  const idempotencyKey = uuidv4();
  return unwrapBffResponseWithCorrelation<ExternalWalletOrderResponse>(
    api.post('/v1/order', body as Record<string, unknown>, {
      headers: { 'x-correlation-id': idempotencyKey },
    }),
  ).then((r) => ({ ...r, correlationId: idempotencyKey }));
}

export function getOrderStatus(idempotencyKey: string): Promise<OrderStatusResponse> {
  return unwrapBffResponse<OrderStatusResponse>(api.get(`/v1/order/${idempotencyKey}`));
}

export function getOrderList(page = 1, pageSize = 25): Promise<OrderListResponse> {
  return unwrapBffResponse<OrderListResponse>(
    api.get('/v1/order/list', { params: { page, pageSize } }),
  );
}

// Terminal states — stop polling immediately on any of these.
// In-progress states (CREATED, PAYMENT_PENDING, PAYMENT_VERIFIED, VENDOR_PROCESSING,
// ESIM_PROVISIONED, VENDOR_RETRY_PENDING, ON_CHAIN_SUBMITTED) keep polling.
export const TERMINAL_ORDER_STATUSES = new Set([
  'COMPLETED',
  'ESIM_PROVISIONED_PENDING_CHAIN',
  'PAYMENT_FAILED',
  'ABANDONED',
  'VENDOR_FAILED',
  'ESIM_PROVISION_FAILED',
  'ON_CHAIN_FAILED',
]);

export function isOrderSuccess(status: string): boolean {
  return status === 'COMPLETED' || status === 'ESIM_PROVISIONED_PENDING_CHAIN';
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
    if (TERMINAL_ORDER_STATUSES.has(status.orderStatus)) return status;
  }
  throw new Error('Order confirmation timed out');
}
