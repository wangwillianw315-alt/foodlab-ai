import { describe, expect, it } from "vitest";
import { demoIngredients } from "../data/demoIngredients";
import { demoProjects } from "../data/demoProjects";
import {
  buildDevelopmentSummary,
  generateDevelopmentSummaryMarkdown,
} from "../utils/developmentSummary";
import { projectToMarkdown } from "../utils/fileIO";

const project = () => structuredClone(demoProjects[0]);

describe("development summary model", () => {
  it("calculates before-processing and yield-adjusted results", () => {
    const currentProject = project();
    const formula = currentProject.formula_versions[1];
    const result = buildDevelopmentSummary(
      currentProject,
      formula,
      demoIngredients,
    );
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.adjustedCostPerKg).toBeGreaterThan(result.costPerKg ?? 0);
    expect(result.nutritionBefore.protein).not.toBeNull();
    expect(result.nutritionYieldAdjusted.protein).toBeGreaterThan(
      result.nutritionBefore.protein ?? 0,
    );
  });

  it("uses minimum semantics for protein and maximum semantics for sugar", () => {
    const currentProject = project();
    const formula = currentProject.formula_versions[1];
    const initial = buildDevelopmentSummary(
      currentProject,
      formula,
      demoIngredients,
    );
    currentProject.product_brief.target_protein_percent =
      (initial.nutritionYieldAdjusted.protein ?? 0) - 1;
    currentProject.product_brief.target_sugar_percent =
      (initial.nutritionYieldAdjusted.sugar ?? 0) + 1;
    const result = buildDevelopmentSummary(
      currentProject,
      formula,
      demoIngredients,
    );
    expect(result.gaps.find((gap) => gap.name === "Protein")?.status).toBe(
      "MEETS_TARGET",
    );
    expect(result.gaps.find((gap) => gap.name === "Sugar")?.status).toBe(
      "MEETS_TARGET",
    );
  });

  it("reports missing cost, nutrition, yield and sensory risks", () => {
    const currentProject = project();
    const formula = currentProject.formula_versions[0];
    formula.processing_yield_percent = null;
    formula.ingredients[0].cost_per_kg = null;
    currentProject.sensory_tests = [];
    const incompleteIngredients = demoIngredients.map((ingredient) =>
      ingredient.ingredient_id === formula.ingredients[0].ingredient_id
        ? { ...ingredient, protein_per_100g: null }
        : ingredient,
    );
    const result = buildDevelopmentSummary(
      currentProject,
      formula,
      incompleteIngredients,
    );
    expect(result.risks.join(" ")).toMatch(/Missing ingredient cost/);
    expect(result.risks.join(" ")).toMatch(/nutrition records are incomplete/);
    expect(result.risks.join(" ")).toMatch(/yield is not defined/);
    expect(result.risks.join(" ")).toMatch(/No linked sensory responses/);
  });
});

describe("development summary Markdown", () => {
  it("exports the selected formula and all required report sections", () => {
    const currentProject = project();
    const formula = currentProject.formula_versions[1];
    const markdown = generateDevelopmentSummaryMarkdown(
      currentProject,
      formula,
      demoIngredients,
    );
    expect(markdown).toContain(`## Current Formula`);
    expect(markdown).toContain(formula.version_name);
    expect(markdown).toContain("## Estimated Nutrition");
    expect(markdown).toContain("## Sensory Results");
    expect(markdown).toContain("## Target Gap Analysis");
    expect(markdown).toContain("## Risks and Open Questions");
    expect(markdown).toContain("not a regulatory, safety, nutrition labelling");
  });

  it("projectToMarkdown honours the requested formula ID", () => {
    const currentProject = project();
    const formula = currentProject.formula_versions[2];
    const markdown = projectToMarkdown(
      currentProject,
      demoIngredients,
      formula.formula_id,
    );
    expect(markdown).toContain(formula.version_name);
    expect(markdown).not.toContain(
      currentProject.formula_versions[0].version_name,
    );
  });
});
