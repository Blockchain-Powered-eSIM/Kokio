type PaymentSheetResult = {
  error?: {
    code?: string;
    message?: string;
    localizedMessage?: string;
  };
};

export function useStripePaymentSheet() {
  return {
    initPaymentSheet: async (): Promise<PaymentSheetResult> => ({
      error: {
        code: "WEB_UNSUPPORTED",
        message: "Stripe PaymentSheet is not available on web.",
        localizedMessage: "Stripe PaymentSheet is not available on web.",
      },
    }),

    presentPaymentSheet: async (): Promise<PaymentSheetResult> => ({
      error: {
        code: "WEB_UNSUPPORTED",
        message: "Stripe PaymentSheet is not available on web.",
        localizedMessage: "Stripe PaymentSheet is not available on web.",
      },
    }),

    loading: false,
  };
}
