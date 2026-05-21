# EAS Workflows

Kokio uses EAS Workflows to automate native builds, store submissions, TestFlight distribution, and OTA updates. GitHub Actions validates release metadata before promotion PRs land and then explicitly routes each merged PR to the correct EAS workflow.

These workflows are run on-demand from GitHub Actions after protected pull request merges to `staging` and `production`.

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
- Runs OTA updates for PRs labeled `ota` only when they change approved OTA-safe paths and a compatible finished build already exists on Expo for both platforms.
- Falls back to native builds for version, native, config, dependency, and uncertain changes.
- Submits Android builds to Google Play open testing.
- Distributes iOS builds through TestFlight external testing in the `Public` group.

### `production`

The `production` branch is for real app releases.

- Git branch: `production`
- EAS build profile: `production`
- EAS environment: `production`
- EAS update branch/channel: `production`
- Runs OTA updates for PRs labeled `ota` only when they change approved OTA-safe paths and a compatible finished build already exists on Expo for both platforms.
- Falls back to native builds for version, native, config, dependency, and uncertain changes.
- Submits Android builds to the Google Play production track.
- Submits iOS builds to App Store Connect.

## Release Versioning

- `package.json` is the single source of truth for the Kokio app version.
- `app.config.ts` derives Expo `version`, `runtimeVersion`, `ios.version`, and `android.version` from `package.json`.
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

Runs on pushes to `dev`.

This workflow builds:

- Android with the `development` EAS build profile.
- iOS device builds with the `development` EAS build profile.

### `workflows/deploy-staging.yml`

Runs on-demand from GitHub Actions for merged PRs to `staging` that do not have the `ota` label.

This workflow:

1. Creates a new Android build with the `staging` profile.
2. Creates a new iOS build with the `staging` profile.
3. Submits Android to Google Play open testing.
4. Distributes iOS through TestFlight external testing in the `Public` group.

The staging workflow uses the EAS `preview` environment for submission and distribution jobs so cloud jobs pull staging-safe environment variables instead of production values.

### `workflows/publish-staging-ota.yml`

Runs on-demand from GitHub Actions for merged PRs to `staging` that have the `ota` label.

This workflow:

1. Publishes an Android OTA update to the `staging` branch.
2. Publishes an iOS OTA update to the `staging` branch.

### `workflows/deploy-production.yml`

Runs on-demand from GitHub Actions for merged PRs to `production` that do not have the `ota` label.

This workflow:

1. Creates a new Android build with the `production` profile.
2. Creates a new iOS build with the `production` profile.
3. Submits Android to the Google Play production track.
4. Submits iOS to App Store Connect.

### `workflows/publish-production-ota.yml`

Runs on-demand from GitHub Actions for merged PRs to `production` that have the `ota` label.

This workflow:

1. Publishes an Android OTA update to the `production` branch.
2. Publishes an iOS OTA update to the `production` branch.

### `.github/workflows/route-eas-release.yml`

Runs when a PR is merged into `staging` or `production`.

This workflow:

1. Reads the merged PR target branch and labels.
2. Chooses the correct EAS workflow:
   - `ota` label on `staging` -> `publish-staging-ota.yml`
   - no `ota` label on `staging` -> `deploy-staging.yml`
   - `ota` label on `production` -> `publish-production-ota.yml`
   - no `ota` label on `production` -> `deploy-production.yml`
3. For OTA-labeled PRs, verifies Expo already has finished store builds for Android and iOS at the current app/runtime version on the target profile.
4. Calls `eas workflow:run` with the exact merge commit SHA.

## OTA Trigger Rules

OTA is triggered only when all of these are true:

- the merged PR targets `staging` or `production`
- the merged PR carried the `ota` label and passed release validation
- the PR changed only approved OTA-safe paths
- Expo already has finished store builds for the target app/runtime version on both platforms

OTA is not triggered when any of these are true:

- files outside the OTA-safe allowlist changed
- the change requires a new runtime version
- Expo does not have compatible finished builds for both platforms

When OTA is not triggered, GitHub routes Kokio to the native build-and-submit workflow instead.

Examples:

- JS-only UI bugfix in `app/`, `components/`, or `screens/` with an `ota` label and an already-existing matching runtime/build: OTA is triggered.
- Change to `android/`, `ios/`, `app.config.ts`, `eas.json`, `package.json`, `package-lock.json`, workflow files, or any non-allowlisted path: native build is triggered.
- Uncertain dependency or release-config change: native build is triggered.

## Important Cautions

- A production push can submit a real Android production release. Review release PRs carefully before merging.
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
