import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Android reads package.json directly in app/build.gradle. iOS has no equivalent
// and the native project is committed, so prebuild never rewrites these values.
// Without this they drift until App Store Connect rejects the build.
export const IOS_VERSION_TARGETS = [
  { file: "ios/Kokio/Info.plist", key: "CFBundleShortVersionString" },
  { file: "ios/Kokio/Supporting/Expo.plist", key: "EXUpdatesRuntimeVersion" },
];

const plistValuePattern = (key) =>
  new RegExp(`(<key>${key}</key>\\s*<string>)([^<]*)(</string>)`);

// Returns the plist value, or null when the file or the key is missing.
export const readPlistValue = (repoRoot, file, key) => {
  const filePath = path.join(repoRoot, file);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const match = plistValuePattern(key).exec(fs.readFileSync(filePath, "utf8"));

  return match ? match[2] : null;
};

const sync = (repoRoot) => {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
  );

  let changed = 0;

  for (const { file, key } of IOS_VERSION_TARGETS) {
    const filePath = path.join(repoRoot, file);

    if (!fs.existsSync(filePath)) {
      console.log(`sync-ios-version: ${file} not found, skipping.`);
      continue;
    }

    const contents = fs.readFileSync(filePath, "utf8");
    const pattern = plistValuePattern(key);
    const match = pattern.exec(contents);

    if (!match) {
      console.error(`sync-ios-version: ${key} not found in ${file}.`);
      process.exit(1);
    }

    const current = match[2];

    if (current === version) {
      continue;
    }

    fs.writeFileSync(filePath, contents.replace(pattern, `$1${version}$3`));
    console.log(`sync-ios-version: ${file} ${key} ${current} -> ${version}`);
    changed += 1;
  }

  console.log(
    changed === 0
      ? `sync-ios-version: OK — iOS version metadata already at ${version}.`
      : `sync-ios-version: updated ${changed} file(s) to ${version}. Commit the changes.`
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  sync(process.cwd());
}
