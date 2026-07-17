# FoodLab AI Portal

FoodLab AI Portal is the V1.0 unified brand, navigation, and lifecycle guide for four independently runnable food-science applications. It does not embed their source code, merge their LocalStorage, or introduce a backend.

## Run

```bash
npm install
npm run dev
npm run test
npm run build
```

The Portal uses `http://localhost:5173`. During local development, missing module URL variables safely fall back to ports 5174-5177. For Netlify, configure the four `VITE_*_URL` values in the site UI using the actual deployed module URLs; `.env.example` contains non-sensitive deployment placeholders and no real `.env` should be committed.

## Scope

- Unified FoodLab AI brand and module directory
- Responsive food-product lifecycle
- Module status, capabilities and availability check
- Portfolio and author pages
- External links to the four configured applications
- Workflow guidance for Product Development to Sensory, Sensory to Shelf Life, and Shelf Life to QA
- Downloadable schema `1.0.0` examples and transfer-contract resources

Cross-module transfer remains explicit and user controlled: a source module downloads JSON, the target previews and validates it, and the user confirms record creation. The Portal does not transmit module records in the background.

This is an educational portfolio platform and not a validated commercial, regulatory or food safety approval system.
