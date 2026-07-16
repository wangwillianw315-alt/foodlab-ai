import type { ShelfLifeStudy } from "../types/shelfLife";
import { assessNumericLimit } from "./limitAssessment";
import { calculateMean } from "./statistics";
import {
  calculateConservativeEstimate,
  calculateThresholdCrossing,
  fitLinearModel,
} from "./shelfLifeModels";

export interface StudyPlanningEstimate {
  conditionId: string;
  parameterId: string;
  lastAcceptableDay: number | null;
  firstUnacceptableDay: number | null;
  predictedCrossingDay: number | null;
  conservativeDay: number | null;
  rSquared: number | null;
}

export function calculateStudyPlanningEstimate(
  study: ShelfLifeStudy,
  safetyFactor = 0.8,
): StudyPlanningEstimate | null {
  const estimates: StudyPlanningEstimate[] = [];

  for (const condition of study.storage_conditions) {
    for (const parameter of study.parameters) {
      if (
        parameter.result_type !== "NUMERIC" ||
        (parameter.upper_limit == null && parameter.lower_limit == null)
      )
        continue;

      const observations = study.sampling_points
        .filter((point) => point.condition_id === condition.condition_id)
        .map((point) => {
          const values = study.results
            .filter(
              (result) =>
                result.sampling_point_id === point.sampling_point_id &&
                result.parameter_id === parameter.parameter_id &&
                result.measured_value != null &&
                Number.isFinite(result.measured_value),
            )
            .map((result) => result.measured_value as number);
          return { day: point.planned_day, mean: calculateMean(values) };
        })
        .filter((item) => Number.isFinite(item.mean))
        .sort((a, b) => a.day - b.day);

      if (!observations.length) continue;
      const assessed = observations.map((item) => ({
        ...item,
        status: assessNumericLimit(
          item.mean,
          parameter.lower_limit,
          parameter.upper_limit,
          parameter.warning_limit,
        ),
      }));
      const firstUnacceptableDay =
        assessed.find((item) => item.status === "UNACCEPTABLE")?.day ?? null;
      const acceptableBeforeFailure = assessed.filter(
        (item) =>
          item.status !== "UNACCEPTABLE" &&
          (firstUnacceptableDay == null || item.day < firstUnacceptableDay),
      );
      const lastAcceptableDay = acceptableBeforeFailure.length
        ? acceptableBeforeFailure[acceptableBeforeFailure.length - 1].day
        : null;

      const model = fitLinearModel(
        observations.map((item) => ({ x: item.day, y: item.mean })),
      );
      const threshold =
        parameter.upper_limit != null && parameter.lower_limit != null
          ? (model.slope ?? 0) >= 0
            ? parameter.upper_limit
            : parameter.lower_limit
          : (parameter.upper_limit ?? parameter.lower_limit);
      const predictedCrossingDay = model.valid
        ? calculateThresholdCrossing(model.slope, model.intercept, threshold as number)
        : null;
      const conservativeDay = calculateConservativeEstimate(
        lastAcceptableDay,
        firstUnacceptableDay,
        predictedCrossingDay,
        safetyFactor,
      );
      if (conservativeDay == null) continue;

      estimates.push({
        conditionId: condition.condition_id,
        parameterId: parameter.parameter_id,
        lastAcceptableDay,
        firstUnacceptableDay,
        predictedCrossingDay,
        conservativeDay,
        rSquared: model.r_squared,
      });
    }
  }

  return (
    estimates.sort((a, b) =>
      (a.conservativeDay as number) - (b.conservativeDay as number),
    )[0] ?? null
  );
}
