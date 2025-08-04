import {
  isSupported,
  createPasskey,
  PasskeyStamper,
  TurnkeyAuthenticatorParams,
} from "@turnkey/react-native-passkey-stamper";
import { TurnkeyClient } from "@turnkey/http";
import { v4 as uuid } from "uuid";
import {
  base64UrlToBuffer,
  parseDEREncodedSignature,
} from "@/helpers/converters";
// Simple implementation of decodeClientDataJSON for React Native
const decodeClientDataJSON = (clientDataJson: string) => {
  try {
    const decoded = JSON.parse(clientDataJson);
    return {
      type: decoded.type,
      challenge: decoded.challenge,
      origin: decoded.origin,
      crossOrigin: decoded.crossOrigin,
    };
  } catch (error) {
    console.error("Error decoding client data JSON:", error);
    return null;
  }
};

import { decode } from "cbor";
import { Buffer } from "buffer";
import { parseAuthenticatorData } from "@/helpers/parseAuthenticatorData";
import { toHex, http, createWalletClient, Account, WalletClient } from "viem";
import { optimismSepolia } from "viem/chains";
import { createAccount } from "@turnkey/viem";
import { User } from "@turnkey/sdk-react-native";
import { checkIfEmailInUse, createSubOrganization } from "./api";
import { PASSKEY_CONFIG, TURNKEY_API_URL } from "@/constants/passkey.constants";

/**
 * Decodes the attestation object and extracts public key data
 * @param json - JSON object containing the attestation data
 * @returns object containing x and y coordinates of the public key
 * @throws error if decoding fails
 * @throws error if no json is provided
 */
export async function decodeAttestationObj(cred: {
  rawId: string;
  response: {
    clientDataJson: string;
    attestationObject: string;
  };
}): Promise<
  | {
      x: string;
      y: string;
      credentialId: string;
    }
  | undefined
> {
  if (!cred) {
    console.error("No json provided");
    return { x: "", y: "", credentialId: "" };
  }
  try {
    console.log("creation json -", cred);

    if (cred?.rawId) console.log("Credentials id:", cred.rawId);
    if (cred?.response) console.log(cred.response);
    const attestationObject = Buffer.from(
      cred.response.attestationObject,
      "base64"
    );
    const decodedAttestationObj = decode(attestationObject);
    let authDataBuffer = decodedAttestationObj.authData;
    if (Buffer.isBuffer(authDataBuffer)) {
      authDataBuffer = authDataBuffer.buffer.slice(
        authDataBuffer.byteOffset,
        authDataBuffer.byteOffset + authDataBuffer.byteLength
      );
    }
    const authDataUint8Array = new Uint8Array(decodedAttestationObj.authData); // Safe conversion
    const authData = parseAuthenticatorData(authDataUint8Array);
    const publicKey = decode(Buffer.from(authData.credentialPublicKey!.buffer));
    const x = toHex(publicKey.get(-2));
    const y = toHex(publicKey.get(-3));
    console.log("Public Key X from attestationObject:", x);
    console.log("Public Key Y from attestationObject:", y);
    return { x, y, credentialId: cred.rawId };
  } catch (e) {
    console.error("create error", e);
  }
}

export async function onPasskeyCreate(user: {
  username: string;
  email?: string;
}): Promise<
  | {
      authenticatorParams: TurnkeyAuthenticatorParams;
      subOrgCreationResponse: any;
    }
  | undefined
> {
  if (!isSupported()) {
    alert("Passkeys are not supported on this device");
  }

  // Check if user already exists with the same email only if email was provided by the user
  if (user.email) {
    const inUse = await checkIfEmailInUse({ email: user.email });
    if (inUse) {
      console.log("User with this email already exists", user.email);
      return;
    }
  }

  try {
    // ID isn't visible by users, but needs to be random enough and valid base64 (for Android)
    const userId = uuid();

    const authenticatorParams = await createPasskey({
      // Use hardcoded passkey name as specified in requirements
      authenticatorName: "KOKIO_PASSKEY",
      rp: {
        id: PASSKEY_CONFIG.RP_ID,
        name: PASSKEY_CONFIG.RP_NAME,
      },
      user: {
        id: userId,
        name: user.username,
        // if we make the email optional the passkey authenticator will not have the email as the displayName and this cannot be changed later on
        displayName: user.email ?? user.username,
      },
      authenticatorSelection: {
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "preferred",
      },
    });

    const response = await createSubOrganization(authenticatorParams, user);
    if (!response) return;
    console.log("created sub-org", response);
    return { authenticatorParams, subOrgCreationResponse: response };
  } catch (e) {
    console.error("error during passkey creation", e);
  }
}

export const returnViemWalletClient = async (
  user: User,
  client: TurnkeyClient
): Promise<WalletClient> => {
  console.log("user wallet address", user.wallets[0].accounts[0].address);
  const viemAccount = await createAccount({
    client: client as any,
    organizationId: user.organizationId,
    signWith: user.wallets[0].accounts[0].address,
    ethereumAddress: user.wallets[0].accounts[0].address,
  });

  const viemClient = createWalletClient({
    account: viemAccount as Account,
    chain: optimismSepolia,
    transport: http(
      `https://opt-sepolia.g.alchemy.com/v2/${process.env.EXPO_PUBLIC_ALCHEMY_API_KEY}`
    ),
  });

  console.log("viemClient", viemClient.account.address);

  return viemClient;
};

// this is the way to send transactions and signed requests for validation
export const stampGetWhoami = async (organizationId: string) => {
  const stamper = new PasskeyStamper({
    rpId: PASSKEY_CONFIG.RP_ID,
  });
  const client = new TurnkeyClient({ baseUrl: TURNKEY_API_URL }, stamper);

  // we can do client.stampSignTransaction
  const signedRequest = await client.stampGetWhoami({
    organizationId,
  });

  console.log("signedRequest", signedRequest);

  const { url, body, stamp } = signedRequest;

  const clientDataJson = JSON.parse(stamp.stampHeaderValue).clientDataJson;
  const signature = JSON.parse(stamp.stampHeaderValue).signature;
  const sigBytes = base64UrlToBuffer(signature);
  const { r, s } = parseDEREncodedSignature(sigBytes);
  const decodedClientDataJson = decodeClientDataJSON(clientDataJson);
  console.log("decodedClientDataJSON:", decodedClientDataJson);
  console.log("r:", r);
  console.log("s:", s);

  // Forward the signed request to the Turnkey API for validation
  const resp = await fetch(url, {
    method: "POST",
    body,
    headers: {
      [stamp.stampHeaderName]: stamp.stampHeaderValue,
    },
  });

  console.log("response from validation", await resp.json());

  return resp.json();
};
