# FoodLab AI Integration Audit

Audit date: 2026-07-15  
Scope: `Food_Product_Development_AI`, `Food_Sensory_AI`, `Food_Shelf_Life_Predictor`, and the actual QA directory `Food_QA_Dashboard`.

> Directory note: the brief names `Food_QA_Dashboard_V1`; the workspace contains `Food_QA_Dashboard`. The audit and scripts use the real directory. No original project was renamed, deleted or refactored.

## Executive conclusion

All four applications build and test successfully. They are safe to connect through external Portal links. They are not yet safe to combine into one runtime because their framework versions, global CSS, Tailwind tokens, routing ownership, storage schemas and same-named domain types differ. Phase 1 therefore keeps five independent applications and assigns ports at command time.

| Project | Audit status | Build | Tests | Main minor issues |
|---|---|---:|---:|---|
| Food QA Dashboard | **READY** | Pass | 40/40 | React 19/TS 7/Vite 8 differs from other apps; large Excel chunk but configured threshold |
| Food Product Development AI | **READY WITH MINOR ISSUES** | Pass | 63/63 | Default Vite port collision; chart-size warnings in jsdom tests |
| Food Shelf Life Predictor | **READY WITH MINOR ISSUES** | Pass | 32/32 | Default port collision; 685 kB production chunk warning |
| Food Sensory AI | **READY WITH MINOR ISSUES** | Pass | 35/35 | Default port collision; 760 kB production chunk warning |

No issue required a source-project change for Portal access.

## 1. Technology and operating matrix

| Item | QA Dashboard | Product Development | Shelf Life | Sensory |
|---|---|---|---|---|
| Package name | `food-qa-dashboard` | `food-product-development-ai` | `food-shelf-life-predictor` | `food-sensory-ai` |
| React | 19.2.7 | ^18.3.1 | ^18.3.1 | ^18.3.1 |
| TypeScript | 7.0.2 | ~5.7.2 | ~5.7.2 | ~5.6.3 |
| Vite | 8.1.4 | ^6.0.5 | ^6.0.5 | ^6.0.5 |
| Tailwind | 3.4.17 | ^3.4.17 | ^3.4.17 | ^3.4.17 |
| State | React Context + hooks | Zustand persist v1 | Zustand persist v1 | Zustand persist v1 |
| Routing | Custom hash state | React Router 7 | React Router 7 | React Router 7 |
| Charts | Recharts 3.9.2 | Recharts 2.15 | Recharts 2.15 | Recharts 2.15 |
| CSV | PapaParse 5.5.4 | Custom file utilities / no PapaParse dependency | PapaParse 5.5.2 | PapaParse 5.4.1 |
| Excel | ExcelJS 4.4.0 | — | — | — |
| Forms | Native controlled inputs | React Hook Form + Zod | React Hook Form + Zod | React Hook Form + Zod |
| Statistics | Domain utilities | Domain utilities | simple-statistics + domain utilities | simple-statistics + domain utilities |
| Tests | Vitest 4.1.10 | Vitest 2.1.8 + Testing Library/jsdom | Vitest 2.1.8 | Vitest 4.1.10 |
| Dev command | `vite` | `vite` | `vite` | `vite` |
| Build command | `tsc -b && vite build` | same | same | same |
| Test command | `vitest run` | `vitest run` | `vitest run` | `vitest run` |
| Configured port | None (Vite default 5173) | None | None | None |
| Environment files/reads | None | None | None | None |
| External API | None; only fetches bundled sample CSV | None | None | None |
| Path alias | None | None | None | None |

### Port conclusion

Before orchestration, all projects request Vite's default 5173 and therefore conflict if launched together. The root scripts pass strict ports without changing original configs:

- Portal 5173
- Product Development 5174
- Sensory 5175
- Shelf Life 5176
- QA 5177

## 2. Package dependencies

### Food QA Dashboard

Runtime: `@vitejs/plugin-react@6.0.3`, `date-fns@4.4.0`, `exceljs@4.4.0`, `lucide-react@1.24.0`, `papaparse@5.5.4`, `react@19.2.7`, `react-dom@19.2.7`, `recharts@3.9.2`.  
Development: `@types/node@26.1.1`, `@types/papaparse@5.5.2`, `@types/react@19.2.17`, `@types/react-dom@19.2.3`, `autoprefixer@10.5.2`, `postcss@8.5.19`, `tailwindcss@3.4.17`, `typescript@7.0.2`, `vite@8.1.4`, `vitest@4.1.10`.

### Food Product Development AI

Runtime: `@hookform/resolvers`, `date-fns`, `lucide-react`, `react`, `react-dom`, `react-hook-form`, `react-router-dom`, `recharts`, `zod`, `zustand`.  
Development: Testing Library (`jest-dom`, `react`), React types, Vite React plugin, Autoprefixer, jsdom, PostCSS, Tailwind, TypeScript, Vite, Vitest.

### Food Shelf Life Predictor

Runtime: `@hookform/resolvers`, `date-fns`, `lucide-react`, `papaparse`, `react`, `react-dom`, `react-hook-form`, `react-router-dom`, `recharts`, `simple-statistics`, `zod`, `zustand`.  
Development: PapaParse/React types, Vite React plugin, Autoprefixer, PostCSS, Tailwind, TypeScript, Vite, Vitest.

### Food Sensory AI

Runtime: `@hookform/resolvers`, `date-fns`, `lucide-react`, `papaparse`, `react`, `react-dom`, `react-hook-form`, `react-router-dom`, `recharts`, `simple-statistics`, `zustand`, `zod`.  
Development: PapaParse/React types, Vite React plugin, Autoprefixer, PostCSS, Tailwind, TypeScript, Vite, Vitest.

Versions are recorded verbatim in each original `package.json`; ranges differ even when the library is shared.

## 3. Directory structures

Generated artifacts (`node_modules`, `dist`, `*.tsbuildinfo`) omitted.

### Food QA Dashboard

```text
Food_QA_Dashboard/
├─ .github/workflows/ci.yml
├─ docs/portfolio-case-study.md
├─ public/{sample-food-quality-data.csv,screenshots/}
├─ src/
│  ├─ components/{dashboard,data,layout,ui}/
│  ├─ data/qualityStandards.ts
│  ├─ hooks/{useFilters.ts,useQualityData.tsx}
│  ├─ pages/{DashboardPage,DataExplorerPage,StandardsPage,AboutPage}.tsx
│  ├─ tests/ (5 files)
│  ├─ types/quality.ts
│  ├─ utils/{analytics,csvParser,excelParser,exportCsv,formatting,qualityAssessment,standards}.ts
│  ├─ App.tsx, index.css, main.tsx
├─ package.json, pnpm-lock.yaml
└─ Vite/TypeScript/Tailwind/PostCSS/Netlify configs
```

### Food Product Development AI

```text
Food_Product_Development_AI/
├─ src/
│  ├─ components/{Common.tsx,Layout.tsx}
│  ├─ data/{demoIngredients,demoProjects}.ts
│  ├─ pages/ (10 page files)
│  ├─ store/productDevelopmentStore.ts
│  ├─ test/ (4 test files + setup)
│  ├─ types/productDevelopment.ts
│  ├─ utils/{dataSchemas,developmentSummary,fileIO,formulaCalculations,formulaScaling,projectValidation,sensoryAnalysis,targetAnalysis}.ts
│  ├─ App.tsx, index.css, main.tsx
├─ package.json, pnpm-lock.yaml, pnpm-workspace.yaml
└─ Vite/Vitest/TypeScript/Tailwind/PostCSS configs
```

### Food Shelf Life Predictor

```text
Food_Shelf_Life_Predictor/
├─ public/{sample-sensory-results.csv,sample-shelf-life-results.csv}
├─ src/
│  ├─ data/demoShelfLifeStudies.ts
│  ├─ store/shelfLifeStore.ts
│  ├─ tests/ (10 files)
│  ├─ types/shelfLife.ts
│  ├─ utils/{acceleratedShelfLife,csvImport,exportData,limitAssessment,microbiology,samplingSchedule,shelfLifeModels,statistics,studyEstimate}.ts
│  ├─ App.tsx, index.css, main.tsx
├─ package.json, package-lock.json
└─ Vite/Vitest/TypeScript/Tailwind/PostCSS configs
```

### Food Sensory AI

```text
Food_Sensory_AI/
├─ public/ (four sample sensory CSV files)
├─ src/
│  ├─ components/{charts,layout,ui}/
│  ├─ data/demoSensoryProjects.ts
│  ├─ pages/Pages.tsx
│  ├─ store/sensoryStore.ts
│  ├─ tests/ (10 files)
│  ├─ types/sensory.ts
│  ├─ utils/{blindCodes,commentAnalysis,consumerSegmentation,csvImport,differenceTests,exportData,hedonicAnalysis,jarAnalysis,randomisation,statistics,storage}.ts
│  ├─ App.tsx, index.css, main.tsx
├─ package.json, package-lock.json
└─ Vite/TypeScript/Tailwind/PostCSS configs
```

## 4. Storage keys and persistence

| App | Storage key | Storage structure | Recovery |
|---|---|---|---|
| QA | LocalStorage `food-qa-dashboard-standards-v1`; SessionStorage `food-qa-dashboard-session-v1` | Versioned standards map; uploaded `{records, source}` only for the session | Invalid standards fall back to defaults; session parse failure clears session |
| Product | `food-product-development-ai-v1` | Zustand envelope containing schema version, projects, ingredients and current selection | Zod/schema and relationship validation; demo reset path |
| Shelf Life | `food-shelf-life-data` | Zustand envelope containing studies, selected study and error state/partialised data | Invalid data isolated under `food-shelf-life-data-corrupt-backup` and demos restored |
| Sensory | `food-sensory-ai` | Zustand envelope containing projects and selected project ID | Invalid data backed up under timestamped `food-sensory-ai-corrupt-backup-*` keys |

**Collision result:** no direct key collision. Dynamic corrupt-backup keys are also namespaced. Portal creates no LocalStorage key and does not read these stores.

## 5. JSON, CSV and Excel data portability

- **QA:** CSV/Excel input maps tabular fields to `FoodQualityRecord`; CSV output flattens assessment arrays. No project JSON import/export.
- **Product:** project JSON includes nested `ProductDevelopmentProject`, `ProductBrief`, formula versions/ingredients, sensory tests/responses and development notes. Ingredient/project CSV helpers are separate. Imported structures are schema-checked.
- **Shelf Life:** study JSON contains `ShelfLifeStudy` with conditions, sampling points, parameters and results. Results CSV carries relational IDs and measured values; import validates referenced study elements.
- **Sensory:** project JSON contains samples, tests, panelists and multiple response collections. CSV imports are test-specific (hedonic, JAR, triangle, CATA samples) and use IDs/codes to resolve references.

These formats are not mutually compatible and should not be treated as a shared model. Phase 5 should introduce transfer DTOs instead of importing another app's internal JSON directly.

## 6. Route structures and collisions

### QA (hash router implemented manually)

`#/dashboard`, `#/data-explorer`, `#/standards`, `#/about`.

### Product Development

`/`, `/projects`, `/projects/:id`, `/ingredients`, `/formula`, `/analysis`, `/sensory`, `/compare`, `/reports`, `/about`, plus wildcard redirect.

### Shelf Life

`/`, `/studies`, `/studies/:id`, `/design`, `/results`, `/analysis`, `/models`, `/reports`, `/about`, plus fallback handling.

### Sensory

`/`, `/projects`, `/test-design`, `/samples`, `/panelists`, `/responses`, `/analysis`, `/compare`, `/reports`, `/about`.

Route names collide heavily (`/`, `/projects`, `/analysis`, `/reports`, `/about`) but do not conflict while each app has its own origin/port. A future single-origin deployment must use app base paths or independent hostnames.

## 7. Duplicate components and file names

- `PageHeader` and `fmt` exist in both Product and Sensory `Common.tsx`; implementations are similar but styling contracts differ.
- Card/metric/empty/status/loading concepts recur across all projects under different names and class systems.
- Sidebar/layout/navigation patterns recur in Product, Shelf Life and Sensory; QA instead uses a top header and tab navigation.
- `DashboardPage` and `AboutPage` names recur, but content and ownership differ.
- `App.tsx`, `main.tsx`, `index.css`, `statistics.ts`, `exportData.ts`/`fileIO.ts` and test filenames recur with different implementations.

These are candidates for a design system or shared utilities, not safe copy-and-paste deduplication.

## 8. Duplicate utility functions

Cross-project exported-name matches found by source scan:

- `calculateMean`, `calculateMedian`, `calculateStandardDeviation`: Product sensory analysis, Sensory statistics and Shelf Life statistics.
- `calculateAttributeSummary`: Product and Sensory, with different response/type contexts.
- `downloadText`: Product and Sensory; Shelf Life has an equivalent `download` helper.
- CSV parse/export and JSON download patterns recur in all data-heavy modules.
- `clone`/`now`/UUID generation and safe LocalStorage adapters recur in Zustand stores.
- Status formatting and numeric `fmt`/`formatNumber` utilities recur.

Risk: null handling, sample-vs-population standard deviation, rounding and warning conventions are not guaranteed identical. Consolidate only after contract tests.

## 9. Duplicate and conflicting TypeScript types

- `ProjectStatus` exists in Product and Sensory; Shelf Life uses `StudyStatus`. Product omits `PLANNING`, while Sensory/Shelf Life include it.
- `SensoryTest` exists in Product and Sensory but means different records. Product links a test to one `formula_id` and embeds responses; Sensory links to `project_id`, many `sample_ids`, panel design and separate response collections.
- Project records share `project_id`, `project_name`, `project_code`, `created_at`, `updated_at`, but their nested ownership and optional fields differ.
- Product `FormulaVersion.formula_id`; Sensory uses optional string `formula_version`; Shelf Life also uses optional string `formula_version`. The latter two are not enforced foreign keys.
- `sample_id` means a sensory sample in Sensory, while QA uses `sample_id` for a quality row; Shelf Life uses `sampling_point_id` and result IDs.
- `batch_number` appears as an optional string in Sensory/Shelf Life and a required QA record field; Product has no canonical batch entity.
- Result/status unions have incompatible vocabularies: `PASS/WARNING/FAIL`, `ACCEPTABLE/UNACCEPTABLE`, project/study lifecycle statuses, formula statuses and sample statuses.

### Identifier consistency result

`project_id` is common but semantically module-owned. `formula_id` is used only in Product; other modules carry an unvalidated `formula_version` string. There is no canonical `product_id`, workspace ID or shared batch ID. The roadmap therefore recommends explicit namespaced identifiers and adapters rather than global renaming.

## 10. UI and CSS differences

- **QA:** light top-navigation dashboard, navy/slate palette, compact analytical tables and cards, Tailwind component classes.
- **Product:** navy/teal sidebar application, Tailwind utility-heavy pages, card-based NPD workspace.
- **Shelf Life:** custom global CSS, navy research sidebar, purple status accent, much of the UI concentrated in one large `App.tsx`.
- **Sensory:** custom global CSS with teal/amber/purple palette, sidebar shell and consolidated page/component files.

Global selectors (`body`, buttons, inputs, headings, `.card`, `.nav`, `.badge`, etc.) would collide in a combined document. Tailwind extensions also define different values for `navy`, `teal`, `lab`, amber and purple. No CSS should be concatenated in Phase 1.

## 11. Naming and model conflicts

- Package names are unique; no npm package-name collision.
- Route names collide but are isolated by port.
- File names collide but are isolated by project directory.
- QA naming mixes snake_case data fields with camelCase standards; the other domain models primarily use snake_case fields plus camelCase store actions.
- Sensory is represented both as a full standalone domain and as a smaller embedded Product submodel.
- Quality limits, shelf-life limits and product targets overlap conceptually but have different structures and validation semantics.
- Demo flags differ (`is_demo`, `demo`, `isSample`), as do archive and recovery conventions.

## 12. Shareable code candidates

1. Brand/design tokens and accessible UI primitives.
2. File download, safe URL creation and PapaParse wrappers.
3. Validated versioned JSON envelope and LocalStorage recovery adapter.
4. Pure statistics functions after formula/edge-case reconciliation.
5. Common date/number formatting.
6. Status badges and notice/disclaimer patterns with module-specific status mappings.
7. TypeScript, Tailwind, Vitest and lint/build configuration packages.
8. Transfer-contract identifiers and provenance metadata—not internal store models.

## 13. Integration risks

| Risk | Severity | Mitigation |
|---|---|---|
| Global CSS/Tailwind collisions | High | Keep isolated apps; introduce scoped shared design system gradually |
| Same type name, different meaning | High | Transfer DTOs and adapters; never barrel-export all internal types |
| LocalStorage migrations/data loss | High | Preserve keys; version migrations; backup and rollback tests |
| Framework major-version divergence | Medium | Align after workspace migration, one app at a time |
| Route collisions | Medium | Separate ports now; later use `/apps/*` bases or subdomains |
| Statistics behaviour divergence | Medium | Golden tests for nulls, rounding, denominators and small samples |
| Large bundles in Shelf Life/Sensory | Low/Medium | Route-level code splitting in a later performance phase |
| Internal JSON mistaken for shared contract | High | Versioned, validated transfer envelopes with source provenance |
| Unified DB introduced too early | High | Defer until ownership, IDs, roles, audit and migration are defined |

## 14. Verification record

Executed from the actual project directories on 2026-07-15:

- QA: TypeScript + Vite build passed; 5 files / 40 tests passed.
- Product: TypeScript + Vite build passed; 4 files / 63 tests passed. Recharts emitted non-failing zero-size warnings under jsdom.
- Shelf Life: TypeScript + Vite build passed; 10 files / 32 tests passed. Vite emitted a >500 kB chunk warning.
- Sensory: TypeScript + Vite build passed; 10 files / 35 tests passed. Vite emitted a >500 kB chunk warning.
- Portal: 10 tests passed; TypeScript check passed; Vite production build passed.

No original source file, LocalStorage key or Vite config was changed during this audit.

### Development-server smoke check

The unified `dev:all` command was executed with strict ports. Two stale Vite processes were found with a misplaced `--` separator, causing their requested 4173/4178 port arguments to be ignored and Vite to occupy 5173/5174 instead. The stale development processes were stopped, after which all five applications bound their assigned ports and returned HTTP 200: Portal 5173, Product Development 5174, Sensory 5175, Shelf Life 5176 and QA 5177. The smoke-test processes were then shut down cleanly, leaving no listener behind.

Portal visual smoke checks were also completed on an isolated temporary port at 1440 px desktop width and 390 px mobile width. The home page and responsive lifecycle layout rendered correctly.
