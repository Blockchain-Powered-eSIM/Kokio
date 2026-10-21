import { useCallback, useEffect, useState } from 'react';

import { previewOrder } from '@/utils/bff/order';
import type { CreateOrderRequest, OrderPricing } from '@/utils/bff/order';

const PREVIEW_DEBOUNCE_MS = 500;

type PreviewResult = { id: string; pricing?: OrderPricing; error?: unknown };

export function useOrderPreview(request: CreateOrderRequest | null) {
  const key = request ? JSON.stringify(request) : null;
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<PreviewResult | null>(null);

  useEffect(() => {
    if (!key) return;
    const id = `${nonce}:${key}`;
    let cancelled = false;
    const timer = setTimeout(() => {
      previewOrder(JSON.parse(key) as CreateOrderRequest)
        .then((pricing) => { if (!cancelled) setResult({ id, pricing }); })
        .catch((error) => { if (!cancelled) setResult({ id, error }); });
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const current = key && result?.id === `${nonce}:${key}` ? result : null;

  return {
    pricing:   current?.pricing,
    error:     current?.error,
    isLoading: !!key && !current,
    refresh,
  };
}
