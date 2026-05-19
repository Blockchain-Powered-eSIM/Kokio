import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

import { createCryptoOrder, pollOrderStatus } from '@/utils/bff/order';
import type { CreateOrderRequest, OrderStatusResponse } from '@/utils/bff/order';
import { useKokio } from '@/hooks/useKokio';
import type { Esim } from '@/components/ESIMItem';

export type CreateOrderVariables = {
  request: CreateOrderRequest;
  eSimItem: Esim;
};

export type CreateTopupOrderVariables = {
  request: Omit<CreateOrderRequest, 'isNewESim' | 'esimId'> & { isNewESim: false; esimId: string };
  eSimItem: Esim;
};

// SecureStore key for the most recently purchased eSIM wallet address.
// Read by topup flows to pre-populate the eSimId for compatibility checks.
export const ESIM_ID_KEY = 'esimId';

async function createAndPoll(request: CreateOrderRequest): Promise<{ order: OrderStatusResponse; correlationId: string | null }> {
  const { data: orderInit, correlationId } = await createCryptoOrder(request);
  const order = correlationId
    ? await pollOrderStatus(correlationId, 15, 2000)
    : await pollOrderStatus(orderInit.orderId, 15, 2000);
  return { order, correlationId };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { kokio, savePurchasedESIM } = useKokio();

  return useMutation<OrderStatusResponse, Error, CreateOrderVariables>({
    mutationFn: ({ request }) => createAndPoll(request).then(r => r.order),

    onSuccess: async (data, { eSimItem }) => {
      if (data.esimId) {
        await SecureStore.setItemAsync(ESIM_ID_KEY, data.esimId);
      }
      if (kokio.deviceUID) {
        await savePurchasedESIM(kokio.deviceUID, eSimItem, data);
      }
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCreateTopupOrder() {
  const queryClient = useQueryClient();
  const { kokio, savePurchasedESIM } = useKokio();

  return useMutation<OrderStatusResponse, Error, CreateTopupOrderVariables>({
    mutationFn: ({ request }) => createAndPoll(request as CreateOrderRequest).then(r => r.order),

    onSuccess: async (data, { eSimItem }) => {
      if (data.esimId) {
        await SecureStore.setItemAsync(ESIM_ID_KEY, data.esimId);
      }
      if (kokio.deviceUID) {
        await savePurchasedESIM(kokio.deviceUID, eSimItem, data);
      }
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
