# Netlify directory map

FoodLab AI V1.0 is deployed as five independent Vite sites from the same repository. In Netlify, configure the Base directory to the application directory and leave Package directory blank. With that arrangement, both the build command and publish directory are resolved relative to the selected application.

| Application | Exact repository/Base directory | `package.json` path | Framework | Build command | Publish directory | Environment variables | SPA routing requirement |
|---|---|---|---|---|---|---|---|
| FoodLab AI Portal | `FoodLab_AI_Portal` | `FoodLab_AI_Portal/package.json` | React + Vite | `npm run build` | `dist` | `VITE_PRODUCT_DEVELOPMENT_URL`, `VITE_SENSORY_URL`, `VITE_SHELF_LIFE_URL`, `VITE_QA_URL` | History fallback required for all routes |
| Food Product Development AI | `Food_Product_Development_AI` | `Food_Product_Development_AI/package.json` | React + Vite | `npm run build` | `dist` | Optional `VITE_PORTAL_URL` | History fallback required |
| Food Sensory AI | `Food_Sensory_AI` | `Food_Sensory_AI/package.json` | React + Vite | `npm run build` | `dist` | Optional `VITE_PORTAL_URL` | History fallback required |
| Food Shelf Life Predictor | `Food_Shelf_Life_Predictor` | `Food_Shelf_Life_Predictor/package.json` | React + Vite | `npm run build` | `dist` | Optional `VITE_PORTAL_URL` | History fallback required |
| Food QA Dashboard | `Food_QA_Dashboard` | `Food_QA_Dashboard/package.json` | React + Vite | `npm run build` | `dist` | Optional `VITE_PORTAL_URL` | Hash routes are client-side; root fallback retained |

For every site, leave **Package directory blank** and use **Node.js 20**. No listed variable is a secret: these are public browser navigation URLs. The Portal variables are required for live module cards; an unset value produces a friendly unavailable state instead of a broken link.

Do not set the repository root as Base directory for these sites: the root is the release orchestrator, while each child application owns its production build.

## SPA routing

Each application has both:

- a `netlify.toml` rewrite from `/*` to `/index.html` with status `200`; and
- a copied `public/_redirects` rule: `/* /index.html 200`.

This makes browser-history routes load correctly when opened directly or refreshed. QA uses hash routing, so the fragment remains client-side, but its root still receives the same safe fallback.

## Representative direct-route smoke tests

Replace `<site-url>` with the deployed site URL. A successful check returns the application shell without a Netlify 404.

| Application | Paths to open and refresh |
|---|---|
| Portal | `/`, `/modules`, `/workflow`, `/demo`, `/portfolio`, `/about`, `/limitations` |
| Product Development | `/`, `/projects`, `/projects/bar`, `/transfers`, `/about` |
| Sensory | `/`, `/projects`, `/transfers`, `/test-design`, `/reports`, `/about` |
| Shelf Life | `/`, `/studies`, `/studies/yoghurt`, `/transfers`, `/about` |
| QA | `/`, `/#/dashboard`, `/#/data-explorer`, `/#/lifecycle-transfer`, `/#/about` |

For non-hash paths, paste the full URL into a new browser tab and refresh once after the page renders. For QA, verify that the hash route remains selected after refresh. See Netlify's [redirect syntax documentation](https://docs.netlify.com/routing/redirects/redirect-options/).
