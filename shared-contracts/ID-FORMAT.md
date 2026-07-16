# FoodLab AI Identifier Format

Phase 2 adds mapping identifiers without renaming or deleting module-owned IDs.

| Identifier | Prefix | Example |
|---|---|---|
| Workspace | `WS-` | `WS-1A2B3C4D` |
| Product development project | `PD-` | `PD-1A2B3C4D` |
| Product | `PR-` | `PR-1A2B3C4D` |
| Formula version | `FV-` | `FV-1A2B3C4D` |
| Sensory project | `SN-` | `SN-1A2B3C4D` |
| Sensory test | `ST-` | `ST-1A2B3C4D` |
| Shelf-life study | `SL-` | `SL-1A2B3C4D` |
| QA product | `QA-` | `QA-1A2B3C4D` |
| Batch | `BA-` | `BA-1A2B3C4D` |
| Transfer | `TX-` | `TX-1A2B3C4D` |

Suffixes are never timestamps alone. Generators prefer Web Crypto `randomUUID()`, then `getRandomValues()`. A `Math.random()` compatibility fallback is used only when Web Crypto is unavailable; it is suitable for local linking, not as a security credential.

The canonical form is an uppercase prefix, a hyphen, and at least eight uppercase hexadecimal characters: `^(WS|PD|PR|FV|SN|ST|SL|QA|BA|TX)-[A-F0-9]{8,}$`. New IDs are emitted in that uppercase form. Phase 2 readers also accept lowercase hexadecimal suffixes for compatibility with transfer files created by early Phase 2 builds; characters outside hexadecimal (`G` through `Z`) are invalid.

The shared workspace ID is stored locally under `foodlab-workspace-id`; it is generated lazily and never causes old records to be rewritten.

Internal IDs such as `project_id`, `formula_id`, `study_id`, `sample_id`, and `batch_number` remain the owning application's keys. Mapping fields are optional so existing demo data and saved LocalStorage envelopes remain readable.
