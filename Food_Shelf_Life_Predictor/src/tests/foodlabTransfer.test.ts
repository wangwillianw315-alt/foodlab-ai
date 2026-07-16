import { describe, expect, it } from "vitest";
import { demoStudies } from "../data/demoShelfLifeStudies";
import { isShelfLifeStudy } from "../store/shelfLifeStore";
import type { SensoryToShelfLifeTransfer } from "../types/foodlabTransfer";
import {
  buildShelfLifeToQaTransfer,
  createFoodLabId,
  createSensoryParameterDrafts,
  createShelfLifeStudyFromSensoryTransfer,
  QA_LIMIT_WARNING,
  validateSensoryToShelfLifeTransfer,
} from "../utils/foodlabTransfer";
import {
  readTransferHistory,
  recordTransferHistory,
  SHELF_LIFE_TRANSFER_HISTORY_KEY,
} from "../utils/transferHistory";

function sensoryTransfer(): SensoryToShelfLifeTransfer {
  return {
    foodlab_transfer: true,
    schema_version: "1.0.0",
    transfer_id: "TX-B1C2D3E4",
    transfer_type: "SENSORY_TO_SHELF_LIFE",
    source_module: "SENSORY",
    target_module: "SHELF_LIFE",
    exported_at: "2026-07-16T00:00:00.000Z",
    exported_by: "Local user",
    workspace_id: "WS-A1B2C3D4",
    source_record_id: "SN-B1C2D3E4",
    payload: {
      product_project_id: "PD-A1B2C3D4",
      product_id: "PR-A1B2C3D4",
      formula_version_id: "FV-A1B2C3D4",
      sensory_project_id: "SN-B1C2D3E4",
      sensory_test_id: "ST-B1C2D3E4",
      product_name: "Plant Protein Bar",
      product_category: "Snack",
      selected_sample: {
        sample_name: "Protein Bar F2",
        blind_code: "417",
        formula_version_name: "Formula 2",
      },
      aggregated_sensory_summary: {
        overall_liking_mean: 7.2,
        response_count: 24,
        purchase_intent_top_two_box: 62.5,
        jar_findings: ["Texture slightly firm"],
        main_observations: ["Nutty profile remained clear"],
        positive_keywords: ["nutty", "balanced"],
        negative_keywords: ["dry"],
        limitations: ["Demonstration panel; confirm with target consumers"],
      },
      recommended_shelf_life_focus: ["Appearance", "Flavour", "Texture"],
    },
    metadata: {
      application_version: "1.0.0",
      notes: "Aggregated results only",
      disclaimer: "Individual panelist records are not included.",
    },
  };
}

describe("FoodLab v1 Sensory to Shelf Life validation", () => {
  it("accepts the supported envelope and ignores unknown future optional fields", () => {
    const value = {
      ...sensoryTransfer(),
      future_optional_field: { ignored: true },
    };
    const result = validateSensoryToShelfLifeTransfer(value);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.payload.product_name).toBe("Plant Protein Bar");
  });

  it("accepts variable-length compatible hex IDs and rejects non-hex IDs", () => {
    const compatible = sensoryTransfer();
    compatible.transfer_id = "TX-abcdef123";
    compatible.workspace_id = "WS-abcdef123";
    compatible.source_record_id = "SN-abcdef123";
    compatible.payload.product_project_id = "PD-abcdef123";
    compatible.payload.product_id = "PR-abcdef123";
    compatible.payload.formula_version_id = "FV-abcdef123";
    compatible.payload.sensory_project_id = "SN-abcdef123";
    compatible.payload.sensory_test_id = "ST-abcdef123";
    expect(
      validateSensoryToShelfLifeTransfer(compatible).ok,
    ).toBe(true);
    for (const field of [
      "product_project_id",
      "product_id",
      "formula_version_id",
      "sensory_project_id",
      "sensory_test_id",
    ] as const) {
      const invalid = structuredClone(compatible);
      invalid.payload[field] = `${invalid.payload[field]?.slice(0, 3)}ABCDEF12Z`;
      expect(validateSensoryToShelfLifeTransfer(invalid).ok).toBe(false);
    }
    expect(createFoodLabId("TX")).toMatch(/^TX-[A-F0-9]{8,}$/);
  });

  it("rejects a missing disclaimer and mismatched source record ID", () => {
    const { disclaimer: _disclaimer, ...metadata } = sensoryTransfer().metadata;
    expect(validateSensoryToShelfLifeTransfer({ ...sensoryTransfer(), metadata }).ok).toBe(false);
    expect(
      validateSensoryToShelfLifeTransfer({
        ...sensoryTransfer(),
        source_record_id: "SN-ABCDEF12",
      }).ok,
    ).toBe(false);
  });

  it("rejects invalid JSON without throwing", () => {
    expect(() => validateSensoryToShelfLifeTransfer("{not-json")).not.toThrow();
    expect(validateSensoryToShelfLifeTransfer("{not-json")).toEqual({
      ok: false,
      error: "The selected file is not valid JSON.",
    });
  });

  it("rejects the wrong transfer type", () => {
    const result = validateSensoryToShelfLifeTransfer({
      ...sensoryTransfer(),
      transfer_type: "PRODUCT_TO_SENSORY",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Wrong transfer type");
  });

  it("rejects unsupported major and newer minor versions with friendly messages", () => {
    for (const [version, phrase] of [
      ["2.0.0", "Unsupported major"],
      ["1.1.0", "newer or unsupported"],
    ]) {
      const result = validateSensoryToShelfLifeTransfer({
        ...sensoryTransfer(),
        schema_version: version,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain(phrase);
    }
  });

  it("rejects a missing payload", () => {
    const { payload: _payload, ...broken } = sensoryTransfer();
    const result = validateSensoryToShelfLifeTransfer(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("payload");
  });
});

describe("Sensory transfer study creation", () => {
  it("prepopulates sensory focuses and adds optional Overall Acceptability with no invented limits", () => {
    const drafts = createSensoryParameterDrafts(sensoryTransfer().payload);
    expect(drafts.map((draft) => draft.parameter_name)).toEqual([
      "Appearance",
      "Flavour",
      "Texture",
      "Overall Acceptability",
    ]);
    expect(drafts.every((draft) => draft.lower_limit === null && draft.upper_limit === null)).toBe(true);
    expect(drafts.find((draft) => draft.parameter_name === "Overall Acceptability")?.required).toBe(false);
  });

  it("requires user-defined, confirmed limits and never invents safety thresholds", () => {
    const drafts = createSensoryParameterDrafts(sensoryTransfer().payload);
    expect(() =>
      createShelfLifeStudyFromSensoryTransfer(sensoryTransfer(), {
        study_name: "Protein Bar stability",
        study_code: "SL-PB-001",
        start_date: "2026-07-16",
        proposed_shelf_life_days: 90,
        storage_condition: {
          condition_name: "Ambient sealed",
          temperature_c: 20,
          light_condition: "DARK",
          accelerated_or_real_time: "REAL_TIME",
        },
        sampling_days: [0, 30, 60, 90],
        parameters: drafts,
      }),
    ).toThrow(/confirm the limits/i);
  });

  it("creates a linked study only after explicit storage and limits are supplied", () => {
    const parameters = createSensoryParameterDrafts(sensoryTransfer().payload).map(
      (draft) => ({
        ...draft,
        lower_limit: 5,
        confirmed_by_user: true,
      }),
    );
    const study = createShelfLifeStudyFromSensoryTransfer(
      sensoryTransfer(),
      {
        study_name: "Protein Bar stability",
        study_code: "SL-PB-001",
        start_date: "2026-07-16",
        proposed_shelf_life_days: 90,
        storage_condition: {
          condition_name: "Ambient sealed",
          temperature_c: 20,
          light_condition: "DARK",
          accelerated_or_real_time: "REAL_TIME",
        },
        sampling_days: [0, 30, 60, 90],
        parameters,
      },
      "2026-07-16T01:00:00.000Z",
    );
    expect(study.product_project_id).toBe("PD-A1B2C3D4");
    expect(study.formula_version_id).toBe("FV-A1B2C3D4");
    expect(study.sensory_project_id).toBe("SN-B1C2D3E4");
    expect(study.shelf_life_study_id).toMatch(/^SL-[a-f0-9]{8}$/i);
    expect(study.product_name).toBe("Plant Protein Bar");
    expect(study.product_category).toBe("Snack");
    expect(study.parameters).toHaveLength(4);
    expect(study.parameters.find((parameter) => parameter.parameter_name === "Overall Acceptability")?.required).toBe(false);
    expect(study.initial_product_notes).toContain("Demonstration panel");
    expect(study.initial_product_notes).toContain("Individual panelist records were not included");
  });
});

describe("Shelf Life to QA transfer", () => {
  it("exports only explicitly confirmed limits and includes mandatory warnings", () => {
    const study = structuredClone(demoStudies[0]);
    const transfer = buildShelfLifeToQaTransfer(
      study,
      {
        workspace_id: "WS-A1B2C3D4",
        product_project_id: "PD-A1B2C3D4",
        product_id: "PR-A1B2C3D4",
        formula_version_id: "FV-A1B2C3D4",
        shelf_life_study_id: "SL-C1D2E3F4",
        storage_condition_id: study.storage_conditions[0].condition_id,
        planning_shelf_life_days: 21,
        packaging_notes: "User-confirmed packaging note",
        parameters: [
          {
            parameter_id: study.parameters[0].parameter_id,
            lower_limit: 3.8,
            upper_limit: 4.8,
            warning_rule: "Review outside the user-approved range",
            confirmed_by_user: true,
          },
          {
            parameter_id: study.parameters[1].parameter_id,
            lower_limit: null,
            upper_limit: 0.96,
            warning_rule: "This unconfirmed row must not leave the app",
            confirmed_by_user: false,
          },
        ],
        scientific_limitations: ["Pilot-scale evidence only"],
      },
      {
        now: "2026-07-16T02:00:00.000Z",
        transfer_id: "TX-C1D2E3F4",
      },
    );
    expect(transfer.payload.qa_parameters).toHaveLength(1);
    expect(transfer.payload.qa_parameters[0].parameter_name).toBe(study.parameters[0].parameter_name);
    expect(transfer.payload.qa_parameters.every((parameter) => parameter.confirmed_by_user)).toBe(true);
    expect(transfer.payload.scientific_limitations).toContain(QA_LIMIT_WARNING);
    expect(transfer.metadata.disclaimer).toBe(QA_LIMIT_WARNING);
    expect(JSON.stringify(transfer)).not.toContain("This unconfirmed row must not leave the app");
  });

  it("refuses an export with no confirmed parameter limit", () => {
    const study = structuredClone(demoStudies[0]);
    expect(() =>
      buildShelfLifeToQaTransfer(study, {
        workspace_id: "WS-A1B2C3D4",
        product_project_id: "PD-A1B2C3D4",
        product_id: "PR-A1B2C3D4",
        formula_version_id: "FV-A1B2C3D4",
        shelf_life_study_id: "SL-C1D2E3F4",
        storage_condition_id: study.storage_conditions[0].condition_id,
        planning_shelf_life_days: null,
        packaging_notes: "",
        parameters: [],
        scientific_limitations: [],
      }),
    ).toThrow(/Confirm at least one QA parameter/i);
  });

  it("rejects non-hex linked IDs before exporting to QA", () => {
    const study = structuredClone(demoStudies[0]);
    expect(() =>
      buildShelfLifeToQaTransfer(study, {
        workspace_id: "WS-A1B2C3D4",
        product_project_id: "PD-ABCDEF12Z",
        product_id: "PR-A1B2C3D4",
        formula_version_id: "FV-A1B2C3D4",
        shelf_life_study_id: "SL-C1D2E3F4",
        storage_condition_id: study.storage_conditions[0].condition_id,
        planning_shelf_life_days: null,
        packaging_notes: "",
        parameters: [],
        scientific_limitations: [],
      }),
    ).toThrow(/product_project_id must use a valid PD-/i);
  });
});

describe("migration-safe local history and old study data", () => {
  it("keeps pre-Phase-2 study records valid when lifecycle IDs are absent", () => {
    const oldStudy = structuredClone(demoStudies[0]);
    expect(oldStudy).not.toHaveProperty("workspace_id");
    expect(isShelfLifeStudy(oldStudy)).toBe(true);
  });

  it("stores only transfer history metadata under the module-specific key", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    expect(
      recordTransferHistory(
        {
          transfer_id: "TX-B1C2D3E4",
          transfer_type: "SENSORY_TO_SHELF_LIFE",
          imported_or_exported: "IMPORTED",
          timestamp: "2026-07-16T00:00:00.000Z",
          linked_record_id: "SL-C1D2E3F4",
          filename: "sensory-transfer.json",
          status: "SUCCESS",
          warning_count: 1,
        },
        storage,
      ),
    ).toBe(true);
    expect(readTransferHistory(storage)).toHaveLength(1);
    expect(values.has(SHELF_LIFE_TRANSFER_HISTORY_KEY)).toBe(true);
    expect(values.get(SHELF_LIFE_TRANSFER_HISTORY_KEY)).not.toContain("aggregated_sensory_summary");
  });
});
