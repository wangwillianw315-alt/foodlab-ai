export type QualityStatus = 'PASS' | 'WARNING' | 'FAIL' | 'INCOMPLETE';
export type ParameterKey = 'ph' | 'water_activity' | 'moisture_percent' | 'temperature_c';

export interface FoodQualityRecord {
  sample_id: string; product_name: string; batch_number: string; test_date: string;
  ph: number | null; water_activity: number | null; moisture_percent: number | null;
  temperature_c: number | null; protein_percent: number | null; fat_percent: number | null;
  status?: QualityStatus; quality_score?: number; failed_parameters?: string[];
  warning_parameters?: string[]; missing_parameters?: string[]; source_row?: number;
  assessment_standard_id?: string; assessment_source?: 'DEMONSTRATION'|'LIFECYCLE_TRANSFER';
}
export interface QualityStandard {
  productName: string; ph: { min: number; max: number }; waterActivity: { max: number };
  moisture: { min: number; max: number }; temperature: { max: number };
  warningMarginPercent: number;
}
export type QualityStandardsMap = Record<string, QualityStandard>;
export interface ParseIssue { row: number; message: string; }
export interface ParseResult { records: FoodQualityRecord[]; errors: ParseIssue[]; totalRows: number; }
export interface DataSourceInfo { name: string; importedAt: string; validRows: number; rejectedRows: number; isSample: boolean; }
export interface Filters { product: string; batch: string; status: string; dateFrom: string; dateTo: string; search: string; }
