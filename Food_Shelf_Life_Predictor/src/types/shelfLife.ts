export type StudyStatus='PLANNING'|'ACTIVE'|'COMPLETED'|'ON_HOLD'|'CANCELLED';
export type ResultStatus='ACCEPTABLE'|'WARNING'|'UNACCEPTABLE'|'INCOMPLETE'|'MANUAL_REVIEW';
export type SampleStatus='PLANNED'|'COMPLETED'|'OVERDUE'|'MISSED'|'CANCELLED';
export interface StorageCondition{condition_id:string;condition_name:string;temperature_c:number;temperature_tolerance_c?:number;relative_humidity_percent?:number|null;light_condition:string;packaging_variant?:string;orientation?:string;storage_location?:string;accelerated_or_real_time:string;notes?:string;primary?:boolean}
export interface SamplingPoint{sampling_point_id:string;condition_id:string;planned_day:number;planned_date:string;actual_date?:string;sample_status:SampleStatus;replicate_count:number;notes?:string}
export interface TestParameter{parameter_id:string;parameter_name:string;category:string;unit:string;result_type:string;lower_limit?:number|null;upper_limit?:number|null;warning_limit?:number|null;direction_of_deterioration:string;required:boolean;test_method?:string;notes?:string}
export interface ShelfLifeResult{result_id:string;study_id:string;condition_id:string;sampling_point_id:string;parameter_id:string;replicate_number:number;measured_value:number|null;text_value?:string;result_date:string;analyst?:string;method_reference?:string;laboratory?:string;detection_limit?:number|null;qualifier?:string;comments?:string;status?:ResultStatus;is_demo:boolean;outlier?:boolean}
export interface ShelfLifeStudy{study_id:string;study_name:string;study_code:string;product_name:string;product_category:string;product_description?:string;formula_version?:string;batch_number?:string;manufacturing_date?:string;study_start_date:string;proposed_shelf_life_days?:number|null;responsible_person?:string;study_objective?:string;target_market?:string;packaging_type?:string;processing_method?:string;preservation_method?:string;allergen_notes?:string;initial_product_notes?:string;study_status:StudyStatus;storage_conditions:StorageCondition[];sampling_points:SamplingPoint[];parameters:TestParameter[];results:ShelfLifeResult[];archived?:boolean;created_at:string;updated_at:string;
  /** Optional FoodLab lifecycle mappings. Existing module IDs remain authoritative. */
  workspace_id?:string;
  product_project_id?:string;
  product_id?:string;
  formula_version_id?:string;
  sensory_project_id?:string;
  sensory_test_id?:string;
  shelf_life_study_id?:string;
  source_transfer_id?:string;
}
export interface ModelResult{model_name:string;slope:number|null;intercept:number|null;r_squared:number|null;estimated_crossing_day:number|null;observation_count:number;valid:boolean;warnings:string[];equation?:string}
export interface ShelfLifeEstimate{condition_id:string;parameter_id:string;last_acceptable_day:number|null;first_unacceptable_day:number|null;predicted_crossing_day:number|null;conservative_estimate_day:number|null;confidence:'LOW'|'MEDIUM'|'HIGH'|'INSUFFICIENT';limiting:boolean;notes:string[]}
