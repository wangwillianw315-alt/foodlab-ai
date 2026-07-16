# FoodLab AI GitHub Security Audit

**Audit date:** 2026-07-16  
**Release:** 1.0.0  
**Scope:** active source, configuration, documentation, examples, tests, and repository metadata prepared for the public `foodlab-ai` repository

## Checked content

The final pre-staging scan inspected 291 active files after excluding dependency folders, generated builds, test output, caches, local deployment state, Git metadata, and local integration snapshots.

The audit checked for:

- `.env`, `.env.local`, `.env.production`, and related environment files;
- OpenAI, GitHub, Netlify, Vercel, and generic API tokens;
- private-key blocks, certificate/key files, credentials files, and password-bearing connection strings;
- `sk-`, `ghp_`, `github_pat_`, `OPENAI_API_KEY`, `VITE_*_KEY`, `NETLIFY_AUTH_TOKEN`, and `VERCEL_TOKEN`;
- private email addresses, phone-like contact data, and unintended personal details;
- Windows, macOS, and Linux local absolute paths;
- dependency folders, build folders, coverage, logs, editor files, operating-system files, and temporary files.

## Findings

- No high-confidence API key, access token, private key, credential-bearing connection string, or password assignment was detected.
- No local absolute path was detected in active release files.
- The only active environment file is `FoodLab_AI_Portal/.env.example`; it contains four public localhost module URL placeholders and no credentials.
- No non-example `.env` file, certificate, private key, service-account file, or credentials file was found.
- Broad words such as `token`, `secret`, and `password` occur only in documentation, dependency metadata, parsing terminology, or synthetic privacy-filter tests.
- A third-party maintainer address in a lockfile is dependency metadata, not project personal data.
- Developer attribution in the root README is intentional portfolio information; no private email address or phone number is published.

## Issues found and resolved

1. **Generated and local directories exist on disk.**  
   Root and application `node_modules/`, application `dist/`, QA `.cache/`, and QA `.netlify/` directories are present locally.

   **Resolution:** root `.gitignore` excludes dependencies, production builds, test output, caches, deployment-provider state, logs, and TypeScript build metadata at every project depth.

2. **QA local deployment state contains machine-specific data.**  
   The ignored QA `.netlify/` directory contains local Netlify state, including a local publish path and site identifier.

   **Resolution:** `.netlify/` is ignored by both the QA module and root repository and must not be staged.

3. **QA was a nested Git repository.**  
   Leaving `Food_QA_Dashboard/.git` inside the root would cause root staging to treat QA as an embedded repository instead of normal source.

   **Resolution:** the complete QA Git metadata was preserved outside the FoodLab AI release workspace before root initialization. The QA source and all V1.0 changes remain in the unified repository tree.

4. **Local integration snapshots are not release source.**  
   `phase-2-backups/` contains local historical snapshots.

   **Resolution:** the directory is excluded by the root `.gitignore`.

## Files intentionally retained

- `FoodLab_AI_Portal/.env.example`
- public demonstration CSV files
- `demo-workflow/` example JSON files
- `shared-contracts/` schemas and canonical examples
- README, release, portfolio, employment, and deployment documentation
- QA portfolio screenshots
- source package manifests and lockfiles

## Unresolved risks

- Future contributors could accidentally add a new credential under an unrecognized filename. GitHub secret scanning and review of staged changes should remain part of every release.
- Public repository visibility does not grant an open-source licence. The current decision is documented in `LICENSE_DECISION.md`.
- Deployment credentials, real product data, panelist records, customer records, and company specifications must never be added to the repository.

## Final decision

**Safe to commit after staged-file verification.**

The final staging review must confirm that ignored dependency, build, environment, deployment-state, cache, and backup paths are absent from the Git index.
