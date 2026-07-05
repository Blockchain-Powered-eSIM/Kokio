import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

import { createCryptoOrder, pollOrderStatus, isOrderSuccess } from '@/utils/bff/order';
import type { CreateOrderRequest, OrderStatusResponse } from '@/utils/bff/order';
import { useKokio } from '@/hooks/useKokio';
import type { Esim } from '@/components/ESIMItem';

export type CreateOrderVariables = {
  request: CreateOrderRequest;
  eSimItem: Esim;
  idempotencyKey?: string;
};

export type CreateTopupOrderVariables = {
  request: Omit<CreateOrderRequest, 'isNewESim' | 'esimId'> & { isNewESim: false; esimId: string };
  eSimItem: Esim;
  idempotencyKey?: string;
};

export type CreateOrderResult = { order: OrderStatusResponse | null; correlationId: string | null };

// SecureStore key for the most recently purchased eSIM wallet address.
// Read by topup flows to pre-populate the eSimId for compatibility checks.
export const ESIM_ID_KEY = 'esimId';

async function createAndPoll(request: CreateOrderRequest, idempotencyKey?: string): Promise<CreateOrderResult> {
  const { correlationId } = await createCryptoOrder(request, idempotencyKey);
  // Per spec, GET /order/{idempotencyKey} only accepts the correlation id used
  // at creation — there is no other key to poll on if the server didn't return one.
  if (!correlationId) return { order: null, correlationId: null };
  const order = await pollOrderStatus(correlationId, 15, 2000);
  return { order, correlationId };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { kokio, savePurchasedESIM } = useKokio();

  return useMutation<CreateOrderResult, Error, CreateOrderVariables>({
    mutationFn: ({ request, idempotencyKey }) => createAndPoll(request, idempotencyKey),

    onSuccess: async ({ order, correlationId }, { eSimItem }) => {
      if (order && isOrderSuccess(order.orderStatus)) {
        if (order.esimId) {
          await SecureStore.setItemAsync(ESIM_ID_KEY, order.esimId);
        }
        if (kokio.deviceUID) {
          await savePurchasedESIM(kokio.deviceUID, eSimItem, order, correlationId);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCreateTopupOrder() {
  const queryClient = useQueryClient();
  const { kokio, savePurchasedESIM } = useKokio();

  return useMutation<CreateOrderResult, Error, CreateTopupOrderVariables>({
    mutationFn: ({ request, idempotencyKey }) => createAndPoll(request as CreateOrderRequest, idempotencyKey),

    onSuccess: async ({ order, correlationId }, { eSimItem }) => {
      if (order && isOrderSuccess(order.orderStatus)) {
        if (order.esimId) {
          await SecureStore.setItemAsync(ESIM_ID_KEY, order.esimId);
        }
        if (kokio.deviceUID) {
          await savePurchasedESIM(kokio.deviceUID, eSimItem, order, correlationId);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
