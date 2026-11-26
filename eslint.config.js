// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

// Import boundaries. Shared code (lib, components, hooks) must never depend on
// a feature or a route, so dependencies only point from app towards lib.
const NO_DEEP_RELATIVE = {
  regex: "^\\.\\./\\.\\./",
  message: "Use an @/ import instead of climbing two or more folders.",
};
const NO_APP = {
  group: ["@/app", "@/app/*"],
  message: "Routes in app/ are entry points only. Import the screen from its feature instead.",
};
const NO_FEATURES = {
  group: ["@/features/*"],
  message: "Shared code must not depend on a feature.",
};
const NO_REACT_LAYERS = {
  group: ["@/providers/*", "@/components/*", "@/hooks/*"],
  message: "lib/ holds plain code with no React layer above it.",
};
const restrictImports = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "**/__tests__/**/*.ts", ".expo/*"],
  },
  {
    files: ["jest.setup.js"],
    languageOptions: { globals: { jest: "readonly" } },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Later entries replace the rule's options for their files, so each one
  // lists every pattern that applies to it.
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: restrictImports(NO_DEEP_RELATIVE, NO_APP),
  },
  {
    files: ["src/app/**/*.ts", "src/app/**/*.tsx"],
    rules: restrictImports(NO_DEEP_RELATIVE),
  },
  {
    files: ["src/components/**/*.tsx", "src/hooks/**/*.ts", "src/hooks/**/*.tsx"],
    rules: restrictImports(NO_DEEP_RELATIVE, NO_APP, NO_FEATURES),
  },
  {
    files: ["src/lib/**/*.ts", "src/lib/**/*.tsx"],
    rules: restrictImports(NO_DEEP_RELATIVE, NO_APP, NO_FEATURES, NO_REACT_LAYERS),
  },
]);
