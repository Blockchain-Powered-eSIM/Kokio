import "@walletconnect/react-native-compat";
import { install as installQuickCrypto } from "react-native-quick-crypto";

// index.js is not used when "main" = "expo-router/entry", so native shims
// need to be initialized from the root layout on native platforms.
installQuickCrypto();
