import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

import { submitOrder, pollOrderStatus, OrderNotFoundError } from '@/utils/bff/order';
import type { CreateOrderRequest, OrderStatusResponse, PollUpdate } from '@/utils/bff/order';
import { useStripePaymentSheet } from '@/hooks/useStripePaymentSheet';
import type { Esim } from '@/components/ESIMItem';

export type CreateOrderVariables = {
  request: CreateOrderRequest;
  eSimItem: Esim;
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
    };

// SecureStore key for the most recently purchased eSIM wallet address.
// Read by topup flows to pre-populate the eSimId for compatibility checks.
export const ESIM_ID_KEY = 'esimId';

/**
 * Thrown when order creation itself fails, or when polling after payment times out. 
 * Carries whatever correlationId is known (the client-generated idempotency key, 
 * else the BFF envelope's correlationId) so the caller can record the order as FAILED.
 */
export class OrderCreationError extends Error {
  correlationId: string | null;
  constructor(message: string, correlationId: string | null) {
    super(message);
    this.name = 'OrderCreationError';
    this.correlationId = correlationId;
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
    mutationFn: async ({ request }) => {
      const { data, correlationId } = await submitOrder(request).catch((err) => {
        const bffErr = err as { correlationId?: string | null };
        throw new OrderCreationError(
          (err as Error)?.message ?? 'Order creation failed',
          bffErr?.correlationId ?? null,
        );
      });

      await options.onOrderCreated?.(correlationId);

      // FIAT — clientSecret present.
      if (data.clientSecret) {
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'Kokio',
          paymentIntentClientSecret: data.clientSecret,
          customFlow: true,
          applePay: { merchantCountryCode: 'US' },
          googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
          style: 'alwaysDark',
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
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
