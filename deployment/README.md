# FoodLab AI Deployment Notes

FoodLab AI V1.0 is designed as five independently built frontend applications. No shared backend, database, authentication service, or secret deployment token is required.

## Local ports

| Application | Port |
|---|---:|
| Portal | 5173 |
| Product Development | 5174 |
| Sensory | 5175 |
| Shelf Life | 5176 |
| QA | 5177 |

Run all applications locally with:

```bash
npm run dev:all
```

## Production builds

From the repository root:

```bash
npm run build:all
```

Each application writes its own ignored `dist/` directory.

## Portal module URLs

The Portal defaults to the local ports above. For another environment, copy `FoodLab_AI_Portal/.env.example` to a local `.env` and set:

```dotenv
VITE_PRODUCT_DEVELOPMENT_URL=https://example.invalid/product-development
VITE_SENSORY_URL=https://example.invalid/sensory
VITE_SHELF_LIFE_URL=https://example.invalid/shelf-life
VITE_QA_URL=https://example.invalid/qa
```

The values are public frontend URLs, not credentials. Real `.env` files and deployment-provider state are ignored and must not be committed.

## Current status

The repository prepares the V1.0 source and build process for public portfolio hosting. A unified live demo URL has not yet been added. Deployment does not imply commercial validation, regulatory approval, or suitability for production food-safety decisions.
