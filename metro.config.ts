// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// The following code ensures we have the necessary
// shims for crypto built into our project
config.resolver = {
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    ...require("node-libs-expo"),
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
  },
  sourceExts: ["jsx", "js", "ts", "tsx", "cjs", "mjs", "json"], //add here
};

config.transformer = {
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
