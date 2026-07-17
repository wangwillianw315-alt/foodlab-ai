# Deployment metadata audit

## Current coverage

All five application entry documents include the essential V1.0 portfolio metadata:

- UTF-8 charset and a responsive viewport;
- a unique document title and application name;
- a module-specific description;
- author attribution to Tianyi Wang;
- version `1.0.0`;
- basic Open Graph type, title and description.

| Application | Title, description, viewport | Application name | V1.0 visible | Educational disclaimer | Developer attribution | Favicon | Social preview |
|---|---|---|---|---|---|---|---|
| `FoodLab_AI_Portal` | complete | complete | complete | visible | visible | deferred | text-only Open Graph complete; image deferred |
| `Food_Product_Development_AI` | complete | complete | complete | visible | visible | deferred | text-only Open Graph complete; image deferred |
| `Food_Sensory_AI` | complete | complete | complete | visible | visible | visible | deferred | text-only Open Graph complete; image deferred |
| `Food_Shelf_Life_Predictor` | complete | complete | complete | visible | visible | visible | deferred | text-only Open Graph complete; image deferred |
| `Food_QA_Dashboard` | complete | complete | complete | visible | visible | visible | deferred | text-only Open Graph complete; image deferred |

The visible developer attribution is: **Tianyi Wang · Bachelor of Food Science · Lincoln University, New Zealand**. The entry-document author metadata uses Tianyi Wang. Each application also retains an educational/scientific limitation statement in its rendered interface.

The descriptions present the applications as educational, local-first food-science portfolio tools. They do not claim commercial validation, regulatory approval or real customers.

## Deferred, non-blocking metadata

- A branded favicon is not yet included.
- A social-sharing image and `og:image` are not yet included.
- Canonical URLs and `og:url` should be added only after the final Netlify URLs or custom domains are confirmed.

These items affect visual polish and link previews, not build correctness, application navigation, JSON transfer behavior or SPA routing. They are therefore non-blocking for the V1.0 deployment preparation and should not be replaced with placeholder production URLs.

## Post-domain follow-up

After final domains are stable, create one approved FoodLab AI visual asset set, add appropriately sized favicon files, add a share image, and update canonical/Open Graph URLs across all five entry documents. Re-run builds and inspect the generated `dist/index.html` files before publishing the metadata revision.
