import type {
  Ingredient,
  ProductDevelopmentProject,
  SensoryResponse,
} from "../types/productDevelopment";
import { assertProjectRelationships } from "./projectValidation";
import { generateDevelopmentSummaryMarkdown } from "./developmentSummary";
import { projectSchema } from "./dataSchemas";
const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
export const downloadText = (
  name: string,
  text: string,
  type = "text/plain",
) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
export const ingredientsToCsv = (items: Ingredient[]) => {
  const keys = [
    "ingredient_id",
    "ingredient_name",
    "category",
    "supplier",
    "supplier_code",
    "cost_per_kg",
    "protein_per_100g",
    "fat_per_100g",
    "carbohydrate_per_100g",
    "sugar_per_100g",
    "fibre_per_100g",
    "moisture_per_100g",
    "energy_kj_per_100g",
    "allergens",
    "notes",
  ] as const;
  return [
    keys.join(","),
    ...items.map((i) =>
      keys
        .map((k) =>
          esc(Array.isArray(i[k]) ? (i[k] as string[]).join(";") : i[k]),
        )
        .join(","),
    ),
  ].join("\n");
};
export const formulaToCsv = (
  items: {
    ingredient_name: string;
    amount_g: number;
    percentage: number;
    cost_per_kg: number | null;
    line_cost: number | null;
  }[],
) =>
  [
    "ingredient_name,amount_g,percentage,cost_per_kg,line_cost",
    ...items.map((i) =>
      [i.ingredient_name, i.amount_g, i.percentage, i.cost_per_kg, i.line_cost]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
export const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};
const numberOrNull = (v: string, field: string, rowNumber: number) => {
  if (v.trim() === "") return null;
  const parsed = Number(v);
  if (!Number.isFinite(parsed))
    throw new Error(`${field} must be a valid number on row ${rowNumber}.`);
  if (parsed < 0)
    throw new Error(`${field} cannot be negative on row ${rowNumber}.`);
  return parsed;
};
export const parseIngredientCsv = (text: string): Ingredient[] => {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV contains no data rows.");
  const h = rows[0];
  for (const k of ["ingredient_id", "ingredient_name", "category"])
    if (!h.includes(k)) throw new Error(`Missing required field: ${k}`);
  const seen = new Set<string>();
  return rows.slice(1).map((r, n) => {
    const get = (k: string) => r[h.indexOf(k)] ?? "",
      key = get("ingredient_id");
    for (const field of ["ingredient_id", "ingredient_name", "category"])
      if (!get(field).trim())
        throw new Error(`${field} is required on row ${n + 2}.`);
    if (seen.has(key))
      throw new Error(`Duplicate ingredient_id on row ${n + 2}.`);
    seen.add(key);
    const num = (k: string) => numberOrNull(get(k), k, n + 2);
    return {
      ingredient_id: key,
      ingredient_name: get("ingredient_name"),
      category: get("category"),
      supplier: get("supplier"),
      supplier_code: get("supplier_code"),
      cost_per_kg: num("cost_per_kg"),
      protein_per_100g: num("protein_per_100g"),
      fat_per_100g: num("fat_per_100g"),
      carbohydrate_per_100g: num("carbohydrate_per_100g"),
      sugar_per_100g: num("sugar_per_100g"),
      fibre_per_100g: num("fibre_per_100g"),
      moisture_per_100g: num("moisture_per_100g"),
      energy_kj_per_100g: num("energy_kj_per_100g"),
      allergens: get("allergens").split(";").filter(Boolean),
      notes: get("notes"),
      is_demo: false,
    };
  });
};
export const parseSensoryCsv = (text: string): SensoryResponse[] => {
  const rows = parseCsv(text),
    h = rows[0] ?? [];
  for (const k of ["panelist_id", "formula_version", "overall_liking"])
    if (!h.includes(k)) throw new Error(`Missing required field: ${k}`);
  if (rows.length < 2) throw new Error("CSV contains no data rows.");
  const numeric = [
    "appearance",
    "aroma",
    "flavour",
    "sweetness",
    "texture",
    "aftertaste",
    "overall_liking",
  ] as const;
  return rows.slice(1).map((r, n) => {
    const get = (k: string) => r[h.indexOf(k)] ?? "";
    if (!get("panelist_id").trim())
      throw new Error(`panelist_id is required on row ${n + 2}.`);
    if (!get("formula_version").trim())
      throw new Error(`formula_version is required on row ${n + 2}.`);
    const result: any = {
      panelist_id: get("panelist_id"),
      formula_version: get("formula_version"),
      comments: get("comments"),
    };
    numeric.forEach((k) => {
      result[k] = numberOrNull(get(k), k, n + 2);
      if (result[k] != null && (result[k] < 1 || result[k] > 9))
        throw new Error(`${k} must be 1–9 on row ${n + 2}.`);
    });
    return result;
  });
};
export const parseProjectJson = (text: string): ProductDevelopmentProject => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file.");
  }
  const parsed = projectSchema.parse(
    data,
  ) as unknown as ProductDevelopmentProject;
  return assertProjectRelationships(parsed);
};
export const projectToMarkdown = (
  project: ProductDevelopmentProject,
  ingredients: Ingredient[] = [],
  formulaId?: string,
) => {
  const formula =
    project.formula_versions.find((item) => item.formula_id === formulaId) ??
    project.formula_versions.find((item) => item.is_baseline) ??
    project.formula_versions[0];
  if (!formula)
    return `# Development Summary — ${project.project_name}\n\nNo formula version is available.\n\n> This report contains estimated and demonstration data. It is not a regulatory, safety, nutrition labelling or commercial manufacturing approval document.\n`;
  return generateDevelopmentSummaryMarkdown(project, formula, ingredients);
};
