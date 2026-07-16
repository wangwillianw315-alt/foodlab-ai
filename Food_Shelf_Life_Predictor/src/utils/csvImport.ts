import Papa from "papaparse";
import type { ShelfLifeResult, ShelfLifeStudy } from "../types/shelfLife";
import { assessNumericLimit } from "./limitAssessment";

export interface CsvIssue {
  row: number;
  message: string;
}

const requiredColumns = [
  "study_code",
  "condition_name",
  "planned_day",
  "parameter_name",
  "replicate_number",
  "measured_value",
  "result_date",
];

const qualifiers = new Set([
  "EXACT",
  "LESS_THAN",
  "GREATER_THAN",
  "NOT_DETECTED",
  "DETECTED",
  "ESTIMATED",
]);

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function importResultsCsv(csv: string, studies: ShelfLifeStudy[]) {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  const issues: CsvIssue[] = parsed.errors.map((error) => ({
    row: (error.row ?? 0) + 2,
    message: error.message,
  }));
  const results: ShelfLifeResult[] = [];
  const missingHeaders = requiredColumns.filter(
    (column) => !parsed.meta.fields?.includes(column),
  );
  if (missingHeaders.length) {
    issues.push({ row: 1, message: `Missing columns: ${missingHeaders.join(", ")}` });
    return { results, issues };
  }
  const seen = new Set(
    studies.flatMap((study) =>
      study.results.map(
        (result) =>
          `${study.study_id}|${result.condition_id}|${result.sampling_point_id}|${result.parameter_id}|${result.replicate_number}`,
      ),
    ),
  );

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const missing = requiredColumns
      .filter((column) => column !== "measured_value")
      .filter((column) => !row[column]?.trim());
    if (missing.length) {
      issues.push({ row: rowNumber, message: `Missing: ${missing.join(", ")}` });
      return;
    }

    const study = studies.find((item) => item.study_code === row.study_code.trim());
    const condition = study?.storage_conditions.find(
      (item) => item.condition_name === row.condition_name.trim(),
    );
    const parameter = study?.parameters.find(
      (item) => item.parameter_name === row.parameter_name.trim(),
    );
    const plannedDay = Number(row.planned_day);
    const replicate = Number(row.replicate_number);
    const hasMeasuredValue = Boolean(row.measured_value?.trim());
    const value = hasMeasuredValue ? Number(row.measured_value) : null;
    const point = study?.sampling_points.find(
      (item) => item.condition_id === condition?.condition_id && item.planned_day === plannedDay,
    );
    const qualifier = (row.qualifier || "EXACT").trim().toUpperCase();
    const qualifierAllowsBlankValue =
      qualifier === "NOT_DETECTED" || qualifier === "DETECTED";

    if (
      !study ||
      !condition ||
      !parameter ||
      !point ||
      !Number.isFinite(plannedDay) ||
      !Number.isInteger(replicate) ||
      replicate < 1 ||
      (!hasMeasuredValue && !qualifierAllowsBlankValue) ||
      (value != null && !Number.isFinite(value)) ||
      !isValidIsoDate(row.result_date.trim()) ||
      !qualifiers.has(qualifier)
    ) {
      issues.push({
        row: rowNumber,
        message: "Unknown reference, invalid number, qualifier, replicate, or date",
      });
      return;
    }

    const key = `${study.study_id}|${condition.condition_id}|${point.sampling_point_id}|${parameter.parameter_id}|${replicate}`;
    if (seen.has(key)) {
      issues.push({ row: rowNumber, message: "Duplicate result" });
      return;
    }
    seen.add(key);

    results.push({
      result_id: crypto.randomUUID(),
      study_id: study.study_id,
      condition_id: condition.condition_id,
      sampling_point_id: point.sampling_point_id,
      parameter_id: parameter.parameter_id,
      replicate_number: replicate,
      measured_value: value,
      result_date: row.result_date.trim(),
      qualifier,
      comments: row.comments,
      status:
        value == null
          ? "MANUAL_REVIEW"
          : assessNumericLimit(
              value,
              parameter.lower_limit,
              parameter.upper_limit,
              parameter.warning_limit,
            ),
      is_demo: false,
    });
  });

  return { results, issues };
}
