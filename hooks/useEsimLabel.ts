import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setEsimLabel } from '@/utils/bff/esim';
import { DEVICE_ESIMS_KEY } from '@/hooks/useDeviceEsims';
import { logger } from '@/utils/logger';

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
    },
    onError: (err) => {
      logger.error('ESIM_LABEL_SET_FAILED', { err });
    },
  });
}
