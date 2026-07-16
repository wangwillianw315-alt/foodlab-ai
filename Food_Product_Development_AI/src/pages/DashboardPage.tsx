import {
  Activity,
  Beaker,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Scale,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, isValid, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { PageHeader, fmt, Status } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import {
  calculateCostPerKg,
  calculateEstimatedNutrition,
} from "../utils/formulaCalculations";
import { calculateMean } from "../utils/sensoryAnalysis";
import { calculateBriefMatchScore } from "../utils/targetAnalysis";
const displayDate = (value: string) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy") : "Date unavailable";
};
export default function DashboardPage() {
  const projects = useProductDevelopmentStore((s) => s.projects),
    ingredients = useProductDevelopmentStore((s) => s.ingredients);
  const formulas = projects.flatMap((p) =>
    p.formula_versions.map((f) => ({ ...f, project: p.project_name })),
  );
  const stages = Object.entries(
    projects.reduce<Record<string, number>>(
      (a, p) => (
        (a[p.development_stage] = (a[p.development_stage] ?? 0) + 1),
        a
      ),
      {},
    ),
  ).map(([name, value]) => ({ name, value }));
  const cats = Object.entries(
    projects.reduce<Record<string, number>>(
      (a, p) => ((a[p.product_category] = (a[p.product_category] ?? 0) + 1), a),
      {},
    ),
  ).map(([name, value]) => ({ name, value }));
  const costs = formulas.map((f) => ({
    name: f.version_name.replace(" Formula", ""),
    cost: calculateCostPerKg(f.ingredients),
  }));
  const knownCosts = costs.flatMap((item) =>
    item.cost == null ? [] : [item.cost],
  );
  const avg = knownCosts.length
    ? knownCosts.reduce((sum, cost) => sum + cost, 0) / knownCosts.length
    : null;
  const targetScores = projects.map((project) => {
    const formula =
      project.formula_versions.find((item) => item.is_baseline) ??
      project.formula_versions.at(-1);
    if (!formula) return { name: project.project_name, score: null };
    const nutrition = calculateEstimatedNutrition(
      formula.ingredients,
      ingredients,
    );
    const sensory = calculateMean(
      project.sensory_tests
        .filter((test) => test.formula_id === formula.formula_id)
        .flatMap((test) =>
          test.responses.map((response) => response.overall_liking),
        ),
    );
    return {
      name: project.project_name,
      score: calculateBriefMatchScore([
        {
          current: nutrition.protein,
          target: project.product_brief.target_protein_percent,
          higherIsBetter: true,
        },
        {
          current: nutrition.fat,
          target: project.product_brief.target_fat_percent,
        },
        {
          current: nutrition.sugar,
          target: project.product_brief.target_sugar_percent,
          lowerIsBetter: true,
        },
        {
          current: nutrition.moisture,
          target: project.product_brief.target_moisture_percent,
        },
        {
          current: nutrition.energy_kj,
          target: project.product_brief.target_energy_kj_per_100g,
        },
        {
          current: calculateCostPerKg(formula.ingredients),
          target: project.product_brief.target_cost_per_kg,
          lowerIsBetter: true,
        },
        { current: sensory, target: 7, higherIsBetter: true },
      ]),
    };
  });
  const trialActivity = Object.entries(
    projects
      .flatMap((project) => project.sensory_tests)
      .reduce<Record<string, number>>((result, test) => {
        result[test.test_date] = (result[test.test_date] ?? 0) + 1;
        return result;
      }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, trials]) => ({ date, trials }));
  const cards = [
    [
      "Active Projects",
      projects.filter((p) => p.status === "ACTIVE").length,
      ClipboardList,
    ],
    ["Formula Versions", formulas.length, Beaker],
    ["Ingredients", ingredients.length, FlaskConical],
    [
      "Trials Completed",
      projects.reduce((s, p) => s + p.sensory_tests.length, 0),
      Activity,
    ],
    [
      "Average Cost per kg",
      avg == null ? "Data missing" : `$${fmt(avg)}`,
      Scale,
    ],
    [
      "Projects Near Target",
      targetScores.filter((item) => item.score != null && item.score >= 75)
        .length,
      CheckCircle2,
    ],
  ] as const;
  return (
    <>
      <PageHeader
        title="Development Dashboard"
        subtitle="Portfolio overview using local demonstration and project data."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(([l, v, Icon]) => (
          <div className="card" key={l}>
            <Icon className="mb-4 text-teal" size={20} />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {l}
            </p>
            <p className="metric mt-1 text-2xl font-bold text-navy">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card">
          <h3 className="font-semibold text-navy">
            Projects by Development Stage
          </h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <h3 className="font-semibold text-navy">
            Target Achievement Overview
          </h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={targetScores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={135}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(0)}%`}
                />
                <Bar dataKey="score" fill="#0f766e" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <h3 className="font-semibold text-navy">Trial Activity Timeline</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={trialActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="trials"
                  stroke="#12345b"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <h3 className="font-semibold text-navy">Formula Cost Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={costs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={115}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}/kg`} />
                <Bar dataKey="cost" fill="#12345b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <h3 className="font-semibold text-navy">
            Product Category Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={cats}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={85}
                  label
                >
                  {cats.map((_, i) => (
                    <Cell
                      key={i}
                      fill={["#12345b", "#0f766e", "#d97706", "#64748b"][i % 4]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <h3 className="font-semibold text-navy">Recent Projects</h3>
          <div className="mt-4 space-y-3">
            {projects.map((p) => (
              <Link
                to={`/projects/${p.project_id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                key={p.project_id}
              >
                <div>
                  <p className="font-medium">{p.project_name}</p>
                  <p className="text-xs text-slate-500">
                    {p.project_code} · {p.development_stage}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Updated {displayDate(p.updated_at)}
                  </p>
                </div>
                <Status value={p.status} />
              </Link>
            ))}
          </div>
        </section>
      </div>
      <p className="mt-6 notice">
        Demo project data only. Demonstration and educational use only.
      </p>
    </>
  );
}
