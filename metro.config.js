// @ts-nocheck
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const projectRoot = __dirname;

// Add aliases for file-system import based modules
const ALIASES = {
  "@noble/hashes/crypto": path.resolve(
    projectRoot,
    "node_modules/@noble/hashes/crypto.js"
  ),
};

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// The following code ensures we have the necessary
// shims for crypto built into our project
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...require("node-libs-react-native"),
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("stream-browserify"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (ALIASES[moduleName]) {
    return {
      filePath: ALIASES[moduleName],
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// The `account-kit/react-native` and it's supporting packages leverages package.json `exports` which is not (yet) supported by default in Metro.
// we can enable this support using:
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  "browser",
  "require",
  "react-native",
];
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

const nativeWindConfig = withNativeWind(config, { input: "./global.css" });
nativeWindConfig.resolver.sourceExts = [
  ...nativeWindConfig.resolver.sourceExts,
  "mjs",
];
module.exports = nativeWindConfig;
