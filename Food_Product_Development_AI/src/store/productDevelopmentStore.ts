import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  FormulaVersion,
  Ingredient,
  ProductDevelopmentProject,
  SensoryTest,
} from "../types/productDevelopment";
import { demoIngredients } from "../data/demoIngredients";
import { demoProjects } from "../data/demoProjects";
import { persistedDataSchema } from "../utils/dataSchemas";
import { assertProjectRelationships } from "../utils/projectValidation";
const storageRecoveryMessage =
  "Saved browser data could not be loaded. Restore the demonstration data to continue.";
type State = {
  schemaVersion: number;
  projects: ProductDevelopmentProject[];
  ingredients: Ingredient[];
  storageError: string | null;
  selectedProjectId: string;
  selectedFormulaId: string;
  createProject: (p: ProductDevelopmentProject) => void;
  updateProject: (id: string, p: Partial<ProductDevelopmentProject>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  addFormula: (projectId: string, f: FormulaVersion) => void;
  updateFormula: (
    projectId: string,
    formulaId: string,
    f: Partial<FormulaVersion>,
  ) => void;
  duplicateFormula: (projectId: string, formulaId: string) => void;
  deleteFormula: (projectId: string, formulaId: string) => void;
  setBaseline: (projectId: string, formulaId: string) => void;
  addIngredient: (i: Ingredient) => void;
  updateIngredient: (id: string, i: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;
  addSensoryTest: (projectId: string, t: SensoryTest) => void;
  updateSensoryTest: (
    projectId: string,
    testId: string,
    t: Partial<SensoryTest>,
  ) => void;
  deleteSensoryTest: (projectId: string, testId: string) => void;
  importProject: (p: ProductDevelopmentProject) => void;
  resetDemoData: () => void;
  setSelection: (projectId: string, formulaId?: string) => void;
  clearStorageError: () => void;
};
const clone = <T>(x: T): T => structuredClone(x);
const now = () => new Date().toISOString();
export const useProductDevelopmentStore = create<State>()(
  persist(
    (set, get) => ({
      schemaVersion: 1,
      projects: clone(demoProjects),
      ingredients: clone(demoIngredients),
      storageError: null,
      selectedProjectId: "bar",
      selectedFormulaId: "bar-f2",
      createProject: (p) => set((s) => ({ projects: [...s.projects, p] })),
      updateProject: (id, p) =>
        set((s) => ({
          projects: s.projects.map((x) =>
            x.project_id === id ? { ...x, ...p, updated_at: now() } : x,
          ),
        })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((x) => x.project_id !== id),
        })),
      duplicateProject: (id) =>
        set((s) => {
          const p = s.projects.find((x) => x.project_id === id);
          if (!p) return s;
          const project_id = crypto.randomUUID();
          const formulaIdMap = new Map<string, string>();
          const formula_versions = p.formula_versions.map((f, n) => {
            const formula_id = crypto.randomUUID();
            formulaIdMap.set(f.formula_id, formula_id);
            return {
              ...clone(f),
              formula_id,
              project_id,
              formula_version_id: undefined,
              version_number: n + 1,
            };
          });
          const timestamp = now();
          const copy = {
            ...clone(p),
            project_id,
            product_project_id: undefined,
            product_id: undefined,
            project_name: `${p.project_name} Copy`,
            project_code: `${p.project_code}-COPY`,
            is_demo: false,
            created_at: timestamp,
            updated_at: timestamp,
            formula_versions,
            sensory_tests: p.sensory_tests.map((test) => ({
              ...clone(test),
              test_id: crypto.randomUUID(),
              formula_id: formulaIdMap.get(test.formula_id) ?? test.formula_id,
            })),
          };
          return { projects: [...s.projects, copy] };
        }),
      addFormula: (projectId, f) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.project_id === projectId
              ? {
                  ...p,
                  formula_versions: [...p.formula_versions, f],
                  updated_at: now(),
                }
              : p,
          ),
        })),
      updateFormula: (projectId, formulaId, f) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.project_id === projectId
              ? {
                  ...p,
                  formula_versions: p.formula_versions.map((x) =>
                    x.formula_id === formulaId ? { ...x, ...f } : x,
                  ),
                  updated_at: now(),
                }
              : p,
          ),
        })),
      duplicateFormula: (projectId, formulaId) => {
        const p = get().projects.find((x) => x.project_id === projectId),
          f = p?.formula_versions.find((x) => x.formula_id === formulaId);
        if (!p || !f) return;
        get().addFormula(projectId, {
          ...clone(f),
          formula_id: crypto.randomUUID(),
          formula_version_id: undefined,
          version_number: p.formula_versions.length + 1,
          version_name: `${f.version_name} Copy`,
          date_created: new Date().toISOString().slice(0, 10),
          is_baseline: false,
          ingredients: f.ingredients.map((i) => ({
            ...i,
            line_id: crypto.randomUUID(),
          })),
        });
      },
      deleteFormula: (projectId, formulaId) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.project_id !== projectId) return p;
            if (!p.formula_versions.some((f) => f.formula_id === formulaId))
              return p;

            const remainingFormulas = p.formula_versions.filter(
              (f) => f.formula_id !== formulaId,
            );
            const baselineId =
              remainingFormulas.find((f) => f.is_baseline)?.formula_id ??
              remainingFormulas[0]?.formula_id;

            return {
              ...p,
              formula_versions: remainingFormulas.map((f) => ({
                ...f,
                is_baseline: f.formula_id === baselineId,
              })),
              sensory_tests: p.sensory_tests.filter(
                (test) => test.formula_id !== formulaId,
              ),
              updated_at: now(),
            };
          }),
        })),
      setBaseline: (projectId, formulaId) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.project_id !== projectId) return p;
            if (!p.formula_versions.some((f) => f.formula_id === formulaId))
              return p;
            return {
              ...p,
              updated_at: now(),
              formula_versions: p.formula_versions.map((f) => ({
                ...f,
                is_baseline: f.formula_id === formulaId,
              })),
            };
          }),
        })),
      addIngredient: (i) =>
        set((s) => ({ ingredients: [...s.ingredients, i] })),
      updateIngredient: (id, i) =>
        set((s) => ({
          ingredients: s.ingredients.map((x) =>
            x.ingredient_id === id && !x.is_demo ? { ...x, ...i } : x,
          ),
        })),
      deleteIngredient: (id) =>
        set((s) => ({
          ingredients: s.ingredients.filter(
            (x) => x.ingredient_id !== id || x.is_demo,
          ),
        })),
      addSensoryTest: (projectId, t) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.project_id === projectId
              ? { ...p, sensory_tests: [...p.sensory_tests, t] }
              : p,
          ),
        })),
      updateSensoryTest: (projectId, testId, t) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.project_id === projectId
              ? {
                  ...p,
                  updated_at: now(),
                  sensory_tests: p.sensory_tests.map((test) =>
                    test.test_id === testId ? { ...test, ...t } : test,
                  ),
                }
              : p,
          ),
        })),
      deleteSensoryTest: (projectId, testId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.project_id === projectId
              ? {
                  ...p,
                  updated_at: now(),
                  sensory_tests: p.sensory_tests.filter(
                    (test) => test.test_id !== testId,
                  ),
                }
              : p,
          ),
        })),
      importProject: (p) =>
        set((s) => ({
          projects: [
            ...s.projects.filter((x) => x.project_id !== p.project_id),
            p,
          ],
        })),
      resetDemoData: () =>
        set({
          schemaVersion: 1,
          projects: clone(demoProjects),
          ingredients: clone(demoIngredients),
          storageError: null,
          selectedProjectId: "bar",
          selectedFormulaId: "bar-f2",
        }),
      setSelection: (projectId, formulaId = "") =>
        set({ selectedProjectId: projectId, selectedFormulaId: formulaId }),
      clearStorageError: () => set({ storageError: null }),
    }),
    {
      name: "food-product-development-ai-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        projects: s.projects,
        ingredients: s.ingredients,
        selectedProjectId: s.selectedProjectId,
        selectedFormulaId: s.selectedFormulaId,
      }),
      merge: (persisted, current) => {
        const parsed = persistedDataSchema.safeParse(persisted);
        if (!parsed.success)
          return { ...current, storageError: storageRecoveryMessage };
        try {
          parsed.data.projects.forEach((project) =>
            assertProjectRelationships(
              project as unknown as ProductDevelopmentProject,
              { allowIncompleteLabels: true },
            ),
          );
        } catch {
          return { ...current, storageError: storageRecoveryMessage };
        }
        return {
          ...current,
          ...parsed.data,
          projects: parsed.data
            .projects as unknown as ProductDevelopmentProject[],
          ingredients: parsed.data.ingredients as unknown as Ingredient[],
          storageError: null,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error)
          useProductDevelopmentStore.setState({
            storageError: storageRecoveryMessage,
          });
      },
    },
  ),
);
export const safeLoadSnapshot = (raw: string | null) => {
  if (!raw) return null;
  try {
    const x = JSON.parse(raw);
    const parsed = persistedDataSchema.safeParse(x?.state);
    if (!parsed.success) return null;
    parsed.data.projects.forEach((project) =>
      assertProjectRelationships(
        project as unknown as ProductDevelopmentProject,
        { allowIncompleteLabels: true },
      ),
    );
    return parsed.data;
  } catch {
    return null;
  }
};
