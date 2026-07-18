# FoodLab AI V1.0 live verification

Verification was completed on 18 July 2026 against the canonical HTTPS production URLs. All five deployments reported `ready` through the Netlify CLI.

| Application | Site name | Production URL | Deploy status | Git connected | Route check | Notes |
|---|---|---|---|---|---|---|
| FoodLab AI Portal | `foodlab-ai` | https://foodlab-ai.netlify.app | Ready | No — manual UI action required | 7/7 rendered routes passed | Four real module links rendered; no localhost link or missing-variable message; title, viewport, assets and educational footer verified |
| Food Product Development AI | `foodlab-product-development` | https://foodlab-product-development.netlify.app | Ready | No — manual UI action required | 4/4 live routes passed | Correct title, application shell, assets and educational disclaimer verified |
| Food Sensory AI | `foodlab-sensory` | https://foodlab-sensory.netlify.app | Ready | No — manual UI action required | 4/4 live routes passed | Correct title, application shell, assets and scientific-use disclaimer verified |
| Food Shelf Life Predictor | `foodlab-shelf-life` | https://foodlab-shelf-life.netlify.app | Ready | No — manual UI action required | 4/4 live routes passed | Correct title, application shell, assets and scientific-use disclaimer verified |
| Food QA Dashboard | `foodlab-qa` | https://foodlab-qa.netlify.app | Ready | No — manual UI action required | 4/4 live/hash routes passed | Correct title, application shell, assets and demonstration-limits disclaimer verified |

## Live checks performed

- Portal routes: `/`, `/modules`, `/workflow`, `/portfolio`, `/about`, `/limitations`, `/demo`
- Product Development routes: `/`, `/projects/bar`, `/transfers`, `/about`
- Sensory routes: `/`, `/projects`, `/transfers`, `/about`
- Shelf Life routes: `/`, `/studies/yoghurt`, `/transfers`, `/about`
- QA routes: `/`, `/#/dashboard`, `/#/lifecycle-transfer`, `/#/standards`
- All 23 route requests returned HTTP 200 with the expected application shell and title.
- Headless-browser rendering passed for all seven Portal routes and the disclaimer page in each module.
- Referenced entry assets returned HTTP 200.
- Browser logging found zero application console messages on the five representative rendered pages.
- The Portal rendered all four canonical HTTPS module URLs and no localhost or loopback link.

## Continuous deployment status

The production sites are live from authenticated Netlify CLI deployments. Site inspection shows empty Git repository/build-setting fields, so GitHub continuous deployment is **not yet configured**. The CLI's supported `netlify init` flow reached an interactive GitHub authorization-choice prompt that cannot be completed safely in the non-interactive session. No token was requested or stored, and no API installation identifier was guessed.

Complete the exact UI action documented in [`NETLIFY_PRODUCTION_RELEASE_REPORT.md`](./NETLIFY_PRODUCTION_RELEASE_REPORT.md) for each site.
