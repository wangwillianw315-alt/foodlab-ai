# Netlify deployment steps

These steps intentionally stop at a reproducible manual procedure. Repository preparation did not log in to Netlify, connect the GitHub repository, create sites or deploy production builds.

## 1. Verify the release locally

From the repository root:

```bash
npm run test:all
npm run build:all
npm run verify:netlify
```

Proceed only when all tests and all five application builds pass.

## 2. Connect the repository for each site

In the Netlify UI:

1. Choose **Add new project** (or **Add new site**, depending on the current UI) → **Import an existing project**.
2. Select **GitHub**, then select `wangwillianw315-alt/foodlab-ai`.
3. Select the production branch (`main` unless the repository policy changes).
4. Enter one application's exact settings from [`netlify-directory-map.md`](./netlify-directory-map.md):
   - **Base directory:** the exact application directory;
   - **Package directory:** leave blank;
   - **Build command:** `npm run build`;
   - **Publish directory:** `dist`.
5. Confirm Node.js 20. The application `netlify.toml` also declares `NODE_VERSION = "20"`.
6. Save the site configuration.

If Netlify auto-detection leaves Base directory blank and fills Package directory instead, override it manually with the settings above. Follow the recommended module-first, Portal-last order in [`netlify-site-plan.md`](./netlify-site-plan.md).

## 3. Configure public frontend URLs

Before the Portal build, add these Portal variables in **Site configuration → Environment variables**:

```dotenv
VITE_PRODUCT_DEVELOPMENT_URL=https://foodlab-product-development.netlify.app
VITE_SENSORY_URL=https://foodlab-sensory.netlify.app
VITE_SHELF_LIFE_URL=https://foodlab-shelf-life.netlify.app
VITE_QA_URL=https://foodlab-qa.netlify.app
```

Use the actual Netlify URLs if the suggested site names were unavailable. Optionally set this on each module after the Portal URL is known:

```dotenv
VITE_PORTAL_URL=https://foodlab-ai.netlify.app
```

Do not paste API keys or private credentials into `VITE_*` variables; Vite exposes them to client-side JavaScript.

## 4. Deploy and validate each module

For each site:

1. Trigger a production deploy from the selected Git commit.
2. Confirm the log runs `npm run build` successfully with Node 20.
3. Confirm the published directory is `dist`.
4. Open the home page and the representative routes in [`netlify-directory-map.md`](./netlify-directory-map.md).
5. Paste each non-hash route into a new tab and refresh it. It must render the SPA, not a Netlify 404.
6. Exercise the existing JSON transfer/import flow and confirm the scientific disclaimers remain visible.
7. Check browser developer tools for missing assets and unexpected runtime errors.

The `netlify.toml` and `public/_redirects` fallback rules cover SPA refreshes. Do not add a database, authentication layer, Netlify Function or backend as part of this deployment.

## 5. Deploy and validate the Portal last

After all four module URLs work:

1. verify all four Portal environment variables use HTTPS and the final module URLs;
2. deploy the Portal;
3. open every module card and verify it opens the correct external site in a new tab;
4. refresh `/modules`, `/workflow`, `/demo`, `/portfolio`, `/about` and `/limitations` directly;
5. confirm no deployed link points to `localhost` or `127.0.0.1`.

## 6. Optional build optimization

After the baseline deployments are stable, the optional ignore commands in [`netlify-ignore-builds.md`](./netlify-ignore-builds.md) may be copied into each site's Netlify UI. They are deliberately not enabled in `netlify.toml`, so an incorrect optimization cannot silently suppress an initial deployment.

Official references: [Netlify monorepos](https://docs.netlify.com/build/configure-builds/monorepos/), [Vite deployment](https://docs.netlify.com/frameworks/vite/), [environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/), and [redirects](https://docs.netlify.com/routing/redirects/).
