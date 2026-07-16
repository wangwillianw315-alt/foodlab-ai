export type FoodLabTransferType =
  | 'PRODUCT_TO_SENSORY'
  | 'SENSORY_TO_SHELF_LIFE'
  | 'SHELF_LIFE_TO_QA';

export type FoodLabModule =
  | 'PRODUCT_DEVELOPMENT'
  | 'SENSORY'
  | 'SHELF_LIFE'
  | 'QA';

export interface FoodLabTransferMetadata {
  application_version: string;
  notes: string;
  disclaimer: string;
  [key: string]: unknown;
}

export interface FoodLabEnvelope<TPayload, TType extends FoodLabTransferType> {
  foodlab_transfer: true;
  schema_version: '1.0.0';
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
  [key: string]: unknown;
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
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type ProductToSensoryEnvelope = FoodLabEnvelope<
  ProductToSensoryPayload,
  'PRODUCT_TO_SENSORY'
> & {
  source_module: 'PRODUCT_DEVELOPMENT';
  target_module: 'SENSORY';
};

export interface AggregatedSensorySummary {
  overall_liking_mean: number | null;
  response_count: number;
  purchase_intent_top_two_box: number | null;
  jar_findings: string[];
  positive_keywords: string[];
  negative_keywords: string[];
  limitations: string[];
  main_observations?: string[];
  [key: string]: unknown;
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
  [key: string]: unknown;
}

export type SensoryToShelfLifeEnvelope = FoodLabEnvelope<
  SensoryToShelfLifePayload,
  'SENSORY_TO_SHELF_LIFE'
> & {
  source_module: 'SENSORY';
  target_module: 'SHELF_LIFE';
};

export type TransferDirection = 'IMPORTED' | 'EXPORTED';
export type TransferResultStatus = 'SUCCESS' | 'FAILED';

export interface TransferHistoryEntry {
  transfer_id: string;
  transfer_type: FoodLabTransferType;
  imported_or_exported: TransferDirection;
  timestamp: string;
  linked_record_id: string;
  filename: string;
  status: TransferResultStatus;
  warning_count: number;
}
