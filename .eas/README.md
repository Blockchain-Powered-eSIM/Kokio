# EAS Workflows

Kokio uses EAS Workflows to automate native builds, store submissions, TestFlight distribution, and OTA updates. GitHub Actions validates release metadata before promotion PRs land and then explicitly routes each merged PR to the correct EAS workflow.

These workflows are run on-demand from GitHub Actions after protected pull request merges to `staging` and `production`.

## Platform Model

Workflows are **scoped to a single platform**. The router resolves which platforms a release targets:

- **Android is always released.** No label required.
- **iOS is opt-in.** Add the `ios` label to the promotion PR (or choose `ios`/`both` on manual dispatch).

iOS workflow files exist but are **dormant** — they are not invoked until an Apple Developer account is connected. This keeps a missing Apple account from failing an Android release, and keeps the iOS cutover to a label rather than a config change.

Platform resolution lives **only** in `.github/workflows/route-eas-release.yml`. `scripts/validate-release-pr.mjs` stays platform-agnostic on purpose, so there is one place to edit when iOS comes online.

## Branch Purposes

### `dev`

The `dev` branch is for day-to-day integration and QA builds.

- Creates internal development builds.
- Does not submit anything to App Store Connect or Google Play.
- Does not run OTA release automation.
- Use this branch when the team needs a fresh installable build for testing native changes or development-client behavior.

### `staging`

The `staging` branch is for release candidate testing.

- Git branch: `staging`
- EAS build profile: `staging`
- EAS environment: `preview`
- EAS update branch/channel: `staging`
- Runs OTA updates for PRs labeled `ota` only when they change approved OTA-safe paths and a compatible finished build already exists on Expo for each resolved platform (Android always; iOS only when the `ios` label is present).
- Falls back to native builds for version, native, config, dependency, and uncertain changes.
- Submits Android builds to the Google Play internal testing track (early bug-catching before a production candidate).
- Distributes iOS builds through TestFlight external testing in the `Public` group (when `ios` is opted in).

### `production`

The `production` branch is for real app releases.

- Git branch: `production`
- EAS build profile: `production`
- EAS environment: `production`
- EAS update branch/channel: `production`
- Runs OTA updates for PRs labeled `ota` only when they change approved OTA-safe paths and a compatible finished build already exists on Expo for each resolved platform (Android always; iOS only when the `ios` label is present).
- Falls back to native builds for version, native, config, dependency, and uncertain changes.
- Submits Android builds to the Google Play closed alpha track as a draft. Releases are validated with a trusted-tester group there, then promoted to the production track manually from the Play Console, the pipeline does **NOT** publishes to production directly.
- Submits iOS builds to App Store Connect (when `ios` is opted in).

## Release Versioning

- `package.json` is the single source of truth for the Kokio app version.
- `app.config.js` derives Expo `version`, `runtimeVersion`, `ios.version`, and `android.version` from `package.json`.
- EAS remote build numbers are separate from app version and continue auto-incrementing per profile.
- PRs to `staging` and `production` use this policy:
  - `ota` label present: `package.json` version must stay the same as the base branch.
  - no `ota` label: `package.json` version must be incremented above the base branch.

The `Release Policy` GitHub Action validates that:

- OTA-labeled PRs keep the same `package.json` version as the base branch
- non-OTA PRs increment `package.json` above the base branch
- OTA-labeled PRs touch only approved OTA-safe paths
- resolved Expo config matches the same version across `version`, `runtimeVersion`, `ios.version`, and `android.version`

## Workflow Files

### `workflows/create-dev-builds.yml`

Runs on pushes to `dev`. Builds Android and iOS device builds with the `development` profile.

### Native build & submit

| File | Runs when | Does |
|---|---|---|
| `workflows/deploy-staging-android.yml` | merged PR to `staging`, no `ota` label | Android `staging` build → Google Play Internal testing |
| `workflows/deploy-staging-ios.yml` | as above **+ `ios` label** | iOS `staging` build → TestFlight (`Public`, beta review submitted) |
| `workflows/deploy-production-android.yml` | merged PR to `production`, no `ota` label | Android `production` build → Play Closed Testing track (draft, manually promoted to production) |
| `workflows/deploy-production-ios.yml` | as above **+ `ios` label** | iOS `production` build → App Store Connect |

Staging workflows use the EAS `preview` environment so cloud jobs pull staging-safe environment variables instead of production values.

### OTA

| File | Runs when | Does |
|---|---|---|
| `workflows/publish-staging-ota-android.yml` | merged PR to `staging` with `ota` | Android OTA to the `staging` branch |
| `workflows/publish-staging-ota-ios.yml` | as above **+ `ios` label** | iOS OTA to the `staging` branch |
| `workflows/publish-production-ota-android.yml` | merged PR to `production` with `ota` | Android OTA to the `production` branch |
| `workflows/publish-production-ota-ios.yml` | as above **+ `ios` label** | iOS OTA to the `production` branch |

### `.github/workflows/route-eas-release.yml`

Runs when a PR is merged into `staging` or `production`.

1. Reads the merged PR's target branch and labels.
2. Resolves platforms: Android always; iOS if the `ios` label is present.
3. Derives the workflow file per platform:
   - `ota` label → `.eas/workflows/publish-{base}-ota-{platform}.yml`
   - no `ota` label → `.eas/workflows/deploy-{base}-{platform}.yml`
4. For OTA-labeled PRs, verifies Expo already has a finished store build **for each resolved platform** at the current app/runtime version on the target profile (`scripts/verify-ota-preflight.mjs`, via `OTA_PLATFORMS`).
5. Calls `eas workflow:run` once per resolved platform with the exact merge commit SHA.

`workflow_dispatch` supports an explicit `workflow_file`, which bypasses platform resolution entirely.

## OTA Trigger Rules

OTA is triggered only when all of these are true:

- the merged PR targets `staging` or `production`
- the merged PR carried the `ota` label and passed release validation
- the PR changed only approved OTA-safe paths
- Expo already has a finished store build at the target app/runtime version **for each platform being published**

OTA is not triggered when any of these are true:

- files outside the OTA-safe allowlist changed
- the change requires a new runtime version
- Expo does not have compatible finished builds for each resolved platform

When OTA is not triggered, GitHub routes Kokio to the native build-and-submit workflow instead.

Examples:

- JS-only UI bugfix in `app/`, `components/`, or `screens/` with an `ota` label and an already-existing matching runtime/build: OTA is triggered.
- Change to `android/`, `ios/`, `app.config.js`, `eas.json`, `package.json`, `package-lock.json`, workflow files, or any non-allowlisted path: native build is triggered.
- Uncertain dependency or release-config change: native build is triggered.

## Important Cautions

- A production push uploads an Android build to the Play Console closed alpha track as a draft, not sent for review. It does not publish to production — promotion to the production track is a manual Play Console step after trusted-tester validation. Review release PRs carefully before merging.
- iOS submission uploads the build to App Store Connect. Apple review, TestFlight processing, and public release behavior still depend on App Store Connect configuration.
- `staging` uses store distribution because Google Play open testing requires an app bundle, not an internal APK.
- `autoIncrement` is enabled for staging and production so repeated store submissions do not fail because of duplicate build numbers.
- These workflows do not use fingerprint-based OTA optimization because Kokio commits native `android/` and `ios/` directories, and Expo's `fingerprint` workflow job only supports CNG/managed projects.

## Current EAS Profiles

- `development`: internal development-client builds for `dev`.
- `development-simulator`: optional iOS simulator development-client builds.
- `staging`: store builds using the EAS `preview` environment.
- `production`: store builds connected to the `production` update channel.
- `preview`: existing internal preview profile, not currently used by these workflows.
