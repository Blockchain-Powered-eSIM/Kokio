import { ReactNode, createContext, useEffect, useReducer } from "react";
import {
  isSupported,
  PasskeyStamper,
} from "@turnkey/react-native-passkey-stamper";
import { TurnkeyClient } from "@turnkey/sdk-react-native";
import { LoginMethod } from "@/utils/types";
import {
  PASSKEY_CONFIG,
  TURNKEY_API_URL,
  TURNKEY_PARENT_ORG_ID,
} from "@/constants/passkey.constants";
import { useTurnkey, User } from "@turnkey/sdk-react-native";
import { decodeAttestationObj, onPasskeyCreate } from "@/utils/passkey";
import { decodeAttestationObject } from "@simplewebauthn/server/helpers";

import { useRouter } from "expo-router";
import { createSubOrganization, handleInitEmailOtpAuth, handleOtpAuth } from "@/utils/api";
import { kokioAuthClient } from "@/utils/auth/kokioAuthClient";
import { useAuthStore } from "@/stores/authStore";
import { base64UrlToBuffer } from "@/helpers/converters";
import { toHex } from "@/helpers/iso/isoUint8Array";

type AuthActionType =
  | { type: "PASSKEY"; payload: User | undefined }
  | { type: "INIT_EMAIL_AUTH" }
  | { type: "COMPLETE_EMAIL_AUTH"; payload: User | undefined }
  | { type: "LOADING"; payload: LoginMethod | null }
  | { type: "ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "AUTHENTICATE"; payload: boolean }
  | { type: "REAUTHENTICATE" };
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

function authReducer(state: AuthState, action: AuthActionType): AuthState {
  switch (action.type) {
    case "LOADING":
      return { ...state, loading: action.payload ? action.payload : null };
    case "ERROR":
      return { ...state, error: action.payload, loading: null };
    case "CLEAR_ERROR":
      return { ...state, error: "" };
    case "INIT_EMAIL_AUTH":
      return { ...state, loading: null, error: "" };
    case "COMPLETE_EMAIL_AUTH":
      return { ...state, authenticated: true };
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

export interface AuthRelayProviderType {
  state: AuthState;
  initEmailLogin: (email: string) => Promise<void>;
  completeEmailAuth: (params: {
    otpId: string;
    otpCode: string;
    organizationId: string;
  }) => Promise<void>;
  signUpWithPasskey: (user: { username?: string; email?: string }) => Promise<
    | {
        authenticatorParams: {
          attestation: {
            clientDataJson: string;
            attestationObject: string;
            credentialId: string;
          };
        };
        decodedAttestationObject:
          | {
              decodedAttestationObjectCbor:
                | {
                    x: string;
                    y: string;
                    credentialId: string;
                  }
                | undefined;
              decodedAttestationObjectSimpleWebAuthnHex: string;
            }
          | undefined;
        user: User | undefined;
        deviceUID: string;
      }
    | undefined
    | null
  >;
  loginWithPasskey: () => Promise<void>;
  reauthenticate: () => void;
  authenticate: () => Promise<void>;
  clearError: () => void;
  logout: () => Promise<void>;
}

export const AuthRelayContext = createContext<AuthRelayProviderType>({
  state: initialState,
  initEmailLogin: async () => Promise.resolve(),
  completeEmailAuth: async () => Promise.resolve(),
  signUpWithPasskey: async () =>
    Promise.resolve({
      authenticatorParams: {
        attestation: {
          clientDataJson: "",
          attestationObject: "",
          credentialId: "",
        },
      },
      decodedAttestationObject: {
        decodedAttestationObjectCbor: {
          x: "",
          y: "",
          credentialId: "",
        },
        decodedAttestationObjectSimpleWebAuthnHex: "",
      },
      user: undefined,
      deviceUID: "",
    }),
  loginWithPasskey: async () => Promise.resolve(),
  reauthenticate: () => {},
  authenticate: async () => Promise.resolve(),
  clearError: () => {},
  logout: async () => Promise.resolve(),
});

interface AuthRelayProviderProps {
  children: ReactNode;
}

export const AuthRelayProvider: React.FC<AuthRelayProviderProps> = ({
  children,
}) => {
  const now = new Date().getTime();

  const [state, dispatch] = useReducer(authReducer, initialState);
  const { session, createEmbeddedKey, createSessionFromEmbeddedKey, createSession, clearSession } =
    useTurnkey();
  const router = useRouter();

  useEffect(() => {
    if (session && session.expiry < now) {
      console.log("Session expired");
      clearSession();
      reauthenticate();
    }
  }, [session]);

  const initEmailLogin = async (email: string) => {
    dispatch({ type: "LOADING", payload: LoginMethod.Email });
    try {
      const response = await handleInitEmailOtpAuth({
        email,
      });

      console.log(await response?.result.otpId);

      if (response) {
        dispatch({ type: "INIT_EMAIL_AUTH" });
        router.setParams({
          otpId: response.result.otpId,
          organizationId: response.organizationId,
        });
        router.push({
          pathname: "/otp-modal",
          params: {
            otpId: response.result.otpId,
            organizationId: response.organizationId,
          },
        });
      }
    } catch (error: any) {
      dispatch({ type: "ERROR", payload: error.message });
    } finally {
      dispatch({ type: "LOADING", payload: null });
    }
  };

  const completeEmailAuth = async ({
    otpId,
    otpCode,
    organizationId,
  }: {
    otpId: string;
    otpCode: string;
    organizationId: string;
  }) => {
    if (otpCode) {
      dispatch({ type: "LOADING", payload: LoginMethod.Email });
      try {
        const targetPublicKey = await createEmbeddedKey();

        const response = await handleOtpAuth({
          otpId: otpId,
          otpCode: otpCode,
          organizationId: organizationId,
          targetPublicKey,
          invalidateExisting: true,
          expirationSeconds: "600",
        });

        if (response?.activity.result.otpAuthResult?.credentialBundle) {
          const session = await createSession({
            bundle: response?.activity.result.otpAuthResult?.credentialBundle,
            expirationSeconds: 3600,
          });
          dispatch({
            type: "COMPLETE_EMAIL_AUTH",
            payload: session.user,
          });
        }
      } catch (error: any) {
        dispatch({ type: "ERROR", payload: error.message });
      } finally {
        dispatch({ type: "LOADING", payload: null });
      }
    }
  };

  // User will be prompted twice for passkey, once for account creation and once for login
  const signUpWithPasskey = async (user: {
    username?: string;
    email?: string;
  }) => {
    if (!isSupported()) {
      throw new Error("Passkeys are not supported on this device");
    }

    dispatch({ type: "LOADING", payload: LoginMethod.Passkey });

    try {
      const data = await onPasskeyCreate(user);

      if (!data) {
        throw new Error("Failed to create passkey");
      }

      console.log("passkey registration succeeded: ", data.authenticatorParams);

      if (data.authenticatorParams) {
        const authenticatorParams = data.authenticatorParams;
        // Successfully created sub-organization, proceed with the login flow

        const targetPublicKey = await createEmbeddedKey({ isCompressed: true });

        const userInfo = {
          userId: data.deviceUID,
          email: user.email ?? ""
        };
        const passkey = {
          challenge: authenticatorParams.challenge,
          attestation: authenticatorParams.attestation,
        };
        const apiKeys = [{
            apiKeyName: "Passkey API Key",
            publicKey: targetPublicKey,
            curveType: "API_KEY_CURVE_P256",
        }];
        const response = await createSubOrganization(
          userInfo, passkey, apiKeys
        );

        const decodedAttestationObjectCbor = await decodeAttestationObj({
          rawId: authenticatorParams.attestation.credentialId,
          response: {
            clientDataJson: authenticatorParams.attestation.clientDataJson,
            attestationObject:
              authenticatorParams.attestation.attestationObject,
          },
        });
        const decodedAttestationObjSimpleWebAuthn = await decodeAttestationObject(
          base64UrlToBuffer(
            authenticatorParams.attestation.attestationObject
          )
        );

        console.log(
          "decoded attestation object cbor: ",
          decodedAttestationObjectCbor
        );
        console.log(
          "decoded attestation object simpleWebAuthn: ",
          toHex(decodedAttestationObjSimpleWebAuthn.get("authData"))
        );

        const subOrganizationId = response.subOrganizationId;

        if(subOrganizationId) {
          const session = await createSessionFromEmbeddedKey({ 
            subOrganizationId,
            expirationSeconds: 3600
          });
          
          dispatch({
            type: "PASSKEY",
            payload: session.user,
          });

          return {
            authenticatorParams: authenticatorParams,
            decodedAttestationObject: {
              decodedAttestationObjectCbor,
              decodedAttestationObjectSimpleWebAuthnHex: toHex(
                decodedAttestationObjSimpleWebAuthn.get("authData")
              ),
            },
            user: session?.user,
            deviceUID: data.deviceUID,
          };
        }
      }
    } catch (error: any) {
      dispatch({ type: "ERROR", payload: error.message });
      return null;
    } finally {
      dispatch({ type: "LOADING", payload: null });
    }
  };

  const loginWithPasskey = async () => {
    if (!isSupported()) {
      throw new Error("Passkeys are not supported on this device");
    }

    dispatch({ type: "LOADING", payload: LoginMethod.Passkey });

    try {
      const stamper = new PasskeyStamper({
        rpId: PASSKEY_CONFIG.RP_ID,
      });

      const httpClient = new TurnkeyClient(
        { baseUrl: TURNKEY_API_URL },
        stamper
      );

      const targetPublicKey = await createEmbeddedKey();

      const sessionResponse = await httpClient.createReadWriteSession({
        type: "ACTIVITY_TYPE_CREATE_READ_WRITE_SESSION_V2",
        timestampMs: Date.now().toString(),
        organizationId: TURNKEY_PARENT_ORG_ID,
        parameters: {
          targetPublicKey,
        },
      });

      console.log("Session response", sessionResponse);

      const credentialBundle =
        sessionResponse.activity.result.createReadWriteSessionResultV2
          ?.credentialBundle;

      console.log(credentialBundle);

      if (credentialBundle) {
        const session = await createSession({
          bundle: credentialBundle,
          expirationSeconds: 3600,
        });
        dispatch({
          type: "PASSKEY",
          payload: session.user,
        });
      }
    } catch (error: any) {
      dispatch({ type: "ERROR", payload: error.message });
    } finally {
      dispatch({ type: "LOADING", payload: null });
    }
  };

  const reauthenticate = async () => {
    dispatch({ type: "REAUTHENTICATE" });
  };

  const authenticate = async () => {
    if (!isSupported()) {
      throw new Error("Passkeys are not supported on this device");
    }

    dispatch({ type: "LOADING", payload: LoginMethod.Passkey });

    try {
      const stamper = new PasskeyStamper({
        rpId: PASSKEY_CONFIG.RP_ID,
      });

      const httpClient = new TurnkeyClient(
        { baseUrl: TURNKEY_API_URL },
        stamper
      );

      const stamp = await stamper.stamp("AUTHENTICATE");

      if (stamp) {
        dispatch({
          type: "AUTHENTICATE",
          payload: true,
        });
      }
    } catch (error: any) {
      dispatch({ type: "ERROR", payload: error.message });
    } finally {
      dispatch({ type: "LOADING", payload: null });
    }
  };

  const logout = async () => {
    // Revoke the refresh token server-side (RFC 7009: server always returns 200,
    // and we must clear locally regardless of network or server errors).
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.refresh_token) {
      try {
        await kokioAuthClient.revokeToken({
          token: tokens.refresh_token,
          token_type_hint: "refresh_token",
        });
      } catch {
        // Proceed unconditionally — revocation is best-effort.
      }
    }

    // Wipe the local token store (kokio.auth.tokens from SecureStore).
    await useAuthStore.getState().clearTokens();

    // Clear the Turnkey session and reset auth state.
    clearSession();
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
        initEmailLogin,
        completeEmailAuth,
        signUpWithPasskey,
        loginWithPasskey,
        reauthenticate,
        authenticate,
        clearError,
        logout,
      }}
    >
      {children}
    </AuthRelayContext.Provider>
  );
};
