import type {
  FormulaIngredient,
  Ingredient,
  NutritionEstimate,
} from "../types/productDevelopment";
export const calculateTotalWeight = (lines: FormulaIngredient[]) =>
  lines.reduce(
    (s, l) =>
      s + (Number.isFinite(l.amount_g) && l.amount_g > 0 ? l.amount_g : 0),
    0,
  );
export const calculateIngredientPercentages = (lines: FormulaIngredient[]) => {
  const total = calculateTotalWeight(lines);
  return lines.map((l) => ({
    ...l,
    percentage: total > 0 ? (l.amount_g / total) * 100 : 0,
  }));
};
export const calculateFormulaCost = (
  lines: FormulaIngredient[],
): number | null =>
  lines.some((l) => l.amount_g > 0 && l.cost_per_kg == null)
    ? null
    : lines.reduce((s, l) => s + (l.amount_g / 1000) * (l.cost_per_kg ?? 0), 0);
export const calculateCostPerKg = (
  lines: FormulaIngredient[],
): number | null => {
  const cost = calculateFormulaCost(lines),
    kg = calculateTotalWeight(lines) / 1000;
  return cost == null || kg <= 0 ? null : cost / kg;
};
export const calculateCostPerServing = (
  lines: FormulaIngredient[],
  servingG: number | null,
) => {
  const kg = calculateCostPerKg(lines);
  return kg == null || !servingG || servingG <= 0
    ? null
    : (kg * servingG) / 1000;
};
export const calculateYieldAdjustedCost = (
  lines: FormulaIngredient[],
  yieldPercent: number | null,
) => {
  const cost = calculateFormulaCost(lines),
    weightKg = calculateTotalWeight(lines) / 1000;
  if (cost == null || !yieldPercent || yieldPercent <= 0 || weightKg <= 0)
    return null;
  return cost / ((weightKg * yieldPercent) / 100);
};
const nutrientKeys = [
  ["energy_kj", "energy_kj_per_100g"],
  ["protein", "protein_per_100g"],
  ["fat", "fat_per_100g"],
  ["carbohydrate", "carbohydrate_per_100g"],
  ["sugar", "sugar_per_100g"],
  ["fibre", "fibre_per_100g"],
  ["moisture", "moisture_per_100g"],
] as const;
export const calculateEstimatedNutrition = (
  lines: FormulaIngredient[],
  ingredients: Ingredient[],
  yieldPercent?: number | null,
): NutritionEstimate => {
  const total = calculateTotalWeight(lines);
  const result: Record<string, number | null | boolean> = { incomplete: false };
  if (total <= 0) {
    nutrientKeys.forEach(([k]) => (result[k] = null));
    result.incomplete = true;
    return result as unknown as NutritionEstimate;
  }
  for (const [key, source] of nutrientKeys) {
    let sum = 0,
      missing = false;
    for (const line of lines) {
      if (line.amount_g <= 0) continue;
      const ing = ingredients.find(
        (i) => i.ingredient_id === line.ingredient_id,
      );
      if (!ing || ing[source] == null) {
        missing = true;
        continue;
      }
      sum += line.amount_g * Number(ing[source]);
    }
    result[key] = missing
      ? null
      : (sum / total) *
        (yieldPercent && yieldPercent > 0 ? 100 / yieldPercent : 1);
    result.incomplete = Boolean(result.incomplete) || missing;
  }
  return result as unknown as NutritionEstimate;
};
export const calculateCostContribution = (lines: FormulaIngredient[]) => {
  const total = calculateFormulaCost(lines);
  return lines.map((l) => ({
    ...l,
    value:
      l.cost_per_kg == null || total == null || total === 0
        ? null
        : (((l.amount_g / 1000) * l.cost_per_kg) / total) * 100,
  }));
};
export const calculateNutritionContribution = (
  lines: FormulaIngredient[],
  ingredients: Ingredient[],
  metric: "protein" | "fat" | "sugar" | "energy_kj",
) => {
  const prop = `${metric}_per_100g` as keyof Ingredient;
  const rows = lines.map((l) => {
    const v = ingredients.find((i) => i.ingredient_id === l.ingredient_id)?.[
      prop
    ];
    return {
      name: l.ingredient_name,
      value: typeof v === "number" ? (l.amount_g * v) / 100 : 0,
    };
  });
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows.map((r) => ({
    ...r,
    percentage: total ? (100 * r.value) / total : 0,
  }));
};
export const validateFormulaLine = (amount: number) =>
  Number.isFinite(amount) && amount >= 0
    ? null
    : "Amount must be a valid non-negative number.";
