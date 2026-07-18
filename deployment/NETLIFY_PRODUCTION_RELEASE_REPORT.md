# FoodLab AI V1.0 Netlify production release report

## Release outcome

FoodLab AI V1.0 is live as five separate production Netlify sites. The release remains a frontend-only, local-first educational portfolio platform: no database, authentication, paid add-on, Netlify Function or backend was introduced.

| Application | Exact directory | Netlify site | Production URL | Build command | Publish directory | Required environment variables |
|---|---|---|---|---|---|---|
| FoodLab AI Portal | `FoodLab_AI_Portal` | `foodlab-ai` | https://foodlab-ai.netlify.app | `npm run build` | `dist` | `VITE_PRODUCT_DEVELOPMENT_URL`, `VITE_SENSORY_URL`, `VITE_SHELF_LIFE_URL`, `VITE_QA_URL` |
| Food Product Development AI | `Food_Product_Development_AI` | `foodlab-product-development` | https://foodlab-product-development.netlify.app | `npm run build` | `dist` | None required; optional `VITE_PORTAL_URL` |
| Food Sensory AI | `Food_Sensory_AI` | `foodlab-sensory` | https://foodlab-sensory.netlify.app | `npm run build` | `dist` | None required; optional `VITE_PORTAL_URL` |
| Food Shelf Life Predictor | `Food_Shelf_Life_Predictor` | `foodlab-shelf-life` | https://foodlab-shelf-life.netlify.app | `npm run build` | `dist` | None required; optional `VITE_PORTAL_URL` |
| Food QA Dashboard | `Food_QA_Dashboard` | `foodlab-qa` | https://foodlab-qa.netlify.app | `npm run build` | `dist` | None required; optional `VITE_PORTAL_URL` |

All five preferred site names were available. Each canonical production deployment reports `ready`.

## Portal environment status

The four required public navigation variables are stored in the Portal site's Netlify `production` context and were read back through the CLI before deployment. The production bundle was separately checked to contain all four HTTPS URLs and no localhost or loopback dependency. No committed `.env` file was created.

## Verification summary

| Gate | Result |
|---|---:|
| Application tests | 252/252 passed across 34 files |
| Shared transfer validation | 3 examples and 4 schemas valid |
| Production builds | 5/5 passed |
| Automated Netlify repository checks | 77/77 passed |
| Live HTTP route checks | 23/23 passed |
| Portal browser-rendered routes | 7/7 passed |
| Module disclaimer renders | 4/4 passed |
| Representative application console messages | 0 |

The current total is 252 rather than the older 242 release-note figure because the final repository contains 22 Portal, 79 Product Development, 47 Sensory, 47 Shelf Life and 57 QA tests.

## GitHub continuous deployment

**Status: manual GitHub connection still required for all five new sites.**

The authenticated CLI created and published each site, but site inspection shows no linked repository, production branch or persisted build settings. `netlify init` requires an interactive GitHub authorization selection in this environment. To avoid exposing a personal access token or guessing a GitHub App installation ID, the CLI flow was stopped without changing repository integration.

For each of the five Netlify projects:

1. Open the project in Netlify.
2. Go to **Project configuration → Build & deploy → Continuous deployment → Repository**.
3. Select **Link repository**, choose **GitHub**, then select `wangwillianw315-alt/foodlab-ai`.
4. Set production branch to `main`.
5. Set **Base directory** to the exact application directory in the table above.
6. Leave **Package directory** blank.
7. Confirm **Build command** is `npm run build` and **Publish directory** is `dist`.
8. Save the configuration and confirm builds remain active.

Use these project names in order: `foodlab-product-development`, `foodlab-sensory`, `foodlab-shelf-life`, `foodlab-qa`, and `foodlab-ai`. The Portal's production environment variables are already stored on `foodlab-ai` and should be preserved.

## Credentials and source-control safety

- Netlify authentication remained in the user's local CLI session.
- No authentication token, personal access token, site state or account-private data was written to source files.
- All application `.netlify/` directories, including `state.json`, remain ignored by Git.
- No real `.env`, `node_modules`, `dist`, `build` or `.netlify` directory is tracked.

## Deployment limitations

- Until the five repositories are linked in the Netlify UI, future pushes to `main` will not automatically rebuild these sites; authenticated CLI deploys remain available.
- Optional module-to-Portal back links are not configured; the required Portal-to-module navigation is fully active.
- Data remains browser-local and cross-module transfers remain explicit JSON export/import operations.
- Favicon/social preview assets, canonical tags and custom domains remain deferred non-blocking polish work.
- Sensory and Shelf Life retain non-failing large-bundle advisories.
- The software does not claim commercial validation, regulatory approval or real customers.
