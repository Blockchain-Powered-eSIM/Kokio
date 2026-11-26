import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setEsimLabel } from '@/lib/api/bff/esim';
import { DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY } from '@/lib/query-keys';
import { logger } from '@/lib/logger';

interface SetEsimLabelInput {
  eSimRef: string;
  label:   string;
}

export function useSetEsimLabel() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, SetEsimLabelInput>({
    mutationFn: async ({ eSimRef, label }) => {
      await setEsimLabel(eSimRef, label);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEVICE_ESIMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEVICE_ORDERS_KEY] });
    },
    onError: (err) => {
      logger.error('ESIM_LABEL_SET_FAILED', { err });
    },
  });
}
