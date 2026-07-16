import { z } from "zod";

const nullableNonNegative = z.number().finite().nonnegative().nullable();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalDateString = z.union([dateString, z.literal("")]).optional();
const score = z.number().finite().min(1).max(9).nullable();

export const ingredientSchema = z
  .object({
    ingredient_id: z.string().min(1),
    ingredient_name: z.string().min(1),
    category: z.string().min(1),
    supplier: z.string().optional(),
    supplier_code: z.string().optional(),
    cost_per_kg: nullableNonNegative,
    protein_per_100g: nullableNonNegative,
    fat_per_100g: nullableNonNegative,
    carbohydrate_per_100g: nullableNonNegative,
    sugar_per_100g: nullableNonNegative,
    fibre_per_100g: nullableNonNegative,
    moisture_per_100g: nullableNonNegative,
    energy_kj_per_100g: nullableNonNegative,
    allergens: z.array(z.string()),
    notes: z.string().optional(),
    is_demo: z.boolean(),
  })
  .passthrough();

const formulaIngredientSchema = z
  .object({
    line_id: z.string().min(1),
    ingredient_id: z.string().min(1),
    ingredient_name: z.string().min(1),
    amount_g: z.number().finite().nonnegative(),
    percentage: z.number().finite().nonnegative(),
    cost_per_kg: nullableNonNegative,
    line_cost: nullableNonNegative,
    notes: z.string().optional(),
  })
  .passthrough();

const formulaSchema = z
  .object({
    formula_id: z.string().min(1),
    project_id: z.string().min(1),
    formula_version_id: z
      .string()
      .regex(/^FV-[A-Za-z0-9]{8}$/)
      .optional(),
    version_name: z.string(),
    version_number: z.number().int().positive(),
    date_created: dateString,
    created_by: z.string().optional(),
    batch_size_g: z.number().finite().nonnegative(),
    processing_yield_percent: z.number().finite().nullable(),
    notes: z.string().optional(),
    status: z.enum([
      "DRAFT",
      "TRIALLED",
      "REJECTED",
      "SHORTLISTED",
      "APPROVED",
    ]),
    ingredients: z.array(formulaIngredientSchema),
    is_baseline: z.boolean().optional(),
  })
  .passthrough();

const sensoryResponseSchema = z
  .object({
    panelist_id: z.string().min(1),
    formula_version: z.string(),
    appearance: score,
    aroma: score,
    flavour: score,
    sweetness: score,
    texture: score,
    aftertaste: score,
    overall_liking: score,
    comments: z.string().optional(),
  })
  .passthrough();

const sensoryTestSchema = z
  .object({
    test_id: z.string().min(1),
    formula_id: z.string().min(1),
    test_name: z.string().min(1),
    test_date: dateString,
    panel_type: z.enum([
      "Internal",
      "Trained",
      "Consumer",
      "Student",
      "Demonstration",
    ]),
    number_of_panellists: z.number().int().nonnegative(),
    test_method: z.string().min(1),
    notes: z.string().optional(),
    responses: z.array(sensoryResponseSchema),
  })
  .passthrough();

const productBriefSchema = z
  .object({
    product_description: z.string().optional(),
    target_serving_size_g: nullableNonNegative,
    target_cost_per_kg: nullableNonNegative,
    target_protein_percent: nullableNonNegative,
    target_fat_percent: nullableNonNegative,
    target_sugar_percent: nullableNonNegative,
    target_moisture_percent: nullableNonNegative,
    target_energy_kj_per_100g: nullableNonNegative,
    target_shelf_life_days: nullableNonNegative,
    storage_condition: z.string().optional(),
    target_texture: z.string().optional(),
    target_flavour: z.string().optional(),
    target_colour: z.string().optional(),
    target_consumer: z.string().optional(),
    claims: z.array(z.string()),
    constraints: z.array(z.string()),
  })
  .passthrough();

const developmentNotesSchema = z
  .object({
    trial_observations: z.string(),
    processing_issues: z.string(),
    texture_observations: z.string(),
    flavour_observations: z.string(),
    packaging_considerations: z.string(),
    open_questions: z.string(),
    next_actions: z.string(),
  })
  .passthrough();

export const projectSchema = z
  .object({
    project_id: z.string().min(1),
    workspace_id: z
      .string()
      .regex(/^WS-[A-Za-z0-9]{8}$/)
      .optional(),
    product_project_id: z
      .string()
      .regex(/^PD-[A-Za-z0-9]{8}$/)
      .optional(),
    product_id: z
      .string()
      .regex(/^PR-[A-Za-z0-9]{8}$/)
      .optional(),
    project_name: z.string(),
    product_category: z.string(),
    project_code: z.string(),
    customer_or_brand: z.string().optional(),
    target_market: z.string().optional(),
    development_stage: z.string(),
    project_owner: z.string().optional(),
    start_date: dateString,
    target_launch_date: optionalDateString,
    project_objective: z.string().optional(),
    target_consumer: z.string().optional(),
    product_claims: z.array(z.string()).optional(),
    key_constraints: z.array(z.string()).optional(),
    allergen_notes: z.string().optional(),
    packaging_notes: z.string().optional(),
    processing_notes: z.string().optional(),
    product_brief: productBriefSchema,
    formula_versions: z.array(formulaSchema),
    sensory_tests: z.array(sensoryTestSchema),
    development_notes: developmentNotesSchema,
    status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    is_demo: z.boolean().optional(),
  })
  .passthrough();

export const persistedDataSchema = z.object({
  schemaVersion: z.literal(1),
  projects: z.array(projectSchema),
  ingredients: z.array(ingredientSchema),
  selectedProjectId: z.string(),
  selectedFormulaId: z.string(),
});
