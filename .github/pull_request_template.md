## Summary

<!-- Describe what this PR does and why. For bug fixes, include steps to reproduce. -->

## Type

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Tests
- [ ] CI / DevOps
- [ ] Documentation
- [ ] Dependency update

## Checklist

**General**
- [ ] No secrets, credentials, or environment values in diff
- [ ] No `console.log` or debug statements left in production code
- [ ] No new `^` or `~` semver ranges introduced in `package.json`

**Quality gate** *(skip for documentation-only PRs)*
- [ ] `tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `npm run audit` passes

**Testing**
- [ ] Tested locally on iOS
- [ ] Tested locally on Android
- [ ] Affected auth flow verified (passkey register / login / step-up)

**Native changes** *(if applicable)*
- [ ] Requires native rebuild — reviewer and CI are aware
- [ ] `ios/` and `android/` changes are intentional
- [ ] Podfile.lock updated and committed

**API / contract changes** *(if applicable)*
- [ ] Behaviour verified against the BFF or Auth Server OpenAPI spec
- [ ] Generated types regenerated (`npm run gen:bff-types` / `npm run gen:auth-types`)

**Dependencies** *(if applicable)*
- [ ] `package.json` version bumped
- [ ] Added packages are compatible with installed Expo SDK (`npx expo install --check`)
- [ ] No new vulnerabilities introduced (`npm run audit`)

**Release** *(for `dev` → `staging` PRs)*
- [ ] Version bumped in `package.json`
- [ ] PR labelled correctly (`ota` if applicable)

## Notes for reviewer

<!-- Anything that warrants specific attention: platform-specific behaviour,
     known limitations, deferred follow-ups, or on-chain interaction changes. -->
