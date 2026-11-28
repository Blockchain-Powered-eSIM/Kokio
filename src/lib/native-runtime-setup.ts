// React Native has no TextDecoder (viem needs it), and its built-in URL is a partial parser;
// the auth and HTTP clients build DPoP proofs from URL origins, so use the full implementation.
import "fast-text-encoding";
import "react-native-url-polyfill/auto";
import { install as installQuickCrypto } from "react-native-quick-crypto";

// index.js is not used when "main" = "expo-router/entry", so native shims
// need to be initialized from the root layout on native platforms.
installQuickCrypto();
