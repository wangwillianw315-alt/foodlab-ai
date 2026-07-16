import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ShelfLifeResult, ShelfLifeStudy } from "../types/shelfLife";
import { demoStudies } from "../data/demoShelfLifeStudies";
import { createFoodLabId } from "../utils/foodlabTransfer";

const STORAGE_KEY = "food-shelf-life-data";
let storageRecoveryMessage: string | null = null;

export function isShelfLifeStudy(value: unknown): value is ShelfLifeStudy {
  if (!value || typeof value !== "object") return false;
  const study = value as Partial<ShelfLifeStudy>;
  const isRecord = (item: unknown): item is Record<string, unknown> =>
    Boolean(item && typeof item === "object");
  const optionalString = (item: unknown) => item === undefined || typeof item === "string";
  const optionalBoolean = (item: unknown) => item === undefined || typeof item === "boolean";
  const nullableFiniteNumber = (item: unknown) =>
    item === undefined || item === null || (typeof item === "number" && Number.isFinite(item));
  const validConditions =
    Array.isArray(study.storage_conditions) &&
    study.storage_conditions.every(
      (item) =>
        isRecord(item) &&
        typeof item.condition_id === "string" &&
        typeof item.condition_name === "string" &&
        typeof item.temperature_c === "number" &&
        Number.isFinite(item.temperature_c) &&
        nullableFiniteNumber(item.temperature_tolerance_c) &&
        nullableFiniteNumber(item.relative_humidity_percent) &&
        optionalString(item.light_condition) &&
        optionalString(item.packaging_variant) &&
        optionalString(item.orientation) &&
        optionalString(item.storage_location) &&
        optionalString(item.accelerated_or_real_time) &&
        optionalString(item.notes) &&
        optionalBoolean(item.primary),
    );
  const validSampling =
    Array.isArray(study.sampling_points) &&
    study.sampling_points.every(
      (item) =>
        isRecord(item) &&
        typeof item.sampling_point_id === "string" &&
        typeof item.condition_id === "string" &&
        typeof item.planned_day === "number" &&
        Number.isFinite(item.planned_day) &&
        typeof item.planned_date === "string" &&
        typeof item.sample_status === "string" &&
        typeof item.replicate_count === "number" &&
        Number.isInteger(item.replicate_count) &&
        item.replicate_count >= 1 &&
        optionalString(item.actual_date) &&
        optionalString(item.notes),
    );
  const validParameters =
    Array.isArray(study.parameters) &&
    study.parameters.every(
      (item) =>
        isRecord(item) &&
        typeof item.parameter_id === "string" &&
        typeof item.parameter_name === "string" &&
        typeof item.category === "string" &&
        typeof item.unit === "string" &&
        typeof item.result_type === "string" &&
        nullableFiniteNumber(item.lower_limit) &&
        nullableFiniteNumber(item.upper_limit) &&
        nullableFiniteNumber(item.warning_limit) &&
        typeof item.direction_of_deterioration === "string" &&
        typeof item.required === "boolean" &&
        optionalString(item.test_method) &&
        optionalString(item.notes),
    );
  const validResults =
    Array.isArray(study.results) &&
    study.results.every(
      (item) =>
        isRecord(item) &&
        typeof item.result_id === "string" &&
        typeof item.study_id === "string" &&
        typeof item.condition_id === "string" &&
        typeof item.sampling_point_id === "string" &&
        typeof item.parameter_id === "string" &&
        typeof item.replicate_number === "number" &&
        Number.isInteger(item.replicate_number) &&
        (item.measured_value === null ||
          (typeof item.measured_value === "number" && Number.isFinite(item.measured_value))) &&
        typeof item.result_date === "string" &&
        typeof item.is_demo === "boolean" &&
        optionalString(item.text_value) &&
        optionalString(item.analyst) &&
        optionalString(item.method_reference) &&
        optionalString(item.laboratory) &&
        nullableFiniteNumber(item.detection_limit) &&
        optionalString(item.qualifier) &&
        optionalString(item.comments) &&
        optionalString(item.status) &&
        optionalBoolean(item.outlier),
    );
  return Boolean(
    typeof study.study_id === "string" &&
      typeof study.study_name === "string" &&
      typeof study.study_code === "string" &&
      typeof study.product_name === "string" &&
      typeof study.product_category === "string" &&
      typeof study.study_start_date === "string" &&
      typeof study.study_status === "string" &&
      typeof study.created_at === "string" &&
      typeof study.updated_at === "string" &&
      nullableFiniteNumber(study.proposed_shelf_life_days) &&
      optionalString(study.product_description) &&
      optionalString(study.formula_version) &&
      optionalString(study.batch_number) &&
      optionalString(study.manufacturing_date) &&
      optionalString(study.responsible_person) &&
      optionalString(study.study_objective) &&
      optionalString(study.target_market) &&
      optionalString(study.packaging_type) &&
      optionalString(study.processing_method) &&
      optionalString(study.preservation_method) &&
      optionalString(study.allergen_notes) &&
      optionalString(study.initial_product_notes) &&
      optionalString(study.workspace_id) &&
      optionalString(study.product_project_id) &&
      optionalString(study.product_id) &&
      optionalString(study.formula_version_id) &&
      optionalString(study.sensory_project_id) &&
      optionalString(study.sensory_test_id) &&
      optionalString(study.shelf_life_study_id) &&
      optionalString(study.source_transfer_id) &&
      optionalBoolean(study.archived) &&
      validConditions &&
      validSampling &&
      validParameters &&
      validResults,
  );
}

export function parseStudyJson(raw: string): ShelfLifeStudy {
  const value: unknown = JSON.parse(raw);
  if (!isShelfLifeStudy(value)) throw new Error("Invalid study JSON schema");
  return value;
}

export function createUniqueCopyCode(
  studies: ShelfLifeStudy[],
  originalCode: string,
) {
  const existingCodes = new Set(
    studies.map((item) => item.study_code.toLowerCase()),
  );
  const baseCode = `${originalCode}-COPY`;
  let copyCode = baseCode;
  let suffix = 2;
  while (existingCodes.has(copyCode.toLowerCase())) {
    copyCode = `${baseCode}-${suffix++}`;
  }
  return copyCode;
}

const safeStorage = createJSONStorage(() => {
  if (typeof localStorage === "undefined") {
    throw new Error("LocalStorage is not available in this environment");
  }
  return {
  getItem(name: string) {
    const raw = localStorage.getItem(name);
    if (raw === null) return null;
    try {
      const persisted = JSON.parse(raw) as { state?: { studies?: unknown } };
      const studies = persisted?.state?.studies;
      if (!Array.isArray(studies) || !studies.every(isShelfLifeStudy)) {
        throw new Error("Persisted study data has an invalid schema");
      }
      const ids = studies.map((study) => study.study_id);
      const codes = studies.map((study) => study.study_code.toLowerCase());
      if (new Set(ids).size !== ids.length || new Set(codes).size !== codes.length) {
        throw new Error("Persisted study data contains duplicate IDs or codes");
      }
      return raw;
    } catch (error) {
      try {
        localStorage.setItem(`${name}-corrupt-backup`, raw);
        localStorage.setItem(
          `${name}-corrupt-backup-info`,
          JSON.stringify({
            recovered_at: new Date().toISOString(),
            reason: error instanceof Error ? error.message : "Unknown error",
          }),
        );
        localStorage.removeItem(name);
      } catch {
        // Storage may be unavailable or full. The in-memory demo data still loads.
      }
      storageRecoveryMessage =
        "Invalid saved data was isolated and demo data was restored. A raw backup was retained in LocalStorage.";
      return null;
    }
  },
  setItem: (name: string, value: string) => localStorage.setItem(name, value),
  removeItem: (name: string) => localStorage.removeItem(name),
  };
});

interface State {
  studies: ShelfLifeStudy[];
  error: string | null;
  setError: (error: string | null) => void;
  addStudy: (study: ShelfLifeStudy) => void;
  updateStudy: (id: string, patch: Partial<ShelfLifeStudy>) => void;
  deleteStudy: (id: string) => void;
  duplicateStudy: (id: string) => void;
  archiveStudy: (id: string) => void;
  addResults: (results: ShelfLifeResult[]) => void;
  importStudy: (raw: string) => boolean;
  resetDemo: () => void;
}

export const useShelfLifeStore = create<State>()(
  persist(
    (set, get) => ({
      studies: structuredClone(demoStudies),
      error: null,
      setError: (error) => set({ error }),
      addStudy: (study) => set((state) => ({ studies: [study, ...state.studies] })),
      updateStudy: (id, patch) =>
        set((state) => ({
          studies: state.studies.map((study) =>
            study.study_id === id
              ? { ...study, ...patch, updated_at: new Date().toISOString() }
              : study,
          ),
        })),
      deleteStudy: (id) =>
        set((state) => ({ studies: state.studies.filter((study) => study.study_id !== id) })),
      duplicateStudy: (id) => {
        const study = get().studies.find((item) => item.study_id === id);
        if (!study) return;
        const newId = crypto.randomUUID();
        const copyCode = createUniqueCopyCode(get().studies, study.study_code);
        set((state) => ({
          studies: [
            {
              ...structuredClone(study),
              study_id: newId,
              shelf_life_study_id: createFoodLabId("SL"),
              source_transfer_id: undefined,
              study_code: copyCode,
              study_name: `${study.study_name} (Copy)`,
              results: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...state.studies,
          ],
        }));
      },
      archiveStudy: (id) => get().updateStudy(id, { archived: true }),
      addResults: (results) =>
        set((state) => ({
          studies: state.studies.map((study) => ({
            ...study,
            results: [
              ...study.results,
              ...results.filter((result) => result.study_id === study.study_id),
            ],
          })),
        })),
      importStudy: (raw) => {
        try {
          const study = parseStudyJson(raw);
          if (
            get().studies.some(
              (item) =>
                item.study_id === study.study_id || item.study_code === study.study_code,
            )
          ) {
            throw new Error("A study with the same ID or code already exists");
          }
          get().addStudy(study);
          set({ error: null });
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Import failed" });
          return false;
        }
      },
      resetDemo: () => set({ studies: structuredClone(demoStudies), error: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: safeStorage,
      partialize: (state) => ({ studies: state.studies }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          state?.setError("Saved data could not be loaded; demo data remains available.");
        } else if (storageRecoveryMessage) {
          state?.setError(storageRecoveryMessage);
          storageRecoveryMessage = null;
        }
      },
    },
  ),
);
