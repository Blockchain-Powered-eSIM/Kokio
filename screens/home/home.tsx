/* eslint-disable import/extensions */

// import { ScrollView } from "react-native";

// import ActiveESIMsScroll from "@/components/home/active-esim-scroll";
// import Wallet from "@/components/home/wallet";
// import Hero from "@/components/home/hero";

// const mockEsims = [
//   {
//     id: "1",
//     country: "Italy",
//     isoCode: "it",
//     duration: 3,
//     data: 1.7,
//     minutes: 52,
//     sms: 27,
//     flagColor: "#008C45",
//   },
//   {
//     id: "2",
//     country: "Greece",
//     isoCode: "gr",
//     duration: 5,
//     data: 3,
//     minutes: 120,
//     sms: 100,
//     flagColor: "#008C45",
//   },
//   {
//     id: "3",
//     country: "France",
//     isoCode: "fr",
//     duration: 20,
//     data: 5.7,
//     minutes: 52,
//     sms: 7,
//     flagColor: "#008C45",
//   },
//   // Add more eSIM objects as needed
// ];

// export default function HomeScreen() {
//   return (
//     <ScrollView>
//       <Hero />
//       <ActiveESIMsScroll esims={mockEsims} />
//       <Wallet />
//     </ScrollView>
//   );
// }

// import {
//   Linking,
//   Platform,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View,
//   Alert,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import * as Application from "expo-application";
// import { Passkey as passkey } from "react-native-passkey";
// import React from "react";
// import { base64 } from "@hexagon/base64";
// import {
//   Base64URLString,
//   PublicKeyCredentialUserEntityJSON,
// } from "@simplewebauthn/typescript-types";
// // import crypto from "crypto";
// import { Hex, toHex } from "viem";
// import { decode, encode } from "cbor2";

// import {
//   parseAuthenticatorData,
//   ParsedAuthenticatorData,
// } from "@/helpers/parseAuthenticatorData";

// // ! taken from https://github.com/MasterKale/SimpleWebAuthn/blob/e02dce6f2f83d8923f3a549f84e0b7b3d44fa3da/packages/browser/src/helpers/bufferToBase64URLString.ts
// /**
//  * Convert the given array buffer into a Base64URL-encoded string. Ideal for converting various
//  * credential response ArrayBuffers to string for sending back to the server as JSON.
//  *
//  * Helper method to compliment `base64URLStringToBuffer`
//  */
// export function bufferToBase64URLString(buffer: ArrayBuffer): string {
//   const bytes = new Uint8Array(buffer);
//   let str = "";

//   for (const charCode of bytes) {
//     str += String.fromCharCode(charCode);
//   }

//   const base64String = btoa(str);

//   return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
// }

// // ! taken from https://github.com/MasterKale/SimpleWebAuthn/blob/e02dce6f2f83d8923f3a549f84e0b7b3d44fa3da/packages/browser/src/helpers/utf8StringToBuffer.ts
// /**
//  * A helper method to convert an arbitrary string sent from the server to an ArrayBuffer the
//  * authenticator will expect.
//  */
// export function utf8StringToBuffer(value: string): ArrayBuffer {
//   // @ts-ignore
//   return new TextEncoder().encode(value);
// }

// /**
//  * Decode a base64url string into its original string
//  */
// export function base64UrlToString(base64urlString: Base64URLString): string {
//   return base64.toString(base64urlString, true);
// }

// const bundleId = Application.applicationId?.split(".").reverse().join(".");
// const rp = {
//   id: bundleId!.replaceAll("_", "-"),
//   name: "ReactNativePasskeys",
// } satisfies PublicKeyCredentialRpEntity;
// console.log(rp);

// // Don't do this in production!
// // Uint8Array.from("random-challenge", (c) => c.charCodeAt(0))
// const challenge = bufferToBase64URLString(
//   utf8StringToBuffer("random-challenge")
// );

// const user = {
//   id: bufferToBase64URLString(utf8StringToBuffer("290283490")),
//   displayName: "username",
//   name: "username",
// } satisfies PublicKeyCredentialUserEntityJSON;

// const authenticatorSelection = {
//   userVerification: "required",
//   residentKey: "required",
// } satisfies AuthenticatorSelectionCriteria;

// export default function App() {
//   const buf = encode(
//     new Map<number, any>([
//       [1, 2],
//       [3, false],
//       [4, { a: "b" }],
//       [1.25, 0x1ffffffffffffffffn],
//       [Date.now(), new Int16Array([-1, 0, 1])],
//     ])
//   );
//   console.log(buf);
//   console.log(decode(buf));

//   const insets = useSafeAreaInsets();

//   const [result, setResult] = React.useState<any>();
//   const [creationResponse, setCreationResponse] = React.useState<
//     NonNullable<Awaited<ReturnType<typeof passkey.create>>>["response"] | null
//   >(null);
//   const [credentialId, setCredentialId] = React.useState("");

//   const createPasskey = async () => {
//     try {
//       const json = await passkey.create({
//         challenge,
//         pubKeyCredParams: [{ alg: -7, type: "public-key" }],
//         rp,
//         user,
//         authenticatorSelection,
//       });

//       console.log("creation json -", json);

//       if (json?.rawId) setCredentialId(json.rawId);
//       if (json?.response) setCreationResponse(json.response);

//       // // https://github.com/passkeys-4337/smart-wallet/blob/main/front/src/libs/web-authn/service/web-authn.ts#L97
//       let cred = json as unknown as {
//         rawId: ArrayBuffer;
//         response: {
//           clientDataJSON: ArrayBuffer;
//           attestationObject: string;
//         };
//       };
//       // // decode attestation object and get public key
//       const decodedAttestationObj: { authData: Uint8Array } = decode(
//         cred.response.attestationObject
//       );

//       const authData: ParsedAuthenticatorData = parseAuthenticatorData(
//         decodedAttestationObj.authData
//       );
//       const publicKey: { [-2]: string; [-3]: string } = decode(
//         authData.credentialPublicKey!
//       );
//       const x = toHex(publicKey[-2]);
//       const y = toHex(publicKey[-3]);
//       const rawId = toHex(new Uint8Array(cred.rawId));
//       console.log(x, y, rawId);

//       setResult(json);
//     } catch (e) {
//       console.error("create error", e);
//     }
//   };

//   const authenticatePasskey = async () => {
//     const json = await passkey.get({
//       rpId: rp.id as string,
//       challenge,
//       ...(credentialId && {
//         allowCredentials: [{ id: credentialId, type: "public-key" }],
//       }),
//     });

//     console.log("authentication json -", json);

//     setResult(json);
//   };

//   const writeBlob = async () => {
//     console.log("user credential id -", credentialId);
//     if (!credentialId) {
//       alert(
//         "No user credential id found - large blob requires a selected credential"
//       );
//       return;
//     }

//     const json = await passkey.get({
//       rpId: rp.id as string,
//       challenge,
//       ...(credentialId && {
//         allowCredentials: [{ id: credentialId, type: "public-key" }],
//       }),
//     });

//     console.log("add blob json -", json);

//     const written = json?.clientExtensionResults?.largeBlob?.written;
//     if (written) Alert.alert("This blob was written to the passkey");

//     setResult(json);
//   };

//   const readBlob = async () => {
//     const json = await passkey.get({
//       rpId: rp.id as string,
//       challenge,
//       // extensions: { largeBlob: { read: true } },
//       ...(credentialId && {
//         allowCredentials: [{ id: credentialId, type: "public-key" }],
//       }),
//     });

//     console.log("read blob json -", json);

//     const blob = json?.clientExtensionResults?.largeBlob?.blob;
//     if (blob)
//       Alert.alert("This passkey has blob", base64UrlToString(blob as any));

//     setResult(json);
//   };

//   return (
//     <View style={{ flex: 1 }}>
//       <ScrollView
//         style={{
//           paddingTop: insets.top,
//           backgroundColor: "#fccefe",
//           paddingBottom: insets.bottom,
//         }}
//         contentContainerStyle={styles.scrollContainer}
//       >
//         <Text style={styles.title}>Testing Passkeys</Text>
//         <Text>Application ID: {Application.applicationId}</Text>
//         <Text>
//           Passkeys are {passkey.isSupported() ? "Supported" : "Not Supported"}
//         </Text>
//         {credentialId && <Text>User Credential ID: {credentialId}</Text>}
//         <View style={styles.buttonContainer}>
//           <Pressable style={styles.button} onPress={createPasskey}>
//             <Text>Create</Text>
//           </Pressable>
//           <Pressable style={styles.button} onPress={authenticatePasskey}>
//             <Text>Authenticate</Text>
//           </Pressable>
//           <Pressable style={styles.button} onPress={writeBlob}>
//             <Text>Add Blob</Text>
//           </Pressable>
//           <Pressable style={styles.button} onPress={readBlob}>
//             <Text>Read Blob</Text>
//           </Pressable>
//           {creationResponse && (
//             <Pressable
//               style={styles.button}
//               onPress={() => {
//                 Alert.alert("Public Key", JSON.stringify(creationResponse));
//               }}
//             >
//               <Text>Get PublicKey</Text>
//             </Pressable>
//           )}
//         </View>
//         {result && (
//           <Text style={styles.resultText}>
//             Result {JSON.stringify(result, null, 2)}
//           </Text>
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   scrollContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: "bold",
//     marginVertical: "5%",
//   },
//   resultText: {
//     maxWidth: "80%",
//   },
//   buttonContainer: {
//     padding: 24,
//     flexDirection: "row",
//     flexWrap: "wrap",
//     alignItems: "center",
//     rowGap: 4,
//     justifyContent: "space-evenly",
//   },
//   button: {
//     backgroundColor: "#fff",
//     padding: 10,
//     borderWidth: 1,
//     borderRadius: 5,
//     width: "45%",
//     alignItems: "center",
//     justifyContent: "center",
//     textAlign: "center",
//   },
// });






import type { User } from "@account-kit/signer";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import * as Linking from "expo-linking";
import {
  createLightAccountAlchemyClient,
  LightAccount,
} from "@account-kit/smart-contracts";
import { sepolia, alchemy } from "@account-kit/infra";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RNAlchemySigner } from "@account-kit/react-native-signer";

export default function HomeScreen() {

  const signer = RNAlchemySigner({
    client: { connection: { apiKey: process.env.EXPO_PUBLIC_ALCHEMY_API_KEY! } },
  });

  console.log(">>>>",process.env.EXPO_PUBLIC_ALCHEMY_API_KEY)

  const url = Linking.useURL();

  if (url) {
    const { hostname, path, queryParams } = Linking.parse(url);

    console.log(
      `Linked to app with hostname: ${hostname}, path: ${path} and data: ${JSON.stringify(
        queryParams
      )}`
    );
  }

  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<LightAccount | null>(null);
  const [signerAddress, setSignerAddress] = useState<string | null>(null);

  const [awaitingOtp, setAwaitingOtp] = useState<boolean>(false);

  const [otpCode, setOtpCode] = useState<string>("");

  const handleUserAuth = ({ code }: { code: string }) => {
    setAwaitingOtp(false);
    signer
      .authenticate({
        otpCode: code,
        type: "otp",
      })
      .then(setUser)
      .catch(console.error);
  };

  useEffect(() => {
    // get the user if already logged in
    signer.getAuthDetails().then(setUser);
  }, []);

  useEffect(() => {
    if (user) {
      createLightAccountAlchemyClient({
        signer,
        chain: sepolia,
        transport: alchemy({ apiKey: process.env.EXPO_PUBLIC_ALCHEMY_API_KEY! }),
      }).then((client) => {
        setAccount(client.account);
      });

      signer.getAddress().then((address: string) => {
        setSignerAddress(address);
      });
    }
  }, [user]);

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        ...styles.container,
      }}
    >
      {awaitingOtp ? (
        <>
          <TextInput
            style={styles.textInput}
            placeholderTextColor="gray"
            placeholder="enter your OTP code"
            onChangeText={setOtpCode}
            value={otpCode}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleUserAuth({ code: otpCode })}
          >
            <Text style={styles.buttonText}>Sign in</Text>
          </TouchableOpacity>
        </>
      ) : !user ? (
        <>
          <TextInput
            style={styles.textInput}
            placeholderTextColor="gray"
            placeholder="enter your email"
            onChangeText={setEmail}
            value={email}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              signer
                .authenticate({
                  email,
                  type: "email",
                  emailMode: "otp",
                })
                .catch(console.error);
              setAwaitingOtp(true);
            }}
          >
            <Text style={styles.buttonText}>Sign in</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.userText}>
            Currently logged in as: {user.email}
          </Text>
          <Text style={styles.userText}>OrgId: {user.orgId}</Text>
          <Text style={styles.userText}>Address: {user.address}</Text>
          <Text style={styles.userText}>
            Light Account Address: {account?.address}
          </Text>
          <Text style={styles.userText}>Signer Address: {signerAddress}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => signer.disconnect().then(() => setUser(null))}
          >
            <Text style={styles.buttonText}>Sign out</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
  },
  textInput: {
    width: "100%",
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginTop: 20,
    marginBottom: 10,
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
  button: {
    width: 200,
    padding: 10,
    height: 50,
    backgroundColor: "rgb(147, 197, 253)",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  userText: {
    marginBottom: 10,
    fontSize: 18,
  },
});