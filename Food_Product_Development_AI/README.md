# Food Product Development AI

A local-first V1.0 portfolio application for managing food product development projects, product briefs, formula versions, ingredient costs, estimated nutrition, sensory evaluation, target gaps and structured development summaries. It is designed for food science students, Food Technologists, Product Development Technologists and NPD teams.

> Demonstration and educational use only. This is not a regulatory, food-safety, nutrition-labelling, shelf-life or commercial manufacturing approval system.

## Food science value

The application makes formulation decisions traceable: a brief defines targets, each formula version captures ingredient quantities and processing yield, calculations show cost and estimated composition, sensory evidence is summarized, and a gap table keeps the next trial focused. Three clearly marked demo projects are included on first launch.

## Technology

React, TypeScript, Vite, Tailwind CSS, Recharts, Zustand, React Hook Form/Zod-ready validation utilities, Lucide React, date-fns and Vitest. Data is saved in browser LocalStorage using schema version `1`; there is no server, cloud database, login, payment or external AI API.

## Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To validate the project:

```bash
npm run test
npm run build
```

## Main features

- Create, edit, duplicate, delete, import and export product development projects.
- Manage a Product Brief with targets, attributes, constraints and planning claims.
- Search/filter 36 demonstration ingredients; add/edit/delete custom records; import/export CSV.
- Build multiple formula versions with editable and drag-reorderable lines, automatic percentages, cost, serving cost and yield-adjusted cost.
- Scale by target batch weight, multiplier or serving count into a new, non-destructive version.
- Estimate energy, protein, fat, carbohydrate, sugar, fibre and moisture before processing or with yield adjustment.
- Create sensory tests, enter panelist responses manually or import 1–9 scores from CSV, warn on duplicate panelist IDs, summarize mean/median/sample standard deviation/range and count comment keywords.
- Compare up to four versions using real Brief-match scoring, benchmark highlights and linked sensory attribute profiles; missing values are excluded rather than treated as zero.
- Analyse Top 5 ingredient cost contributors, selectable nutrient contribution, target-cost variance and Product Brief gaps in a dedicated Analysis workspace.
- Generate a printable Development Summary from a shared report model, including before/yield-adjusted estimates, Top 5 costs, sensory statistics, target gaps, risks and next-trial notes; export Markdown, JSON and formula CSV.
- Preserve project relationships when duplicating or deleting formulas, and reject imported JSON with duplicate IDs or orphaned sensory-test references.

## FoodLab AI Phase 2 hand-off

Open **Send to Sensory** to create a user-controlled `PRODUCT_TO_SENSORY` JSON file using schema version `1.0.0`. Select one to four formula versions, review editable sample names and sensory suggestions, then download the file and import it explicitly in Food Sensory AI. Nothing is transmitted in the background.

Cross-module `workspace_id`, `product_project_id`, `product_id` and `formula_version_id` fields remain optional for legacy projects and are assigned lazily on first export. Existing project IDs and the `food-product-development-ai-v1` LocalStorage data remain unchanged. Workspace identity uses `foodlab-workspace-id`; transfer-history metadata uses `foodlab-product-development-transfer-history-v1` and never stores the full payload. Supplier identity and line-level cost data are excluded; the optional aggregate sample cost is unchecked by default.

## Data structure

`ProductDevelopmentProject` owns its `ProductBrief`, `FormulaVersion[]`, `SensoryTest[]` and development notes. Formula lines reference the ingredient library by stable ID and retain cost at the version level for traceability. State persistence wraps `{ schemaVersion: 1, data/state: ... }`; corrupt data falls back safely and the UI offers demo-data restoration.

## Formula calculations

- Ingredient percentage = ingredient amount ÷ total formula weight × 100
- Line cost = ingredient amount (kg) × ingredient cost/kg
- Formula cost = sum of available line costs; if any cost is missing, no false total is shown
- Cost/kg = formula cost ÷ total input weight (kg)
- Final product weight = input weight × processing yield %
- Yield-adjusted cost/kg = formula cost ÷ final product weight (kg)

Negative/invalid amounts and zero-weight scaling are rejected. Scaling rounds lines to two decimal places and reports the rounding difference.

## Nutrition estimation

For each nutrient, the application calculates `sum(ingredient grams × nutrient per 100 g) ÷ total formula grams`. A yield-adjusted view applies the assumed output-weight change. Missing composition values produce an `incomplete` state instead of a fabricated value.

This is a formulation estimate only and is not a replacement for laboratory analysis or legally compliant nutrition information. V1 does not produce an Australian/New Zealand Nutrition Information Panel.

## Sensory analysis

Sensory scores use a 1–9 range. Missing scores are excluded attribute-by-attribute; out-of-range scores are rejected. The app reports mean, median, sample standard deviation, min/max and response count. Comment analysis is literal keyword frequency only, not sentiment analysis.

## Portfolio use

In an interview, demonstrate creation of a Product Brief, two formula versions, nutrition and cost comparison, sensory CSV import, target-gap interpretation and a Development Summary export.

Suggested résumé line:

> Developed a browser-based food product development platform for managing formulation versions, ingredient costs, estimated nutrition and sensory evaluation data using React and TypeScript.

## Disclaimer

All bundled ingredient, formula, cost, nutrition and sensory values are illustrative. Verify supplier specifications, laboratory results, processing assumptions, allergens, food-safety controls and applicable regulatory requirements before any real use. Claims are planning labels only; eligibility is not assessed in V1.

## Post-V1 roadmap

Potential future work includes editable nutrition-label templates, supplier specification documents, formula approval flows, trial batch records, an allergen matrix, processing-flow and packaging-trial tools, and PDF export.

Platform-level work may later extract shared contract and design packages, add compatibility fixtures, and evaluate database or account features only after data ownership, privacy and migration requirements are defined.
