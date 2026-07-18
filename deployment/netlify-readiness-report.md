# FoodLab AI V1.0 Netlify readiness report

> Historical pre-deployment snapshot from 17 July 2026. Production deployment was completed on 18 July 2026; current live status is in [`NETLIFY_PRODUCTION_RELEASE_REPORT.md`](./NETLIFY_PRODUCTION_RELEASE_REPORT.md).

## Outcome

The repository is prepared for manual connection through the Netlify web interface as five independent React + Vite sites. No Netlify login, site creation, repository connection or deployment was performed. No database, backend, Netlify Function or authentication feature was added.

## Exact application directories

| Application | Base directory | Build command | Publish directory |
|---|---|---|---|
| FoodLab AI Portal | `FoodLab_AI_Portal` | `npm run build` | `dist` |
| Food Product Development AI | `Food_Product_Development_AI` | `npm run build` | `dist` |
| Food Sensory AI | `Food_Sensory_AI` | `npm run build` | `dist` |
| Food Shelf Life Predictor | `Food_Shelf_Life_Predictor` | `npm run build` | `dist` |
| Food QA Dashboard | `Food_QA_Dashboard` | `npm run build` | `dist` |

For each Netlify site, set the application directory as **Base directory**, leave **Package directory blank**, use Node.js 20, and keep the build and publish values shown above.

## Configuration and redirects

- `FoodLab_AI_Portal/netlify.toml` and `FoodLab_AI_Portal/public/_redirects`
- `Food_Product_Development_AI/netlify.toml` and `Food_Product_Development_AI/public/_redirects`
- `Food_Sensory_AI/netlify.toml` and `Food_Sensory_AI/public/_redirects`
- `Food_Shelf_Life_Predictor/netlify.toml` and `Food_Shelf_Life_Predictor/public/_redirects`
- `Food_QA_Dashboard/netlify.toml` and `Food_QA_Dashboard/public/_redirects`

- Each application contains an application-level `netlify.toml` with `npm run build`, `dist`, Node.js 20 and a `/*` to `/index.html` status-200 SPA rewrite.
- Each application contains `public/_redirects` with `/* /index.html 200`.
- All five production builds contain `dist/_redirects` and `dist/index.html`.
- Existing QA security and immutable-asset cache headers were retained.
- No secrets, backend settings or Netlify Functions were added to any configuration.

The TOML and `_redirects` rules express the same rewrite and do not conflict.

## Environment variables

Configure these public frontend URL variables on the Portal site using the four actual module URLs:

```dotenv
VITE_PRODUCT_DEVELOPMENT_URL=https://foodlab-product-development.netlify.app
VITE_SENSORY_URL=https://foodlab-sensory.netlify.app
VITE_SHELF_LIFE_URL=https://foodlab-shelf-life.netlify.app
VITE_QA_URL=https://foodlab-qa.netlify.app
```

The checked-in `FoodLab_AI_Portal/.env.example` contains exactly these non-sensitive examples. The Portal validates HTTP/HTTPS URLs, opens configured modules in a new tab with safe link attributes, and shows a friendly unavailable state when a production URL is absent.

Each module optionally accepts `VITE_PORTAL_URL` after the Portal's actual URL is known. When it is unset in production, the module shows a disabled friendly state instead of linking to localhost.

## Verification results

Run on 17 July 2026 in the release working tree:

| Gate | Result |
|---|---:|
| Application tests | **252/252 passed** |
| Shared contract validation | **3 examples and 4 schemas valid** |
| Production builds | **5/5 passed** |
| Automated Netlify readiness checks | **77/77 passed** |
| Local direct-route preview checks | **28/28 passed** |

Direct route checks returned HTTP 200 and the application shell for:

- Portal: `/`, `/modules`, `/workflow`, `/portfolio`, `/about`, `/limitations`, `/demo`
- Product Development: `/`, `/projects`, `/projects/bar`, `/transfers`, `/about`
- Sensory: `/`, `/projects`, `/transfers`, `/test-design`, `/reports`, `/about`
- Shelf Life: `/`, `/studies`, `/studies/yoghurt`, `/transfers`, `/about`
- QA: `/`, `/#/dashboard`, `/#/data-explorer`, `/#/lifecycle-transfer`, `/#/about`

The verification also confirmed referenced build assets exist, release bundles contain no development-port or loopback-IP URLs, no real `.env` is included, and no likely API keys or personal secrets were detected. Generated `node_modules`, `dist`, `build` and `.netlify` directories remain excluded from source control.

Netlify CLI was not installed in the environment. In accordance with the deployment scope, it was not installed, and normal Vite production builds plus local preview checks were used instead.

## Known non-blocking limitations

- Final Netlify site names and URLs remain subject to global availability.
- Branded favicons, social preview images, canonical URLs and `og:url` are deferred until final domains are known; essential page metadata is present.
- Sensory and Shelf Life builds report Vite's non-failing large-chunk warning. Code splitting is a future performance improvement, not a deployment blocker.
- Optional build-ignore commands are documented but intentionally not enabled until baseline Netlify deployments are proven.
- The applications remain local-first and exchange user-controlled JSON files. There is no shared database, login, multi-tenant layer or cloud synchronization.
- The software is an educational portfolio system and does not claim commercial validation, regulatory approval or real customers.

## Remaining manual Netlify actions

1. Log in to Netlify and import `wangwillianw315-alt/foodlab-ai` once for each application.
2. Enter each site's Base directory, leave Package directory blank, and confirm `npm run build`, `dist` and Node.js 20.
3. Deploy and test the four modules.
4. Record their actual HTTPS URLs and set the four Portal environment variables.
5. Deploy the Portal last and confirm every module card opens the correct site.
6. Optionally set `VITE_PORTAL_URL` on the four modules and redeploy them.
7. Repeat the documented browser refresh and JSON workflow checks on the live URLs.

## Recommended deployment order

1. Product Development
2. Sensory
3. Shelf Life
4. QA Dashboard
5. Portal

The Portal is last because its build-time environment variables require the four actual module URLs.
