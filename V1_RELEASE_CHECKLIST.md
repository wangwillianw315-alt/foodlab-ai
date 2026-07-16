# FoodLab AI V1.0 Release Checklist

## Scope freeze

- [x] Release contains only the Portal, Product Development, Sensory, Shelf Life, QA, shared lifecycle identifiers, transfer history, scientific disclaimers, and the three approved JSON hand-offs.
- [x] No new business module, database, authentication, payment, multi-tenant, or complex permission feature was added.
- [x] Existing application LocalStorage stores remain intact and separate.

## Versioning and documentation

- [x] Root and all active application package versions are `1.0.0`.
- [x] Root `VERSION` contains `1.0.0`.
- [x] `CHANGELOG.md` is present.
- [x] `RELEASE_NOTES_V1.0.md` contains purpose, modules, integrations, verification totals, limitations, and roadmap.
- [x] Module documentation describes the V1.0 integration state without commercial, regulatory, certification, or customer claims.

## Source-control hygiene

- [x] Root `.gitignore` excludes `node_modules`, build output, coverage, caches, environment files, local secrets, and integration snapshots.
- [x] No non-example `.env` file was identified in the active release source.
- [x] A final 291-file pre-staging scan found no API keys, access tokens, private keys, credential-bearing connection strings, or local absolute paths.
- [x] The existing QA Git index contains no `node_modules`, `dist`, `build`, `coverage`, cache, or `.env` paths.
- [x] The workspace is initialized as one reviewed root Git repository on `main`.
- [x] QA Git metadata was preserved outside the release workspace before initialization, so QA source is not committed as an embedded repository.
- [x] The staged root index contains no dependencies, builds, caches, real environment files, deployment state, or backup snapshots.

## Verification

- [x] `npm run test:all` passes.
- [x] 242 application tests pass across 34 test files.
- [x] 3 transfer examples pass validation against 4 shared schemas.
- [x] `npm run build:all` passes.
- [x] All five production applications build successfully.
- [x] Only documented non-blocking chart-size and bundle-size advisories remain.

## Release decision

- [x] Final secret/source-control audit reviewed.
- [x] V1.0 release candidate is ready.
