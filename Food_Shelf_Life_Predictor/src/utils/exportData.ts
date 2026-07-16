import Papa from "papaparse";
import type { ShelfLifeResult, ShelfLifeStudy } from "../types/shelfLife";

export const download = (name: string, text: string, type = "text/plain") => {
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(new Blob([text], { type }));
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const exportStudyJson = (study: ShelfLifeStudy) =>
  download(
    `${study.study_code}.json`,
    JSON.stringify(study, null, 2),
    "application/json",
  );

export function resultRowsToCsv(
  rows: Array<{ study: ShelfLifeStudy; result: ShelfLifeResult }>,
) {
  return Papa.unparse(
    rows.map(({ study, result }) => {
      const condition = study.storage_conditions.find(
        (item) => item.condition_id === result.condition_id,
      );
      const parameter = study.parameters.find(
        (item) => item.parameter_id === result.parameter_id,
      );
      const samplingPoint = study.sampling_points.find(
        (item) => item.sampling_point_id === result.sampling_point_id,
      );
      return {
        study_code: study.study_code,
        condition_name: condition?.condition_name ?? "",
        planned_day: samplingPoint?.planned_day ?? "",
        parameter_name: parameter?.parameter_name ?? "",
        replicate_number: result.replicate_number,
        measured_value: result.measured_value,
        unit: parameter?.unit ?? "",
        qualifier: result.qualifier ?? "",
        result_date: result.result_date,
        comments: result.comments ?? "",
      };
    }),
  );
}

export const resultsToCsv = (study: ShelfLifeStudy) =>
  resultRowsToCsv(study.results.map((result) => ({ study, result })));
