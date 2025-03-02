import {
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Alert,
  } from "react-native";
  import { useSafeAreaInsets } from "react-native-safe-area-context";
  import * as Application from "expo-application";
  import { Passkey as passkey } from "react-native-passkey";
  import React from "react";
  import { base64 } from "@hexagon/base64";
  import {
    Base64URLString,
    PublicKeyCredentialUserEntityJSON,
  } from "@simplewebauthn/typescript-types";
  // import crypto from "crypto";
  import { Hex, toHex } from "viem";
  require('cbor-rn-prereqs');
  import { decode, encode } from "cbor2";
  
  import {
    parseAuthenticatorData,
    ParsedAuthenticatorData,
  } from "@/helpers/parseAuthenticatorData";
  
  // ! taken from https://github.com/MasterKale/SimpleWebAuthn/blob/e02dce6f2f83d8923f3a549f84e0b7b3d44fa3da/packages/browser/src/helpers/bufferToBase64URLString.ts
  /**
   * Convert the given array buffer into a Base64URL-encoded string. Ideal for converting various
   * credential response ArrayBuffers to string for sending back to the server as JSON.
   *
   * Helper method to compliment `base64URLStringToBuffer`
   */
  export function bufferToBase64URLString(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let str = "";
  
    for (const charCode of bytes) {
      str += String.fromCharCode(charCode);
    }
  
    const base64String = btoa(str);
  
    return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  
  // ! taken from https://github.com/MasterKale/SimpleWebAuthn/blob/e02dce6f2f83d8923f3a549f84e0b7b3d44fa3da/packages/browser/src/helpers/utf8StringToBuffer.ts
  /**
   * A helper method to convert an arbitrary string sent from the server to an ArrayBuffer the
   * authenticator will expect.
   */
  export function utf8StringToBuffer(value: string): ArrayBuffer {
    // @ts-ignore
    return new TextEncoder().encode(value);
  }
  
  /**
   * Decode a base64url string into its original string
   */
  export function base64UrlToString(base64urlString: Base64URLString): string {
    return base64.toString(base64urlString, true);
  }
  
  const bundleId = Application.applicationId?.split(".").reverse().join(".");
  const rp = {
    id: bundleId!.replaceAll("_", "-"),
    name: "ReactNativePasskeys",
  } satisfies PublicKeyCredentialRpEntity;
  console.log(rp);
  
  // Don't do this in production!
  // Uint8Array.from("random-challenge", (c) => c.charCodeAt(0))
  const challenge = bufferToBase64URLString(
    utf8StringToBuffer("random-challenge")
  );
  
  const user = {
    id: bufferToBase64URLString(utf8StringToBuffer("290283490")),
    displayName: "username",
    name: "username",
  } satisfies PublicKeyCredentialUserEntityJSON;
  
  const authenticatorSelection = {
    userVerification: "required",
    residentKey: "required",
  } satisfies AuthenticatorSelectionCriteria;
  
  export default function App() {
    const buf = encode(
      new Map<number, any>([
        [1, 2],
        [3, false],
        [4, { a: "b" }],
        [1.25, 0x1ffffffffffffffffn],
        [Date.now(), new Int16Array([-1, 0, 1])],
      ])
    );
    console.log(buf);
    console.log(decode(buf));
  
    const insets = useSafeAreaInsets();
  
    const [result, setResult] = React.useState<any>();
    const [creationResponse, setCreationResponse] = React.useState<
      NonNullable<Awaited<ReturnType<typeof passkey.create>>>["response"] | null
    >(null);
    const [credentialId, setCredentialId] = React.useState("");
  
    const createPasskey = async () => {
      try {
        const json = await passkey.create({
          challenge,
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          rp,
          user,
          authenticatorSelection,
        });
  
        console.log("creation json -", json);
  
        if (json?.rawId) setCredentialId(json.rawId);
        if (json?.response) setCreationResponse(json.response);
  
        // // https://github.com/passkeys-4337/smart-wallet/blob/main/front/src/libs/web-authn/service/web-authn.ts#L97
        let cred = json as unknown as {
          rawId: ArrayBuffer;
          response: {
            clientDataJSON: ArrayBuffer;
            attestationObject: string;
          };
        };
        // // decode attestation object and get public key
        const decodedAttestationObj: { authData: Uint8Array } = decode(
          cred.response.attestationObject
        );
  
        const authData: ParsedAuthenticatorData = parseAuthenticatorData(
          decodedAttestationObj.authData
        );
        const publicKey: { [-2]: string; [-3]: string } = decode(
          authData.credentialPublicKey!
        );
        const x = toHex(publicKey[-2]);
        const y = toHex(publicKey[-3]);
        const rawId = toHex(new Uint8Array(cred.rawId));
        console.log(x, y, rawId);
  
        setResult(json);
      } catch (e) {
        console.error("create error", e);
      }
    };
  
    const authenticatePasskey = async () => {
      const json = await passkey.get({
        rpId: rp.id as string,
        challenge,
        ...(credentialId && {
          allowCredentials: [{ id: credentialId, type: "public-key" }],
        }),
      });
  
      console.log("authentication json -", json);
  
      setResult(json);
    };
  
    const writeBlob = async () => {
      console.log("user credential id -", credentialId);
      if (!credentialId) {
        alert(
          "No user credential id found - large blob requires a selected credential"
        );
        return;
      }
  
      const json = await passkey.get({
        rpId: rp.id as string,
        challenge,
        ...(credentialId && {
          allowCredentials: [{ id: credentialId, type: "public-key" }],
        }),
      });
  
      console.log("add blob json -", json);
  
      const written = json?.clientExtensionResults?.largeBlob?.written;
      if (written) Alert.alert("This blob was written to the passkey");
  
      setResult(json);
    };
  
    const readBlob = async () => {
      const json = await passkey.get({
        rpId: rp.id as string,
        challenge,
        // extensions: { largeBlob: { read: true } },
        ...(credentialId && {
          allowCredentials: [{ id: credentialId, type: "public-key" }],
        }),
      });
  
      console.log("read blob json -", json);
  
      const blob = json?.clientExtensionResults?.largeBlob?.blob;
      if (blob)
        Alert.alert("This passkey has blob", base64UrlToString(blob as any));
  
      setResult(json);
    };
  
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{
            paddingTop: insets.top,
            backgroundColor: "#fccefe",
            paddingBottom: insets.bottom,
          }}
          contentContainerStyle={styles.scrollContainer}
        >
          <Text style={styles.title}>Testing Passkeys</Text>
          <Text>Application ID: {Application.applicationId}</Text>
          <Text>
            Passkeys are {passkey.isSupported() ? "Supported" : "Not Supported"}
          </Text>
          {credentialId && <Text>User Credential ID: {credentialId}</Text>}
          <View style={styles.buttonContainer}>
            <Pressable style={styles.button} onPress={createPasskey}>
              <Text>Create</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={authenticatePasskey}>
              <Text>Authenticate</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={writeBlob}>
              <Text>Add Blob</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={readBlob}>
              <Text>Read Blob</Text>
            </Pressable>
            {creationResponse && (
              <Pressable
                style={styles.button}
                onPress={() => {
                  Alert.alert("Public Key", JSON.stringify(creationResponse));
                }}
              >
                <Text>Get PublicKey</Text>
              </Pressable>
            )}
          </View>
          {result && (
            <Text style={styles.resultText}>
              Result {JSON.stringify(result, null, 2)}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    scrollContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      marginVertical: "5%",
    },
    resultText: {
      maxWidth: "80%",
    },
    buttonContainer: {
      padding: 24,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      rowGap: 4,
      justifyContent: "space-evenly",
    },
    button: {
      backgroundColor: "#fff",
      padding: 10,
      borderWidth: 1,
      borderRadius: 5,
      width: "45%",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    },
  });