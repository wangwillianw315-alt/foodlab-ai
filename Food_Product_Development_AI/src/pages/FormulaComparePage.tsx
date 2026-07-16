import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, fmt, PageHeader, Status } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import type { SensoryResponse } from "../types/productDevelopment";
import {
  calculateCostPerKg,
  calculateCostPerServing,
  calculateEstimatedNutrition,
  calculateTotalWeight,
} from "../utils/formulaCalculations";
import { calculateMean } from "../utils/sensoryAnalysis";
import { calculateBriefMatchScore } from "../utils/targetAnalysis";

const comparisonMetrics = [
  "Lowest Cost",
  "Highest Protein",
  "Lowest Sugar",
  "Highest Sensory Score",
  "Closest to Brief",
] as const;
type ComparisonMetric = (typeof comparisonMetrics)[number];

const sensoryAttributes = [
  { key: "appearance", label: "Appearance" },
  { key: "aroma", label: "Aroma" },
  { key: "flavour", label: "Flavour" },
  { key: "sweetness", label: "Sweetness" },
  { key: "texture", label: "Texture" },
  { key: "aftertaste", label: "Aftertaste" },
  { key: "overall_liking", label: "Overall liking" },
] as const satisfies ReadonlyArray<{
  key: keyof SensoryResponse;
  label: string;
}>;

type SensoryAttribute = (typeof sensoryAttributes)[number]["key"];
type NumericComparisonKey =
  | "cost"
  | "protein"
  | "sugar"
  | "sensory"
  | "briefMatch";

interface ComparisonRow {
  id: string;
  name: string;
  status: string;
  total: number;
  count: number;
  cost: number | null;
  serving: number | null;
  protein: number | null;
  fat: number | null;
  sugar: number | null;
  fibre: number | null;
  moisture: number | null;
  energy: number | null;
  sensory: number | null;
  sensoryResponseCount: number;
  sensoryAttributes: Record<SensoryAttribute, number | null>;
  briefMatch: number | null;
}

const isFiniteNumber = (value: number | null): value is number =>
  typeof value === "number" && Number.isFinite(value);

const getBestRows = (
  rows: ComparisonRow[],
  key: NumericComparisonKey,
  direction: "min" | "max",
) => {
  const available = rows.filter((row) => isFiniteNumber(row[key]));
  if (!available.length) return [];
  const bestValue = Math[direction](
    ...available.map((row) => row[key] as number),
  );
  return available.filter(
    (row) => Math.abs((row[key] as number) - bestValue) < 1e-9,
  );
};

const formatValue = (value: number | null, unit = "", prefix = "") =>
  isFiniteNumber(value)
    ? `${prefix}${fmt(value)}${unit ? ` ${unit}` : ""}`
    : "Data missing";

export default function FormulaComparePage() {
  const store = useProductDevelopmentStore();
  const project =
    store.projects.find(
      (item) => item.project_id === store.selectedProjectId,
    ) ?? store.projects[0];
  const [selected, setSelected] = useState<string[]>([]);
  const [metric, setMetric] = useState<ComparisonMetric>("Lowest Cost");

  if (!project)
    return <EmptyState title="No projects" body="Create a project first." />;

  const validSelected = selected.filter((id) =>
    project.formula_versions.some((formula) => formula.formula_id === id),
  );
  const ids = validSelected.length
    ? validSelected
    : project.formula_versions.slice(0, 4).map((formula) => formula.formula_id);
  const brief = project.product_brief;
  const rows: ComparisonRow[] = project.formula_versions
    .filter((formula) => ids.includes(formula.formula_id))
    .map((formula) => {
      const nutrition = calculateEstimatedNutrition(
        formula.ingredients,
        store.ingredients,
      );
      const sensoryResponses = project.sensory_tests
        .filter((test) => test.formula_id === formula.formula_id)
        .flatMap((test) => test.responses);
      const sensoryMeans = Object.fromEntries(
        sensoryAttributes.map(({ key }) => [
          key,
          calculateMean(
            sensoryResponses.map((response) => {
              const value = response[key];
              return typeof value === "number" ? value : null;
            }),
          ),
        ]),
      ) as Record<SensoryAttribute, number | null>;
      const cost = calculateCostPerKg(formula.ingredients);
      const briefMatch = calculateBriefMatchScore([
        {
          current: cost,
          target: brief.target_cost_per_kg,
          lowerIsBetter: true,
        },
        {
          current: nutrition.protein,
          target: brief.target_protein_percent,
          higherIsBetter: true,
        },
        { current: nutrition.fat, target: brief.target_fat_percent },
        {
          current: nutrition.sugar,
          target: brief.target_sugar_percent,
          lowerIsBetter: true,
        },
        { current: nutrition.moisture, target: brief.target_moisture_percent },
        {
          current: nutrition.energy_kj,
          target: brief.target_energy_kj_per_100g,
        },
      ]);

      return {
        id: formula.formula_id,
        name: formula.version_name,
        status: formula.status,
        total: calculateTotalWeight(formula.ingredients),
        count: formula.ingredients.length,
        cost,
        serving: calculateCostPerServing(
          formula.ingredients,
          brief.target_serving_size_g,
        ),
        protein: nutrition.protein,
        fat: nutrition.fat,
        sugar: nutrition.sugar,
        fibre: nutrition.fibre,
        moisture: nutrition.moisture,
        energy: nutrition.energy_kj,
        sensory: sensoryMeans.overall_liking,
        sensoryResponseCount: sensoryResponses.filter((response) =>
          isFiniteNumber(response.overall_liking),
        ).length,
        sensoryAttributes: sensoryMeans,
        briefMatch,
      };
    });

  const toggle = (id: string) => {
    if (ids.includes(id)) {
      const next = ids.filter((selectedId) => selectedId !== id);
      setSelected(next.length ? next : [id]);
    } else if (ids.length < 4) {
      setSelected([...ids, id]);
    }
  };

  const metricRule: Record<
    ComparisonMetric,
    { key: NumericComparisonKey; direction: "min" | "max" }
  > = {
    "Lowest Cost": { key: "cost", direction: "min" },
    "Highest Protein": { key: "protein", direction: "max" },
    "Lowest Sugar": { key: "sugar", direction: "min" },
    "Highest Sensory Score": { key: "sensory", direction: "max" },
    "Closest to Brief": { key: "briefMatch", direction: "max" },
  };
  const selectedRule = metricRule[metric];
  const best = getBestRows(rows, selectedRule.key, selectedRule.direction)[0];
  const bestValue = best?.[selectedRule.key] ?? null;
  const bestValueLabel =
    metric === "Lowest Cost"
      ? formatValue(bestValue, "/kg", "$")
      : metric === "Highest Protein" || metric === "Lowest Sugar"
        ? formatValue(bestValue, "g/100g")
        : metric === "Highest Sensory Score"
          ? formatValue(bestValue, "/9")
          : formatValue(bestValue, "% match");

  const benchmarkIds = {
    cost: new Set(getBestRows(rows, "cost", "min").map((row) => row.id)),
    protein: new Set(getBestRows(rows, "protein", "max").map((row) => row.id)),
    sugar: new Set(getBestRows(rows, "sugar", "min").map((row) => row.id)),
    sensory: new Set(getBestRows(rows, "sensory", "max").map((row) => row.id)),
    briefMatch: new Set(
      getBestRows(rows, "briefMatch", "max").map((row) => row.id),
    ),
  };
  const benchmarkLabels: Partial<Record<NumericComparisonKey, string>> = {
    cost: "Lowest",
    protein: "Highest",
    sugar: "Lowest",
    sensory: "Highest",
    briefMatch: "Closest",
  };
  const sensoryRadarData = sensoryAttributes.map(({ key, label }) => ({
    attribute: label,
    ...Object.fromEntries(
      rows.map((row) => [row.id, row.sensoryAttributes[key]]),
    ),
  }));
  const hasSensoryData = rows.some((row) =>
    sensoryAttributes.some(({ key }) =>
      isFiniteNumber(row.sensoryAttributes[key]),
    ),
  );
  const missingSensoryVersions = rows
    .filter(
      (row) =>
        !sensoryAttributes.some(({ key }) =>
          isFiniteNumber(row.sensoryAttributes[key]),
        ),
    )
    .map((row) => row.name);
  const chartColours = ["#12345b", "#0f766e", "#d97706", "#dc2626"];
  const tableMetrics: Array<{
    label: string;
    key: keyof ComparisonRow;
    unit?: string;
    prefix?: string;
    benchmark?: keyof typeof benchmarkIds;
  }> = [
    { label: "Total weight", key: "total", unit: "g" },
    { label: "Ingredients", key: "count" },
    {
      label: "Cost / kg",
      key: "cost",
      unit: "/kg",
      prefix: "$",
      benchmark: "cost",
    },
    { label: "Cost / serving", key: "serving", prefix: "$" },
    {
      label: "Protein / 100g",
      key: "protein",
      unit: "g",
      benchmark: "protein",
    },
    { label: "Fat / 100g", key: "fat", unit: "g" },
    {
      label: "Sugar / 100g",
      key: "sugar",
      unit: "g",
      benchmark: "sugar",
    },
    { label: "Fibre / 100g", key: "fibre", unit: "g" },
    { label: "Moisture / 100g", key: "moisture", unit: "g" },
    { label: "Energy / 100g", key: "energy", unit: "kJ" },
    {
      label: "Sensory overall liking",
      key: "sensory",
      unit: "/9",
      benchmark: "sensory",
    },
    {
      label: "Overall-liking responses",
      key: "sensoryResponseCount",
    },
    {
      label: "Product Brief match",
      key: "briefMatch",
      unit: "%",
      benchmark: "briefMatch",
    },
  ];

  return (
    <>
      <PageHeader
        title="Formula Version Comparison"
        subtitle="Compare up to four versions. No version is automatically declared best."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
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
              setSelected([]);
            }}
          >
            {store.projects.map((item) => (
              <option value={item.project_id} key={item.project_id}>
                {item.project_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Decision metric</span>
          <select
            className="field"
            value={metric}
            onChange={(event) =>
              setMetric(event.target.value as ComparisonMetric)
            }
          >
            {comparisonMetrics.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {project.formula_versions.map((formula) => (
          <button
            type="button"
            className={
              ids.includes(formula.formula_id) ? "btn-primary" : "btn-secondary"
            }
            disabled={!ids.includes(formula.formula_id) && ids.length >= 4}
            onClick={() => toggle(formula.formula_id)}
            aria-pressed={ids.includes(formula.formula_id)}
            key={formula.formula_id}
          >
            {formula.version_name}
          </button>
        ))}
      </div>

      <div className="notice mb-5">
        {best ? (
          <p>
            Best against selected metric: <strong>{best.name}</strong> —{" "}
            {bestValueLabel} ({metric}).
          </p>
        ) : (
          <p>
            Best against selected metric: <strong>Data missing</strong> for{" "}
            {metric}. No version has been selected as best.
          </p>
        )}
        <p className="mt-1 text-xs">
          Missing values are excluded. “Closest to Brief” uses available Product
          Brief cost and nutrition targets; it does not treat missing targets or
          measurements as zero.
        </p>
      </div>

      <section className="card mb-5 table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              {rows.map((row) => (
                <th key={row.id}>{row.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableMetrics.map((item) => (
              <tr key={item.label}>
                <td className="font-medium">{item.label}</td>
                {rows.map((row) => {
                  const value = row[item.key];
                  const isBenchmark = item.benchmark
                    ? benchmarkIds[item.benchmark].has(row.id)
                    : false;
                  return (
                    <td
                      className={`metric ${
                        isBenchmark ? "bg-emerald-50 text-emerald-800" : ""
                      }`}
                      key={row.id}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span>
                          {typeof value === "number"
                            ? formatValue(
                                value,
                                item.unit ?? "",
                                item.prefix ?? "",
                              )
                            : "Data missing"}
                        </span>
                        {isBenchmark && item.benchmark && (
                          <span className="badge bg-emerald-100 text-emerald-700">
                            {benchmarkLabels[item.benchmark]}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="font-medium">Development status</td>
              {rows.map((row) => (
                <td key={row.id}>
                  <Status value={row.status} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card">
          <h3 className="font-semibold text-navy">Cost per kg</h3>
          <p className="mt-1 text-xs text-slate-500">
            Versions without complete cost data are omitted, not shown as zero.
          </p>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip
                  formatter={(value) => `$${Number(value).toFixed(2)}/kg`}
                />
                <Bar dataKey="cost" name="Cost / kg" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold text-navy">Sensory overall liking</h3>
          <p className="mt-1 text-xs text-slate-500">
            Mean of linked overall-liking responses; missing scores are
            excluded.
          </p>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 9]} />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(2)}/9`}
                />
                <Bar dataKey="sensory" name="Overall liking" fill="#12345b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card xl:col-span-2">
          <h3 className="font-semibold text-navy">
            Sensory attribute comparison
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Mean 9-point hedonic scores from all sensory tests linked to each
            selected formula version.
          </p>
          {hasSensoryData ? (
            <div className="h-80">
              <ResponsiveContainer>
                <RadarChart data={sensoryRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 9]} tickCount={4} />
                  {rows.map((row, index) => (
                    <Radar
                      key={row.id}
                      name={row.name}
                      dataKey={row.id}
                      stroke={chartColours[index % chartColours.length]}
                      fill={chartColours[index % chartColours.length]}
                      fillOpacity={0.05}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No sensory comparison data"
              body="Add or import sensory responses linked to the selected formula versions."
            />
          )}
          {missingSensoryVersions.length > 0 && (
            <p className="notice mt-3">
              No linked sensory scores for: {missingSensoryVersions.join(", ")}.
              These versions are not plotted at zero.
            </p>
          )}
          <div className="table-wrap mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sensory attribute</th>
                  {rows.map((row) => (
                    <th key={row.id}>{row.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensoryAttributes.map(({ key, label }) => (
                  <tr key={key}>
                    <td className="font-medium">{label}</td>
                    {rows.map((row) => (
                      <td key={row.id}>
                        {formatValue(row.sensoryAttributes[key], "/9")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className="notice mt-5">
        Formulation, nutrition, cost and sensory values are decision-support
        estimates only. Review the complete technical evidence and confirm
        performance through appropriate trials, laboratory analysis, supplier
        documentation, regulatory assessment and shelf-life validation before
        commercial production.
      </p>
    </>
  );
}
