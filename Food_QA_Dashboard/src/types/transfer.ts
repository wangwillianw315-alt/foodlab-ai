export type TransferType='SHELF_LIFE_TO_QA';
export interface QAParameterTransfer{parameter_name:string;unit:string;lower_limit:number|null;upper_limit:number|null;warning_rule:string;confirmed_by_user:true}
export type LinkedParameterKey='ph'|'water_activity'|'moisture_percent'|'temperature_c'|'protein_percent'|'fat_percent';
export interface ShelfLifeToQAPayload{
  product_project_id:string;product_id:string;formula_version_id:string;sensory_project_id?:string;shelf_life_study_id:string;
  product_name:string;product_category:string;planning_shelf_life_days:number|null;storage_condition:string;packaging_notes:string;
  qa_parameters:QAParameterTransfer[];scientific_limitations:string[];
}
export interface ShelfLifeToQAEnvelope{
  foodlab_transfer:true;schema_version:'1.0.0';transfer_id:string;transfer_type:'SHELF_LIFE_TO_QA';source_module:'SHELF_LIFE';target_module:'QA';
  exported_at:string;exported_by:string;workspace_id:string;source_record_id:string;payload:ShelfLifeToQAPayload;
  metadata:{application_version:string;notes:string;disclaimer:string;[key:string]:unknown};[key:string]:unknown;
}
export interface LinkedQAStandard{
  standard_id:string;qa_product_id:string;batch_id:string;workspace_id:string;product_name:string;status:'ACTIVE'|'DRAFT';
  parameters:QAParameterTransfer[];scientific_limitations:string[];source_transfer_id:string;source_record_id:string;created_at:string;
}
export interface BatchMonitoringProject{
  batch_id:string;qa_product_id:string;standard_id:string;workspace_id:string;product_name:string;status:'ACTIVE'|'DRAFT';
  product_project_id:string;product_id:string;formula_version_id:string;sensory_project_id?:string;shelf_life_study_id:string;
  source_transfer_id:string;created_at:string;
}
export interface ImportedQAProduct extends ShelfLifeToQAPayload{
  qa_product_id:string;batch_id:string;workspace_id:string;transfer_id:string;source_record_id:string;status:'ACTIVE'|'DRAFT';created_at:string;
  linked_standard:LinkedQAStandard;batch_monitoring_project:BatchMonitoringProject;
}
export interface TransferHistoryEntry{transfer_id:string;transfer_type:string;imported_or_exported:'IMPORTED'|'EXPORTED';timestamp:string;linked_record_id:string;filename:string;success:boolean;warning_count:number}
export type TransferParseResult={ok:true;value:ShelfLifeToQAEnvelope;warnings:string[]}|{ok:false;error:string;warnings:string[]};
