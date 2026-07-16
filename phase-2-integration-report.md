# FoodLab AI Integration Phase 2 Report

Date: 2026-07-16  
Scope: shared identity, consistent module shell and explicit cross-module JSON transfer

## Outcome

FoodLab AI now demonstrates one user-controlled lifecycle while retaining five independent frontend applications:

```text
Product Development
  → PRODUCT_TO_SENSORY 1.0.0
Sensory Evaluation
  → SENSORY_TO_SHELF_LIFE 1.0.0
Shelf-Life Validation
  → SHELF_LIFE_TO_QA 1.0.0
QA Monitoring
```

Every handoff is an explicit JSON download and import. The target previews and validates the file before creating a new local record. There is no database, login, background synchronisation, payment, multi-tenancy or Monorepo relocation.

## Scope decision from the Phase 1 audit

Only issues that could break or misrepresent a cross-module transfer were changed.

| Audit minor issue | Phase 2 decision |
|---|---|
| All applications originally requested Vite port 5173 | Already isolated by the Phase 1 root runner; retained fixed ports 5173–5177 |
| Product Recharts zero-size warnings in jsdom | Deferred; test-environment warning does not affect transfer data |
| Shelf Life and Sensory production chunk warnings | Deferred to a later performance phase |
| QA React/TypeScript/Vite generation differs from the other apps | Preserved; runtime isolation is intentional until Monorepo migration |
| QA Excel bundle threshold | Preserved; unrelated to lifecycle transfer |

No additional charts, complex statistics or unrelated UI polish were added.

## Backup and rollback

The pre-change source/configuration snapshot is stored at:

`phase-2-backups/2026-07-16-before-phase-2/`

It contains the five application source trees plus their package/configuration files and the Phase 1 root documentation. New Phase 2 files can be removed and backed-up files copied back to restore the Phase 1 state. No existing project or LocalStorage key was deleted.

## Shared contracts

The `shared-contracts/` directory contains:

- `foodlab-envelope.schema.json`
- `product-to-sensory.schema.json`
- `sensory-to-shelf-life.schema.json`
- `shelf-life-to-qa.schema.json`
- `ID-FORMAT.md`
- `README.md`
- `CHANGELOG.md`
- one documented example for each transfer direction

The schemas use JSON Schema Draft 2020-12, currently support exactly `1.0.0`, allow unknown optional fields, and require FoodLab envelope provenance plus a non-empty disclaimer. Importers reject malformed JSON, an unsupported schema version, the wrong direction, invalid identifiers, broken source-record lineage and invalid payload fields without overwriting destination data.

## Identifier model

Phase 2 adds optional mapping fields while leaving each application's internal IDs intact:

| Prefix | Meaning |
|---|---|
| `WS-` | Workspace |
| `PD-` | Product development project |
| `PR-` | Product |
| `FV-` | Formula version |
| `SN-` | Sensory project |
| `ST-` | Sensory test |
| `SL-` | Shelf-life study |
| `QA-` | QA product standard |
| `BA-` | Batch monitoring project |
| `TX-` | Transfer |

New IDs use an uppercase hexadecimal suffix of at least eight characters. Runtime validation also accepts lowercase hexadecimal suffixes for compatibility. The workspace key is generated lazily under `foodlab-workspace-id`; an imported record continues to carry the workspace ID from its source transfer even though browser storage is isolated by application port.

## Features implemented

### Product Development → Sensory

- Select one project and up to four formula versions.
- Edit sample names, allergens, objective, suggested test types and attributes before export.
- Supplier/formula cost summaries are excluded by default and only included by explicit opt-in.
- Export preserves `workspace_id`, `product_project_id`, `product_id` and every `formula_version_id`.
- Sensory validates and previews the file, creates a new project, generates unique three-digit blind codes and retains linked-source IDs.
- Cost data is deliberately ignored by Sensory and produces a visible warning when present.

### Sensory → Shelf Life

- Select one shortlisted sample and an optional sensory test.
- Export aggregate liking, response count, purchase-intent summary, JAR findings, keywords, observations, limitations and recommended monitoring focus.
- Panelist, participant, demographic and response-row data are never exported.
- Shelf Life previews the aggregate evidence, requires user-entered storage conditions and user-confirmed limits, then creates a new study.
- Product/formula/sensory lineage and sensory limitations are preserved; Overall Acceptability is offered as an optional parameter.

### Shelf Life → QA

- Select the main storage condition, planning shelf life, packaging notes and monitored parameters.
- Only parameters whose limits and warning rule were explicitly confirmed by the user enter the transfer.
- The file includes scientific limitations and warns that planning limits are not regulatory specifications.
- QA strictly validates and previews the transfer, then offers Create as new standard, Save as draft or Cancel.
- A successful import creates a QA-owned linked standard and batch-monitoring project without changing built-in demonstration standards.
- Active linked standards are available to QA assessment for supported parameter mappings; unsupported parameter names remain visible planning specifications rather than being silently reinterpreted.

## Transfer examples

Canonical examples:

- `shared-contracts/examples/product-to-sensory.example.json`
- `shared-contracts/examples/sensory-to-shelf-life.example.json`
- `shared-contracts/examples/shelf-life-to-qa.example.json`

Exact downloadable copies are published under `FoodLab_AI_Portal/public/transfers/` and linked from the Portal Workflow page.

## Compatibility and LocalStorage migration

- Existing module store shapes and keys remain in place.
- All cross-module ID fields are optional on old internal records.
- Old demo data is read without an eager rewrite.
- Imports always append a new destination-owned record or return a duplicate error; they never silently replace an existing record.
- Transfer histories contain only envelope/result metadata, not full payloads.
- No data is uploaded, synchronised across origins or migrated to a database.

Phase 2 keys:

| Application | Key | Purpose |
|---|---|---|
| Product, Sensory and Shelf Life | `foodlab-workspace-id` | Lazily generated workspace identity; QA preserves the incoming workspace ID inside its linked record without writing this key |
| Product Development | `foodlab-product-development-transfer-history-v1` | Export history metadata |
| Sensory | `foodlab-sensory-transfer-history-v1` | Import/export history metadata |
| Shelf Life | `foodlab-shelf-life-transfer-history` | Import/export history metadata |
| QA | `food-qa-dashboard-transfer-history-v1` | Import history metadata |
| QA | `food-qa-dashboard-linked-products-v1` | Imported product with its nested linked standard and batch-monitoring project, written atomically |

## Verification

The final root-level verification was executed after all fixes:

| Target | Test files | Tests | TypeScript | Production build |
|---|---:|---:|---:|---:|
| Portal | 1 | 12/12 | Pass | Pass |
| Product Development | 5 | 79/79 | Pass | Pass |
| Sensory | 11 | 47/47 | Pass | Pass |
| Shelf Life | 11 | 47/47 | Pass | Pass |
| QA Dashboard | 6 | 57/57 | Pass | Pass |
| **Application total** | **34** | **242/242** | **Pass** | **Pass** |

`npm run test:all` also passed the root contract check: 3 examples and 4 schemas. `npm run build:all` completed all five production builds. Product emitted only its pre-existing Recharts zero-size jsdom warning; Shelf Life and Sensory emitted only their pre-existing chunk-size warnings.

The five applications were then started together and returned HTTP 200 on their assigned ports:

- Portal Workflow: 5173
- Product transfer page: 5174
- Sensory transfer page: 5175
- Shelf Life transfer page: 5176
- QA lifecycle transfer page: 5177

All three Portal example downloads returned HTTP 200 with `application/json`. Browser smoke tests loaded the canonical shared example into each target importer, rendered all three previews and recorded zero page errors. The Portal Workflow also rendered at 1440 px and at 390 px with a 390 px document width and no horizontal overflow.

Existing demo and saved-data compatibility remains covered by the original test suites plus new legacy-record tests. Cross-module IDs remain optional for old module records, and no import test overwrote an existing destination record.

## Changed files

The pre-change snapshot contains 166 files. The following 70 source/documentation files were created or modified; backup copies and generated build output are excluded from this list.

### Root and shared contracts

- `README.md`
- `package.json`
- `integration-roadmap.md`
- `phase-2-integration-report.md`
- `shared-design-system.md`
- `scripts/validate-phase2-contracts.mjs`
- `shared-contracts/README.md`
- `shared-contracts/ID-FORMAT.md`
- `shared-contracts/CHANGELOG.md`
- `shared-contracts/foodlab-envelope.schema.json`
- `shared-contracts/product-to-sensory.schema.json`
- `shared-contracts/sensory-to-shelf-life.schema.json`
- `shared-contracts/shelf-life-to-qa.schema.json`
- `shared-contracts/examples/product-to-sensory.example.json`
- `shared-contracts/examples/sensory-to-shelf-life.example.json`
- `shared-contracts/examples/shelf-life-to-qa.example.json`

### Portal

- `FoodLab_AI_Portal/src/data/modules.ts`
- `FoodLab_AI_Portal/src/data/workflow.ts`
- `FoodLab_AI_Portal/src/pages/WorkflowPage.tsx`
- `FoodLab_AI_Portal/src/tests/portal.test.tsx`
- `FoodLab_AI_Portal/src/index.css`
- `FoodLab_AI_Portal/public/transfers/product-to-sensory.example.json`
- `FoodLab_AI_Portal/public/transfers/sensory-to-shelf-life.example.json`
- `FoodLab_AI_Portal/public/transfers/shelf-life-to-qa.example.json`

### Product Development

- `Food_Product_Development_AI/README.md`
- `Food_Product_Development_AI/src/App.tsx`
- `Food_Product_Development_AI/src/components/Layout.tsx`
- `Food_Product_Development_AI/src/pages/AboutPage.tsx`
- `Food_Product_Development_AI/src/pages/FormulaBuilderPage.tsx`
- `Food_Product_Development_AI/src/pages/TransfersPage.tsx`
- `Food_Product_Development_AI/src/store/productDevelopmentStore.ts`
- `Food_Product_Development_AI/src/test/foodlabTransfer.test.ts`
- `Food_Product_Development_AI/src/types/foodlabTransfer.ts`
- `Food_Product_Development_AI/src/types/productDevelopment.ts`
- `Food_Product_Development_AI/src/utils/dataSchemas.ts`
- `Food_Product_Development_AI/src/utils/foodlabTransfer.ts`
- `Food_Product_Development_AI/src/utils/transferHistory.ts`

### Sensory

- `Food_Sensory_AI/src/App.tsx`
- `Food_Sensory_AI/src/index.css`
- `Food_Sensory_AI/src/components/layout/FoodLabHeader.tsx`
- `Food_Sensory_AI/src/pages/TransfersPage.tsx`
- `Food_Sensory_AI/src/store/sensoryStore.ts`
- `Food_Sensory_AI/src/tests/transfers.test.ts`
- `Food_Sensory_AI/src/types/sensory.ts`
- `Food_Sensory_AI/src/types/transfers.ts`
- `Food_Sensory_AI/src/utils/foodlabIds.ts`
- `Food_Sensory_AI/src/utils/transferHistory.ts`
- `Food_Sensory_AI/src/utils/transfers.ts`

### Shelf Life

- `Food_Shelf_Life_Predictor/src/App.tsx`
- `Food_Shelf_Life_Predictor/src/index.css`
- `Food_Shelf_Life_Predictor/src/components/TransferWorkspace.tsx`
- `Food_Shelf_Life_Predictor/src/store/shelfLifeStore.ts`
- `Food_Shelf_Life_Predictor/src/tests/foodlabTransfer.test.ts`
- `Food_Shelf_Life_Predictor/src/types/foodlabTransfer.ts`
- `Food_Shelf_Life_Predictor/src/types/shelfLife.ts`
- `Food_Shelf_Life_Predictor/src/utils/foodlabTransfer.ts`
- `Food_Shelf_Life_Predictor/src/utils/transferHistory.ts`

### QA Dashboard

- `Food_QA_Dashboard/src/App.tsx`
- `Food_QA_Dashboard/src/components/data/RecordDetails.tsx`
- `Food_QA_Dashboard/src/components/layout/Header.tsx`
- `Food_QA_Dashboard/src/components/layout/Navigation.tsx`
- `Food_QA_Dashboard/src/hooks/useQualityData.tsx`
- `Food_QA_Dashboard/src/pages/LifecycleTransferPage.tsx`
- `Food_QA_Dashboard/src/pages/StandardsPage.tsx`
- `Food_QA_Dashboard/src/tests/transfer.test.ts`
- `Food_QA_Dashboard/src/types/quality.ts`
- `Food_QA_Dashboard/src/types/transfer.ts`
- `Food_QA_Dashboard/src/utils/csvParser.ts`
- `Food_QA_Dashboard/src/utils/qualityAssessment.ts`
- `Food_QA_Dashboard/src/utils/transfer.ts`

Generated `dist/` output and TypeScript build cache files are not counted as source changes.

## Known limitations

- Applications remain separate origins; movement is by explicit file, not automatic synchronisation.
- Contract `1.0.0` has no shared backend, central audit log, checksum/signature or concurrency control.
- QA can automatically assess only recognised dashboard parameters; other imported parameters remain documented specifications for later mapping.
- Transferred values are planning evidence, not regulatory approval, a validated product specification, an official shelf-life date or proof of food safety.
- Browser storage availability and capacity still depend on the local browser.
- Existing Recharts test-environment warnings and large Shelf Life/Sensory bundles remain deferred.

## Remaining Phase 3 work

The detailed Monorepo proposal is in `integration-roadmap.md`. It freezes the transfer contracts first, introduces workspace plumbing without domain refactors, extracts small runtime contract/design packages, moves one app at a time with rollback checks, and delays dependency alignment and code deduplication until all five apps build from the workspace.

A database, authentication, payments, multi-tenancy and complex permissions remain outside that migration.
