// @deprecate
// import { PASSKEY_CONFIG } from "@/constants/passkey.constants";
// const TURNKEY_API_URL = "https://api.turnkey.com"; // retained for stampGetWhoami (test utility only)
// import { PasskeyStamper } from "@turnkey/react-native-passkey-stamper";
// import { TurnkeyClient } from "@turnkey/sdk-react-native";
// import {
//   base64UrlToBuffer,
//   parseDEREncodedSignature,
// } from "@/helpers/converters";
// import Constants from "expo-constants";
// import { AppExtraConfig } from "@/appKeys";
// import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";

// import { toHex, http, createWalletClient, Account, WalletClient } from "viem";
// import { baseSepolia } from "viem/chains";
// import { createAccount } from "@turnkey/viem";
// import { User } from "@turnkey/sdk-react-native";

// const extra = Constants.expoConfig?.extra as AppExtraConfig;

// export const returnViemWalletClient = async (
//   user: User,
//   client: TurnkeyClient,
//   smartAccountAddress: string
// ): Promise<WalletClient> => {
//   console.log("user wallet address", smartAccountAddress);

//   const viemAccount = await createAccount({
//     //@ts-ignore-line
//     client,
//     organizationId: user.organizationId,
//     signWith: user.wallets[0].accounts[0].address,
//     ethereumAddress: user.wallets[0].accounts[0].address,
//   });

//   const viemClient = createWalletClient({
//     account: viemAccount as Account,
//     chain: baseSepolia,
//     transport: http(
//       `https://base-sepolia.g.alchemy.com/v2/${extra.alchemyApiKey}`
//     ),
//   });

//   console.log("viemClient", viemClient.account.address);

//   return viemClient;
// };

// export const stampGetWhoami = async (organizationId: string) => {
//   const stamper = new PasskeyStamper({
//     rpId: PASSKEY_CONFIG.RP_ID,
//   });
//   const client = new TurnkeyClient({ baseUrl: TURNKEY_API_URL }, stamper);

//   const signedRequest = await client.stampGetWhoami({
//     organizationId,
//   });

//   console.log("signedRequest", signedRequest);

//   const { url, body, stamp } = signedRequest;

//   const clientDataJson = JSON.parse(stamp.stampHeaderValue).clientDataJson;
//   const signature = JSON.parse(stamp.stampHeaderValue).signature;
//   const sigBytes = base64UrlToBuffer(signature);
//   const { r, s } = parseDEREncodedSignature(sigBytes);
//   const decodedClientDataJson = decodeClientDataJSON(clientDataJson);
//   console.log("decodedClientDataJSON:", decodedClientDataJson);
//   console.log("r:", r);
//   console.log("s:", s);

//   const resp = await fetch(url, {
//     method: "POST",
//     body,
//     headers: {
//       [stamp.stampHeaderName]: stamp.stampHeaderValue,
//     },
//   });

//   console.log("response from validation", await resp.json());

//   return resp.json();
// };
