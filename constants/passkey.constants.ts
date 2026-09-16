import { Platform } from "react-native";

export const PASSKEY_CONFIG = {
  RP_NAME: "Kokio App",
  RP_ID: "kokio.app",
};

// Display copy for the platform biometric, e.g. "Your Kokio wallet lives on this
// phone and signs with the passkey you already use." Matches the label already
// used inline in StepUpPromptModal.
export const PASSKEY_LABEL = Platform.OS === "ios" ? "Face ID" : "Fingerprint";