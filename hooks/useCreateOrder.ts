import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';

import { submitOrder, pollOrderStatus, OrderNotFoundError } from '@/utils/bff/order';
import type { CreateOrderRequest, OrderStatusResponse, PollUpdate } from '@/utils/bff/order';
import { BffError } from '@/utils/bff/koKioBffClient';
import { useStripePaymentSheet } from '@/hooks/useStripePaymentSheet';
import { formatPlanLabel } from '@/helpers/esimOrder';
import { addPendingOrder, removePendingOrder, PENDING_ORDERS_KEY } from '@/hooks/usePendingOrders';
import type { Esim } from '@/components/ESIMItem';

export type CreateOrderVariables = {
  request: CreateOrderRequest;
  eSimItem: Esim;
  idempotencyKey?: string;
};

// Fired once order creation succeeds, before any payment step.
export type CreateOrderOptions = {
  onOrderCreated?: (correlationId: string) => void | Promise<void>;
  onPollUpdate?: (update: PollUpdate) => void;
};

export type CreateOrderResult =
  | { kind: 'terminal'; order: OrderStatusResponse; correlationId: string }
  | {
      kind: 'awaiting_crypto_payment';
      correlationId: string;
      orderId: string;
      moonpayChargeId: string;
      moonpayPaymentPageUrl: string;
    }
  | {
      kind: 'awaiting_device_wallet_payment';
      correlationId: string;
      orderId: string;
      // The generated type (from the OpenAPI schema) models this as a single
      // {to, data} object, but the real response is an array of ordered calls
      // to submit as one user operation - the schema doesn't match the server.
      userOperations: { to: string; data: string }[];
      paymentSessionExpiresAt: string | null;
    };

// SecureStore key for the most recently purchased eSIM wallet address.
// Read by topup flows to pre-populate the eSimId for compatibility checks.
export const ESIM_ID_KEY = 'esimId';

/**
 * Thrown when order creation itself fails, or when polling after payment times out.
 * Carries whatever correlationId is known (the client-generated idempotency key,
 * else the BFF envelope's correlationId) so the caller can record the order as FAILED.
 * Also carries the originating BffError's code when there was one, so callers
 * can distinguish specific failures (e.g. the wallet-deployment order block)
 * without parsing message text.
 */
export class OrderCreationError extends Error {
  correlationId: string | null;
  code: string | null;
  constructor(message: string, correlationId: string | null, code: string | null = null) {
    super(message);
    this.name = 'OrderCreationError';
    this.correlationId = correlationId;
    this.code = code;
  }
}

// The user backed out of the Stripe sheet without submitting.
export class StripeCancelledError extends Error {
  constructor() {
    super('Payment cancelled');
    this.name = 'StripeCancelledError';
  }
}

// initPaymentSheet/confirmPaymentSheetPayment returned an error. Shown to the user, 
// but does not record the order as FAILED, the order may still resolve via webhook/poll.
export class StripeSheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StripeSheetError';
  }
}

/**
 * Poll wrapper shared by both the FIAT and COUPON paths below. 
 * Normalizes whatever pollOrderStatus throws (OrderNotFoundError, the generic timeout, 
 * or a passthrough error) into an OrderCreationError carrying correlationId, 
 * so the caller's FAILED-recording logic doesn't need a special case per error type.
 */
async function pollToTerminal(
  correlationId: string,
  onUpdate?: (update: PollUpdate) => void,
): Promise<OrderStatusResponse> {
  return pollOrderStatus(correlationId, { onUpdate }).catch((err) => {
    const message = err instanceof OrderNotFoundError ? 'Order not found' : 'Order confirmation timed out';
    throw new OrderCreationError(message, correlationId);
  });
}

export function useCreateOrder(options: CreateOrderOptions = {}) {
  const queryClient = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet, confirmPaymentSheetPayment } =
    useStripePaymentSheet();

  return useMutation<CreateOrderResult, Error, CreateOrderVariables>({
    mutationFn: async ({ request, eSimItem }) => {
      const { data, correlationId } = await submitOrder(request).catch((err) => {
        const bffErr = err as { correlationId?: string | null };
        throw new OrderCreationError(
          (err as Error)?.message ?? 'Order creation failed',
          bffErr?.correlationId ?? null,
          err instanceof BffError ? err.code : null,
        );
      });

      await options.onOrderCreated?.(correlationId);

      // Recorded before any payment step so a reference id exists even if the
      // order later gets stuck (payment timeout, a backend job hanging) and
      // never reaches the terminal order list on its own.
      await addPendingOrder({
        correlationId,
        orderId: data.orderId,
        catalogueId: request.catalogueId,
        planLabel: formatPlanLabel(eSimItem),
        paymentMethod: request.paymentMethod,
        createdAt: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: [PENDING_ORDERS_KEY] });

      // FIAT — clientSecret present.
      if (data.clientSecret) {
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'Kokio',
          paymentIntentClientSecret: data.clientSecret,
          customFlow: true,
          applePay: { merchantCountryCode: 'SG' },
          googlePay: { merchantCountryCode: 'SG', testEnv: __DEV__ },
          style: 'alwaysDark',
          returnURL: Linking.createURL('stripe-redirect'),
        });
        if (initError) throw new StripeSheetError(initError.message);

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) throw new StripeCancelledError();

        const { error: confirmError } = await confirmPaymentSheetPayment();
        if (confirmError) throw new StripeSheetError(confirmError.message);

        const order = await pollToTerminal(correlationId, options.onPollUpdate);

        return { kind: 'terminal', order, correlationId };
      }

      /**
       * CRYPTO — moonpayPaymentPageUrl present. 
       * Which presentation mechanism to use (SDK drawer vs. hosted-page browser)
       * is a caller-side UI decision. Return the session, when caller finishes, then poll.
       */
      if (data.moonpayChargeId && data.moonpayPaymentPageUrl) {
        return {
          kind: 'awaiting_crypto_payment',
          correlationId,
          orderId: data.orderId,
          moonpayChargeId: data.moonpayChargeId,
          moonpayPaymentPageUrl: data.moonpayPaymentPageUrl,
        };
      }

      /**
       * DEVICE_WALLET — userOperations present (an array of ordered calls,
       * despite the generated type modeling it as a single {to, data} object -
       * cast past the stale type and validate at runtime instead). Caller must
       * sign and submit it (sendUserOperation) before any polling starts;
       * unlike FIAT/CRYPTO, payment has not happened yet at this point, so
       * returning here rather than polling is deliberate.
       */
      const rawUserOperations = data.userOperations as unknown;
      const isValidCall = (op: unknown): op is { to: string; data: string } =>
        !!op && typeof (op as { to?: unknown }).to === 'string' && typeof (op as { data?: unknown }).data === 'string';
      if (Array.isArray(rawUserOperations) && rawUserOperations.length > 0 && rawUserOperations.every(isValidCall)) {
        return {
          kind: 'awaiting_device_wallet_payment',
          correlationId,
          orderId: data.orderId,
          userOperations: rawUserOperations,
          paymentSessionExpiresAt: data.paymentSessionExpiresAt ?? null,
        };
      }

      /**
       * COUPON (full coverage) — neither field present,
       * $0 invoice already auto-paid server-side. Poll immediately.
       * TODO: Partial coupon flow to be extended from here.
       */
      const order = await pollToTerminal(correlationId, options.onPollUpdate);
      return { kind: 'terminal', order, correlationId };
    },

    onSuccess: async (result) => {
      if (result.kind !== 'terminal') return;
      if (result.order.esimId) {
        await SecureStore.setItemAsync(ESIM_ID_KEY, result.order.esimId);
      }
      await removePendingOrder(result.correlationId);
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: [PENDING_ORDERS_KEY] });
    },
  });
}
