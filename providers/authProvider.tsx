import { ReactNode, createContext, useEffect, useReducer } from "react";
import { Passkey } from "react-native-passkey";
import { useRouter } from "expo-router";
import { LoginMethod } from "@/utils/types";
import { kokioAuthClient } from "@/utils/auth/kokioAuthClient";
import { registerPasskey } from "@/utils/auth/passkeyRegister";
import { loginWithKokioPasskey } from "@/utils/auth/passkeyLogin";
import { useAuthStore } from "@/stores/authStore";

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
  }) => Promise<{ deviceWalletAddress: string; deviceUniqueIdentifier: string } | null | undefined>;
  loginWithPasskey: () => Promise<void>;
  reauthenticate: () => void;
  clearError: () => void;
  logout: () => Promise<void>;
}

export const AuthRelayContext = createContext<AuthRelayProviderType>({
  state: initialState,
  signUpWithPasskey: async () => null,
  loginWithPasskey: async () => {},
  reauthenticate: () => {},
  clearError: () => {},
  logout: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthRelayProviderProps {
  children: ReactNode;
}

export const AuthRelayProvider: React.FC<AuthRelayProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  // Mirror token-store state → auth state.
  // When the authenticated-fetch wrapper (AUTH-302) exhausts its token refresh
  // and calls clearTokens(), isAuthenticated flips to false. We detect that
  // here and force the user back to the sign-in screen.
  useEffect(() => {
    const unsub = useAuthStore.subscribe((s) => {
      if (!s.isAuthenticated && state.authenticated) {
        dispatch({ type: "REAUTHENTICATE" });
      }
    });
    return unsub;
  }, [state.authenticated]);

  const signUpWithPasskey = async (user: {
    username?: string;
    email?: string;
  }) => {
    if (!Passkey.isSupported()) {
      throw new Error("Passkeys are not supported on this device");
    }

    dispatch({ type: "LOADING", payload: LoginMethod.Passkey });

    try {
      const { deviceWalletAddress, deviceUniqueIdentifier } =
        await registerPasskey(user.username ?? user.email ?? "Kokio User");

      // Immediately log in: register/complete → login/begin → Passkey.get →
      // login/complete → PKCE authorize → token exchange → tokens in authStore
      await loginWithKokioPasskey(deviceWalletAddress);

      dispatch({ type: "PASSKEY" });
      return { deviceWalletAddress, deviceUniqueIdentifier };
    } catch (error: any) {
      dispatch({ type: "ERROR", payload: error.userMessage ?? error.message });
      return null;
    } finally {
      dispatch({ type: "LOADING", payload: null });
    }
  };

  const loginWithPasskey = async () => {
    if (!Passkey.isSupported()) {
      throw new Error("Passkeys are not supported on this device");
    }

    dispatch({ type: "LOADING", payload: LoginMethod.Passkey });

    try {
      // Reads deviceWalletAddress from SecureStore (stored at registration).
      // Retries once on AUTH_TIME_RECENCY_VIOLATION (biometric timeout >120s).
      await loginWithKokioPasskey();
      dispatch({ type: "PASSKEY" });
    } catch (error: any) {
      dispatch({ type: "ERROR", payload: error.userMessage ?? error.message });
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
    dispatch({ type: "REAUTHENTICATE" });
    router.replace("/");
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  return (
    <AuthRelayContext.Provider
      value={{
        state,
        signUpWithPasskey,
        loginWithPasskey,
        reauthenticate,
        clearError,
        logout,
      }}
    >
      {children}
    </AuthRelayContext.Provider>
  );
};
