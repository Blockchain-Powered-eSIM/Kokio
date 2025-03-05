import { StatusBar } from "expo-status-bar";
import { Button, StyleSheet, Text, View } from "react-native";

import { Buffer } from "buffer";
import { useNavigation } from "@react-navigation/native";

import {
  Passkey,
  PasskeyCreateResult,
  PasskeyGetResult,
} from "react-native-passkey";
import { getChallengeFromPayload, getRandomChallenge } from "./util";

const RPID = "app.kokio.docs";

export default function Home() {
  const navigation = useNavigation();
  const navigateToAuth = () => {
    //@ts-ignore
    navigation.navigate("AuthScreen"); // Use the navigate function with the screen name
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Native Passkeys + Turnkey</Text>
      <Button title="Sign Up" onPress={onPasskeyCreate}></Button>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    margin: 42,
  },
});

async function onPasskeyCreate() {
  if (!Passkey.isSupported()) {
    alert("Passkeys are not supported on this device");
  }

  try {
    const now = new Date();
    const humanReadableDateTime = `${now.getFullYear()}-${now.getMonth()}-${now.getDay()}@${now.getHours()}h${now.getMinutes()}min`;
    console.log(
      "creating passkey with the following datetime: ",
      humanReadableDateTime
    );

    // ID isn't visible by users, but needs to be random enough and valid base64 (for Android)
    const userId = Buffer.from(String(Date.now())).toString("base64");

    const authenticatorParams = await createPasskey({
      // This doesn't matter much, it will be the name of the authenticator persisted on the Turnkey side.
      // Won't be visible by default.
      authenticatorName: "End-User Passkey",
      rp: {
        id: RPID,
        name: "Passkey App",
      },
      user: {
        id: userId,
        // ...but name and display names are
        // We insert a human-readable date time for ease of use
        name: `Key @ ${humanReadableDateTime}`,
        displayName: `Key @ ${humanReadableDateTime}`,
      },
      authenticatorSelection: {
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "preferred",
      },
    });
    console.log("passkey registration succeeded: ", authenticatorParams);
  } catch (e) {
    console.error("error during passkey creation", e);
  }
}

/**
 * Creates a passkey and returns authenticator params
 */
export async function createPasskey(
  config: TPasskeyRegistrationConfig,
  options?: {
    withSecurityKey: boolean;
    withPlatformKey: boolean;
  }
) {
  const challenge = config.challenge || getRandomChallenge();

  let createFn = options?.withPlatformKey
    ? Passkey.createPlatformKey
    : options?.withSecurityKey
    ? Passkey.createSecurityKey
    : Passkey.create;

  let registrationResult = await createFn({
    challenge: challenge,
    rp: config.rp,
    user: config.user,
    authenticatorSelection: config.authenticatorSelection || {
      requireResidentKey: true,
      residentKey: "required",
      userVerification: "preferred",
    },
    attestation: config.attestation || "none",
    extensions: config.extensions || {},
    // All algorithms can be found here: https://www.iana.org/assignments/cose/cose.xhtml#algorithms
    // We only support ES256 and RS256, which are listed below
    pubKeyCredParams: [
      {
        type: "public-key",
        alg: -7,
      },
      {
        type: "public-key",
        alg: -257,
      },
    ],
  });

  // See https://github.com/f-23/react-native-passkey/issues/54
  // On Android the typedef lies. Registration result is actually a string!
  // TODO: remove me once the above is resolved.
  const brokenRegistrationResult =
    registrationResult as BrokenPasskeyCreateResult;
  if (typeof brokenRegistrationResult === "string") {
    registrationResult = JSON.parse(brokenRegistrationResult);
  }

  console.log("registration result: ", registrationResult);

  return {
    authenticatorName: config.authenticatorName,
    challenge: challenge,
    attestation: {
      credentialId: registrationResult.id,
      clientDataJson: registrationResult.response.clientDataJSON,
      attestationObject: registrationResult.response.attestationObject,
      // TODO: can we infer the transport from the registration result?
      // In all honesty this isn't critical so we default to "hybrid" because that's the transport used by passkeys.
      transports: ["AUTHENTICATOR_TRANSPORT_HYBRID"],
    },
  };
}

type TPasskeyRegistrationConfig = {
  // The RPID ("Relying Party ID") for your app.
  // See https://github.com/f-23/react-native-passkey?tab=readme-ov-file#configuration to set this up.
  rp: {
    id: string;
    name: string;
  };

  // Properties for passkey display: user name and email will show up in the prompts
  user: {
    id: string;
    name: string;
    displayName: string;
  };

  // Name of the authenticator (affects Turnkey only, won't be shown on passkey prompts)
  // TODO: document restrictions on character sets
  authenticatorName: string;

  // Optional challenge. If not provided, a new random challenge will be generated
  challenge?: string;

  // Optional timeout value. Defaults to 5 minutes.
  timeout?: number;

  // Optional override for UV flag. Defaults to "preferred".
  userVerification?: UserVerificationRequirement;

  // Optional list of credentials to exclude from registration. Defaults to empty
  excludeCredentials?: PublicKeyCredentialDescriptor[];

  // Authenticator selection params
  // Defaults if not passed:
  // - authenticatorAttachment: undefined
  //   (users can enroll yubikeys -- aka "cross-platform authenticator" -- or "platform" authenticator like faceID)
  // - requireResidentKey: true
  // - residentKey: "required"
  // - userVerification: "preferred"
  authenticatorSelection?: {
    authenticatorAttachment?: string;
    requireResidentKey?: boolean;
    residentKey?: string;
    userVerification?: string;
  };

  // Optional attestation param. Defaults to "none"
  attestation?: string;

  // Optional extensions. Defaults to empty.
  extensions?: Record<string, unknown>;
};

type BrokenPasskeyCreateResult = PasskeyCreateResult | string;
type BrokenPasskeyGetResult = PasskeyGetResult | string;
