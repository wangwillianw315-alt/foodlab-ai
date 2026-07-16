# FoodLab AI V1.0 Release Notes

**Version:** 1.0.0  
**Release date:** 2026-07-16  
**Status:** Portfolio release candidate

## Project purpose

FoodLab AI is a local-first educational portfolio platform that demonstrates a connected food-product lifecycle from formulation and sensory evaluation through shelf-life study planning and quality monitoring. It keeps each scientific module independently runnable while using explicit, reviewable JSON files for cross-module hand-offs.

## Included modules

- **FoodLab AI Portal:** unified brand, lifecycle overview, module status, workflow resources, About page, and portfolio entry point.
- **Food Product Development AI:** product briefs, formula versions, ingredient costs, estimated nutrition, trials, and development summaries.
- **Food Sensory AI:** blinded study design, response management, descriptive analysis, and aggregate result export.
- **Food Shelf Life Predictor:** storage-study planning, sampling schedules, observations, acceptance limits, and transparent model exploration.
- **Food QA Dashboard:** production-data import, linked product standards, sample assessment, and batch-level quality monitoring.

## Completed integrations

The V1.0 lifecycle is:

```text
Product Development
  -> PRODUCT_TO_SENSORY.json
Sensory Evaluation
  -> SENSORY_TO_SHELF_LIFE.json
Shelf-Life Validation
  -> SHELF_LIFE_TO_QA.json
QA Monitoring
```

All three hand-offs use the FoodLab envelope schema `1.0.0`, shared lifecycle identifiers, transfer-specific validation, import previews, explicit confirmation, duplicate protection, and metadata-only transfer history.

Privacy and scientific boundaries are deliberate:

- Product Development excludes supplier identity and line-level cost data; aggregate sample cost is optional.
- Sensory exports aggregate results only and never exports panelist-level records.
- Shelf Life exports only acceptance limits explicitly confirmed by the user.
- Imports create linked records without silently replacing existing records.
- Existing module LocalStorage remains separate and is not deleted, uploaded, or synchronized in the background.

## Verification summary

- **Application tests:** 242 passed across 34 test files.
- **Contract validation:** 3 example transfer files passed validation against 4 shared JSON schemas.
- **Production builds:** 5 passed: Portal, Product Development, Sensory, Shelf Life, and QA.
- **Secret scan:** 443 active source, documentation, and configuration files inspected with no detected API keys, access tokens, private keys, credential-bearing connection strings, or real `.env` files.

The release verification commands are:

```bash
npm run test:all
npm run build:all
```

## Source-control status

The workspace is prepared as one root Git repository for the public `foodlab-ai` release. Staged-file verification found no `node_modules`, build folders, coverage, caches, logs, real `.env` files, deployment-provider state, TypeScript build output, or local backup snapshots.

The QA module previously contained nested Git metadata. That metadata was preserved outside the release workspace before root initialization so QA is committed as normal source rather than an unintended embedded repository. Its earlier standalone history remains available in the original QA repository but is not replayed into the V1.0 root commit.

## Known limitations

- Cross-module transfer is a deliberate user-controlled JSON download/import workflow; there is no backend synchronization.
- Each application uses its own browser LocalStorage, so data is browser-profile and origin specific.
- V1.0 has no login, cloud database, payment, multi-tenancy, or complex permission system.
- Transfer history stores metadata, not full payloads, and is not a cryptographically signed central audit trail.
- QA automatically maps only recognized parameters; unfamiliar limits require review or manual configuration.
- Formula, nutrition, sensory, shelf-life, and quality outputs are planning or demonstration evidence and require qualified professional interpretation and appropriate validation.
- Test output contains non-blocking jsdom chart-size warnings in Product Development.
- Sensory and Shelf Life production builds contain non-blocking bundle-size advisories; code splitting is deferred because it is not a V1.0 release blocker.
- Sensory and Shelf Life currently contain both npm and pnpm lockfiles; package-manager standardization is deferred to a controlled repository-integration phase.

## Future roadmap

- Move to a controlled Monorepo only after the independently runnable applications and migration steps are protected.
- Extract shared runtime contract, identifier, transfer-history, and design-system packages.
- Add continuous integration with golden JSON fixtures and cross-module compatibility tests.
- Align dependencies and introduce targeted route/code splitting.
- Consider database, identity, permissions, and collaboration only after data ownership, privacy, migration, and operational requirements are defined.

## Release disclaimer

FoodLab AI V1.0 is an educational portfolio release candidate. It does not claim commercial validation, regulatory approval, laboratory certification, real customers, customer adoption, or guaranteed product outcomes. It does not replace validated laboratory methods, food-safety programs, regulatory review, or qualified professional judgement.
