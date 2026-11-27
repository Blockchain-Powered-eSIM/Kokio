import { useCallback, useEffect, useRef } from "react";
import { usePayWithCrypto } from "@heliofi/checkout-react-native";
import type { PaymentCallback } from "@heliofi/checkout-react-native";
import { pollOrderStatus } from "@/lib/api/bff/order";
import type { OrderStatusResponse } from "@/lib/api/bff/order";
import { pollingLabel } from "@/features/orders/order-status";
import { logger } from "@/lib/logger";

// SDK "as is" pattern per Helio docs. Must render inside MoonpayCommerceProvider.
// Triggers the SDK's built-in wallet selector on mount and owns nothing except
// the BFF confirmation step after the SDK fires onSuccess.
export const ExternalWalletCheckout = ({
  correlationId,
  setIsCheckoutLoading,
  setLoadingMessage,
  onComplete,
  onSdkDismiss,
}: {
  correlationId: string | null;
  setIsCheckoutLoading: (v: boolean) => void;
  setLoadingMessage: (msg: string) => void;
  onComplete: (order: OrderStatusResponse | null) => void;
  onSdkDismiss: () => void;
}) => {
  const successFiredRef = useRef(false);

  const onSuccess = useCallback<PaymentCallback>(
    async (result) => {
      successFiredRef.current = true;
      logger.debug('HELIO_ONSUCCESS', { transactionSignature: result.transactionSignature });
      setIsCheckoutLoading(true);
      setLoadingMessage('Processing your order...');
      const finalOrder = correlationId
        ? await pollOrderStatus(correlationId, {
            onUpdate: (update) =>
              setLoadingMessage(
                update.kind === 'status' ? pollingLabel(update.orderStatus) : 'Retrying...',
              ),
          }).catch(() => null)
        : null;
      onComplete(finalOrder);
    },
    [correlationId, onComplete, setIsCheckoutLoading, setLoadingMessage],
  );

  const { payWithCrypto, drawerVisible } = usePayWithCrypto({ onSuccess });

  useEffect(() => {
    payWithCrypto();
  }, [payWithCrypto]);

  // SDK drawer closed without a confirmed payment → surface browser fallback
  const prevVisibleRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevVisibleRef.current === true && !drawerVisible && !successFiredRef.current) {
      onSdkDismiss();
    }
    prevVisibleRef.current = drawerVisible;
  }, [drawerVisible, onSdkDismiss]);

  return null;
};
