import { ReactNode, createContext, useCallback, useEffect, useReducer, useState } from "react";
import { Passkey } from "react-native-passkey";
import { useRouter } from "expo-router";
import { LoginMethod } from "@/utils/types";
import { kokioAuthClient } from "@/utils/auth/kokioAuthClient";
import { registerPasskey } from "@/utils/auth/passkeyRegister";
import type { RegisterResult } from "@/utils/auth/passkeyRegister";
import { loginWithKokioPasskey } from "@/utils/auth/passkeyLogin";
import { performStepUp } from "@/utils/auth/stepUp";
import { StepUpCancelledError } from "@/utils/auth/errors";
import {
  setStepUpHandler,
  resolveStepUp,
  rejectStepUp,
  clearBffNonceCache,
  type StepUpHint,
} from "@/services/httpService";
import { useAuthStore } from "@/stores/authStore";
import { clearUsedHashes } from "@/utils/orderTracking";

// ─── Error formatting ─────────────────────────────────────────────────────────

function formatError(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'Unknown error';
  const e = error as Record<string, unknown>;
  const code = typeof e.code === 'string' ? e.code : undefined;
  const status = typeof e.httpStatus === 'number' ? e.httpStatus : undefined;
  const msg = typeof e.message === 'string' ? e.message
    : typeof e.userMessage === 'string' ? e.userMessage
    : 'Unknown error';
  if (!code) return msg;
  return status ? `[${code} ${status}] ${msg}` : `[${code}] ${msg}`;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface AuthState {
  authenticated: boolean;
  loading: LoginMethod | null;
  error: string;
}

const initialState: AuthState = {
  authenticated: false,
  loading: null,
  error: "",
};

type AuthActionType =
  | { type: "PASSKEY" }
  | { type: "LOADING"; payload: LoginMethod | null }
  | { type: "ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "AUTHENTICATE"; payload: boolean }
  | { type: "REAUTHENTICATE" };

function authReducer(state: AuthState, action: AuthActionType): AuthState {
  switch (action.type) {
    case "LOADING":
      return { ...state, loading: action.payload ?? null };
    case "ERROR":
      return { ...state, error: action.payload, loading: null };
    case "CLEAR_ERROR":
      return { ...state, error: "" };
    case "PASSKEY":
      return { ...state, authenticated: true };
    case "REAUTHENTICATE":
      return { ...state, authenticated: false };
    case "AUTHENTICATE":
      return { ...state, authenticated: action.payload };
    default:
      return state;
  }
}

// ─── Context type ─────────────────────────────────────────────────────────────

export interface AuthRelayProviderType {
  state: AuthState;
  signUpWithPasskey: (user: {
    username?: string;
    email?: string;
  }) => Promise<RegisterResult | null | undefined>;
  loginWithPasskey: () => Promise<boolean>;
  reauthenticate: () => void;
  clearError: () => void;
  logout: () => Promise<void>;
  // Step-up (AUTH-602)
  stepUpVisible: boolean;
  stepUpHint: StepUpHint | null;
  stepUpError: string;
  stepUp: () => Promise<void>;
  dismissStepUp: () => void;
}

export const AuthRelayContext = createContext<AuthRelayProviderType>({
  state: initialState,
  signUpWithPasskey: async () => null,
  loginWithPasskey: async () => false,
  reauthenticate: () => {},
  clearError: () => {},
  logout: async () => {},
  stepUpVisible: false,
  stepUpHint: null,
  stepUpError: '',
  stepUp: async () => {},
  dismissStepUp: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthRelayProviderProps {
  children: ReactNode;
}

export const AuthRelayProvider: React.FC<AuthRelayProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [stepUpVisible, setStepUpVisible] = useState(false);
  const [stepUpHint, setStepUpHint] = useState<StepUpHint | null>(null);
  const [stepUpError, setStepUpError] = useState('');
  const router = useRouter();

  // Wire httpService step-up handler — fires whenever a BFF request returns
  // 401 STEP_UP_REQUIRED. The modal reads stepUpVisible / stepUpHint.
  useEffect(() => {
    setStepUpHandler((hint: StepUpHint) => {
      setStepUpHint(hint);
      setStepUpVisible(true);
    });
  }, []);

  // Re-auth gate: only drop to unauthenticated when a live session is
  // invalidated (token refresh failure, logout). Loading persisted tokens on
  // cold launch does NOT set authenticated — the user must always pass the
  // biometric prompt on every cold launch.
  useEffect(() => {
    const unsub = useAuthStore.subscribe((next, prev) => {
      if (prev.isAuthenticated && !next.isAuthenticated) {
        dispatch({ type: "AUTHENTICATE", payload: false });
      }
    });
    return unsub;
  }, []);

  const signUpWithPasskey = async (user: {
    username?: string;
    email?: string;
  }) => {
    if (!Passkey.isSupported()) {
      throw new Error("Passkeys are not supported on this device");
    }

    dispatch({ type: "LOADING", payload: LoginMethod.Passkey });

    try {
      const result = await registerPasskey(user.username ?? user.email ?? "Kokio User");

      // Google Password Manager commits the passkey to local storage asynchronously
      // after Passkey.create returns. Calling Passkey.get immediately finds the
      // credential in the cloud but not yet locally, triggering "Choose which device /
      // Use another device" with no local option. A short pause lets the local store
      // catch up before the authentication request.
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      // Pass credentialId so Android skips the full discoverable-credential sweep
      // and targets the just-created credential directly.
      await loginWithKokioPasskey(result.credentialId);

      dispatch({ type: "PASSKEY" });
      return result;
    } catch (error) {
      dispatch({ type: "ERROR", payload: formatError(error) });
      return null;
    } finally {
      dispatch({ type: "LOADING", payload: null });
    }
  };

  const loginWithPasskey = async (): Promise<boolean> => {
    if (!Passkey.isSupported()) {
      throw new Error("Passkeys are not supported on this device");
    }

    dispatch({ type: "LOADING", payload: LoginMethod.Passkey });

    try {
      // Reads deviceWalletAddress from SecureStore (stored at registration).
      // Retries once on AUTH_TIME_RECENCY_VIOLATION (biometric timeout >120s).
      await loginWithKokioPasskey();
      dispatch({ type: "PASSKEY" });
      return true;
    } catch (error) {
      dispatch({ type: "ERROR", payload: formatError(error) });
      return false;
    } finally {
      dispatch({ type: "LOADING", payload: null });
    }
  };

  const reauthenticate = () => {
    dispatch({ type: "REAUTHENTICATE" });
  };

  const logout = async () => {
    // Revoke the refresh token server-side (RFC 7009).
    // Server always returns 200; clear locally regardless of network errors.
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.refresh_token) {
      try {
        await kokioAuthClient.revokeToken({
          token: tokens.refresh_token,
          token_type_hint: "refresh_token",
        });
      } catch {
        // Best-effort revocation — proceed unconditionally.
      }
    }

    await useAuthStore.getState().clearTokens();
    clearBffNonceCache();
    await clearUsedHashes();
    dispatch({ type: "REAUTHENTICATE" });
    router.replace("/");
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const stepUp = useCallback(async () => {
    setStepUpError('');
    try {
      await performStepUp();
      resolveStepUp();
      setStepUpVisible(false);
      setStepUpHint(null);
    } catch (err) {
      setStepUpError(formatError(err));
    }
  }, []);

  const dismissStepUp = useCallback(() => {
    if (__DEV__) console.log('[stepup] stepup.cancelled');
    rejectStepUp(new StepUpCancelledError());
    setStepUpVisible(false);
    setStepUpHint(null);
    setStepUpError('');
  }, []);

  return (
    <AuthRelayContext.Provider
      value={{
        state,
        signUpWithPasskey,
        loginWithPasskey,
        reauthenticate,
        clearError,
        logout,
        stepUpVisible,
        stepUpHint,
        stepUpError,
        stepUp,
        dismissStepUp,
      }}
    >
      {children}
    </AuthRelayContext.Provider>
  );
};
