import type { ProductDevelopmentProject } from "../types/productDevelopment";

const duplicateValues = (values: string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

export const validateProjectRelationships = (
  project: ProductDevelopmentProject,
  options: { allowIncompleteLabels?: boolean } = {},
): string[] => {
  const issues: string[] = [];
  if (!options.allowIncompleteLabels) {
    if (!project.project_name?.trim()) issues.push("Project name is required.");
    if (!project.project_code?.trim()) issues.push("Project code is required.");
    if (!project.product_category?.trim())
      issues.push("Product category is required.");
    if (!project.development_stage?.trim())
      issues.push("Development stage is required.");
  }
  const formulas = Array.isArray(project.formula_versions)
    ? project.formula_versions
    : [];
  const tests = Array.isArray(project.sensory_tests)
    ? project.sensory_tests
    : [];
  const formulaIds = formulas.map((formula) => formula.formula_id);

  for (const duplicate of duplicateValues(formulaIds))
    issues.push(`Duplicate formula_id: ${duplicate}.`);
  for (const duplicate of duplicateValues(tests.map((test) => test.test_id)))
    issues.push(`Duplicate test_id: ${duplicate}.`);

  const formulaIdSet = new Set(formulaIds);
  for (const formula of formulas) {
    if (!formula.formula_id?.trim()) issues.push("Formula ID is required.");
    if (!options.allowIncompleteLabels && !formula.version_name?.trim())
      issues.push(
        `Formula ${formula.formula_id || "(unknown)"} needs a version name.`,
      );
    if (
      !options.allowIncompleteLabels &&
      formula.processing_yield_percent != null &&
      (formula.processing_yield_percent <= 0 ||
        formula.processing_yield_percent > 100)
    )
      issues.push(
        `Formula ${formula.formula_id || "(unknown)"} has an invalid processing yield.`,
      );
    if (formula.project_id !== project.project_id)
      issues.push(
        `Formula ${formula.formula_id || "(unknown)"} references a different project.`,
      );
    if (!Array.isArray(formula.ingredients)) {
      issues.push(
        `Formula ${formula.formula_id || "(unknown)"} has no ingredient list.`,
      );
      continue;
    }
    for (const line of formula.ingredients) {
      if (!line.line_id?.trim())
        issues.push(
          `Formula ${formula.formula_id} contains a line without line_id.`,
        );
      if (!line.ingredient_id?.trim())
        issues.push(
          `Formula ${formula.formula_id} contains a line without ingredient_id.`,
        );
    }
    for (const duplicate of duplicateValues(
      formula.ingredients.map((line) => line.line_id),
    ))
      issues.push(
        `Formula ${formula.formula_id} contains duplicate line_id ${duplicate}.`,
      );
    for (const duplicate of duplicateValues(
      formula.ingredients.map((line) => line.ingredient_id),
    ))
      issues.push(
        `Formula ${formula.formula_id} contains duplicate ingredient ${duplicate}.`,
      );
  }

  for (const test of tests) {
    if (!test.test_id?.trim()) issues.push("Sensory test ID is required.");
    if (!formulaIdSet.has(test.formula_id))
      issues.push(
        `Sensory test ${test.test_id || "(unknown)"} references missing formula ${test.formula_id || "(unknown)"}.`,
      );
    if (!Array.isArray(test.responses))
      issues.push(
        `Sensory test ${test.test_id || "(unknown)"} has no response list.`,
      );
  }

  return issues;
};

export const assertProjectRelationships = (
  project: ProductDevelopmentProject,
  options: { allowIncompleteLabels?: boolean } = {},
) => {
  const issues = validateProjectRelationships(project, options);
  if (issues.length)
    throw new Error(`Invalid project data: ${issues.join(" ")}`);
  return project;
};
