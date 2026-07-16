import { useState } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  FlaskConical,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, fmt, PageHeader, Status } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import {
  calculateCostContribution,
  calculateCostPerKg,
  calculateCostPerServing,
  calculateEstimatedNutrition,
  calculateFormulaCost,
  calculateNutritionContribution,
  calculateTotalWeight,
  calculateYieldAdjustedCost,
} from "../utils/formulaCalculations";
import { calculateMean } from "../utils/sensoryAnalysis";
import { evaluateTarget } from "../utils/targetAnalysis";

type NutritionMetric = "protein" | "fat" | "sugar" | "energy_kj";

export default function AnalysisPage() {
  const store = useProductDevelopmentStore();
  const project =
    store.projects.find(
      (item) => item.project_id === store.selectedProjectId,
    ) ?? store.projects[0];
  const [yieldAdjusted, setYieldAdjusted] = useState(false);
  const [nutritionMetric, setNutritionMetric] =
    useState<NutritionMetric>("protein");

  if (!project)
    return (
      <EmptyState
        title="No projects"
        body="Create a project before analysis."
      />
    );

  const formula =
    project.formula_versions.find(
      (item) => item.formula_id === store.selectedFormulaId,
    ) ?? project.formula_versions[0];
  if (!formula)
    return (
      <EmptyState
        title="No formula versions"
        body="Create a formula version before running cost and nutrition analysis."
      />
    );

  const totalWeight = calculateTotalWeight(formula.ingredients);
  const totalCost = calculateFormulaCost(formula.ingredients);
  const costPerKg = calculateCostPerKg(formula.ingredients);
  const adjustedCost = calculateYieldAdjustedCost(
    formula.ingredients,
    formula.processing_yield_percent,
  );
  const displayedCost = yieldAdjusted ? adjustedCost : costPerKg;
  const servingCost = calculateCostPerServing(
    formula.ingredients,
    project.product_brief.target_serving_size_g,
  );
  const nutrition = calculateEstimatedNutrition(
    formula.ingredients,
    store.ingredients,
    yieldAdjusted ? formula.processing_yield_percent : null,
  );
  const costContribution = calculateCostContribution(formula.ingredients)
    .map((line) => ({
      name: line.ingredient_name,
      percentage: line.value ?? 0,
      lineCost: line.line_cost,
    }))
    .sort((a, b) => b.percentage - a.percentage);
  const nutritionContribution = calculateNutritionContribution(
    formula.ingredients,
    store.ingredients,
    nutritionMetric,
  ).sort((a, b) => b.percentage - a.percentage);
  const mostExpensive = costContribution.find((item) => item.lineCost != null);
  const targetCost = project.product_brief.target_cost_per_kg;
  const costDifference =
    displayedCost == null || targetCost == null
      ? null
      : displayedCost - targetCost;
  const costVariancePercent =
    costDifference == null || !targetCost
      ? null
      : (costDifference / targetCost) * 100;
  const costTone =
    costVariancePercent == null
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : costVariancePercent <= 0
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : costVariancePercent <= 10
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-red-200 bg-red-50 text-red-800";
  const sensory = calculateMean(
    project.sensory_tests
      .filter((test) => test.formula_id === formula.formula_id)
      .flatMap((test) =>
        test.responses.map((response) => response.overall_liking),
      ),
  );
  const gapRows = [
    {
      name: "Protein",
      current: nutrition.protein,
      target: project.product_brief.target_protein_percent,
      unit: "g/100g",
      higher: true,
    },
    {
      name: "Fat",
      current: nutrition.fat,
      target: project.product_brief.target_fat_percent,
      unit: "g/100g",
    },
    {
      name: "Sugar",
      current: nutrition.sugar,
      target: project.product_brief.target_sugar_percent,
      unit: "g/100g",
      lower: true,
    },
    {
      name: "Moisture",
      current: nutrition.moisture,
      target: project.product_brief.target_moisture_percent,
      unit: "g/100g",
    },
    {
      name: "Energy",
      current: nutrition.energy_kj,
      target: project.product_brief.target_energy_kj_per_100g,
      unit: "kJ/100g",
    },
    {
      name: "Cost",
      current: displayedCost,
      target: targetCost,
      unit: "$/kg",
      lower: true,
    },
    {
      name: "Sensory overall liking",
      current: sensory,
      target: 7,
      unit: "/9",
      higher: true,
    },
  ].map((row) => {
    const status = evaluateTarget(
      row.current,
      row.target,
      row.lower,
      row.higher,
    );
    const difference =
      row.current == null || row.target == null
        ? null
        : row.current - row.target;
    const variance =
      difference == null || !row.target
        ? null
        : (difference / row.target) * 100;
    const prompt =
      status === "INCOMPLETE_DATA"
        ? "Data missing"
        : status === "NO_TARGET"
          ? "Set target in Product Brief"
          : status === "MEETS_TARGET"
            ? "Confirm by laboratory analysis"
            : status === "CLOSE_TO_TARGET"
              ? "Review and confirm"
              : row.lower
                ? "Reduce or review"
                : row.higher
                  ? "Increase or review"
                  : "Review";
    return { ...row, status, difference, variance, prompt };
  });
  const pieColours = ["#12345b", "#0f766e", "#d97706", "#64748b", "#dc2626"];

  return (
    <>
      <PageHeader
        title="Cost, Nutrition & Target Analysis"
        subtitle="Decision support for the selected project and formula version."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <label>
          <span className="label">Project</span>
          <select
            className="field"
            value={project.project_id}
            onChange={(event) => {
              const next = store.projects.find(
                (item) => item.project_id === event.target.value,
              );
              store.setSelection(
                event.target.value,
                next?.formula_versions[0]?.formula_id,
              );
            }}
          >
            {store.projects.map((item) => (
              <option key={item.project_id} value={item.project_id}>
                {item.project_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Formula version</span>
          <select
            className="field"
            value={formula.formula_id}
            onChange={(event) =>
              store.setSelection(project.project_id, event.target.value)
            }
          >
            {project.formula_versions.map((item) => (
              <option key={item.formula_id} value={item.formula_id}>
                {item.version_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Calculation view</span>
          <select
            className="field"
            value={yieldAdjusted ? "yield" : "before"}
            onChange={(event) =>
              setYieldAdjusted(event.target.value === "yield")
            }
          >
            <option value="before">Before processing estimate</option>
            <option value="yield">Yield-adjusted estimate</option>
          </select>
        </label>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Batch weight", `${fmt(totalWeight)} g`],
          [
            "Total batch cost",
            totalCost == null ? "Data missing" : `$${fmt(totalCost)}`,
          ],
          [
            "Cost per kg",
            displayedCost == null ? "Data missing" : `$${fmt(displayedCost)}`,
          ],
          [
            "Cost per 100g",
            displayedCost == null
              ? "Data missing"
              : `$${fmt(displayedCost / 10)}`,
          ],
          [
            "Cost per serving",
            servingCost == null ? "Data missing" : `$${fmt(servingCost)}`,
          ],
          ["Most expensive", mostExpensive?.name ?? "Data missing"],
        ].map(([label, value]) => (
          <section className="card" key={label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="metric mt-2 font-bold text-navy">{value}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card">
          <h3 className="flex items-center gap-2 font-semibold text-navy">
            <CircleDollarSign size={18} /> Cost Contribution by Ingredient
          </h3>
          {costContribution.length ? (
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={costContribution.slice(0, 5)}
                    dataKey="percentage"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    label={({ name, percentage }) =>
                      `${name} ${Number(percentage).toFixed(1)}%`
                    }
                  >
                    {costContribution.slice(0, 5).map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={pieColours[index % pieColours.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500">
              No cost data available.
            </p>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Top contributor</th>
                  <th>Line cost</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {costContribution.slice(0, 5).map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>
                      {item.lineCost == null
                        ? "Data missing"
                        : `$${fmt(item.lineCost)}`}
                    </td>
                    <td>{fmt(item.percentage)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-semibold text-navy">
              <FlaskConical size={18} />
              Nutrition Contribution
            </h3>
            <select
              className="field w-44"
              value={nutritionMetric}
              onChange={(event) =>
                setNutritionMetric(event.target.value as NutritionMetric)
              }
            >
              <option value="protein">Protein</option>
              <option value="fat">Fat</option>
              <option value="sugar">Sugar</option>
              <option value="energy_kj">Energy</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={nutritionContribution.slice(0, 8)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" unit="%" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                />
                <Bar
                  dataKey="percentage"
                  fill="#0f766e"
                  radius={[0, 5, 5, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {nutrition.incomplete && (
            <p className="notice">
              <AlertTriangle className="mr-2 inline" size={16} />
              Some ingredient nutrition data is missing; incomplete nutrients
              are not presented as verified totals.
            </p>
          )}
        </section>

        <section className={`rounded-xl border p-5 xl:col-span-2 ${costTone}`}>
          <h3 className="font-semibold">Target Cost Comparison</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs opacity-70">Target cost</p>
              <p className="metric text-xl font-bold">
                {targetCost == null ? "Not set" : `$${fmt(targetCost)}/kg`}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Estimated cost</p>
              <p className="metric text-xl font-bold">
                {displayedCost == null
                  ? "Data missing"
                  : `$${fmt(displayedCost)}/kg`}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Difference</p>
              <p className="metric text-xl font-bold">
                {costDifference == null
                  ? "—"
                  : `${costDifference >= 0 ? "+" : ""}$${fmt(costDifference)}`}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-70">Variance</p>
              <p className="metric text-xl font-bold">
                {costVariancePercent == null
                  ? "—"
                  : `${costVariancePercent >= 0 ? "+" : ""}${fmt(costVariancePercent)}%`}
              </p>
            </div>
          </div>
        </section>

        <section className="card xl:col-span-2">
          <h3 className="flex items-center gap-2 font-semibold text-navy">
            <Target size={18} />
            Product Brief Gap Analysis
          </h3>
          <div className="table-wrap mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Current</th>
                  <th>Target</th>
                  <th>Difference</th>
                  <th>Variance</th>
                  <th>Status</th>
                  <th>Neutral prompt</th>
                </tr>
              </thead>
              <tbody>
                {gapRows.map((row) => (
                  <tr key={row.name}>
                    <td className="font-medium">{row.name}</td>
                    <td>
                      {fmt(row.current)} {row.unit}
                    </td>
                    <td>
                      {fmt(row.target)} {row.unit}
                    </td>
                    <td>
                      {row.difference == null
                        ? "—"
                        : `${row.difference >= 0 ? "+" : ""}${fmt(row.difference)}`}
                    </td>
                    <td>
                      {row.variance == null
                        ? "—"
                        : `${row.variance >= 0 ? "+" : ""}${fmt(row.variance)}%`}
                    </td>
                    <td>
                      <Status value={row.status} />
                    </td>
                    <td>{row.prompt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className="notice mt-5">
        This is a formulation estimate only. Confirm nutrition, sensory
        performance, cost assumptions and target compliance using appropriate
        supplier, laboratory and trial evidence.
      </p>
    </>
  );
}
