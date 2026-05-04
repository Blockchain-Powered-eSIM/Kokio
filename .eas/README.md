# EAS Workflows

Kokio uses EAS Workflows to automate builds, store submissions, TestFlight distribution, and OTA updates from branch pushes.

These workflows run when commits land on the configured branch. In normal use, this should happen through protected pull request merges.

## Branch Purposes

### `dev`

The `dev` branch is for day-to-day integration and QA builds.

- Creates internal development builds.
- Does not submit anything to App Store Connect or Google Play.
- Use this branch when the team needs a fresh installable build for testing native changes or development-client behavior.

### `staging`

The `staging` branch is for release candidate testing.

- Publishes OTA updates to the `staging` update branch when the native runtime is already compatible.
- Creates new store builds when native code or native configuration changes.
- Submits Android builds to Google Play open testing.
- Distributes iOS builds through TestFlight.

### `production`

The `production` branch is for real app releases.

- Publishes OTA updates to the `production` update branch when the native runtime is already compatible.
- Creates new store builds when native code or native configuration changes.
- Submits Android builds to the Google Play production track.
- Submits iOS builds to App Store Connect.

## Workflow Files

### `workflows/create-dev-builds.yml`

Runs on pushes to `dev`.

This workflow builds:

- Android with the `development` EAS build profile.
- iOS device builds with the `development` EAS build profile.

It does not use fingerprinting because dev builds are meant to be explicit QA artifacts, not release deployments.

### `workflows/deploy-staging.yml`

Runs on pushes to `staging`.

This workflow:

1. Generates native fingerprints for Android and iOS.
2. Checks whether a matching EAS build already exists for each platform.
3. If a matching build exists, publishes an OTA update to the `staging` branch.
4. If no matching build exists, creates a new build with the `staging` profile.
5. Submits Android to Google Play open testing.
6. Distributes iOS through TestFlight.

### `workflows/deploy-production.yml`

Runs on pushes to `production`.

This workflow:

1. Generates native fingerprints for Android and iOS.
2. Checks whether a matching EAS build already exists for each platform.
3. If a matching build exists, publishes an OTA update to the `production` branch.
4. If no matching build exists, creates a new build with the `production` profile.
5. Submits Android to the Google Play production track.
6. Submits iOS to App Store Connect.

## Important Cautions

- A production push can submit a real Android production release. Review release PRs carefully before merging.
- iOS submission uploads the build to App Store Connect. Apple review, TestFlight processing, and public release behavior still depend on App Store Connect configuration.
- OTA updates only work when the existing native build is compatible with the JavaScript/assets being published. Native dependency, native config, runtime version, or SDK changes should produce a new build.
- `staging` uses store distribution because Google Play open testing requires an app bundle, not an internal APK.
- `autoIncrement` is enabled for staging and production so repeated store submissions do not fail because of duplicate build numbers.

## Current EAS Profiles

- `development`: internal development-client builds for `dev`.
- `development-simulator`: optional iOS simulator development-client builds.
- `staging`: store builds connected to the `staging` update channel.
- `production`: store builds connected to the `production` update channel.
- `preview`: existing internal preview profile, not currently used by these workflows.
