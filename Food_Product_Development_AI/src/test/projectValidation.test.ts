import { describe, expect, it } from "vitest";
import { demoIngredients } from "../data/demoIngredients";
import { demoProjects } from "../data/demoProjects";
import {
  formulaToCsv,
  ingredientsToCsv,
  parseIngredientCsv,
  parseProjectJson,
  parseSensoryCsv,
} from "../utils/fileIO";
import { validateProjectRelationships } from "../utils/projectValidation";

const cloneDemo = () => structuredClone(demoProjects[0]);

describe("project relationship validation", () => {
  it("accepts a complete demo project", () => {
    expect(validateProjectRelationships(cloneDemo())).toEqual([]);
  });

  it("round-trips a complete project JSON export", () => {
    const project = cloneDemo();
    expect(parseProjectJson(JSON.stringify(project))).toEqual(project);
  });

  it("rejects project JSON with a missing formula status", () => {
    const project = cloneDemo() as any;
    delete project.formula_versions[0].status;
    expect(() => parseProjectJson(JSON.stringify(project))).toThrow();
  });

  it("rejects project JSON with an invalid updated timestamp", () => {
    const project = cloneDemo();
    project.updated_at = "not-a-date";
    expect(() => parseProjectJson(JSON.stringify(project))).toThrow();
  });

  it("rejects duplicate formula IDs", () => {
    const project = cloneDemo();
    project.formula_versions[1].formula_id =
      project.formula_versions[0].formula_id;
    expect(validateProjectRelationships(project)).toContain(
      `Duplicate formula_id: ${project.formula_versions[0].formula_id}.`,
    );
  });

  it("rejects sensory tests that reference a missing formula", () => {
    const project = cloneDemo();
    project.sensory_tests[0].formula_id = "missing-formula";
    expect(() => parseProjectJson(JSON.stringify(project))).toThrow(
      /references missing formula/,
    );
  });

  it("rejects duplicate ingredients inside one formula", () => {
    const project = cloneDemo();
    project.formula_versions[0].ingredients[1].ingredient_id =
      project.formula_versions[0].ingredients[0].ingredient_id;
    expect(validateProjectRelationships(project).join(" ")).toMatch(
      /duplicate ingredient/i,
    );
  });
});

describe("CSV numeric validation", () => {
  it("round-trips ingredient CSV fields including commas and quotes", () => {
    const ingredient = {
      ...structuredClone(demoIngredients[0]),
      ingredient_id: "custom-round-trip",
      ingredient_name: 'Protein, "Fine"',
      notes: 'Supplier says "trial only".',
      is_demo: false,
    };
    expect(parseIngredientCsv(ingredientsToCsv([ingredient]))[0]).toEqual(
      ingredient,
    );
  });

  it("exports formula names with valid CSV escaping", () => {
    const csv = formulaToCsv([
      {
        ingredient_name: 'Cocoa, "dark"',
        amount_g: 10,
        percentage: 100,
        cost_per_kg: 5,
        line_cost: 0.05,
      },
    ]);
    expect(csv).toContain('"Cocoa, ""dark"""');
  });

  it("rejects blank required ingredient values", () => {
    expect(() =>
      parseIngredientCsv("ingredient_id,ingredient_name,category\na,,Protein"),
    ).toThrow(/ingredient_name is required/);
  });

  it("rejects non-numeric ingredient values", () => {
    expect(() =>
      parseIngredientCsv(
        "ingredient_id,ingredient_name,category,cost_per_kg\na,A,Protein,not-a-number",
      ),
    ).toThrow(/cost_per_kg must be a valid number/);
  });

  it("rejects non-numeric sensory scores", () => {
    expect(() =>
      parseSensoryCsv(
        "panelist_id,formula_version,overall_liking\np1,V1,not-a-number",
      ),
    ).toThrow(/overall_liking must be a valid number/);
  });

  it("rejects blank sensory formula versions", () => {
    expect(() =>
      parseSensoryCsv("panelist_id,formula_version,overall_liking\np1,,7"),
    ).toThrow(/formula_version is required/);
  });
});
