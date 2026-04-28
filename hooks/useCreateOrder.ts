import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

import { createOrder } from '@/utils/bff/order';
import type { CreateOrderRequest, CreateOrderResponse } from '@/utils/bff/order';
import { useKokio } from '@/hooks/useKokio';
import type { Esim } from '@/components/ESIMItem';

export type CreateOrderVariables = {
  request: CreateOrderRequest;
  // Catalogue plan used to build the offline eSIM record in kokio.savePurchasedESIM.
  eSimItem: Esim;
};

export type CreateTopupOrderVariables = {
  request: Omit<CreateOrderRequest, 'isNewESim' | 'eSimId'> & { isNewESim: false; eSimId: string };
  eSimItem: Esim;
};

// SecureStore key for the most recently purchased eSIM wallet address.
// Read by topup flows to pre-populate the eSimId for compatibility checks.
export const ESIM_ID_KEY = 'esimId';

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { kokio, savePurchasedESIM } = useKokio();

  return useMutation<CreateOrderResponse, Error, CreateOrderVariables>({
    mutationFn: ({ request }) => createOrder(request),

    onSuccess: async (data, { eSimItem }) => {
      // 1. Persist esimId for future topup compatibility checks and order creation.
      await SecureStore.setItemAsync(ESIM_ID_KEY, data.esimId);

      // 2. Append to the local purchased-eSIM list for offline access.
      //    savePurchasedESIM reads orderId / iccid / installationDetails via _get,
      //    all of which are present on CreateOrderResponse.
      if (kokio.deviceUID) {
        await savePurchasedESIM(kokio.deviceUID, eSimItem, data);
      }

      // 3. Invalidate any cached order history so it refetches on next access.
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCreateTopupOrder() {
  const queryClient = useQueryClient();
  const { kokio, savePurchasedESIM } = useKokio();

  return useMutation<CreateOrderResponse, Error, CreateTopupOrderVariables>({
    mutationFn: ({ request }) => createOrder(request as CreateOrderRequest),

    onSuccess: async (data, { eSimItem }) => {
      await SecureStore.setItemAsync(ESIM_ID_KEY, data.esimId);
      if (kokio.deviceUID) {
        await savePurchasedESIM(kokio.deviceUID, eSimItem, data);
      }
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
