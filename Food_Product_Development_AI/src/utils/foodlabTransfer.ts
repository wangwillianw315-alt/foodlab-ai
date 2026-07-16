import { z } from "zod";
import type {
  FormulaVersion,
  Ingredient,
  ProductDevelopmentProject,
} from "../types/productDevelopment";
import {
  FOODLAB_SCHEMA_VERSION,
  type ProductToSensoryEnvelope,
} from "../types/foodlabTransfer";
import { calculateCostPerKg } from "./formulaCalculations";

export const FOODLAB_WORKSPACE_ID_KEY = "foodlab-workspace-id";
export const PRODUCT_TO_SENSORY_DISCLAIMER =
  "Demonstration planning data only. Verify allergens, formulation details and test design before use. This transfer is not a regulatory, food-safety or commercial approval.";

export type FoodLabIdPrefix = "WS" | "PD" | "PR" | "FV" | "TX";

const makeRandomSuffix = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();
  }
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(4);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    )
      .join("")
      .toUpperCase();
  }
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  )
    .join("")
    .toUpperCase();
};

export const createFoodLabId = (prefix: FoodLabIdPrefix) =>
  `${prefix}-${makeRandomSuffix()}`;

export const getOrCreateWorkspaceId = (
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
) => {
  const current = storage.getItem(FOODLAB_WORKSPACE_ID_KEY);
  if (/^WS-[A-Fa-f0-9]{8,}$/.test(current ?? "")) return current!;
  const workspaceId = createFoodLabId("WS");
  storage.setItem(FOODLAB_WORKSPACE_ID_KEY, workspaceId);
  return workspaceId;
};

const prefixedId = (prefix: FoodLabIdPrefix) =>
  z.string().regex(new RegExp(`^${prefix}-[A-Fa-f0-9]{8,}$`));

const rawEnvelopeSchema = z
  .object({
    foodlab_transfer: z.literal(true),
    schema_version: z.string(),
    transfer_id: z.string().min(1),
    transfer_type: z.string().min(1),
    source_module: z.string().min(1),
    target_module: z.string().min(1),
    exported_at: z.string().datetime({ offset: true }),
    exported_by: z.string().min(1),
    workspace_id: z.string().min(1),
    source_record_id: z.string().min(1),
    payload: z.unknown(),
    metadata: z
      .object({
        application_version: z.string().min(1),
        notes: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

const productToSensoryPayloadSchema = z
  .object({
    product_project_id: prefixedId("PD"),
    product_id: prefixedId("PR"),
    product_name: z.string().trim().min(1),
    product_category: z.string().trim().min(1),
    project_objective: z.string(),
    target_consumer: z.string(),
    samples: z
      .array(
        z
          .object({
            formula_version_id: prefixedId("FV"),
            formula_version_name: z.string().trim().min(1),
            sample_name: z.string().trim().min(1),
            allergens: z.array(z.string()),
            ingredient_summary: z.array(z.string()),
            demo_only: z.boolean(),
            cost_summary: z.number().finite().nonnegative().nullable().optional(),
          })
          .passthrough(),
      )
      .min(1)
      .max(4),
    suggested_test_design: z
      .object({
        test_types: z.array(z.string()),
        attributes: z.array(z.string()),
        notes: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

const productToSensoryEnvelopeSchema = rawEnvelopeSchema.extend({
  schema_version: z.literal(FOODLAB_SCHEMA_VERSION),
  transfer_id: prefixedId("TX"),
  transfer_type: z.literal("PRODUCT_TO_SENSORY"),
  source_module: z.literal("PRODUCT_DEVELOPMENT"),
  target_module: z.literal("SENSORY"),
  workspace_id: prefixedId("WS"),
  source_record_id: prefixedId("PD"),
  payload: productToSensoryPayloadSchema,
  metadata: z
    .object({
      application_version: z.string().min(1),
      notes: z.string(),
      disclaimer: z.string().min(1),
    })
    .passthrough(),
});

const describeZodError = (error: z.ZodError) =>
  error.issues
    .map((issue) => {
      const field = issue.path.join(".") || "transfer";
      return `${field}: ${issue.message}`;
    })
    .join("; ");

export const validateProductToSensoryEnvelope = (
  input: unknown,
): ProductToSensoryEnvelope => {
  const raw = rawEnvelopeSchema.safeParse(input);
  if (!raw.success)
    throw new Error(`Invalid FoodLab transfer: ${describeZodError(raw.error)}`);

  const version = raw.data.schema_version;
  const versionParts = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!versionParts)
    throw new Error(`Invalid schema version "${version}". Expected 1.0.0.`);
  if (Number(versionParts[1]) !== 1)
    throw new Error(
      `Unsupported schema major version ${versionParts[1]}. This application supports 1.0.0.`,
    );
  if (version !== FOODLAB_SCHEMA_VERSION)
    throw new Error(
      `Unsupported schema version ${version}. This application currently supports exactly 1.0.0.`,
    );
  if (raw.data.transfer_type !== "PRODUCT_TO_SENSORY")
    throw new Error(
      `Wrong transfer type: expected PRODUCT_TO_SENSORY, received ${raw.data.transfer_type}.`,
    );
  if (
    raw.data.source_module !== "PRODUCT_DEVELOPMENT" ||
    raw.data.target_module !== "SENSORY"
  )
    throw new Error(
      "Wrong transfer route: expected PRODUCT_DEVELOPMENT to SENSORY.",
    );

  const parsed = productToSensoryEnvelopeSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(`Invalid FoodLab transfer: ${describeZodError(parsed.error)}`);
  if (parsed.data.source_record_id !== parsed.data.payload.product_project_id)
    throw new Error(
      "source_record_id must match payload.product_project_id for PRODUCT_TO_SENSORY transfers.",
    );
  return parsed.data as ProductToSensoryEnvelope;
};

export type SafeTransferValidation =
  | { success: true; data: ProductToSensoryEnvelope; warnings: string[] }
  | { success: false; errors: string[]; warnings: string[] };

export const safeValidateProductToSensoryEnvelope = (
  input: unknown,
): SafeTransferValidation => {
  try {
    return {
      success: true,
      data: validateProductToSensoryEnvelope(input),
      warnings: [],
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Invalid transfer."],
      warnings: [],
    };
  }
};

export const safeParseProductToSensoryJson = (
  text: string,
): SafeTransferValidation => {
  try {
    return safeValidateProductToSensoryEnvelope(JSON.parse(text));
  } catch {
    return {
      success: false,
      errors: ["Invalid JSON file."],
      warnings: [],
    };
  }
};

export interface ProductTransferIdentity {
  workspace_id: string;
  product_project_id: string;
  product_id: string;
  formula_version_ids: Record<string, string>;
}

export interface BuildProductTransferOptions {
  project: ProductDevelopmentProject;
  ingredients: Ingredient[];
  selectedFormulaIds: string[];
  sampleNames?: Record<string, string>;
  productName?: string;
  productCategory?: string;
  projectObjective?: string;
  targetConsumer?: string;
  additionalAllergens?: string[];
  testTypes?: string[];
  attributes?: string[];
  sensoryNotes?: string;
  includeCostSummary?: boolean;
  workspaceId: string;
  exportedAt?: string;
  exportedBy?: string;
  metadataNotes?: string;
  idFactory?: (prefix: FoodLabIdPrefix) => string;
}

export const buildProductToSensoryTransfer = ({
  project,
  ingredients,
  selectedFormulaIds,
  sampleNames = {},
  productName = project.project_name,
  productCategory = project.product_category,
  projectObjective = project.project_objective ?? "",
  targetConsumer = project.target_consumer ?? project.product_brief.target_consumer ?? "",
  additionalAllergens = [],
  testTypes = [],
  attributes = [],
  sensoryNotes = "",
  includeCostSummary = false,
  workspaceId,
  exportedAt = new Date().toISOString(),
  exportedBy = "Local user",
  metadataNotes = "",
  idFactory = createFoodLabId,
}: BuildProductTransferOptions): {
  envelope: ProductToSensoryEnvelope;
  identity: ProductTransferIdentity;
} => {
  const uniqueFormulaIds = [...new Set(selectedFormulaIds)];
  if (uniqueFormulaIds.length < 1)
    throw new Error("Select at least one formula version.");
  if (uniqueFormulaIds.length > 4)
    throw new Error("A transfer can include a maximum of four formula versions.");

  const formulas = uniqueFormulaIds.map((formulaId) => {
    const formula = project.formula_versions.find(
      (item) => item.formula_id === formulaId,
    );
    if (!formula)
      throw new Error(`Formula version ${formulaId} was not found.`);
    return formula;
  });

  const formulaVersionIds = Object.fromEntries(
    formulas.map((formula) => [
      formula.formula_id,
      formula.formula_version_id ?? idFactory("FV"),
    ]),
  );
  const identity: ProductTransferIdentity = {
    workspace_id: project.workspace_id ?? workspaceId,
    product_project_id: project.product_project_id ?? idFactory("PD"),
    product_id: project.product_id ?? idFactory("PR"),
    formula_version_ids: formulaVersionIds,
  };

  const samples = formulas.map((formula) => {
    const formulaAllergens = formula.ingredients.flatMap((line) =>
      ingredients.find((item) => item.ingredient_id === line.ingredient_id)
        ?.allergens ?? [],
    );
    return {
      formula_version_id: formulaVersionIds[formula.formula_id],
      formula_version_name: formula.version_name,
      sample_name: sampleNames[formula.formula_id]?.trim() || formula.version_name,
      allergens: [...new Set([...formulaAllergens, ...additionalAllergens])],
      ingredient_summary: formula.ingredients
        .filter((line) => line.amount_g > 0)
        .map((line) => line.ingredient_name),
      demo_only: Boolean(project.is_demo),
      ...(includeCostSummary
        ? { cost_summary: calculateCostPerKg(formula.ingredients) }
        : {}),
    };
  });

  const envelope: ProductToSensoryEnvelope = {
    foodlab_transfer: true,
    schema_version: FOODLAB_SCHEMA_VERSION,
    transfer_id: idFactory("TX"),
    transfer_type: "PRODUCT_TO_SENSORY",
    source_module: "PRODUCT_DEVELOPMENT",
    target_module: "SENSORY",
    exported_at: exportedAt,
    exported_by: exportedBy,
    workspace_id: identity.workspace_id,
    source_record_id: identity.product_project_id,
    payload: {
      product_project_id: identity.product_project_id,
      product_id: identity.product_id,
      product_name: productName.trim(),
      product_category: productCategory.trim(),
      project_objective: projectObjective.trim(),
      target_consumer: targetConsumer.trim(),
      samples,
      suggested_test_design: {
        test_types: [...new Set(testTypes.map((item) => item.trim()).filter(Boolean))],
        attributes: [...new Set(attributes.map((item) => item.trim()).filter(Boolean))],
        notes: sensoryNotes.trim(),
      },
    },
    metadata: {
      application_version: "1.0.0",
      notes: metadataNotes.trim(),
      disclaimer: PRODUCT_TO_SENSORY_DISCLAIMER,
    },
  };

  return {
    envelope: validateProductToSensoryEnvelope(envelope),
    identity,
  };
};

export const applyProductTransferIdentity = (
  project: ProductDevelopmentProject,
  identity: ProductTransferIdentity,
): Pick<
  ProductDevelopmentProject,
  "workspace_id" | "product_project_id" | "product_id" | "formula_versions"
> => ({
  workspace_id: identity.workspace_id,
  product_project_id: identity.product_project_id,
  product_id: identity.product_id,
  formula_versions: project.formula_versions.map((formula) => ({
    ...formula,
    formula_version_id:
      identity.formula_version_ids[formula.formula_id] ??
      formula.formula_version_id,
  })),
});

export const transferFilename = (
  projectName: string,
  transferId: string,
) => {
  const slug =
    projectName
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "product";
  return `product-to-sensory-${slug}-${transferId}.json`;
};
