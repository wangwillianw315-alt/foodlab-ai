import { describe, expect, it } from "vitest";
import type {
  FormulaIngredient,
  Ingredient,
  SensoryResponse,
} from "../types/productDevelopment";
import {
  calculateCostPerKg,
  calculateEstimatedNutrition,
  calculateFormulaCost,
  calculateIngredientPercentages,
  calculateTotalWeight,
  calculateYieldAdjustedCost,
  validateFormulaLine,
} from "../utils/formulaCalculations";
import { scaleByTargetWeight } from "../utils/formulaScaling";
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  validateSensoryResponse,
} from "../utils/sensoryAnalysis";
import {
  calculateBriefMatchScore,
  evaluateTarget,
} from "../utils/targetAnalysis";
import {
  parseIngredientCsv,
  parseProjectJson,
  parseSensoryCsv,
} from "../utils/fileIO";
import {
  safeLoadSnapshot,
  useProductDevelopmentStore,
} from "../store/productDevelopmentStore";
import { demoIngredients } from "../data/demoIngredients";
import { demoProjects } from "../data/demoProjects";
const lines: FormulaIngredient[] = [
  {
    line_id: "1",
    ingredient_id: "a",
    ingredient_name: "A",
    amount_g: 600,
    percentage: 0,
    cost_per_kg: 2,
    line_cost: 1.2,
  },
  {
    line_id: "2",
    ingredient_id: "b",
    ingredient_name: "B",
    amount_g: 400,
    percentage: 0,
    cost_per_kg: 4,
    line_cost: 1.6,
  },
];
const ingredients: Ingredient[] = [
  {
    ingredient_id: "a",
    ingredient_name: "A",
    category: "x",
    cost_per_kg: 2,
    protein_per_100g: 10,
    fat_per_100g: 2,
    carbohydrate_per_100g: 20,
    sugar_per_100g: 5,
    fibre_per_100g: 3,
    moisture_per_100g: 60,
    energy_kj_per_100g: 500,
    allergens: [],
    is_demo: false,
  },
  {
    ingredient_id: "b",
    ingredient_name: "B",
    category: "x",
    cost_per_kg: 4,
    protein_per_100g: 20,
    fat_per_100g: 4,
    carbohydrate_per_100g: 10,
    sugar_per_100g: 2,
    fibre_per_100g: 1,
    moisture_per_100g: 50,
    energy_kj_per_100g: 700,
    allergens: [],
    is_demo: false,
  },
];
const sensory = (score: number | null): SensoryResponse => ({
  panelist_id: "p",
  formula_version: "v",
  appearance: score,
  aroma: score,
  flavour: score,
  sweetness: score,
  texture: score,
  aftertaste: score,
  overall_liking: score,
});
describe("formula calculations", () => {
  it("calculates total formula weight", () =>
    expect(calculateTotalWeight(lines)).toBe(1000));
  it("percentages sum to 100", () =>
    expect(
      calculateIngredientPercentages(lines).reduce(
        (s, x) => s + x.percentage,
        0,
      ),
    ).toBeCloseTo(100));
  it("empty formula avoids division by zero", () =>
    expect(calculateCostPerKg([])).toBeNull());
  it("calculates total cost", () =>
    expect(calculateFormulaCost(lines)).toBeCloseTo(2.8));
  it("calculates cost per kg", () =>
    expect(calculateCostPerKg(lines)).toBeCloseTo(2.8));
  it("adjusts cost for yield", () =>
    expect(calculateYieldAdjustedCost(lines, 80)).toBeCloseTo(3.5));
  it("rejects negative ingredient weight", () =>
    expect(validateFormulaLine(-1)).toMatch(/non-negative/));
  it("rejects invalid number", () =>
    expect(validateFormulaLine(NaN)).toBeTruthy());
  it("missing cost returns no false total", () =>
    expect(
      calculateFormulaCost([{ ...lines[0], cost_per_kg: null }]),
    ).toBeNull());
  it("ignores missing cost on zero-weight placeholder lines", () =>
    expect(
      calculateFormulaCost([
        lines[0],
        { ...lines[1], amount_g: 0, cost_per_kg: null, line_cost: null },
      ]),
    ).toBeCloseTo(1.2));
  it("zero batch weight returns null cost/kg", () =>
    expect(calculateCostPerKg([{ ...lines[0], amount_g: 0 }])).toBeNull());
});
describe("scaling and nutrition", () => {
  it("scales to target weight", () =>
    expect(calculateTotalWeight(scaleByTargetWeight(lines, 25000))).toBe(
      25000,
    ));
  it("does not mutate source formula", () => {
    scaleByTargetWeight(lines, 2000);
    expect(lines[0].amount_g).toBe(600);
  });
  it("rejects scaling a zero-weight batch", () => {
    expect(() => scaleByTargetWeight([], 1000)).toThrow(/greater than zero/);
  });
  it("weighted nutrition is correct", () =>
    expect(calculateEstimatedNutrition(lines, ingredients).protein).toBeCloseTo(
      14,
    ));
  it("missing nutrition is marked incomplete", () =>
    expect(
      calculateEstimatedNutrition(lines, [
        { ...ingredients[0], protein_per_100g: null },
        ingredients[1],
      ]).incomplete,
    ).toBe(true));
  it("empty formula nutrition is incomplete", () =>
    expect(calculateEstimatedNutrition([], ingredients).incomplete).toBe(true));
  it("ignores missing nutrition on zero-weight placeholder lines", () => {
    const estimate = calculateEstimatedNutrition(
      [lines[0], { ...lines[1], amount_g: 0, ingredient_id: "missing" }],
      ingredients,
    );
    expect(estimate.protein).toBeCloseTo(10);
    expect(estimate.incomplete).toBe(false);
  });
});
describe("sensory analysis", () => {
  it("calculates mean", () => expect(calculateMean([5, 7, 9])).toBe(7));
  it("calculates median", () =>
    expect(calculateMedian([9, 5, 7, 6])).toBe(6.5));
  it("calculates sample standard deviation", () =>
    expect(calculateStandardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(
      2.138,
      3,
    ));
  it("rejects score above 9", () =>
    expect(validateSensoryResponse(sensory(10)).length).toBeGreaterThan(0));
  it("allows missing scores", () =>
    expect(validateSensoryResponse(sensory(null))).toHaveLength(0));
});
describe("targets and files", () => {
  it("returns close within 5%", () =>
    expect(evaluateTarget(104, 100)).toBe("CLOSE_TO_TARGET"));
  it("returns meets target", () =>
    expect(evaluateTarget(100, 100)).toBe("MEETS_TARGET"));
  it("lower cost meets maximum target", () =>
    expect(evaluateTarget(90, 100, true)).toBe("MEETS_TARGET"));
  it("protein above a minimum target meets target", () =>
    expect(evaluateTarget(22, 20, false, true)).toBe("MEETS_TARGET"));
  it("brief match score respects upper and lower target directions", () =>
    expect(
      calculateBriefMatchScore([
        { current: 22, target: 20, higherIsBetter: true },
        { current: 7, target: 8, lowerIsBetter: true },
      ]),
    ).toBe(100));
  it("brief match score counts targeted missing data as incomplete", () =>
    expect(
      calculateBriefMatchScore([
        { current: 22, target: 20, higherIsBetter: true },
        { current: null, target: 8, lowerIsBetter: true },
      ]),
    ).toBe(50));
  it("corrupt store snapshot does not crash", () =>
    expect(safeLoadSnapshot("{bad")).toBeNull());
  it("loads a valid schema-versioned snapshot", () =>
    expect(
      safeLoadSnapshot(
        JSON.stringify({
          state: {
            schemaVersion: 1,
            projects: demoProjects,
            ingredients: demoIngredients,
            selectedProjectId: "bar",
            selectedFormulaId: "bar-f1",
          },
        }),
      ),
    ).toMatchObject({ schemaVersion: 1 }));
  it("rejects incomplete schema-versioned snapshots", () =>
    expect(
      safeLoadSnapshot(
        JSON.stringify({ state: { schemaVersion: 1, projects: [] } }),
      ),
    ).toBeNull());
  it("rehydrates autosaved draft labels without discarding the snapshot", () => {
    const projects = structuredClone(demoProjects);
    projects[0].project_name = "";
    projects[0].formula_versions[0].version_name = "";
    projects[0].formula_versions[0].processing_yield_percent = 0;
    expect(
      safeLoadSnapshot(
        JSON.stringify({
          state: {
            schemaVersion: 1,
            projects,
            ingredients: demoIngredients,
            selectedProjectId: "bar",
            selectedFormulaId: "bar-f1",
          },
        }),
      ),
    ).not.toBeNull();
  });
  it("persists selection changes to LocalStorage", () => {
    useProductDevelopmentStore.getState().setSelection("bar", "bar-f1");
    const saved = localStorage.getItem("food-product-development-ai-v1");
    expect(saved).toContain('"schemaVersion":1');
    expect(saved).toContain('"selectedFormulaId":"bar-f1"');
    expect(safeLoadSnapshot(saved)).not.toBeNull();
  });
  it("invalid JSON is rejected", () =>
    expect(() => parseProjectJson("{bad")).toThrow(/Invalid JSON/));
  it("ingredient CSV rejects duplicate IDs", () =>
    expect(() =>
      parseIngredientCsv(
        "ingredient_id,ingredient_name,category\na,A,X\na,B,X",
      ),
    ).toThrow(/Duplicate/));
  it("sensory CSV rejects invalid score", () =>
    expect(() =>
      parseSensoryCsv("panelist_id,formula_version,overall_liking\np1,v1,10"),
    ).toThrow(/1–9/));
  it("sensory CSV retains duplicate panelist IDs for a UI warning", () => {
    const parsed = parseSensoryCsv(
      "panelist_id,formula_version,overall_liking\np1,v1,7\np1,v1,8",
    );
    expect(parsed).toHaveLength(2);
    expect(parsed[0].panelist_id).toBe(parsed[1].panelist_id);
  });
});

describe("sensory store lifecycle", () => {
  it("adds, updates and deletes a sensory test", () => {
    useProductDevelopmentStore.getState().resetDemoData();
    const projectId = "bar";
    const testId = "lifecycle-test";
    useProductDevelopmentStore.getState().addSensoryTest(projectId, {
      test_id: testId,
      formula_id: "bar-f1",
      test_name: "Lifecycle test",
      test_date: "2026-07-15",
      panel_type: "Internal",
      number_of_panellists: 0,
      test_method: "9-point hedonic scale",
      responses: [],
    });
    useProductDevelopmentStore
      .getState()
      .updateSensoryTest(projectId, testId, { number_of_panellists: 1 });
    expect(
      useProductDevelopmentStore
        .getState()
        .projects.find((p) => p.project_id === projectId)
        ?.sensory_tests.find((t) => t.test_id === testId)?.number_of_panellists,
    ).toBe(1);
    useProductDevelopmentStore.getState().deleteSensoryTest(projectId, testId);
    expect(
      useProductDevelopmentStore
        .getState()
        .projects.find((p) => p.project_id === projectId)
        ?.sensory_tests.some((t) => t.test_id === testId),
    ).toBe(false);
  });
});

describe("project and formula data integrity", () => {
  it("remaps formula and sensory test IDs when duplicating a project", () => {
    useProductDevelopmentStore.getState().resetDemoData();
    const original = useProductDevelopmentStore
      .getState()
      .projects.find((p) => p.project_id === "bar")!;

    useProductDevelopmentStore.getState().duplicateProject(original.project_id);

    const copy = useProductDevelopmentStore
      .getState()
      .projects.find(
        (p) => p.project_name === `${original.project_name} Copy`,
      )!;
    expect(copy.project_id).not.toBe(original.project_id);
    expect(copy.formula_versions).toHaveLength(
      original.formula_versions.length,
    );
    expect(copy.sensory_tests).toHaveLength(original.sensory_tests.length);

    original.formula_versions.forEach((formula, index) => {
      const copiedFormula = copy.formula_versions[index];
      expect(copiedFormula.formula_id).not.toBe(formula.formula_id);
      expect(copiedFormula.project_id).toBe(copy.project_id);
    });
    original.sensory_tests.forEach((test, index) => {
      const sourceFormulaIndex = original.formula_versions.findIndex(
        (formula) => formula.formula_id === test.formula_id,
      );
      expect(copy.sensory_tests[index].test_id).not.toBe(test.test_id);
      expect(copy.sensory_tests[index].formula_id).toBe(
        copy.formula_versions[sourceFormulaIndex].formula_id,
      );
    });
  });

  it("deletes linked sensory tests and assigns a new baseline", () => {
    useProductDevelopmentStore.getState().resetDemoData();
    const projectId = "bar";
    const deletedFormulaId = "bar-f1";
    const previousUpdatedAt = useProductDevelopmentStore
      .getState()
      .projects.find((p) => p.project_id === projectId)!.updated_at;
    useProductDevelopmentStore.getState().addSensoryTest(projectId, {
      test_id: "baseline-test",
      formula_id: deletedFormulaId,
      test_name: "Baseline test",
      test_date: "2026-07-15",
      panel_type: "Internal",
      number_of_panellists: 0,
      test_method: "9-point hedonic scale",
      responses: [],
    });

    useProductDevelopmentStore
      .getState()
      .deleteFormula(projectId, deletedFormulaId);

    const project = useProductDevelopmentStore
      .getState()
      .projects.find((p) => p.project_id === projectId)!;
    expect(
      project.formula_versions.some(
        (formula) => formula.formula_id === deletedFormulaId,
      ),
    ).toBe(false);
    expect(
      project.sensory_tests.some(
        (test) => test.formula_id === deletedFormulaId,
      ),
    ).toBe(false);
    expect(
      project.formula_versions.filter((formula) => formula.is_baseline),
    ).toHaveLength(1);
    expect(project.formula_versions[0].is_baseline).toBe(true);
    expect(project.updated_at).not.toBe(previousUpdatedAt);
  });

  it("preserves the existing baseline when deleting another formula", () => {
    useProductDevelopmentStore.getState().resetDemoData();

    useProductDevelopmentStore.getState().deleteFormula("bar", "bar-f2");

    const project = useProductDevelopmentStore
      .getState()
      .projects.find((p) => p.project_id === "bar")!;
    expect(
      project.formula_versions.find((f) => f.is_baseline)?.formula_id,
    ).toBe("bar-f1");
    expect(
      project.sensory_tests.some((test) => test.formula_id === "bar-f2"),
    ).toBe(false);
  });
});
