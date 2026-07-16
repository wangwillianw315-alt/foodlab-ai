import { Download, FileJson, Printer } from "lucide-react";
import { EmptyState, fmt, PageHeader, Status } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import {
  buildDevelopmentSummary,
  reportSensoryAttributes,
} from "../utils/developmentSummary";
import { downloadText, formulaToCsv, projectToMarkdown } from "../utils/fileIO";

const nutritionRows = [
  ["Energy", "energy_kj", "kJ/100g"],
  ["Protein", "protein", "g/100g"],
  ["Fat", "fat", "g/100g"],
  ["Carbohydrate", "carbohydrate", "g/100g"],
  ["Sugar", "sugar", "g/100g"],
  ["Fibre", "fibre", "g/100g"],
  ["Moisture", "moisture", "g/100g"],
] as const;

const money = (value: number | null) =>
  value == null ? "Data missing" : `$${fmt(value)}`;

export default function ReportPage() {
  const store = useProductDevelopmentStore();
  const project =
    store.projects.find(
      (item) => item.project_id === store.selectedProjectId,
    ) ?? store.projects[0];
  const formula =
    project?.formula_versions.find(
      (item) => item.formula_id === store.selectedFormulaId,
    ) ?? project?.formula_versions[0];

  if (!project)
    return (
      <EmptyState
        title="No project"
        body="Create a project to generate a development summary."
      />
    );
  if (!formula)
    return (
      <EmptyState
        title="No formula"
        body="Add a formula version to this project first."
      />
    );

  const summary = buildDevelopmentSummary(project, formula, store.ingredients);
  const updateNote = (key: string, value: string) =>
    store.updateProject(project.project_id, {
      development_notes: { ...project.development_notes, [key]: value },
    });

  return (
    <>
      <PageHeader
        title="Development Summary"
        subtitle={`${project.project_name} · ${formula.version_name}`}
        actions={
          <>
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </button>
            <button
              className="btn-secondary"
              onClick={() =>
                downloadText(
                  `${project.project_code}-${formula.version_number}-summary.md`,
                  projectToMarkdown(
                    project,
                    store.ingredients,
                    formula.formula_id,
                  ),
                  "text/markdown",
                )
              }
            >
              <Download size={16} /> Markdown
            </button>
            <button
              className="btn-secondary"
              onClick={() =>
                downloadText(
                  `${project.project_code}.json`,
                  JSON.stringify(project, null, 2),
                  "application/json",
                )
              }
            >
              <FileJson size={16} /> JSON
            </button>
            <button
              className="btn-primary"
              onClick={() =>
                downloadText(
                  `${project.project_code}-${formula.version_number}.csv`,
                  formulaToCsv(formula.ingredients),
                  "text/csv",
                )
              }
            >
              Formula CSV
            </button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 no-print">
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
              <option value={item.project_id} key={item.project_id}>
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
              <option value={item.formula_id} key={item.formula_id}>
                {item.version_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="notice mb-5">
        This report contains estimated and demonstration data. It is not a
        regulatory, safety, nutrition labelling or commercial manufacturing
        approval document.
      </div>

      <div className="space-y-5">
        <section className="card">
          <h3 className="font-semibold text-navy">Project Overview</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ["Code", project.project_code],
              ["Category", project.product_category],
              ["Stage", project.development_stage],
              ["Status", project.status],
              ["Owner", project.project_owner || "Not recorded"],
              ["Target launch", project.target_launch_date || "Not recorded"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold text-navy">Product Brief</h3>
          <p className="mt-2 text-sm">
            {project.product_brief.product_description ||
              "No product description recorded."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.product_brief.claims.length ? (
              project.product_brief.claims.map((claim) => (
                <span className="badge bg-teal/10 text-teal" key={claim}>
                  {claim}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                No planning claims recorded.
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Claims are planning labels only. Regulatory eligibility is not
            assessed in V1.
          </p>
        </section>

        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-navy">Current Formula</h3>
              <p className="mt-1 text-sm text-slate-500">
                {formula.version_name} · {fmt(summary.totalWeight)} g input ·
                yield{" "}
                {formula.processing_yield_percent == null
                  ? "not set"
                  : `${fmt(formula.processing_yield_percent)}%`}
              </p>
            </div>
            <Status value={formula.status} />
          </div>
          <div className="table-wrap mt-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Amount (g)</th>
                  <th>%</th>
                  <th>Cost/kg</th>
                  <th>Line cost</th>
                </tr>
              </thead>
              <tbody>
                {formula.ingredients.map((line) => (
                  <tr key={line.line_id}>
                    <td>{line.ingredient_name}</td>
                    <td>{fmt(line.amount_g)}</td>
                    <td>{fmt(line.percentage)}%</td>
                    <td>{money(line.cost_per_kg)}</td>
                    <td>{money(line.line_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="card">
            <h3 className="font-semibold text-navy">Estimated Cost</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Total batch cost", money(summary.totalCost)],
                ["Input cost/kg", money(summary.costPerKg)],
                ["Yield-adjusted cost/kg", money(summary.adjustedCostPerKg)],
                ["Input cost/serving", money(summary.costPerServing)],
                [
                  "Yield-adjusted cost/serving",
                  money(summary.adjustedCostPerServing),
                ],
              ].map(([label, value]) => (
                <div className="flex justify-between border-b pb-2" key={label}>
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="metric font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="card">
            <h3 className="font-semibold text-navy">Top 5 Cost Contributors</h3>
            <div className="table-wrap mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Line cost</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.costContributors.slice(0, 5).map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{money(item.lineCost)}</td>
                      <td>
                        {item.percentage == null
                          ? "Data missing"
                          : `${fmt(item.percentage)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="card">
          <h3 className="font-semibold text-navy">
            Estimated Nutrition / 100 g
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Yield-adjusted values use the recorded processing yield and remain
            formulation estimates.
          </p>
          <div className="table-wrap mt-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nutrient</th>
                  <th>Before processing</th>
                  <th>Yield-adjusted</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {nutritionRows.map(([label, key, unit]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{fmt(summary.nutritionBefore[key], 1)}</td>
                    <td>
                      {summary.useYield
                        ? fmt(summary.nutritionYieldAdjusted[key], 1)
                        : "Data missing"}
                    </td>
                    <td>{unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(summary.nutritionBefore.incomplete ||
            summary.nutritionYieldAdjusted.incomplete) && (
            <p className="notice mt-3">
              One or more ingredient nutrition records are incomplete.
            </p>
          )}
        </section>

        <section className="card">
          <h3 className="font-semibold text-navy">Sensory Results</h3>
          <p className="mt-1 text-sm text-slate-500">
            {summary.linkedTests.length} linked test(s) ·{" "}
            {summary.responses.length} response(s)
          </p>
          <div className="table-wrap mt-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Mean</th>
                  <th>Median</th>
                  <th>Std dev</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Responses</th>
                </tr>
              </thead>
              <tbody>
                {reportSensoryAttributes.map((attribute) => {
                  const result = summary.sensory[attribute];
                  return (
                    <tr key={attribute}>
                      <td className="capitalize">
                        {attribute.replaceAll("_", " ")}
                      </td>
                      <td>{fmt(result.mean)}</td>
                      <td>{fmt(result.median)}</td>
                      <td>{fmt(result.standardDeviation)}</td>
                      <td>{fmt(result.min)}</td>
                      <td>{fmt(result.max)}</td>
                      <td>{result.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold text-navy">Target Gap Analysis</h3>
          <p className="mt-1 text-xs text-slate-500">
            {summary.useYield
              ? "Nutrition and cost gaps use yield-adjusted estimates."
              : "Yield is unavailable; gaps use input-formula estimates."}
          </p>
          <div className="table-wrap mt-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Current</th>
                  <th>Target</th>
                  <th>Difference</th>
                  <th>Variance</th>
                  <th>Status</th>
                  <th>Review prompt</th>
                </tr>
              </thead>
              <tbody>
                {summary.gaps.map((gap) => (
                  <tr key={gap.name}>
                    <td>{gap.name}</td>
                    <td>
                      {fmt(gap.current)} {gap.unit}
                    </td>
                    <td>
                      {fmt(gap.target)} {gap.unit}
                    </td>
                    <td>
                      {gap.difference == null
                        ? "—"
                        : `${gap.difference >= 0 ? "+" : ""}${fmt(gap.difference)}`}
                    </td>
                    <td>
                      {gap.variancePercent == null
                        ? "—"
                        : `${gap.variancePercent >= 0 ? "+" : ""}${fmt(gap.variancePercent)}%`}
                    </td>
                    <td>
                      <Status value={gap.status} />
                    </td>
                    <td>{gap.prompt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3 className="font-semibold text-navy">Risks and Open Questions</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
            {summary.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <strong>Open questions:</strong>{" "}
            {project.development_notes.open_questions || "Not recorded"}
          </p>
        </section>

        <section className="card">
          <h3 className="font-semibold text-navy">
            Development Notes and Next Trial Plan
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {Object.entries(project.development_notes).map(([key, value]) => (
              <label key={key}>
                <span className="label">{key.replaceAll("_", " ")}</span>
                <textarea
                  className="field"
                  rows={3}
                  value={value}
                  onChange={(event) => updateNote(key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
