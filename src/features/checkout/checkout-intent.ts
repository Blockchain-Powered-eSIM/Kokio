// Carries a one-shot checkout preference across the Wallet tab -> Shop ->
// Checkout navigation chain, which doesn't thread route params through every
// intermediate screen. Set when the user taps a "pay with the Kokio wallet"
// entry point elsewhere in the app; Checkout consumes (and clears) it once.
let preferredPaymentMethod: string | null = null;

export function setPreferredCheckoutPaymentMethod(method: string): void {
  preferredPaymentMethod = method;
}

export function consumePreferredCheckoutPaymentMethod(): string | null {
  const value = preferredPaymentMethod;
  preferredPaymentMethod = null;
  return value;
}
