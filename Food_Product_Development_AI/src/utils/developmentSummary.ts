import type {
  FormulaVersion,
  Ingredient,
  ProductDevelopmentProject,
} from "../types/productDevelopment";
import {
  calculateCostContribution,
  calculateCostPerKg,
  calculateCostPerServing,
  calculateEstimatedNutrition,
  calculateFormulaCost,
  calculateTotalWeight,
  calculateYieldAdjustedCost,
} from "./formulaCalculations";
import { calculateAttributeSummary } from "./sensoryAnalysis";
import { evaluateTarget } from "./targetAnalysis";

export const reportSensoryAttributes = [
  "appearance",
  "aroma",
  "flavour",
  "sweetness",
  "texture",
  "aftertaste",
  "overall_liking",
] as const;

export const buildDevelopmentSummary = (
  project: ProductDevelopmentProject,
  formula: FormulaVersion,
  ingredients: Ingredient[],
) => {
  const totalWeight = calculateTotalWeight(formula.ingredients);
  const totalCost = calculateFormulaCost(formula.ingredients);
  const costPerKg = calculateCostPerKg(formula.ingredients);
  const adjustedCostPerKg = calculateYieldAdjustedCost(
    formula.ingredients,
    formula.processing_yield_percent,
  );
  const servingSize = project.product_brief.target_serving_size_g;
  const costPerServing = calculateCostPerServing(
    formula.ingredients,
    servingSize,
  );
  const adjustedCostPerServing =
    adjustedCostPerKg == null || !servingSize || servingSize <= 0
      ? null
      : (adjustedCostPerKg * servingSize) / 1000;
  const nutritionBefore = calculateEstimatedNutrition(
    formula.ingredients,
    ingredients,
  );
  const nutritionYieldAdjusted = calculateEstimatedNutrition(
    formula.ingredients,
    ingredients,
    formula.processing_yield_percent,
  );
  const useYield =
    formula.processing_yield_percent != null &&
    formula.processing_yield_percent > 0;
  const nutritionForGap = useYield ? nutritionYieldAdjusted : nutritionBefore;
  const costForGap = useYield ? adjustedCostPerKg : costPerKg;
  const linkedTests = project.sensory_tests.filter(
    (test) => test.formula_id === formula.formula_id,
  );
  const responses = linkedTests.flatMap((test) => test.responses);
  const sensory = Object.fromEntries(
    reportSensoryAttributes.map((attribute) => [
      attribute,
      calculateAttributeSummary(
        responses.map((response) => response[attribute]),
      ),
    ]),
  ) as Record<
    (typeof reportSensoryAttributes)[number],
    ReturnType<typeof calculateAttributeSummary>
  >;
  const gapInputs = [
    {
      name: "Protein",
      current: nutritionForGap.protein,
      target: project.product_brief.target_protein_percent,
      unit: "g/100g",
      higherIsBetter: true,
    },
    {
      name: "Fat",
      current: nutritionForGap.fat,
      target: project.product_brief.target_fat_percent,
      unit: "g/100g",
    },
    {
      name: "Sugar",
      current: nutritionForGap.sugar,
      target: project.product_brief.target_sugar_percent,
      unit: "g/100g",
      lowerIsBetter: true,
    },
    {
      name: "Moisture",
      current: nutritionForGap.moisture,
      target: project.product_brief.target_moisture_percent,
      unit: "g/100g",
    },
    {
      name: "Energy",
      current: nutritionForGap.energy_kj,
      target: project.product_brief.target_energy_kj_per_100g,
      unit: "kJ/100g",
    },
    {
      name: "Cost",
      current: costForGap,
      target: project.product_brief.target_cost_per_kg,
      unit: "$/kg",
      lowerIsBetter: true,
    },
    {
      name: "Sensory overall liking",
      current: sensory.overall_liking.mean,
      target: 7,
      unit: "/9",
      higherIsBetter: true,
    },
  ];
  const gaps = gapInputs.map((item) => {
    const status = evaluateTarget(
      item.current,
      item.target,
      item.lowerIsBetter,
      item.higherIsBetter,
    );
    const difference =
      item.current == null || item.target == null
        ? null
        : item.current - item.target;
    const variancePercent =
      difference == null || !item.target
        ? null
        : (difference / item.target) * 100;
    const prompt =
      status === "INCOMPLETE_DATA"
        ? "Data missing"
        : status === "NO_TARGET"
          ? "Set target in Product Brief"
          : status === "MEETS_TARGET"
            ? "Confirm by laboratory analysis"
            : status === "CLOSE_TO_TARGET"
              ? "Review and confirm"
              : item.lowerIsBetter
                ? "Reduce or review"
                : item.higherIsBetter
                  ? "Increase or review"
                  : "Review";
    return { ...item, status, difference, variancePercent, prompt };
  });
  const costContributors = calculateCostContribution(formula.ingredients)
    .map((line) => ({
      name: line.ingredient_name,
      lineCost: line.line_cost,
      percentage: line.value,
    }))
    .sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1));
  const risks: string[] = [];
  const missingCosts = formula.ingredients
    .filter((line) => line.cost_per_kg == null)
    .map((line) => line.ingredient_name);
  if (missingCosts.length)
    risks.push(`Missing ingredient cost data: ${missingCosts.join(", ")}.`);
  if (nutritionBefore.incomplete)
    risks.push("One or more ingredient nutrition records are incomplete.");
  if (!useYield)
    risks.push(
      "Processing yield is not defined; yield-adjusted results are unavailable.",
    );
  if (!responses.length)
    risks.push(
      "No linked sensory responses are available for this formula version.",
    );
  if (!project.allergen_notes?.trim())
    risks.push("Allergen review notes have not been recorded.");
  risks.push(
    "Supplier specifications, laboratory results, safety controls, regulatory eligibility and shelf life require independent confirmation.",
  );

  return {
    formula,
    totalWeight,
    totalCost,
    costPerKg,
    adjustedCostPerKg,
    costPerServing,
    adjustedCostPerServing,
    servingSize,
    nutritionBefore,
    nutritionYieldAdjusted,
    useYield,
    linkedTests,
    responses,
    sensory,
    gaps,
    costContributors,
    risks,
  };
};

const mdValue = (value: number | null, digits = 2) =>
  value == null || !Number.isFinite(value)
    ? "Data missing"
    : value.toFixed(digits);

export const generateDevelopmentSummaryMarkdown = (
  project: ProductDevelopmentProject,
  formula: FormulaVersion,
  ingredients: Ingredient[],
) => {
  const summary = buildDevelopmentSummary(project, formula, ingredients);
  const nutritionRows = [
    ["Energy", "energy_kj", "kJ/100g"],
    ["Protein", "protein", "g/100g"],
    ["Fat", "fat", "g/100g"],
    ["Carbohydrate", "carbohydrate", "g/100g"],
    ["Sugar", "sugar", "g/100g"],
    ["Fibre", "fibre", "g/100g"],
    ["Moisture", "moisture", "g/100g"],
  ] as const;
  return `# Development Summary — ${project.project_name}

> This report contains estimated and demonstration data. It is not a regulatory, safety, nutrition labelling or commercial manufacturing approval document.

## Project Overview

- Project code: ${project.project_code}
- Category: ${project.product_category}
- Development stage: ${project.development_stage}
- Status: ${project.status}
- Project owner: ${project.project_owner || "Not recorded"}

## Product Brief

${project.product_brief.product_description || "No product description recorded."}

- Target consumer: ${project.product_brief.target_consumer || project.target_consumer || "Not recorded"}
- Planning claims: ${project.product_brief.claims.join(", ") || "None recorded"}
- Constraints: ${project.product_brief.constraints.join(", ") || "None recorded"}

Claims are planning labels only. Regulatory eligibility is not assessed in V1.

## Current Formula

- Version: ${formula.version_name}
- Status: ${formula.status}
- Input weight: ${mdValue(summary.totalWeight)} g
- Processing yield: ${formula.processing_yield_percent == null ? "Not defined" : `${mdValue(formula.processing_yield_percent)}%`}

| Ingredient | Amount (g) | Percentage | Cost/kg | Line cost |
| --- | ---: | ---: | ---: | ---: |
${formula.ingredients.map((line) => `| ${line.ingredient_name} | ${mdValue(line.amount_g)} | ${mdValue(line.percentage)}% | ${line.cost_per_kg == null ? "Data missing" : `$${mdValue(line.cost_per_kg)}`} | ${line.line_cost == null ? "Data missing" : `$${mdValue(line.line_cost)}`} |`).join("\n")}

## Estimated Cost

- Total batch cost: ${summary.totalCost == null ? "Data missing" : `$${mdValue(summary.totalCost)}`}
- Input cost/kg: ${summary.costPerKg == null ? "Data missing" : `$${mdValue(summary.costPerKg)}`}
- Yield-adjusted cost/kg: ${summary.adjustedCostPerKg == null ? "Data missing" : `$${mdValue(summary.adjustedCostPerKg)}`}
- Input cost/serving: ${summary.costPerServing == null ? "Data missing" : `$${mdValue(summary.costPerServing)}`}
- Yield-adjusted cost/serving: ${summary.adjustedCostPerServing == null ? "Data missing" : `$${mdValue(summary.adjustedCostPerServing)}`}

### Top Cost Contributors

| Ingredient | Line cost | Cost share |
| --- | ---: | ---: |
${summary.costContributors
  .slice(0, 5)
  .map(
    (item) =>
      `| ${item.name} | ${item.lineCost == null ? "Data missing" : `$${mdValue(item.lineCost)}`} | ${item.percentage == null ? "Data missing" : `${mdValue(item.percentage)}%`} |`,
  )
  .join("\n")}

## Estimated Nutrition

| Nutrient | Before processing | Yield-adjusted | Unit |
| --- | ---: | ---: | --- |
${nutritionRows.map(([label, key, unit]) => `| ${label} | ${mdValue(summary.nutritionBefore[key])} | ${summary.useYield ? mdValue(summary.nutritionYieldAdjusted[key]) : "Data missing"} | ${unit} |`).join("\n")}

This is a formulation estimate only and is not a replacement for laboratory analysis or legally compliant nutrition information.

## Sensory Results

- Linked tests: ${summary.linkedTests.length}
- Responses: ${summary.responses.length}
- Overall liking: ${mdValue(summary.sensory.overall_liking.mean)} / 9

| Attribute | Mean | Median | Standard deviation | Responses |
| --- | ---: | ---: | ---: | ---: |
${reportSensoryAttributes
  .map((attribute) => {
    const result = summary.sensory[attribute];
    return `| ${attribute.replaceAll("_", " ")} | ${mdValue(result.mean)} | ${mdValue(result.median)} | ${mdValue(result.standardDeviation)} | ${result.count} |`;
  })
  .join("\n")}

## Target Gap Analysis

| Metric | Current | Target | Difference | Variance | Status | Review prompt |
| --- | ---: | ---: | ---: | ---: | --- | --- |
${summary.gaps.map((gap) => `| ${gap.name} | ${mdValue(gap.current)} ${gap.unit} | ${mdValue(gap.target)} ${gap.unit} | ${mdValue(gap.difference)} | ${gap.variancePercent == null ? "Data missing" : `${mdValue(gap.variancePercent)}%`} | ${gap.status} | ${gap.prompt} |`).join("\n")}

## Development Notes

- Trial observations: ${project.development_notes.trial_observations || "Not recorded"}
- Processing issues: ${project.development_notes.processing_issues || "Not recorded"}
- Texture observations: ${project.development_notes.texture_observations || "Not recorded"}
- Flavour observations: ${project.development_notes.flavour_observations || "Not recorded"}
- Packaging considerations: ${project.development_notes.packaging_considerations || "Not recorded"}

## Risks and Open Questions

${summary.risks.map((risk) => `- ${risk}`).join("\n")}
- Open questions: ${project.development_notes.open_questions || "Not recorded"}

## Next Trial Plan

${project.development_notes.next_actions || "No next actions recorded."}

---

Demonstration and educational use only.
`;
};
