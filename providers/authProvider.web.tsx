import { ReactNode, createContext, useMemo, useState } from "react";

export interface AuthRelayProviderType {
  state: {
    authenticated: boolean;
    loading: string | null;
    error: string;
  };
  signUpWithPasskey: (user: {
    username?: string;
    email?: string;
  }) => Promise<null>;
  loginWithPasskey: () => Promise<boolean>;
  reauthenticate: () => void;
  clearError: () => void;
  logout: () => Promise<void>;
  stepUpVisible: boolean;
  stepUpHint: null;
  stepUpError: string;
  stepUp: () => Promise<void>;
  dismissStepUp: () => void;
}

const defaultValue: AuthRelayProviderType = {
  state: {
    authenticated: false,
    loading: null,
    error: "",
  },
  signUpWithPasskey: async () => null,
  loginWithPasskey: async () => false,
  reauthenticate: () => {},
  clearError: () => {},
  logout: async () => {},
  stepUpVisible: false,
  stepUpHint: null,
  stepUpError: "",
  stepUp: async () => {},
  dismissStepUp: () => {},
};

export const AuthRelayContext =
  createContext<AuthRelayProviderType>(defaultValue);

export function AuthRelayProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(defaultValue.state);

  const value = useMemo<AuthRelayProviderType>(
    () => ({
      ...defaultValue,
      state,
      clearError: () => setState((prev) => ({ ...prev, error: "" })),
      reauthenticate: () =>
        setState((prev) => ({ ...prev, authenticated: false })),
    }),
    [state]
  );

  return (
    <AuthRelayContext.Provider value={value}>
      {children}
    </AuthRelayContext.Provider>
  );
}
