import { beforeEach, describe, expect, it } from "vitest";
import { demoIngredients } from "../data/demoIngredients";
import { demoProjects } from "../data/demoProjects";
import type { FoodLabIdPrefix } from "../utils/foodlabTransfer";
import {
  applyProductTransferIdentity,
  buildProductToSensoryTransfer,
  FOODLAB_WORKSPACE_ID_KEY,
  getOrCreateWorkspaceId,
  safeParseProductToSensoryJson,
  safeValidateProductToSensoryEnvelope,
  validateProductToSensoryEnvelope,
} from "../utils/foodlabTransfer";
import {
  loadTransferHistory,
  PRODUCT_TRANSFER_HISTORY_KEY,
  recordTransferHistory,
} from "../utils/transferHistory";
import { safeLoadSnapshot } from "../store/productDevelopmentStore";

const deterministicIds = () => {
  let value = 0;
  return (prefix: FoodLabIdPrefix) =>
    `${prefix}-${String(++value).padStart(8, "0")}`;
};

const buildTransfer = (overrides = {}) => {
  const project = structuredClone(demoProjects[0]);
  return buildProductToSensoryTransfer({
    project,
    ingredients: demoIngredients,
    selectedFormulaIds: [project.formula_versions[0].formula_id],
    workspaceId: "WS-00000001",
    exportedAt: "2026-07-16T00:00:00.000Z",
    idFactory: deterministicIds(),
    testTypes: ["9-point Hedonic", "Preference"],
    attributes: ["Appearance", "Overall Acceptability"],
    sensoryNotes: "Compare the selected samples.",
    ...overrides,
  });
};

describe("FoodLab Product to Sensory transfer", () => {
  beforeEach(() => {
    localStorage.removeItem(FOODLAB_WORKSPACE_ID_KEY);
    localStorage.removeItem(PRODUCT_TRANSFER_HISTORY_KEY);
  });

  it("generates the exact versioned Product to Sensory route", () => {
    const { envelope } = buildTransfer();

    expect(envelope).toMatchObject({
      foodlab_transfer: true,
      schema_version: "1.0.0",
      transfer_type: "PRODUCT_TO_SENSORY",
      source_module: "PRODUCT_DEVELOPMENT",
      target_module: "SENSORY",
      exported_by: "Local user",
      workspace_id: "WS-00000001",
    });
    expect(envelope.source_record_id).toBe(
      envelope.payload.product_project_id,
    );
    expect(envelope.payload.samples).toHaveLength(1);
    expect(envelope.payload.samples[0]).toMatchObject({
      formula_version_name: "V1 Base Formula",
      sample_name: "V1 Base Formula",
      demo_only: true,
    });
    expect(envelope.metadata.disclaimer).toMatch(/not a regulatory/i);
  });

  it("validates a correct envelope and safely accepts unknown optional fields", () => {
    const { envelope } = buildTransfer();
    const withFutureField = {
      ...envelope,
      optional_future_field: { safe: true },
      payload: { ...envelope.payload, optional_future_payload: "ignored" },
    };

    expect(validateProductToSensoryEnvelope(withFutureField).transfer_id).toBe(
      envelope.transfer_id,
    );
  });

  it("accepts compatible variable-length hex IDs and rejects non-hex suffixes", () => {
    const { envelope } = buildTransfer();
    const compatible = {
      ...envelope,
      transfer_id: "TX-abcdef123",
      workspace_id: "WS-abcdef123",
      source_record_id: "PD-abcdef123",
      payload: {
        ...envelope.payload,
        product_project_id: "PD-abcdef123",
        product_id: "PR-abcdef123",
        samples: envelope.payload.samples.map((sample) => ({
          ...sample,
          formula_version_id: "FV-abcdef123",
        })),
      },
    };
    expect(
      safeValidateProductToSensoryEnvelope(compatible).success,
    ).toBe(true);
    expect(
      safeValidateProductToSensoryEnvelope({
        ...compatible,
        payload: {...compatible.payload, product_id: "PR-ABCDEF12Z"},
      }).success,
    ).toBe(false);
  });

  it("rejects a missing transfer disclaimer", () => {
    const { envelope } = buildTransfer();
    const { disclaimer: _disclaimer, ...metadata } = envelope.metadata;
    expect(
      safeValidateProductToSensoryEnvelope({...envelope, metadata}).success,
    ).toBe(false);
  });

  it("rejects the wrong transfer type", () => {
    const { envelope } = buildTransfer();
    const result = safeValidateProductToSensoryEnvelope({
      ...envelope,
      transfer_type: "SENSORY_TO_SHELF_LIFE",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.join(" ")).toMatch(/wrong transfer type/i);
  });

  it("rejects an unsupported major schema version", () => {
    const { envelope } = buildTransfer();
    const result = safeValidateProductToSensoryEnvelope({
      ...envelope,
      schema_version: "2.0.0",
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.errors.join(" ")).toMatch(/unsupported schema major/i);
  });

  it("rejects a newer same-major version until explicitly supported", () => {
    const { envelope } = buildTransfer();
    const result = safeValidateProductToSensoryEnvelope({
      ...envelope,
      schema_version: "1.1.0",
    });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.errors.join(" ")).toMatch(/supports exactly 1\.0\.0/i);
  });

  it("rejects a missing payload", () => {
    const { envelope } = buildTransfer();
    const { payload: _payload, ...withoutPayload } = envelope;
    const result = safeValidateProductToSensoryEnvelope(withoutPayload);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.join(" ")).toMatch(/payload/i);
  });

  it("invalid JSON never throws from the safe parser", () => {
    expect(() => safeParseProductToSensoryJson("{bad")).not.toThrow();
    expect(safeParseProductToSensoryJson("{bad")).toMatchObject({
      success: false,
      errors: ["Invalid JSON file."],
    });
  });

  it("enforces the four-formula maximum", () => {
    const project = structuredClone(demoProjects[0]);
    project.formula_versions.push(
      {
        ...structuredClone(project.formula_versions[0]),
        formula_id: "extra-4",
        version_name: "Version 4",
      },
      {
        ...structuredClone(project.formula_versions[0]),
        formula_id: "extra-5",
        version_name: "Version 5",
      },
    );

    expect(() =>
      buildProductToSensoryTransfer({
        project,
        ingredients: demoIngredients,
        selectedFormulaIds: project.formula_versions.map(
          (formula) => formula.formula_id,
        ),
        workspaceId: "WS-00000001",
        idFactory: deterministicIds(),
      }),
    ).toThrow(/maximum of four/i);
  });

  it("excludes all supplier and cost fields by default", () => {
    const { envelope } = buildTransfer();
    const serialized = JSON.stringify(envelope);

    expect(serialized).not.toContain("supplier");
    expect(serialized).not.toContain("cost_per_kg");
    expect(serialized).not.toContain("cost_summary");
  });

  it("includes only aggregate sample cost when explicitly selected", () => {
    const { envelope } = buildTransfer({ includeCostSummary: true });
    const serialized = JSON.stringify(envelope);

    expect(envelope.payload.samples[0].cost_summary).toBeTypeOf("number");
    expect(serialized).not.toContain("supplier_code");
    expect(serialized).not.toContain("cost_per_kg");
    expect(serialized).not.toContain("line_cost");
  });

  it("preserves stable optional cross-module IDs after first export", () => {
    const project = structuredClone(demoProjects[0]);
    const first = buildTransfer({ project });
    const identifiedProject = {
      ...project,
      ...applyProductTransferIdentity(project, first.identity),
    };
    const second = buildProductToSensoryTransfer({
      project: identifiedProject,
      ingredients: demoIngredients,
      selectedFormulaIds: [identifiedProject.formula_versions[0].formula_id],
      workspaceId: "WS-99999999",
      idFactory: deterministicIds(),
    });

    expect(second.envelope.workspace_id).toBe(first.envelope.workspace_id);
    expect(second.envelope.payload.product_project_id).toBe(
      first.envelope.payload.product_project_id,
    );
    expect(second.envelope.payload.product_id).toBe(
      first.envelope.payload.product_id,
    );
    expect(second.envelope.payload.samples[0].formula_version_id).toBe(
      first.envelope.payload.samples[0].formula_version_id,
    );
  });

  it("keeps one workspace ID in the dedicated LocalStorage key", () => {
    const first = getOrCreateWorkspaceId();
    const second = getOrCreateWorkspaceId();

    expect(first).toBe(second);
    expect(localStorage.getItem(FOODLAB_WORKSPACE_ID_KEY)).toBe(first);
  });

  it("records transfer metadata without storing a payload", () => {
    const { envelope } = buildTransfer();
    recordTransferHistory({
      transfer_id: envelope.transfer_id,
      transfer_type: envelope.transfer_type,
      imported_or_exported: "EXPORTED",
      timestamp: envelope.exported_at,
      linked_record_id: envelope.source_record_id,
      filename: "product-to-sensory.json",
      status: "SUCCESS",
      warning_count: 0,
    });

    expect(loadTransferHistory()).toHaveLength(1);
    expect(loadTransferHistory()[0].status).toBe("SUCCESS");
    expect(localStorage.getItem(PRODUCT_TRANSFER_HISTORY_KEY)).not.toContain(
      "payload",
    );
  });

  it("continues to read legacy LocalStorage snapshots without Phase 2 IDs", () => {
    const legacySnapshot = JSON.stringify({
      state: {
        schemaVersion: 1,
        projects: demoProjects,
        ingredients: demoIngredients,
        selectedProjectId: "bar",
        selectedFormulaId: "bar-f1",
      },
    });

    const loaded = safeLoadSnapshot(legacySnapshot);
    expect(loaded).not.toBeNull();
    expect(loaded?.projects[0].product_project_id).toBeUndefined();
    expect(loaded?.projects[0].formula_versions[0].formula_version_id).toBeUndefined();
  });
});
