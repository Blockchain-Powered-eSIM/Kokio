import type { Kokio } from "kokio-sdk";
import { pollOrderStatus, submitPaymentHash } from "@/lib/api/bff/order";
import type { OrderStatusResponse, PollUpdate } from "@/lib/api/bff/order";
import { logger } from "@/lib/logger";

// How long to wait for the chain webhook to confirm a device-wallet payment
// before submitting the signed hash ourselves as a recovery fallback.
const DEVICE_WALLET_PAYMENT_SUBMISSION_DELAY_MS = 25000;

// Longer than the default poll budget (30s, tuned for Stripe/MoonPay's
// near-instant webhooks): a device-wallet payment's confirmation depends on
// the chain webhook's own wait for `safe` L1 finality, which real-device
// testing showed can run past 30s even when the payment actually succeeded.
const DEVICE_WALLET_PAYMENT_POLL_MAX_DURATION_MS = 120000;

// GET /order/{idempotencyKey} shares a 20 requests per minute per-device
// limit (per deviceWalletAddress) with /esim, /order/list, /coupon/{code},
// and /order/preview. A device-wallet payment's confirmation depends on the
// chain webhook's `safe` L1 finality, which takes 30s+. Polling faster
// wouldn't surface the status sooner; 8s (7.5 req/min) leaves headroom for
// concurrent traffic.
const DEVICE_WALLET_PAYMENT_POLL_INTERVAL_MS = 8000;

/**
 * Sends the order's payment calls from the device wallet and waits until they
 * are mined. Returns the user operation hash; throws if the calls reverted.
 */
export async function sendDeviceWalletPayment(
  deviceWallet: NonNullable<Kokio["deviceWallet"]>,
  smartAccountClient: NonNullable<Kokio["smartAccountClient"]>,
  userOperations: { to: string; data: string }[],
): Promise<`0x${string}`> {
  // Fires the passkey/biometric prompt. Resolves with the user operation
  // hash, NOT a receipt - the payment is not confirmed on-chain yet. The
  // calls are bundled as one user operation, in order (e.g. an approval
  // followed by the actual payment call).
  const hash = await deviceWallet.sendUserOperation(
    userOperations.map((op) => ({ to: op.to as `0x${string}`, data: op.data as `0x${string}` })),
  );

  const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash });

  // A user operation whose calls REVERT still gets mined and still
  // returns a receipt - a resolved promise here is not proof the
  // payment went through.
  if (!receipt.success) {
    throw new Error('Payment reverted on-chain');
  }
  return hash;
}

/**
 * Polls until the backend confirms the order paid by `hash`. Resolves with
 * null if it does not settle in time.
 */
export async function waitForDeviceWalletOrder(
  correlationId: string,
  hash: `0x${string}`,
  onUpdate: (update: PollUpdate) => void,
): Promise<OrderStatusResponse | null> {
  // The chain webhook confirms this order independently of anything the
  // client does; submitting the hash early would only add a wasted call
  // on the common case where the webhook lands first. Submit it once,
  // only if the webhook still hasn't confirmed after a reasonable wait.
  const fallbackTimer = setTimeout(() => {
    submitPaymentHash(correlationId, hash).catch((err) => {
      logger.error('DEVICE_WALLET_PAYMENT_SUBMISSION_FAILED', { err });
    });
  }, DEVICE_WALLET_PAYMENT_SUBMISSION_DELAY_MS);

  const finalOrder = await pollOrderStatus(correlationId, {
    onUpdate,
    maxDurationMs: DEVICE_WALLET_PAYMENT_POLL_MAX_DURATION_MS,
    intervalMs: DEVICE_WALLET_PAYMENT_POLL_INTERVAL_MS,
  }).catch(() => null);
  clearTimeout(fallbackTimer);
  return finalOrder;
}
