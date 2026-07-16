# FoodLab AI Demo Workflow

This guided demonstration uses synthetic data to show the FoodLab AI V1.0 product lifecycle. It does not represent a real customer, commercial deployment, laboratory approval, or regulatory decision.

## Preparation

From the repository root:

```bash
npm run dev:all
```

Open the Portal at `http://localhost:5173`. The specialist modules use ports 5174 through 5177.

## Step 1: Product Development to Sensory

1. Open Product Development.
2. Review a product project and shortlisted formula version.
3. Open **Send to Sensory**.
4. Import or compare [`product-to-sensory.example.json`](product-to-sensory.example.json).
5. Confirm the preview to create a linked sensory project.

The example excludes supplier identity and line-level cost data.

## Step 2: Sensory to Shelf Life

1. Open the linked Sensory project.
2. Review the blinded samples and aggregate study evidence.
3. Export or compare [`sensory-to-shelf-life.example.json`](sensory-to-shelf-life.example.json).
4. Import it in Shelf Life and confirm the study preview.

The example contains aggregate results only and no panelist-level records.

## Step 3: Shelf Life to QA

1. Review the linked shelf-life study, storage condition, and user-confirmed limits.
2. Export or compare [`shelf-life-to-qa.example.json`](shelf-life-to-qa.example.json).
3. Import it in QA.
4. Confirm the linked standard and batch-monitoring setup.

Only limits explicitly confirmed by the user are included. They remain planning values until supported by validated specifications and appropriate evidence.

## What to explain

- Shared workspace, product, formula, study, standard, and batch identifiers preserve provenance.
- JSON transfers are explicit and reviewable; no record is synchronized in the background.
- Target modules validate and preview files before record creation.
- Duplicate protection avoids silent replacement.
- Transfer history contains metadata rather than full scientific payloads.
- Each module retains its own LocalStorage.

Canonical schemas and validation examples are maintained in [`../shared-contracts/`](../shared-contracts/).
