# Netlify site plan

## Recommended sites and order

Deploy the four workflow modules first, then deploy the Portal last. This order allows the Portal to be configured with final module URLs before its first production publication.

| Order | Application | Suggested Netlify site name | Intended production URL |
|---:|---|---|---|
| 1 | Product Development | `foodlab-product-development` | `https://foodlab-product-development.netlify.app` |
| 2 | Sensory | `foodlab-sensory` | `https://foodlab-sensory.netlify.app` |
| 3 | Shelf Life | `foodlab-shelf-life` | `https://foodlab-shelf-life.netlify.app` |
| 4 | QA | `foodlab-qa` | `https://foodlab-qa.netlify.app` |
| 5 | Portal | `foodlab-ai` | `https://foodlab-ai.netlify.app` |

Netlify site names are globally unique. If a suggested name is unavailable, use the allocated URL consistently in the environment variables below. Suggested alternatives are:

- Portal: `foodlab-ai-portfolio`
- Product Development: `foodlab-product-dev`
- Sensory: `foodlab-sensory-analysis`
- Shelf Life: `foodlab-shelf-life-study`
- QA: `foodlab-quality-dashboard`

These are planning names only. Do not permanently place a guessed production URL in application source; use the actual Netlify URLs through environment variables after the sites exist.

## Portal environment variables

Set these variables on the Portal site before deploying it:

```dotenv
VITE_PRODUCT_DEVELOPMENT_URL=https://foodlab-product-development.netlify.app
VITE_SENSORY_URL=https://foodlab-sensory.netlify.app
VITE_SHELF_LIFE_URL=https://foodlab-shelf-life.netlify.app
VITE_QA_URL=https://foodlab-qa.netlify.app
```

These exact values are also the checked-in examples. If Netlify assigns a different site URL, replace the corresponding example URL in the Netlify UI; do not commit a local `.env` file.

## Optional module-to-Portal link

Each module accepts the following public build variable:

```dotenv
VITE_PORTAL_URL=https://foodlab-ai.netlify.app
```

Because the Portal is deployed last, either:

1. leave `VITE_PORTAL_URL` unset for the four initial module deployments and redeploy each module after the Portal URL exists; or
2. reserve/create the Portal site name first without publishing, then use its known URL while deploying the modules.

An unset production value must show a friendly unavailable state, not a localhost-only link. These URLs are public routing configuration, never credentials.

## Architecture boundary

The five sites exchange lifecycle records through the existing JSON/local-storage workflow. This plan does not add a database, authentication, Netlify Functions, server-side API, payment flow, multi-tenant layer or other backend. Deployment is a portfolio-hosting step and does not imply commercial validation, regulatory approval or real customer use.

Environment-variable reference: [Netlify environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/).
