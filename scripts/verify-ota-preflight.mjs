import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = process.cwd();
const eventPath = process.env.GITHUB_EVENT_PATH;

if (!eventPath && !process.env.RELEASE_BASE_BRANCH) {
  console.error("GITHUB_EVENT_PATH is not set.");
  process.exit(1);
}

const event = eventPath ? JSON.parse(fs.readFileSync(eventPath, "utf8")) : {};
const baseBranch =
  process.env.RELEASE_BASE_BRANCH ?? event.pull_request?.base?.ref;
const labels = (event.pull_request?.labels ?? []).map((label) => label.name);
const hasOtaLabel =
  process.env.RELEASE_HAS_OTA_LABEL === "true" || labels.includes("ota");

if (!baseBranch) {
  console.error("Could not determine pull request base branch.");
  process.exit(1);
}

if (!hasOtaLabel) {
  console.log("No ota label found. Skipping OTA preflight.");
  process.exit(0);
}

const VALID_PLATFORMS = new Set(["android", "ios"]);
const platforms = (process.env.OTA_PLATFORMS ?? "android")
  .split(/[\s,]+/)
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

if (platforms.length === 0) {
  console.error("OTA_PLATFORMS resolved to an empty platform list.");
  process.exit(1);
}
for (const platform of platforms) {
  if (!VALID_PLATFORMS.has(platform)) {
    console.error(
      `Unknown platform "${platform}" in OTA_PLATFORMS. Expected android and/or ios.`
    );
    process.exit(1);
  }
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")
);
const appVersion = packageJson.version;
const runtimeVersion = packageJson.version;
const profile = baseBranch;

for (const platform of platforms) {
  let builds;

  try {
    const stdout = execFileSync(
      "eas",
      [
        "build:list",
        "--json",
        "--non-interactive",
        "--platform",
        platform,
        "--build-profile",
        profile,
        "--status",
        "finished",
        "--distribution",
        "store",
        "--app-version",
        appVersion,
        "--runtime-version",
        runtimeVersion,
        "--limit",
        "1",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    builds = JSON.parse(stdout);
  } catch (error) {
    console.error(`Failed to query EAS builds for ${platform}.`);
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
    process.exit(1);
  }

  if (!Array.isArray(builds) || builds.length === 0) {
    console.error(
      `No finished ${platform} store build found for profile ${profile}, app version ${appVersion}, and runtime version ${runtimeVersion}. ` +
        `An OTA update to ${platform} requires an existing compatible store build for that platform.`
    );
    process.exit(1);
  }
  console.log(
    `OTA preflight: found a compatible finished ${platform} build for ${profile} @ ${appVersion}.`
  );
}
console.log(
  `OTA preflight passed for ${baseBranch} (${platforms.join(", ")}) using app/runtime version ${appVersion}.`
);
