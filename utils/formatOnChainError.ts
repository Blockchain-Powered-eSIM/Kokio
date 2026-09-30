// SDK/RPC on-chain write errors (viem, bundler, paymaster) are long technical
// dumps, not something to show a user directly. Short errors we throw
// ourselves (e.g. "Top-up access change reverted on-chain") are fine as-is.
const MAX_USER_FACING_ERROR_LENGTH = 120;

export function formatOnChainError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.length <= MAX_USER_FACING_ERROR_LENGTH) {
    return err.message;
  }
  return fallback;
}

// The passkey signer rethrows a plain `{ error, message }` object (NOT an
// Error instance) when the user dismisses the biometric prompt. Also
// defensively covers a standard Error/DOMException-shaped cancellation
// in case the signer changes.
export function isUserCancelledPasskeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { error?: unknown; name?: unknown; message?: unknown };
  const code = typeof candidate.error === 'string' ? candidate.error : typeof candidate.name === 'string' ? candidate.name : '';
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  return /cancel/i.test(code) || /cancel/i.test(message) || /notallowed/i.test(code);
}
