export const FOODLAB_SCHEMA_VERSION = "1.0.0" as const;

export type FoodLabTransferType =
  | "PRODUCT_TO_SENSORY"
  | "SENSORY_TO_SHELF_LIFE"
  | "SHELF_LIFE_TO_QA";

export type FoodLabModule =
  | "PRODUCT_DEVELOPMENT"
  | "SENSORY"
  | "SHELF_LIFE"
  | "QA";

export interface FoodLabTransferMetadata {
  application_version: string;
  notes: string;
  disclaimer: string;
  [key: string]: unknown;
}

export interface FoodLabTransferEnvelope<
  TPayload,
  TType extends FoodLabTransferType = FoodLabTransferType,
> {
  foodlab_transfer: true;
  schema_version: typeof FOODLAB_SCHEMA_VERSION;
  transfer_id: string;
  transfer_type: TType;
  source_module: FoodLabModule;
  target_module: FoodLabModule;
  exported_at: string;
  exported_by: string;
  workspace_id: string;
  source_record_id: string;
  payload: TPayload;
  metadata: FoodLabTransferMetadata;
  [key: string]: unknown;
}

export interface ProductToSensorySample {
  formula_version_id: string;
  formula_version_name: string;
  sample_name: string;
  allergens: string[];
  ingredient_summary: string[];
  demo_only: boolean;
  cost_summary?: number | null;
}

export interface ProductToSensoryPayload {
  product_project_id: string;
  product_id: string;
  product_name: string;
  product_category: string;
  project_objective: string;
  target_consumer: string;
  samples: ProductToSensorySample[];
  suggested_test_design: {
    test_types: string[];
    attributes: string[];
    notes: string;
  };
  [key: string]: unknown;
}

export type ProductToSensoryEnvelope = FoodLabTransferEnvelope<
  ProductToSensoryPayload,
  "PRODUCT_TO_SENSORY"
>;

export interface TransferHistoryEntry {
  transfer_id: string;
  transfer_type: FoodLabTransferType;
  imported_or_exported: "IMPORTED" | "EXPORTED";
  timestamp: string;
  linked_record_id: string;
  filename: string;
  status: "SUCCESS" | "FAILED";
  warning_count: number;
}
