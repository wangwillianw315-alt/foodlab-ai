export type FoodLabTransferType =
  | "PRODUCT_TO_SENSORY"
  | "SENSORY_TO_SHELF_LIFE"
  | "SHELF_LIFE_TO_QA";

export type FoodLabModule =
  | "PRODUCT_DEVELOPMENT"
  | "SENSORY"
  | "SHELF_LIFE"
  | "QA";

export interface FoodLabTransferEnvelope<TPayload> {
  foodlab_transfer: true;
  schema_version: "1.0.0";
  transfer_id: string;
  transfer_type: FoodLabTransferType;
  source_module: FoodLabModule;
  target_module: FoodLabModule;
  exported_at: string;
  exported_by: string;
  workspace_id: string;
  source_record_id: string;
  payload: TPayload;
  metadata: {
    application_version: string;
    notes: string;
    disclaimer: string;
  };
}

export interface AggregatedSensorySummary {
  overall_liking_mean: number | null;
  response_count: number;
  purchase_intent_top_two_box: number | null;
  jar_findings: string[];
  main_observations?: string[];
  positive_keywords: string[];
  negative_keywords: string[];
  limitations: string[];
}

export interface SensoryToShelfLifePayload {
  product_project_id: string;
  product_id: string;
  formula_version_id: string;
  sensory_project_id: string;
  sensory_test_id?: string;
  product_name?: string;
  product_category?: string;
  selected_sample: {
    sample_name: string;
    blind_code: string;
    formula_version_name: string;
  };
  aggregated_sensory_summary: AggregatedSensorySummary;
  recommended_shelf_life_focus: string[];
}

export type SensoryToShelfLifeTransfer = FoodLabTransferEnvelope<SensoryToShelfLifePayload> & {
  transfer_type: "SENSORY_TO_SHELF_LIFE";
  source_module: "SENSORY";
  target_module: "SHELF_LIFE";
};

export interface ShelfLifeToQaParameter {
  parameter_name: string;
  unit: string;
  lower_limit: number | null;
  upper_limit: number | null;
  warning_rule: string;
  confirmed_by_user: true;
}

export interface ShelfLifeToQaPayload {
  product_project_id: string;
  product_id: string;
  formula_version_id: string;
  shelf_life_study_id: string;
  sensory_project_id?: string;
  product_name: string;
  product_category: string;
  planning_shelf_life_days: number | null;
  storage_condition: string;
  packaging_notes: string;
  qa_parameters: ShelfLifeToQaParameter[];
  scientific_limitations: string[];
}

export type ShelfLifeToQaTransfer = FoodLabTransferEnvelope<ShelfLifeToQaPayload> & {
  transfer_type: "SHELF_LIFE_TO_QA";
  source_module: "SHELF_LIFE";
  target_module: "QA";
};

export interface TransferHistoryEntry {
  transfer_id: string;
  transfer_type: "SENSORY_TO_SHELF_LIFE" | "SHELF_LIFE_TO_QA";
  imported_or_exported: "IMPORTED" | "EXPORTED";
  timestamp: string;
  linked_record_id: string;
  filename: string;
  status: "SUCCESS" | "FAILED";
  warning_count: number;
}
