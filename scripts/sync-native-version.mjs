import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const plistPattern = (key) =>
  new RegExp(`(<key>${key}</key>\\s*<string>)([^<]*)(</string>)`);

const gradlePattern = (key) => new RegExp(`(${key}\\s+")([^"]*)(")`);

const resValuePattern = (key) =>
  new RegExp(`(resValue "string", "${key}", ")([^"]*)(")`);

// Both native projects are committed, so prebuild never rewrites these values.
// EAS also reads versionName straight out of build.gradle without running
// Groovy, so a variable there is recorded as the variable name and every OTA
// against that build is rejected for a version mismatch.
export const NATIVE_VERSION_TARGETS = [
  {
    file: "ios/Kokio/Info.plist",
    key: "CFBundleShortVersionString",
    pattern: plistPattern,
  },
  {
    file: "ios/Kokio/Supporting/Expo.plist",
    key: "EXUpdatesRuntimeVersion",
    pattern: plistPattern,
  },
  {
    file: "android/app/build.gradle",
    key: "versionName",
    pattern: gradlePattern,
  },
  {
    file: "android/app/build.gradle",
    key: "expo_runtime_version",
    pattern: resValuePattern,
  },
];

// Returns the version held in the file, or null when the file or key is missing.
export const readVersionValue = (repoRoot, { file, key, pattern }) => {
  const filePath = path.join(repoRoot, file);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const match = pattern(key).exec(fs.readFileSync(filePath, "utf8"));

  return match ? match[2] : null;
};

const sync = (repoRoot) => {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
  );

  let changed = 0;

  for (const target of NATIVE_VERSION_TARGETS) {
    const { file, key } = target;
    const filePath = path.join(repoRoot, file);

    if (!fs.existsSync(filePath)) {
      console.log(`sync-native-version: ${file} not found, skipping.`);
      continue;
    }

    const contents = fs.readFileSync(filePath, "utf8");
    const pattern = target.pattern(key);
    const match = pattern.exec(contents);

    if (!match) {
      console.error(`sync-native-version: ${key} not found in ${file}.`);
      process.exit(1);
    }

    const current = match[2];

    if (current === version) {
      continue;
    }

    fs.writeFileSync(filePath, contents.replace(pattern, `$1${version}$3`));
    console.log(`sync-native-version: ${file} ${key} ${current} -> ${version}`);
    changed += 1;
  }

  console.log(
    changed === 0
      ? `sync-native-version: OK, native version metadata already at ${version}.`
      : `sync-native-version: updated ${changed} value(s) to ${version}. Commit the changes.`
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  sync(process.cwd());
}
