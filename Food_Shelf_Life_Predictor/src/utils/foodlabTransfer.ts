import type {
  FoodLabTransferEnvelope,
  SensoryToShelfLifePayload,
  SensoryToShelfLifeTransfer,
  ShelfLifeToQaTransfer,
} from "../types/foodlabTransfer";
import type {
  ShelfLifeStudy,
  StorageCondition,
  TestParameter,
} from "../types/shelfLife";
import { generateSamplingSchedule } from "./samplingSchedule";

export const FOODLAB_SCHEMA_VERSION = "1.0.0" as const;
export const FOODLAB_WORKSPACE_STORAGE_KEY = "foodlab-workspace-id";
export const QA_LIMIT_WARNING =
  "Transferred limits are user-confirmed planning values and are not automatically regulatory specifications.";
export const SCIENTIFIC_TRANSFER_WARNING =
  "This transfer does not establish product safety, regulatory compliance, or an official shelf-life date. Qualified review and validated testing remain required.";

type ValidationSuccess<T> = { ok: true; value: T; warnings: string[] };
type ValidationFailure = { ok: false; error: string };
export type TransferValidation<T> = ValidationSuccess<T> | ValidationFailure;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const isFiniteNumberOrNull = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isIsoDate = (value: unknown): value is string =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value));

function randomSuffix() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid.replaceAll("-", "").slice(0, 8);
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(4);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

export function createFoodLabId(prefix: "WS" | "SL" | "TX") {
  return `${prefix}-${randomSuffix().toUpperCase()}`;
}

const isFoodLabId = (value: string, prefix: string) =>
  new RegExp(`^${prefix}-[A-Fa-f0-9]{8,}$`).test(value);

export function getOrCreateWorkspaceId(): string {
  if (typeof localStorage === "undefined") return createFoodLabId("WS");
  const existing = localStorage.getItem(FOODLAB_WORKSPACE_STORAGE_KEY);
  if (existing && isFoodLabId(existing, "WS")) return existing;
  const next = createFoodLabId("WS");
  try {
    localStorage.setItem(FOODLAB_WORKSPACE_STORAGE_KEY, next);
  } catch {
    // The caller can still use the in-memory ID when browser storage is blocked.
  }
  return next;
}

function parseInput(input: string | unknown): TransferValidation<Record<string, unknown>> {
  try {
    const value: unknown = typeof input === "string" ? JSON.parse(input) : input;
    return isRecord(value)
      ? { ok: true, value, warnings: [] }
      : { ok: false, error: "Transfer file must contain a JSON object." };
  } catch {
    return { ok: false, error: "The selected file is not valid JSON." };
  }
}

function validateEnvelope(
  value: Record<string, unknown>,
): TransferValidation<Record<string, unknown>> {
  if (value.foodlab_transfer !== true)
    return { ok: false, error: "Not a FoodLab transfer file." };
  if (!isNonEmptyString(value.schema_version))
    return { ok: false, error: "Missing schema_version." };
  if (value.schema_version !== FOODLAB_SCHEMA_VERSION) {
    const major = value.schema_version.split(".")[0];
    if (major !== "1")
      return {
        ok: false,
        error: `Unsupported major schema version ${value.schema_version}. This application supports 1.0.0 only.`,
      };
    return {
      ok: false,
      error: `Schema version ${value.schema_version} is newer or unsupported. Please export a 1.0.0 transfer file.`,
    };
  }
  if (!isNonEmptyString(value.transfer_id) || !/^TX-[A-Fa-f0-9]{8,}$/.test(value.transfer_id))
    return { ok: false, error: "Missing or invalid transfer_id." };
  if (!isNonEmptyString(value.workspace_id) || !/^WS-[A-Fa-f0-9]{8,}$/.test(value.workspace_id))
    return { ok: false, error: "Missing or invalid workspace_id." };
  if (!isNonEmptyString(value.source_record_id))
    return { ok: false, error: "Missing source_record_id." };
  if (!isIsoDate(value.exported_at))
    return { ok: false, error: "Missing or invalid exported_at date." };
  if (!isNonEmptyString(value.exported_by))
    return { ok: false, error: "Missing exported_by." };
  if (!isRecord(value.metadata))
    return { ok: false, error: "Missing transfer metadata." };
  if (
    !isNonEmptyString(value.metadata.application_version) ||
    typeof value.metadata.notes !== "string" ||
    !isNonEmptyString(value.metadata.disclaimer)
  )
    return { ok: false, error: "Invalid transfer metadata." };
  if (!isRecord(value.payload))
    return { ok: false, error: "Missing or invalid transfer payload." };
  return { ok: true, value, warnings: [] };
}

export function validateSensoryToShelfLifeTransfer(
  input: string | unknown,
): TransferValidation<SensoryToShelfLifeTransfer> {
  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;
  const base = validateEnvelope(parsed.value);
  if (!base.ok) return base;
  const value = base.value;
  if (value.transfer_type !== "SENSORY_TO_SHELF_LIFE")
    return {
      ok: false,
      error: "Wrong transfer type. Expected SENSORY_TO_SHELF_LIFE.",
    };
  if (value.source_module !== "SENSORY" || value.target_module !== "SHELF_LIFE")
    return {
      ok: false,
      error: "Wrong source or target module. Expected SENSORY to SHELF_LIFE.",
    };

  const payload = value.payload as Record<string, unknown>;
  for (const [field, prefix] of [
    ["product_project_id", "PD"],
    ["product_id", "PR"],
    ["formula_version_id", "FV"],
    ["sensory_project_id", "SN"],
  ] as const) {
    if (!isNonEmptyString(payload[field]) || !isFoodLabId(payload[field], prefix))
      return { ok: false, error: `Missing or invalid payload identifier: ${field}.` };
  }
  if (!isFoodLabId(value.source_record_id as string, "SN"))
    return { ok: false, error: "source_record_id must use a valid SN- identifier." };
  if (value.source_record_id !== payload.sensory_project_id)
    return { ok: false, error: "source_record_id must match payload.sensory_project_id." };
  if (
    payload.sensory_test_id !== undefined &&
    (!isNonEmptyString(payload.sensory_test_id) || !isFoodLabId(payload.sensory_test_id, "ST"))
  )
    return { ok: false, error: "Invalid optional sensory_test_id." };
  if (payload.product_name !== undefined && !isNonEmptyString(payload.product_name))
    return { ok: false, error: "Invalid optional product_name." };
  if (payload.product_category !== undefined && !isNonEmptyString(payload.product_category))
    return { ok: false, error: "Invalid optional product_category." };
  if (!isRecord(payload.selected_sample))
    return { ok: false, error: "Missing selected_sample." };
  for (const field of ["sample_name", "blind_code", "formula_version_name"]) {
    if (!isNonEmptyString(payload.selected_sample[field]))
      return { ok: false, error: `Missing selected_sample.${field}.` };
  }
  if (!isRecord(payload.aggregated_sensory_summary))
    return { ok: false, error: "Missing aggregated_sensory_summary." };
  const summary = payload.aggregated_sensory_summary;
  if (
    !isFiniteNumberOrNull(summary.overall_liking_mean) ||
    !Number.isInteger(summary.response_count) ||
    (summary.response_count as number) < 0 ||
    !isFiniteNumberOrNull(summary.purchase_intent_top_two_box)
  )
    return { ok: false, error: "Invalid aggregated sensory numeric summary." };
  for (const field of [
    "jar_findings",
    "positive_keywords",
    "negative_keywords",
    "limitations",
  ]) {
    if (!isStringArray(summary[field]))
      return { ok: false, error: `Invalid aggregated_sensory_summary.${field}.` };
  }
  if (summary.main_observations !== undefined && !isStringArray(summary.main_observations))
    return { ok: false, error: "Invalid aggregated_sensory_summary.main_observations." };
  if (!isStringArray(payload.recommended_shelf_life_focus))
    return { ok: false, error: "Invalid recommended_shelf_life_focus." };

  return {
    ok: true,
    value: value as unknown as SensoryToShelfLifeTransfer,
    warnings: [
      "Sensory results are aggregated and remain subject to the limitations recorded by the source project.",
    ],
  };
}

export interface SensoryParameterDraft {
  parameter_name: string;
  unit: string;
  lower_limit: number | null;
  upper_limit: number | null;
  required: boolean;
  confirmed_by_user: boolean;
}

export function createSensoryParameterDrafts(
  payload: SensoryToShelfLifePayload,
): SensoryParameterDraft[] {
  const names = [...payload.recommended_shelf_life_focus];
  if (!names.some((name) => name.trim().toLowerCase() === "overall acceptability"))
    names.push("Overall Acceptability");
  return [...new Map(names.filter((name) => name.trim()).map((name) => [name.trim().toLowerCase(), name.trim()])).values()].map(
    (name) => ({
      parameter_name: name,
      unit: "score",
      lower_limit: null,
      upper_limit: null,
      required: name.toLowerCase() !== "overall acceptability",
      confirmed_by_user: false,
    }),
  );
}

export interface SensoryStudyImportInput {
  study_name: string;
  study_code: string;
  start_date: string;
  proposed_shelf_life_days: number | null;
  storage_condition: {
    condition_name: string;
    temperature_c: number;
    light_condition: string;
    accelerated_or_real_time: string;
    packaging_variant?: string;
  };
  sampling_days: number[];
  parameters: SensoryParameterDraft[];
}

export function createShelfLifeStudyFromSensoryTransfer(
  transfer: SensoryToShelfLifeTransfer,
  input: SensoryStudyImportInput,
  now = new Date().toISOString(),
): ShelfLifeStudy {
  if (!input.study_name.trim() || !input.study_code.trim())
    throw new Error("Study name and study code are required.");
  const start = new Date(`${input.start_date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.start_date) ||
    Number.isNaN(start.valueOf()) ||
    start.toISOString().slice(0, 10) !== input.start_date
  )
    throw new Error("A valid study start date is required.");
  const condition = input.storage_condition;
  if (
    !condition.condition_name.trim() ||
    !Number.isFinite(condition.temperature_c) ||
    condition.temperature_c <= -273.15 ||
    !condition.light_condition.trim() ||
    !condition.accelerated_or_real_time.trim()
  )
    throw new Error("The user must define a valid storage condition.");
  const days = [...new Set(input.sampling_days)].sort((a, b) => a - b);
  if (!days.length || days.some((day) => !Number.isInteger(day) || day < 0))
    throw new Error("At least one non-negative whole sampling day is required.");
  if (
    input.proposed_shelf_life_days !== null &&
    (!Number.isFinite(input.proposed_shelf_life_days) || input.proposed_shelf_life_days < 0)
  )
    throw new Error("The proposed shelf life must be a non-negative number or blank.");
  if (!input.parameters.length)
    throw new Error("Select at least one sensory monitoring parameter.");

  const parameters: TestParameter[] = input.parameters.map((parameter, index) => {
    if (!parameter.parameter_name.trim() || !parameter.unit.trim())
      throw new Error("Every selected parameter requires a name and unit.");
    if (!parameter.confirmed_by_user)
      throw new Error("Review and confirm the limits for every selected parameter.");
    if (parameter.lower_limit === null && parameter.upper_limit === null)
      throw new Error(
        `Define at least one user-approved limit for ${parameter.parameter_name}; no safety limit is generated automatically.`,
      );
    for (const limit of [parameter.lower_limit, parameter.upper_limit]) {
      if (limit !== null && !Number.isFinite(limit))
        throw new Error(`Invalid limit for ${parameter.parameter_name}.`);
    }
    if (
      parameter.lower_limit !== null &&
      parameter.upper_limit !== null &&
      parameter.lower_limit > parameter.upper_limit
    )
      throw new Error(`Lower limit exceeds upper limit for ${parameter.parameter_name}.`);
    return {
      parameter_id: `p-${index + 1}-${randomSuffix()}`,
      parameter_name: parameter.parameter_name.trim(),
      category: "Sensory",
      unit: parameter.unit.trim(),
      result_type: "NUMERIC",
      lower_limit: parameter.lower_limit,
      upper_limit: parameter.upper_limit,
      warning_limit: null,
      direction_of_deterioration: "USER_DEFINED",
      required: parameter.required,
      notes: "Imported as a monitoring focus. Limits were entered and confirmed by the local user; they are not regulatory safety limits.",
    };
  });

  const studyId = globalThis.crypto?.randomUUID?.() ?? `study-${randomSuffix()}-${randomSuffix()}`;
  const conditionId = `c-${randomSuffix()}`;
  const storageCondition: StorageCondition = {
    condition_id: conditionId,
    condition_name: condition.condition_name.trim(),
    temperature_c: condition.temperature_c,
    light_condition: condition.light_condition.trim(),
    packaging_variant: condition.packaging_variant?.trim() || undefined,
    accelerated_or_real_time: condition.accelerated_or_real_time.trim(),
    primary: true,
    notes: "Storage condition supplied and confirmed during explicit Sensory transfer import.",
  };
  const payload = transfer.payload;
  const limitations = payload.aggregated_sensory_summary.limitations.filter(Boolean);
  const observations = payload.aggregated_sensory_summary.main_observations?.filter(Boolean) ?? [];
  const noteParts = [
    `Imported from Sensory transfer ${transfer.transfer_id}.`,
    `Selected sample: ${payload.selected_sample.sample_name} (${payload.selected_sample.blind_code}); formula ${payload.selected_sample.formula_version_name}.`,
    observations.length ? `Aggregated sensory observations: ${observations.join("; ")}.` : "",
    limitations.length ? `Sensory limitations: ${limitations.join("; ")}.` : "Sensory limitations: none supplied.",
    "Individual panelist records were not included.",
  ].filter(Boolean);

  return {
    study_id: studyId,
    shelf_life_study_id: createFoodLabId("SL"),
    workspace_id: transfer.workspace_id,
    product_project_id: payload.product_project_id,
    product_id: payload.product_id,
    formula_version_id: payload.formula_version_id,
    sensory_project_id: payload.sensory_project_id,
    sensory_test_id: payload.sensory_test_id,
    source_transfer_id: transfer.transfer_id,
    study_name: input.study_name.trim(),
    study_code: input.study_code.trim(),
    product_name: payload.product_name?.trim() || payload.selected_sample.sample_name,
    product_category: payload.product_category?.trim() || "Other",
    formula_version: payload.selected_sample.formula_version_name,
    study_start_date: input.start_date,
    proposed_shelf_life_days: input.proposed_shelf_life_days,
    study_objective: "Validate quality stability for the formula shortlisted by aggregated sensory evaluation.",
    initial_product_notes: noteParts.join("\n"),
    study_status: "PLANNING",
    storage_conditions: [storageCondition],
    sampling_points: generateSamplingSchedule(conditionId, input.start_date, days),
    parameters,
    results: [],
    created_at: now,
    updated_at: now,
  };
}

export interface QaParameterSelection {
  parameter_id: string;
  lower_limit: number | null;
  upper_limit: number | null;
  warning_rule: string;
  confirmed_by_user: boolean;
}

export interface ShelfLifeToQaExportInput {
  workspace_id: string;
  product_project_id: string;
  product_id: string;
  formula_version_id: string;
  shelf_life_study_id: string;
  storage_condition_id: string;
  planning_shelf_life_days: number | null;
  packaging_notes: string;
  parameters: QaParameterSelection[];
  scientific_limitations: string[];
}

export function buildShelfLifeToQaTransfer(
  study: ShelfLifeStudy,
  input: ShelfLifeToQaExportInput,
  options: { now?: string; transfer_id?: string } = {},
): ShelfLifeToQaTransfer {
  for (const [name, value] of Object.entries({
    workspace_id: input.workspace_id,
    product_project_id: input.product_project_id,
    product_id: input.product_id,
    formula_version_id: input.formula_version_id,
    shelf_life_study_id: input.shelf_life_study_id,
  })) {
    if (!value.trim()) throw new Error(`${name} is required before export.`);
  }
  for (const [field, prefix] of [
    ["workspace_id", "WS"],
    ["product_project_id", "PD"],
    ["product_id", "PR"],
    ["formula_version_id", "FV"],
    ["shelf_life_study_id", "SL"],
  ] as const) {
    if (!isFoodLabId(input[field], prefix))
      throw new Error(`${field} must use a valid ${prefix}- identifier.`);
  }
  if (study.sensory_project_id && !isFoodLabId(study.sensory_project_id, "SN"))
    throw new Error("sensory_project_id must use a valid SN- identifier.");
  const storage = study.storage_conditions.find(
    (condition) => condition.condition_id === input.storage_condition_id,
  );
  if (!storage) throw new Error("Select a valid main storage condition.");
  if (
    input.planning_shelf_life_days !== null &&
    (!Number.isFinite(input.planning_shelf_life_days) || input.planning_shelf_life_days < 0)
  )
    throw new Error("Planning shelf life must be non-negative or blank.");

  const confirmed = input.parameters.filter((selection) => selection.confirmed_by_user);
  if (!confirmed.length)
    throw new Error("Confirm at least one QA parameter and its planning limits.");
  const qaParameters = confirmed.map((selection) => {
    const parameter = study.parameters.find(
      (candidate) => candidate.parameter_id === selection.parameter_id,
    );
    if (!parameter) throw new Error("A selected QA parameter no longer exists.");
    if (selection.lower_limit === null && selection.upper_limit === null)
      throw new Error(`Enter at least one confirmed limit for ${parameter.parameter_name}.`);
    for (const limit of [selection.lower_limit, selection.upper_limit]) {
      if (limit !== null && !Number.isFinite(limit))
        throw new Error(`Invalid confirmed limit for ${parameter.parameter_name}.`);
    }
    if (
      selection.lower_limit !== null &&
      selection.upper_limit !== null &&
      selection.lower_limit > selection.upper_limit
    )
      throw new Error(`Lower limit exceeds upper limit for ${parameter.parameter_name}.`);
    if (!selection.warning_rule.trim())
      throw new Error(`Enter a user-approved warning rule for ${parameter.parameter_name}.`);
    return {
      parameter_name: parameter.parameter_name,
      unit: parameter.unit,
      lower_limit: selection.lower_limit,
      upper_limit: selection.upper_limit,
      warning_rule: selection.warning_rule.trim(),
      confirmed_by_user: true as const,
    };
  });
  const limitations = [
    QA_LIMIT_WARNING,
    SCIENTIFIC_TRANSFER_WARNING,
    ...input.scientific_limitations.map((item) => item.trim()).filter(Boolean),
  ].filter((item, index, items) => items.indexOf(item) === index);
  const transferId = options.transfer_id ?? createFoodLabId("TX");
  if (!isFoodLabId(transferId, "TX"))
    throw new Error("transfer_id must use a valid TX- identifier.");
  const exportedAt = options.now ?? new Date().toISOString();
  const payload = {
    product_project_id: input.product_project_id.trim(),
    product_id: input.product_id.trim(),
    formula_version_id: input.formula_version_id.trim(),
    shelf_life_study_id: input.shelf_life_study_id.trim(),
    ...(study.sensory_project_id ? { sensory_project_id: study.sensory_project_id } : {}),
    product_name: study.product_name,
    product_category: study.product_category,
    planning_shelf_life_days: input.planning_shelf_life_days,
    storage_condition: `${storage.condition_name} (${storage.temperature_c} °C; ${storage.accelerated_or_real_time})`,
    packaging_notes: input.packaging_notes.trim(),
    qa_parameters: qaParameters,
    scientific_limitations: limitations,
  };
  return {
    foodlab_transfer: true,
    schema_version: FOODLAB_SCHEMA_VERSION,
    transfer_id: transferId,
    transfer_type: "SHELF_LIFE_TO_QA",
    source_module: "SHELF_LIFE",
    target_module: "QA",
    exported_at: exportedAt,
    exported_by: "Local user",
    workspace_id: input.workspace_id,
    source_record_id: input.shelf_life_study_id,
    payload,
    metadata: {
      application_version: "1.0.0",
      notes: `${QA_LIMIT_WARNING} ${SCIENTIFIC_TRANSFER_WARNING}`,
      disclaimer: QA_LIMIT_WARNING,
    },
  };
}

export function transferFilename(
  transfer: FoodLabTransferEnvelope<unknown>,
  recordCode = "record",
) {
  const safeCode = recordCode.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "");
  return `foodlab-${transfer.transfer_type.toLowerCase().replaceAll("_", "-")}-${safeCode || "record"}.json`;
}
