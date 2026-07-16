# FoodLab AI Integration Roadmap

## Current architecture decision

FoodLab AI currently consists of a thin Portal and four independently runnable React applications. Phase 2 connects them with explicit JSON files and shared lifecycle identifiers while preserving every module's routes, internal data model and LocalStorage ownership.

This is the deliberate boundary for the current release: no database, authentication, background synchronisation or Monorepo relocation has been introduced.

## Phase 1 — Unified Portal (complete)

- Shared FoodLab AI brand, module directory and lifecycle narrative
- Environment-configurable external module links
- Module status and optional URL availability checks
- Portfolio, About and responsive lifecycle pages
- Independent builds, tests and browser storage retained

## Phase 2 — Identity and cross-module workflow (complete)

- FoodLab AI header, Portal return link, module name, status and disclaimer in all four applications
- Optional mapping IDs for workspace, product project, product, formula version, sensory project/test, shelf-life study, QA product, batch and transfer
- Versioned JSON Schema 2020-12 contracts for all three handoffs
- Explicit Product Development → Sensory export/import
- Aggregate-only Sensory → Shelf Life export/import
- User-confirmed-limit-only Shelf Life → QA export/import
- Import preview, explicit confirmation, new-record creation and duplicate protection
- Module-specific transfer histories that retain metadata rather than full transfer payloads
- Existing LocalStorage records remain readable without an eager migration

The shared schema and example files are the interoperability boundary. Module-owned project JSON is still private and must not be imported directly by another module.

## Phase 3 — Controlled Monorepo integration plan

Phase 3 is a plan, not part of the current implementation. It should start only after the Phase 2 contract version is frozen and the complete transfer workflow has been demonstrated with representative data.

### Gate 1: freeze and protect the boundary

- Tag the `1.0.0` transfer contracts and add schema fixtures for valid, invalid and forward-compatible files.
- Add cross-application contract tests to CI before moving any directory.
- Export representative LocalStorage backups from all four modules and document rollback steps.
- Record current test totals, build output, routes and bundle warnings as the migration baseline.

### Gate 2: create workspace plumbing without refactoring apps

Introduce a pnpm workspace and move only the Portal first. Keep each application's package name, scripts, Vite base, routes and storage keys unchanged.

```text
apps/
  portal/
  product-development/
  sensory/
  shelf-life/
  qa-dashboard/
packages/
  contracts-core/
  contracts-product/
  contracts-sensory/
  contracts-shelf-life/
  contracts-qa/
  design-system/
  config-typescript/
  config-vite/
  config-tailwind/
```

Exit criterion: the moved Portal has byte-equivalent public transfer examples, passes its existing tests and still opens the four unchanged local applications.

### Gate 3: extract runtime contract packages

- Start with `contracts-core`: envelope, ID helpers, schema version handling and metadata-only transfer history types.
- Add one package per transfer domain instead of a universal `Product`, `Project`, `Sample` or `Result` type.
- Publish JSON Schemas from the same source as runtime validators to prevent drift.
- Keep adapters inside the owning app; shared packages define transfer DTOs, not internal Zustand/store models.

Exit criterion: producers and consumers pass the same golden fixtures, including unsupported versions, malformed payloads and unknown optional fields.

### Gate 4: extract the small design system

- Share brand tokens, module colours, status colours, typography and spacing.
- Share only stable shell primitives such as brand header, Portal link, status badge, disclaimer notice and transfer card.
- Do not combine global CSS files or rewrite domain pages during extraction.
- Run responsive and keyboard smoke tests after migrating each module shell.

### Gate 5: move one specialist application at a time

Recommended order: Product Development, Sensory, Shelf Life, then QA. After each move:

1. Run that application's existing test and production build.
2. Run the complete `test:all` and `build:all` suites.
3. Start all five ports and execute the three-file lifecycle demo.
4. Verify old LocalStorage data, routes and downloads.
5. Commit a reversible migration before moving the next application.

QA is last because it uses React 19, a newer TypeScript/Vite generation and ExcelJS-specific bundle configuration; those differences should remain isolated until the workspace is stable.

### Gate 6: align dependencies and deduplicate carefully

- Align React, Vite, TypeScript, Vitest and Tailwind versions only after all five apps build from the workspace.
- Consolidate statistics helpers only after golden tests define null handling, denominators, sample/population variance and rounding.
- Consolidate CSV/file helpers only after escaping, encoding and error-reporting behaviours are covered.
- Add route-level code splitting for the existing Shelf Life and Sensory bundle warnings as a separate performance task.

## Database decision after Monorepo stability

A shared database remains a later architectural decision. Before it starts, define entity ownership, tenancy, roles, audit history, retention, privacy, backup/restore and an explicit opt-in migration path for browser data. Existing LocalStorage must never be silently uploaded or deleted.

Authentication, payments, multi-tenancy and complex permissions should not be bundled into the Monorepo migration. They require their own product and security decisions.

## Phase 3 acceptance criteria

- All five applications still run independently from workspace scripts.
- All existing routes and module LocalStorage keys remain compatible.
- The three Phase 2 transfer files remain valid without data loss.
- No import silently overwrites a destination record.
- No panelist-level data or unconfirmed shelf-life limit crosses a module boundary.
- Full tests, production builds and the five-port smoke check pass after every app move.
- Rollback instructions restore the pre-migration directory structure and data.

## Risks and controls

| Risk | Control |
|---|---|
| Same type name with different meaning | Domain-specific contracts and app-owned adapters |
| React/Vite/TypeScript version divergence | Align after, not during, directory moves |
| Global CSS collisions | Keep app entry points isolated; share tokenised shell components only |
| LocalStorage loss | Preserve keys, use versioned adapters and test real backups |
| Contract drift | Golden fixtures and producer/consumer CI tests |
| Statistical behaviour drift | Consolidate only behind domain-specific edge-case tests |
| Scope expansion into backend work | Keep database, auth and tenancy outside the Monorepo migration |

