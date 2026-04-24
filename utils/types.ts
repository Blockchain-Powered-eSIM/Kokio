export enum LoginMethod {
  Passkey = "PASSKEY",
}

// @deprecate
// import { type TurnkeyApiTypes } from "@turnkey/sdk-server";
// import { type Hex } from "viem";

// export enum HashFunction {
//   NoOp = "HASH_FUNCTION_NO_OP",
//   SHA256 = "HASH_FUNCTION_SHA256",
//   KECCAK256 = "HASH_FUNCTION_KECCAK256",
//   NotApplicable = "HASH_FUNCTION_NOT_APPLICABLE",
// }

// export enum PayloadEncoding {
//   Hexadecimal = "PAYLOAD_ENCODING_HEXADECIMAL",
//   TextUTF8 = "PAYLOAD_ENCODING_TEXT_UTF8",
// }

// export enum Authenticator {
//   APIKey = "API_KEY",
//   Passkey = "PASSKEY",
// }

// export type KeyPair = {
//   privateKey: Hex;
//   publicKey: Hex;
// };

// export type SignRawPayloadResult =
//   | {
//     r: string;
//     s: string;
//     v: string;
//   }
//   | undefined;

// export type Email = `${string}@${string}.${string}`;

// export type User = {
//   id: string;
//   userName?: string;
//   email?: string;
//   phoneNumber?: string;
//   organizationId: string;
//   wallets: Wallet[];
// };

// export type Wallet = {
//   name: string;
//   id: string;
//   accounts: `0x${string}`[];
// };

// export type Attestation = TurnkeyApiTypes["v1Attestation"];
// export type WalletAccountParams = TurnkeyApiTypes["v1WalletAccountParams"];

// export type GetSubOrgIdParams = {
//   filterType: "NAME" | "USERNAME" | "EMAIL" | "CREDENTIAL_ID" | "PUBLIC_KEY";
//   filterValue: string;
// };

// export type CreateSubOrgParams = {
//   email?: Email;
//   phone?: string;
//   passkey?: {
//     name?: string;
//     challenge: string;
//     attestation: Attestation;
//   };
//   oauth?: OAuthProviderParams;
// };

// export type GetWhoamiParams = {
//   organizationId: string;
// };

// export type OAuthProviderParams = {
//   providerName: string;
//   oidcToken: string;
// };

// export type MethodParamsMap = {
//   getSubOrgId: GetSubOrgIdParams;
//   createSubOrg: CreateSubOrgParams;
//   getWhoami: GetWhoamiParams;
// };

// export type MethodName = keyof MethodParamsMap;

// export type ParamsType<M extends MethodName> = MethodParamsMap[M];

// export type JSONRPCRequest<M extends MethodName> = {
//   method: M;
//   params: ParamsType<M>;
// };

// export type PasskeyT = {
//   challenge: string,
//   attestation: {
//     credentialId: string;
//     clientDataJson: string;
//     attestationObject: string;
//     transports: (
//       "AUTHENTICATOR_TRANSPORT_BLE" |
//       "AUTHENTICATOR_TRANSPORT_INTERNAL" |
//       "AUTHENTICATOR_TRANSPORT_NFC" |
//       "AUTHENTICATOR_TRANSPORT_USB" |
//       "AUTHENTICATOR_TRANSPORT_HYBRID"
//     )[];
//   }
// }

// export type APIKeysT = {
//   apiKeyName: string;
//   publicKey: string;
//   curveType: string;
// }[]
