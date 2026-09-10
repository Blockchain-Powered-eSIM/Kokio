import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { IOS_VERSION_TARGETS, readPlistValue } from "./sync-ios-version.mjs";

const repoRoot = process.cwd();
const eventPath = process.env.GITHUB_EVENT_PATH;
const otaSafePatterns = [
  "app/",
  "assets/",
  "components/",
  "config/",
  "constants/",
  "contexts/",
  "helpers/",
  "hooks/",
  "lib/",
  "providers/",
  "screens/",
  "services/",
  "stores/",
  "utils/",
  "__tests__/",
  "global.css",
  "types.d.ts",
];

if (!eventPath) {
  console.error("GITHUB_EVENT_PATH is not set.");
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const baseBranch = event.pull_request?.base?.ref;
const baseSha = event.pull_request?.base?.sha;
const labels = (event.pull_request?.labels ?? []).map((label) => label.name);
const hasOtaLabel = labels.includes("ota");
const hasReleaseRetryLabel = labels.includes("release-retry");

if (!baseBranch || !baseSha) {
  console.error("Could not determine pull request base branch or base SHA.");
  process.exit(1);
}

if (baseBranch === "dev") {
  console.log("Skipping release validation for dev PR.");
  process.exit(0);
}

const changedFiles = execFileSync(
  "git",
  ["diff", "--name-only", baseSha, "HEAD"],
  { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
)
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

const ciOnlyPatterns = [".eas/", ".github/"];
const isCiOnlyChange =
  changedFiles.length > 0 &&
  changedFiles.every((file) =>
    ciOnlyPatterns.some((pattern) => file.startsWith(pattern))
  );

if (!hasOtaLabel && isCiOnlyChange) {
  console.log(
    "PR changes only CI/workflow paths (.eas/, .github/); skipping version and OTA-path checks."
  );
  process.exit(0);
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
);
const basePackageJson = JSON.parse(
  execFileSync("git", ["show", `${baseSha}:package.json`], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
);

let expoConfig;

try {
  const stdout = execFileSync(
    "npx",
    ["expo", "config", "--json", "--type", "public"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  expoConfig = JSON.parse(stdout);
} catch (error) {
  console.error("Failed to resolve Expo config.");
  if (error.stderr) {
    console.error(error.stderr.toString());
  }
  process.exit(1);
}

const versionChecks = [
  ["package.json version", packageJson.version],
  ["expo.version", expoConfig.version],
  ["expo.runtimeVersion", expoConfig.runtimeVersion],
  ["expo.ios.version", expoConfig.ios?.version],
  ["expo.android.version", expoConfig.android?.version],
];

for (const [label, value] of versionChecks) {
  if (value !== packageJson.version) {
    console.error(
      `${label} does not match package.json version (${packageJson.version}). Found: ${value}`
    );
    process.exit(1);
  }
}

// The checks above read the Expo config, which derives every version from
// package.json and so can never disagree with it. The committed iOS project is
// the part that goes stale, so read the plists themselves.
for (const { file, key } of IOS_VERSION_TARGETS) {
  const value = readPlistValue(repoRoot, file, key);

  if (value !== packageJson.version) {
    console.error(
      `${file} ${key} does not match package.json version (${packageJson.version}). Found: ${value}. Run npm run postinstall and commit the result.`
    );
    process.exit(1);
  }
}

const hasOnlyOtaSafeChanges = changedFiles.every((file) =>
  otaSafePatterns.some((pattern) =>
    pattern.endsWith("/") ? file.startsWith(pattern) : file === pattern
  )
);

if (hasOtaLabel && !hasOnlyOtaSafeChanges) {
  console.error(
    "PR has an ota label but changes files outside the OTA-safe allowlist. OTA releases must be limited to approved JS/assets paths."
  );
  process.exit(1);
}

const parseVersion = (value) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    console.error(`Invalid semver version: ${value}`);
    process.exit(1);
  }

  return match.slice(1).map((part) => Number(part));
};

const compareVersions = (left, right) => {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);

  for (let i = 0; i < leftParts.length; i += 1) {
    if (leftParts[i] > rightParts[i]) return 1;
    if (leftParts[i] < rightParts[i]) return -1;
  }

  return 0;
};

if (hasOtaLabel) {
  if (packageJson.version !== basePackageJson.version) {
    console.error(
      `PR has an ota label, so package.json version must stay at ${basePackageJson.version}. Found ${packageJson.version}.`
    );
    process.exit(1);
  }
} else if (
  !hasReleaseRetryLabel &&
  compareVersions(packageJson.version, basePackageJson.version) <= 0
) {
  console.error(
    `PR does not have an ota label, so package.json version must be incremented above ${basePackageJson.version}. Found ${packageJson.version}.`
  );
  process.exit(1);
} else if (
  hasReleaseRetryLabel &&
  packageJson.version !== basePackageJson.version
) {
  console.error(
    `PR has a release-retry label, so package.json version must stay at ${basePackageJson.version}. Found ${packageJson.version}.`
  );
  process.exit(1);
}

console.log(
  `Release validation passed for ${baseBranch} using version ${packageJson.version}${
    hasOtaLabel ? " with ota label" : hasReleaseRetryLabel ? " with release-retry label" : ""
  }.`
);
