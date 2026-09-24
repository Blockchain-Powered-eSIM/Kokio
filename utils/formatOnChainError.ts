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
