# Changelog

All notable changes to FoodLab AI are documented in this file.

## [1.0.0] - 2026-07-16

### Added

- FoodLab AI Portal as the unified brand, lifecycle guide, module directory, About page, and portfolio entry point.
- Independently runnable Product Development, Sensory, Shelf Life, and QA applications.
- Versioned `PRODUCT_TO_SENSORY`, `SENSORY_TO_SHELF_LIFE`, and `SHELF_LIFE_TO_QA` JSON hand-offs.
- Shared workspace, product, formula, sensory-study, shelf-life-study, standard, and batch lifecycle identifiers.
- Explicit import preview and confirmation, duplicate protection, and metadata-only transfer histories.
- Shared JSON schemas, examples, identifier rules, migration guidance, and scientific disclaimers.
- Root commands for contract validation, all-module tests, and all-module production builds.

### Release hygiene

- Standardized active application package versions at `1.0.0`.
- Added the root `VERSION` file and release documentation.
- Added root ignore rules for dependencies, generated output, environment files, secrets, caches, and local integration snapshots.

### Verification

- 242 application tests across 34 test files passed.
- 3 JSON transfer examples were validated against 4 shared schemas.
- Production builds passed for the Portal and all four specialist modules.

### Notes

- V1.0 is a local-first educational portfolio release candidate.
- It is not presented as commercially validated, regulator-approved, laboratory-certified, or customer-validated software.
