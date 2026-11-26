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

// Every folder and file under src/ is kebab-case. Expo Router's own names are
// allowed: (group) and [param] folders, _layout, +not-found and +html.
const KEBAB = "[a-z0-9]+(?:-[a-z0-9]+)*";
const FOLDER_NAME = new RegExp(`^(?:${KEBAB}|\\(${KEBAB}\\)|\\[(?:\\.\\.\\.)?${KEBAB}\\]|__tests__)$`);
const FILE_NAME = new RegExp(
  `^(?:${KEBAB}|_layout|\\+not-found|\\+html|\\[(?:\\.\\.\\.)?${KEBAB}\\])` +
    `(?:\\.(?:native|ios|android|web|d|test))?\\.(?:ts|tsx|js)$`,
);
const fileNamesPlugin = {
  rules: {
    "kebab-case": {
      meta: { type: "suggestion", schema: [] },
      create(context) {
        const parts = context.filename.split(/[\\/]/);
        const src = parts.lastIndexOf("src");
        if (src === -1) return {};
        const folders = parts.slice(src + 1, -1);
        const file = parts[parts.length - 1];
        const bad = [...folders.filter((f) => !FOLDER_NAME.test(f)), ...(FILE_NAME.test(file) ? [] : [file])];
        return {
          Program(node) {
            for (const name of bad) {
              context.report({ node, message: `"${name}" is not kebab-case.` });
            }
          },
        };
      },
    },
  },
};

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
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js"],
    plugins: { "file-names": fileNamesPlugin },
    rules: { "file-names/kebab-case": "error" },
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
