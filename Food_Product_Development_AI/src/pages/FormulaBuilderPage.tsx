import { useMemo, useState } from "react";
import { Copy, Plus, Scale, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, fmt, PageHeader, Status } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import type {
  FormulaIngredient,
  FormulaVersion,
} from "../types/productDevelopment";
import {
  calculateCostContribution,
  calculateCostPerKg,
  calculateCostPerServing,
  calculateEstimatedNutrition,
  calculateFormulaCost,
  calculateIngredientPercentages,
  calculateTotalWeight,
  calculateYieldAdjustedCost,
  validateFormulaLine,
} from "../utils/formulaCalculations";
import {
  calculateRoundingDifference,
  scaleByMultiplier,
  scaleByServingCount,
  scaleByTargetWeight,
} from "../utils/formulaScaling";
export default function FormulaBuilderPage() {
  const store = useProductDevelopmentStore(),
    project =
      store.projects.find((p) => p.project_id === store.selectedProjectId) ??
      store.projects[0],
    [scaleMode, setScaleMode] = useState("weight"),
    [scaleValue, setScaleValue] = useState("25000"),
    [error, setError] = useState("");
  const formula =
    project?.formula_versions.find(
      (f) => f.formula_id === store.selectedFormulaId,
    ) ?? project?.formula_versions[0];
  if (!project)
    return (
      <EmptyState
        title="No projects"
        body="Create a project before building a formula."
      />
    );
  const selectProject = (id: string) => {
    const p = store.projects.find((x) => x.project_id === id);
    store.setSelection(id, p?.formula_versions[0]?.formula_id);
  };
  const update = (f: Partial<FormulaVersion>) =>
    formula && store.updateFormula(project.project_id, formula.formula_id, f);
  const setLines = (lines: FormulaIngredient[]) =>
    update({
      ingredients: calculateIngredientPercentages(lines),
      batch_size_g: calculateTotalWeight(lines),
    });
  const addFormula = () => {
    const f: FormulaVersion = {
      formula_id: crypto.randomUUID(),
      project_id: project.project_id,
      version_name: `Version ${project.formula_versions.length + 1}`,
      version_number: project.formula_versions.length + 1,
      date_created: new Date().toISOString().slice(0, 10),
      batch_size_g: 0,
      processing_yield_percent: 100,
      status: "DRAFT",
      ingredients: [],
    };
    store.addFormula(project.project_id, f);
    store.setSelection(project.project_id, f.formula_id);
  };
  if (!formula)
    return (
      <>
        <PageHeader
          title="Formula Builder"
          subtitle={project.project_name}
          actions={
            <button className="btn-primary" onClick={addFormula}>
              <Plus />
              Create first formula
            </button>
          }
        />
        <EmptyState
          title="No formula versions"
          body="Create the first formula version for this project."
        />
      </>
    );
  const total = calculateTotalWeight(formula.ingredients),
    cost = calculateFormulaCost(formula.ingredients),
    kg = calculateCostPerKg(formula.ingredients),
    serving = calculateCostPerServing(
      formula.ingredients,
      project.product_brief.target_serving_size_g,
    ),
    nutrition = calculateEstimatedNutrition(
      formula.ingredients,
      store.ingredients,
    ),
    adjusted = calculateYieldAdjustedCost(
      formula.ingredients,
      formula.processing_yield_percent,
    ),
    contrib = calculateCostContribution(formula.ingredients).map((x) => ({
      name: x.ingredient_name,
      value: x.value ?? 0,
    }));
  const addIngredient = (id: string) => {
    const i = store.ingredients.find((x) => x.ingredient_id === id);
    if (!i) return;
    if (formula.ingredients.some((x) => x.ingredient_id === id)) {
      setError("Duplicate ingredient: adjust the existing line instead.");
      return;
    }
    setLines([
      ...formula.ingredients,
      {
        line_id: crypto.randomUUID(),
        ingredient_id: i.ingredient_id,
        ingredient_name: i.ingredient_name,
        amount_g: 0,
        percentage: 0,
        cost_per_kg: i.cost_per_kg,
        line_cost: i.cost_per_kg == null ? null : 0,
      },
    ]);
    setError("");
  };
  const scale = () => {
    try {
      const v = Number(scaleValue);
      if (total <= 0)
        throw new Error("Batch weight must be greater than zero.");
      let lines =
        scaleMode === "weight"
          ? scaleByTargetWeight(formula.ingredients, v)
          : scaleMode === "multiplier"
            ? scaleByMultiplier(formula.ingredients, v)
            : scaleByServingCount(
                formula.ingredients,
                project.product_brief.target_serving_size_g ?? 0,
                v,
              );
      const copy = {
        ...formula,
        formula_id: crypto.randomUUID(),
        formula_version_id: undefined,
        version_number: project.formula_versions.length + 1,
        version_name: `${formula.version_name} – Scaled`,
        date_created: new Date().toISOString().slice(0, 10),
        status: "DRAFT" as const,
        is_baseline: false,
        ingredients: calculateIngredientPercentages(lines),
        batch_size_g: calculateTotalWeight(lines),
      };
      store.addFormula(project.project_id, copy);
      store.setSelection(project.project_id, copy.formula_id);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scaling failed.");
    }
  };
  return (
    <>
      <PageHeader
        title="Formula Builder"
        subtitle="Build, cost, scale and assess formulation versions."
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() =>
                store.duplicateFormula(project.project_id, formula.formula_id)
              }
            >
              <Copy size={16} />
              Duplicate
            </button>
            <button
              className="btn-secondary"
              disabled={formula.is_baseline}
              onClick={() =>
                store.setBaseline(project.project_id, formula.formula_id)
              }
            >
              {formula.is_baseline ? "Baseline version" : "Set as baseline"}
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                if (!confirm(`Delete formula version ${formula.version_name}?`))
                  return;
                const next = project.formula_versions.find(
                  (item) => item.formula_id !== formula.formula_id,
                );
                store.deleteFormula(project.project_id, formula.formula_id);
                store.setSelection(project.project_id, next?.formula_id);
              }}
            >
              <Trash2 size={16} />
              Delete version
            </button>
            <button className="btn-primary" onClick={addFormula}>
              <Plus size={16} />
              New version
            </button>
          </>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label">Project</span>
          <select
            className="field"
            value={project.project_id}
            onChange={(e) => selectProject(e.target.value)}
          >
            {store.projects.map((p) => (
              <option value={p.project_id} key={p.project_id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Formula version</span>
          <select
            className="field"
            value={formula.formula_id}
            onChange={(e) =>
              store.setSelection(project.project_id, e.target.value)
            }
          >
            {project.formula_versions.map((f) => (
              <option value={f.formula_id} key={f.formula_id}>
                {f.version_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div>
          <section className="card mb-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <label>
                <span className="label">Version name</span>
                <input
                  className="field"
                  value={formula.version_name}
                  onChange={(e) => update({ version_name: e.target.value })}
                />
              </label>
              <label>
                <span className="label">Status</span>
                <select
                  className="field"
                  value={formula.status}
                  onChange={(e) => update({ status: e.target.value as any })}
                >
                  {[
                    "DRAFT",
                    "TRIALLED",
                    "REJECTED",
                    "SHORTLISTED",
                    "APPROVED",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="label">Processing yield (%)</span>
                <input
                  className="field"
                  type="number"
                  min="0.01"
                  max="100"
                  value={formula.processing_yield_percent ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      update({ processing_yield_percent: null });
                      setError("");
                      return;
                    }
                    const value = Number(e.target.value);
                    if (!Number.isFinite(value) || value <= 0 || value > 100) {
                      setError(
                        "Processing yield must be greater than 0 and no more than 100%.",
                      );
                      return;
                    }
                    update({ processing_yield_percent: value });
                    setError("");
                  }}
                />
              </label>
              <div className="self-end">
                <Status
                  value={formula.is_baseline ? "BASELINE" : formula.status}
                />
              </div>
            </div>
            <label className="mt-4 block">
              <span className="label">Version notes</span>
              <textarea
                className="field"
                rows={2}
                value={formula.notes ?? ""}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </label>
          </section>
          <section className="card !p-0 table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ingredient</th>
                  <th>Amount (g)</th>
                  <th>%</th>
                  <th>Cost / kg</th>
                  <th>Line cost</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formula.ingredients.map((l, index) => (
                  <tr
                    draggable
                    key={l.line_id}
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", String(index))
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain")),
                        a = [...formula.ingredients],
                        [m] = a.splice(from, 1);
                      a.splice(index, 0, m);
                      setLines(a);
                    }}
                  >
                    <td className="cursor-grab text-slate-400">⋮⋮</td>
                    <td className="font-medium">{l.ingredient_name}</td>
                    <td>
                      <input
                        className="field w-28 metric"
                        type="number"
                        min="0"
                        value={l.amount_g}
                        onChange={(e) => {
                          const amount = Number(e.target.value);
                          const msg = validateFormulaLine(amount);
                          if (msg) {
                            setError(msg);
                            return;
                          }
                          setLines(
                            formula.ingredients.map((x) =>
                              x.line_id === l.line_id
                                ? {
                                    ...x,
                                    amount_g: amount,
                                    line_cost:
                                      x.cost_per_kg == null
                                        ? null
                                        : (amount / 1000) * x.cost_per_kg,
                                  }
                                : x,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td className="metric">{fmt(l.percentage)}%</td>
                    <td className="metric">{fmt(l.cost_per_kg)}</td>
                    <td className="metric">
                      {l.line_cost == null
                        ? "Data missing"
                        : `$${fmt(l.line_cost)}`}
                    </td>
                    <td>
                      <button
                        className="btn-danger !p-2"
                        onClick={() =>
                          setLines(
                            formula.ingredients.filter(
                              (x) => x.line_id !== l.line_id,
                            ),
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td></td>
                  <td className="p-3 font-semibold">Total</td>
                  <td className="p-3 metric font-semibold">{fmt(total)} g</td>
                  <td className="p-3 metric font-semibold">
                    {fmt(
                      formula.ingredients.reduce((s, x) => s + x.percentage, 0),
                    )}
                    %
                  </td>
                  <td></td>
                  <td className="p-3 metric font-semibold">
                    {cost == null ? "Data missing" : `$${fmt(cost)}`}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </section>
          <div className="mt-3 flex gap-2">
            <select
              className="field max-w-sm"
              defaultValue=""
              onChange={(e) => {
                addIngredient(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Add ingredient…
              </option>
              {store.ingredients.map((i) => (
                <option value={i.ingredient_id} key={i.ingredient_id}>
                  {i.ingredient_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <aside className="space-y-5">
          <section className="card">
            <h3 className="font-semibold text-navy">Formula metrics</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Total batch", `${fmt(total)} g`],
                ["Total cost", cost == null ? "Data missing" : `$${fmt(cost)}`],
                ["Cost / kg", kg == null ? "Data missing" : `$${fmt(kg)}`],
                [
                  "Yield-adjusted / kg",
                  adjusted == null ? "Data missing" : `$${fmt(adjusted)}`,
                ],
                [
                  "Cost / serving",
                  serving == null ? "Data missing" : `$${fmt(serving)}`,
                ],
              ].map(([l, v]) => (
                <div className="flex justify-between border-b pb-2" key={l}>
                  <dt className="text-slate-500">{l}</dt>
                  <dd className="metric font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="card">
            <h3 className="flex items-center gap-2 font-semibold text-navy">
              <Scale size={18} />
              Formula Scaling
            </h3>
            <select
              className="field mt-4"
              value={scaleMode}
              onChange={(e) => setScaleMode(e.target.value)}
            >
              <option value="weight">Target batch weight (g)</option>
              <option value="multiplier">Multiplier</option>
              <option value="servings">Target serving count</option>
            </select>
            <input
              className="field mt-2"
              type="number"
              min="0"
              value={scaleValue}
              onChange={(e) => setScaleValue(e.target.value)}
            />
            <p className="mt-2 text-xs text-slate-500">
              Original: {fmt(total)} g · rounding difference:{" "}
              {scaleMode === "weight" && Number(scaleValue) > 0 && total > 0
                ? fmt(
                    calculateRoundingDifference(
                      scaleByTargetWeight(
                        formula.ingredients,
                        Number(scaleValue),
                      ),
                      Number(scaleValue),
                    ),
                  )
                : "—"}{" "}
              g
            </p>
            <button className="btn-primary mt-3 w-full" onClick={scale}>
              Create scaled version
            </button>
          </section>
          <section className="card">
            <h3 className="font-semibold text-navy">
              Estimated nutrition / 100 g
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(nutrition)
                .filter(([k]) => k !== "incomplete")
                .map(([k, v]) => (
                  <div className="rounded-lg bg-slate-50 p-2" key={k}>
                    <p className="text-xs capitalize text-slate-500">
                      {k.replace("_", " ")}
                    </p>
                    <p className="metric font-semibold">
                      {typeof v === "number" ? fmt(v, 1) : "Data missing"}
                    </p>
                  </div>
                ))}
            </div>
            {nutrition.incomplete && (
              <p className="mt-2 text-xs text-amber-700">
                Incomplete ingredient nutrition data.
              </p>
            )}
          </section>
          <section className="card">
            <h3 className="font-semibold text-navy">Cost contribution</h3>
            <div className="h-52">
              <ResponsiveContainer>
                <BarChart data={contrib} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 9 }}
                  />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                  <Bar dataKey="value" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </aside>
      </div>
      <p className="notice mt-5">
        This is a formulation estimate only and is not a replacement for
        laboratory analysis or legally compliant nutrition information.
      </p>
    </>
  );
}
