# FoodLab AI Shared Transfer Contracts

These files define the Phase 2, user-controlled JSON handoff between the four independent FoodLab AI applications. They are documentation and interchange contracts, not a runtime npm package and not a database model.

## Supported flow

1. `PRODUCT_TO_SENSORY`
2. `SENSORY_TO_SHELF_LIFE`
3. `SHELF_LIFE_TO_QA`

Every file uses `foodlab-envelope.schema.json` and a transfer-specific payload schema. The current exact supported version is `1.0.0`.

## Safety and compatibility rules

- Transfers occur only after an explicit export or confirmed import action.
- Existing application IDs and LocalStorage keys remain valid.
- Cross-module IDs are additive and optional on legacy records.
- Import creates a new target record and never overwrites one silently.
- Unknown optional fields are ignored safely (`additionalProperties: true`).
- Missing required fields, wrong transfer directions, invalid JSON, and unsupported major versions are rejected.
- Every transfer includes a non-empty safety or scope disclaimer in `metadata.disclaimer`.
- Runtime importers verify that `source_record_id` matches the owning source ID in the payload.
- Newer non-breaking versions receive a friendly unsupported-version warning until an importer explicitly supports them.
- Transfer history stores metadata only, never full payloads.
- No panelist-level data moves to Shelf Life.
- Supplier costs are excluded unless explicitly selected.
- QA limits are transferred only when explicitly confirmed by the user.

## Envelope

All transfer files contain:

```json
{
  "foodlab_transfer": true,
  "schema_version": "1.0.0",
  "transfer_id": "TX-1234ABCD",
  "transfer_type": "PRODUCT_TO_SENSORY",
  "source_module": "PRODUCT_DEVELOPMENT",
  "target_module": "SENSORY",
  "exported_at": "2026-07-16T00:00:00.000Z",
  "exported_by": "Local user",
  "workspace_id": "WS-1234ABCD",
  "source_record_id": "PD-1234ABCD",
  "payload": {},
  "metadata": {
    "application_version": "1.0.0",
    "notes": "Explicit local JSON transfer",
    "disclaimer": "Planning data only; qualified review remains required."
  }
}
```

See [ID-FORMAT.md](ID-FORMAT.md) for identifier rules and `examples/` for complete files.
