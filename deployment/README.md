# FoodLab AI Netlify deployment documentation

This directory describes how to publish the five FoodLab AI V1.0 frontends as five independent Netlify sites from one GitHub repository.

No Netlify login, site creation, repository connection or deployment has been performed as part of this preparation. The source remains a frontend-only, portfolio release: no database, authentication system, server-side API or other backend is introduced.

## Documents

- [`netlify-directory-map.md`](./netlify-directory-map.md) — exact application directories, build settings and route smoke tests.
- [`netlify-site-plan.md`](./netlify-site-plan.md) — recommended site names, deployment order and cross-site URL wiring.
- [`NETLIFY_DEPLOYMENT_STEPS.md`](./NETLIFY_DEPLOYMENT_STEPS.md) — manual Netlify UI procedure and post-deploy checks.
- [`netlify-ignore-builds.md`](./netlify-ignore-builds.md) — optional monorepo ignore commands; these are documented but not enabled in `netlify.toml`.
- [`metadata-audit.md`](./metadata-audit.md) — release metadata coverage and intentionally deferred non-blocking items.
- [`netlify-readiness-report.md`](./netlify-readiness-report.md) — final local verification results, limitations and remaining manual actions.

## Standard build settings

Every site uses the same settings, with only the Base directory changing:

| Setting | Value |
|---|---|
| Package directory | Leave blank |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node.js | `20` |

The Base directory must be the exact application directory listed in the directory map. Each application also contains its own `netlify.toml` and `public/_redirects` fallback for SPA routing.

## Local verification

From the repository root, run:

```bash
npm run test:all
npm run build:all
npm run verify:netlify
```

Generated `dist/` directories and local `.env` files are ignored and must not be committed. The Portal environment values are public frontend URLs, not secrets.

Netlify references: [monorepo configuration](https://docs.netlify.com/build/configure-builds/monorepos/), [Vite on Netlify](https://docs.netlify.com/frameworks/vite/), and [redirects and rewrites](https://docs.netlify.com/routing/redirects/).
