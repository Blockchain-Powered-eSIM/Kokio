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
  id: Platform.select({
    web: undefined,
    ios: bundleId,
    android: bundleId?.replaceAll("_", "-"),
  }),
  name: "ReactNativePasskeys",
} satisfies PublicKeyCredentialRpEntity;

// Don't do this in production!
const challenge = bufferToBase64URLString(utf8StringToBuffer("fizz"));

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
        // @ts-ignore
        rp,
        user,
        authenticatorSelection,
        ...(Platform.OS !== "android" && {
          extensions: { largeBlob: { support: "required" } },
        }),
      });

      console.log("creation json -", json);

      if (json?.rawId) setCredentialId(json.rawId);
      if (json?.response) setCreationResponse(json.response);

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
      // extensions: {
      //   largeBlob: {
      //     write: bufferToBase64URLString(
      //       utf8StringToBuffer("Hey its a private key!")
      //     ),
      //   },
      // },
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
      <Text
        style={{
          textAlign: "center",
          position: "absolute",
          bottom: insets.bottom + 16,
          left: 0,
          right: 0,
        }}
      >
        Source available on{" "}
        <Text
          onPress={() =>
            Linking.openURL(
              "https://github.com/peterferguson/react-native-passkeys"
            )
          }
          style={{ textDecorationLine: "underline" }}
        >
          GitHub
        </Text>
      </Text>
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
