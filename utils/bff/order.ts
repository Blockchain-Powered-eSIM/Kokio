import { BffError , unwrapBffResponse, unwrapBffResponseWithCorrelation } from './koKioBffClient'; 
import type { components } from './generated/koKioBff';
import api from '@/services/httpService';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

type CreateOrderRequest  = components['schemas']['CreateOrderRequest'];
type CreateOrderResponse = components['schemas']['CreateOrderResponse'];
type OrderStatusResponse = components['schemas']['OrderStatusResponse'];
type OrderListItem       = components['schemas']['OrderListItem'];
type OrderListResponse   = components['schemas']['OrderListResponse'];

export type InstallationDetails = components['schemas']['InstallationDetails'];

export type { CreateOrderRequest, CreateOrderResponse, OrderStatusResponse, OrderListItem, OrderListResponse };

// ─── Order functions ──────────────────────────────────────────────────────────

// Single order-creation call for every payment method.
export function submitOrder(
  request: CreateOrderRequest,
): Promise<{ data: CreateOrderResponse; correlationId: string }> {
  const idempotencyKey = uuidv4();
  return unwrapBffResponseWithCorrelation<CreateOrderResponse>(
    api.post('/v1/order', request as Record<string, unknown>, {
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

/**
 * Thrown when GET /order/{idempotencyKey} returns "no order found" shape, i.e.
 * HTTP 200, success envelope, all data fields null and the message containing ORDER_NOT_FOUND.
 * Per spec this means no order exists for this idempotency key + device.
 * It should only occur transiently, if at all, immediately after creation. 
 * Not retried.
 */
export class OrderNotFoundError extends Error {
  constructor() {
    super('No order found for this correlation ID');
    this.name = 'OrderNotFoundError';
  }
}

export type PollUpdate =
  | { kind: 'status'; orderStatus: string }
  | { kind: 'retrying'; attempt: number; waitMs: number };

export type PollOrderStatusOptions = {
  // Steady-state cadence between polls. Default 4000ms.
  intervalMs?: number;
  // Total budget, including any 429 backoff waits. Default 30000ms.
  maxDurationMs?: number;
  onUpdate?: (update: PollUpdate) => void;
};

const DEFAULT_POLL_INTERVAL_MS = 4000;
const DEFAULT_POLL_MAX_DURATION_MS = 30000;
const BACKOFF_CAP_MS = 8000;

export async function pollOrderStatus(
  idempotencyKey: string,
  options: PollOrderStatusOptions = {},
): Promise<OrderStatusResponse> {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_POLL_MAX_DURATION_MS;
  const onUpdate = options.onUpdate;

  const deadline = Date.now() + maxDurationMs;
  let backoffMs = intervalMs;
  let retryAttempt = 0;

  while (Date.now() < deadline) {
    let status: OrderStatusResponse;
    try {
      status = await getOrderStatus(idempotencyKey);
    } catch (err) {
      // Throttled and capped exponential backoff.
      if (!(err instanceof BffError) || err.httpStatus !== 429) throw err;

      retryAttempt += 1;
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const waitMs = Math.min(backoffMs, remaining);
      onUpdate?.({ kind: 'retrying', attempt: retryAttempt, waitMs });
      await new Promise<void>((r) => setTimeout(r, waitMs));
      backoffMs = Math.min(backoffMs * 2, BACKOFF_CAP_MS);
      continue;
    }

    logger.debug('ESIM_POLL_STATUS', { status });

    if (!status.orderId) throw new OrderNotFoundError();
    if (TERMINAL_ORDER_STATUSES.has(status.orderStatus)) return status;

    onUpdate?.({ kind: 'status', orderStatus: status.orderStatus });
    backoffMs = intervalMs; // reset after any successful, non-throttled call

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise<void>((r) => setTimeout(r, Math.min(intervalMs, remaining)));
  }

  throw new Error('Order confirmation timed out');
}
