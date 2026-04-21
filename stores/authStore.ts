import { create } from 'zustand';
import {
  saveTokens,
  loadTokens,
  clearTokens as persistClear,
  parseIdToken,
  type TokenBundle,
  type IdTokenClaims,
} from '@/utils/auth/tokenStore';

// ─── Store shape ──────────────────────────────────────────────────────────────

type AuthStoreState = {
  tokens: TokenBundle | null;
  setTokens: (bundle: TokenBundle) => Promise<void>;
  loadPersistedTokens: () => Promise<void>;
  clearTokens: () => Promise<void>;
};

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStoreState>((set) => ({
  tokens: null,

  setTokens: async (bundle) => {
    await saveTokens(bundle);
    set({ tokens: bundle });
  },

  loadPersistedTokens: async () => {
    const bundle = await loadTokens();
    set({ tokens: bundle });
  },

  clearTokens: async () => {
    await persistClear();
    set({ tokens: null });
  },
}));

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Reactive selector — re-renders when the token bundle changes. */
export function useTokens(): TokenBundle | null {
  return useAuthStore((s) => s.tokens);
}

/**
 * Decodes the id_token without signature verification and returns
 * `sub` and `auth_time` for display purposes.
 */
export function useIdTokenClaims(): IdTokenClaims {
  const idToken = useAuthStore((s) => s.tokens?.id_token);
  if (!idToken) return {};
  return parseIdToken(idToken);
}
