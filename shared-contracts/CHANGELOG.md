# Contract changelog

## 1.0.0 — 2026-07-16

- Added FoodLab transfer envelope.
- Added Product Development → Sensory payload.
- Added aggregated Sensory → Shelf Life payload.
- Added user-confirmed Shelf Life → QA payload.
- Established additive identifier mappings and explicit local-file workflow.
- Clarified canonical uppercase hexadecimal IDs, compatible lowercase reads, and the required transfer disclaimer.

## Future migration policy

- Patch/minor additions must remain optional and preserve existing meanings.
- Importers ignore unknown optional fields but never assume they were processed.
- A breaking field or semantic change requires a new major version.
- Importers reject unsupported major versions and retain the original file unchanged.
- A future migration must be explicit, tested, reversible, and must not silently rewrite LocalStorage.
