import { ReactNode, createContext, useCallback, useEffect, useReducer, useState } from "react";
import { Passkey } from "react-native-passkey";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { LoginMethod } from "@/utils/types";
import { kokioAuthClient } from "@/utils/auth/kokioAuthClient";
import { registerPasskey } from "@/utils/auth/passkeyRegister";
import type { RegisterResult } from "@/utils/auth/passkeyRegister";
import { loginWithKokioPasskey, discoverAndLoginWithPasskey, type DiscoverLoginResult } from "@/utils/auth/passkeyLogin";
import { performStepUp } from "@/utils/auth/stepUp";
import { AuthError, StepUpCancelledError } from "@/utils/auth/errors";
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

const STEP_UP_ERROR_MESSAGES: Record<string, string> = {
  DPOP_PROOF_BINDING_INVALID: 'Authentication failed. Please try again.',
  DPOP_NONCE_REQUIRED:        'Authentication failed. Please try again.',
  STEP_UP_FAILED:             'Verification failed. Please try again.',
  STEP_UP_CANCELLED:          'Action was cancelled.',
  PASSKEY_AUTH_FAILED:        'Biometric authentication failed. Please try again.',
  INVALID_PASSKEY:            'Biometric verification failed. Please try again.',
};

function formatError(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'Something went wrong. Please try again.';
  const e = error as Record<string, unknown>;
  const code = typeof e.code === 'string' ? e.code : undefined;
  if (code && STEP_UP_ERROR_MESSAGES[code]) return STEP_UP_ERROR_MESSAGES[code];
  return typeof e.userMessage === 'string' ? e.userMessage
    : typeof e.message === 'string' ? e.message
    : 'Something went wrong. Please try again.';
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
  loginWithPasskey: () => Promise<'success' | 'no-credential' | 'error'>;
  recoverWithPasskey: () => Promise<DiscoverLoginResult | null>;
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
  loginWithPasskey: async () => 'error' as const,
  recoverWithPasskey: async () => null,
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

      // Persist registration data immediately. If post-registration login fails
      // (Google PM sync delay), the next tap reads these from SecureStore and
      // routes to loginWithPasskey() instead of re-registering.
      await SecureStore.setItemAsync('deviceWalletAddress', result.deviceWalletAddress);
      await SecureStore.setItemAsync('credentialId', result.credentialId);
      await SecureStore.setItemAsync('publicKeyX', result.publicKeyX);
      await SecureStore.setItemAsync('publicKeyY', result.publicKeyY);
      if (result.rawSalt) await SecureStore.setItemAsync('rawSalt', result.rawSalt);
      if (result.deviceUniqueIdentifier) {
        // JSON.stringify to match saveValueForDeviceUID / getValueForDeviceUID format
        await SecureStore.setItemAsync('deviceUID', JSON.stringify(result.deviceUniqueIdentifier));
      }

      // Google Password Manager commits the passkey to the local device index
      // asynchronously after Passkey.create returns. loginWithKokioPasskey uses
      // transports: ['internal'] (device-local only) to avoid showing a credential
      // picker dialog — but the credential won't be locally indexed for ~1s.
      // Wait 1500ms so the first login attempt succeeds silently without dialog.
      await new Promise<void>(resolve => setTimeout(resolve, 1500));

      // Pass credentialId so Android targets the just-created credential directly
      // instead of doing a full discoverable-credential sweep. Pass deviceWalletAddress
      // so loginBegin doesn't have to read SecureStore (setupKokioRegistration hasn't
      // run yet at this point, but we've already pre-saved above).
      // No transports restriction: omitting it lets Google PM find the credential
      // via cloud sync even before local on-device indexing completes.
      try {
        await loginWithKokioPasskey(result.credentialId, result.deviceWalletAddress);
      } catch (loginErr) {
        if (loginErr instanceof AuthError) throw loginErr;
        await new Promise<void>(resolve => setTimeout(resolve, 1500));
        try {
          await loginWithKokioPasskey(result.credentialId, result.deviceWalletAddress);
        } catch (loginErr2) {
          if (loginErr2 instanceof AuthError) throw loginErr2;
          // Still not indexed — wait longer and try once more. Do NOT fall
          // back to discoverAndLoginWithPasskey(): an open credential picker
          // can surface orphaned credentials from prior installs and fail
          // with CREDENTIAL_NOT_FOUND, breaking the whole registration flow.
          await new Promise<void>(resolve => setTimeout(resolve, 2500));
          await loginWithKokioPasskey(result.credentialId, result.deviceWalletAddress);
        }
      }

      dispatch({ type: "PASSKEY" });
      return result;
    } catch (error) {
      dispatch({ type: "ERROR", payload: formatError(error) });
      return null;
    } finally {
      dispatch({ type: "LOADING", payload: null });
    }
  };

  const loginWithPasskey = async (): Promise<'success' | 'no-credential' | 'error'> => {
    if (!Passkey.isSupported()) {
      throw new Error("Passkeys are not supported on this device");
    }

    dispatch({ type: "LOADING", payload: LoginMethod.Passkey });

    try {
      await loginWithKokioPasskey();
      dispatch({ type: "PASSKEY" });
      return 'success';
    } catch (error) {
      const isNoCredentials = (error as Record<string, unknown>)?.error === 'NoCredentials';
      if (!isNoCredentials) {
        dispatch({ type: "ERROR", payload: formatError(error) });
      }
      return isNoCredentials ? 'no-credential' : 'error';
    } finally {
      dispatch({ type: "LOADING", payload: null });
    }
  };

  // Recovers an existing passkey after reinstall (SecureStore wiped but passkey
  // still in Google Password Manager / iCloud Keychain). Returns the result on
  // success so the caller can restore kokio state; returns null on any failure
  // so the caller can fall through to fresh registration.
  const recoverWithPasskey = async (): Promise<DiscoverLoginResult | null> => {
    if (!Passkey.isSupported()) return null;

    dispatch({ type: "LOADING", payload: LoginMethod.Passkey });
    try {
      const result = await discoverAndLoginWithPasskey();
      dispatch({ type: "PASSKEY" });
      return result;
    } catch {
      dispatch({ type: "LOADING", payload: null });
      return null;
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
      if (err instanceof AuthError) {
        // Server-side failure — retrying won't help; drain the queue so parked
        // requests get a definitive rejection rather than hanging indefinitely.
        rejectStepUp(err);
        setStepUpVisible(false);
        setStepUpHint(null);
      }
      // Platform/biometric errors (not AuthError) leave the modal open so the
      // user can retry without losing their queued requests.
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
        recoverWithPasskey,
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
