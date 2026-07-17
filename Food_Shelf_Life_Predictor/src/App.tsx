import { useMemo, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  Archive,
  ArrowLeftRight,
  BarChart3,
  Beaker,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Copy,
  Database,
  Download,
  FileText,
  FlaskConical,
  Info,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import { useShelfLifeStore } from "./store/shelfLifeStore";
import type { ShelfLifeStudy, StudyStatus } from "./types/shelfLife";
import {
  calculateCompletionRate,
  generateSamplingSchedule,
} from "./utils/samplingSchedule";
import { calculateMean, calculateStandardDeviation } from "./utils/statistics";
import {
  exportStudyJson,
  resultsToCsv,
  resultRowsToCsv,
  download,
} from "./utils/exportData";
import { importResultsCsv } from "./utils/csvImport";
import { calculateStudyPlanningEstimate } from "./utils/studyEstimate";
import {
  calculateQ10,
  estimateRateAtTemperature,
  fitArrheniusModel,
} from "./utils/acceleratedShelfLife";
import { TransferWorkspace } from "./components/TransferWorkspace";
import { createFoodLabId, getOrCreateWorkspaceId } from "./utils/foodlabTransfer";
import { resolvePortalUrl } from "./utils/portalUrl";
const DISCLAIMER =
  "This application is for educational, research planning and demonstration purposes only. Shelf-life estimates must not be used as commercial expiry dates, food safety approvals or regulatory evidence without validated laboratory testing, approved methods, suitable challenge studies and review by qualified food safety professionals.";
const nav = [
  ["/", LayoutDashboard, "Dashboard"],
  ["/studies", ClipboardList, "Studies"],
  ["/design", FlaskConical, "Study Design"],
  ["/results", Database, "Results"],
  ["/analysis", BarChart3, "Analysis"],
  ["/models", Activity, "Models"],
  ["/reports", FileText, "Reports"],
  ["/transfers", ArrowLeftRight, "Module Transfers"],
  ["/about", Info, "About"],
] as const;
function Layout() {
  const error = useShelfLifeStore((state) => state.error);
  const setError = useShelfLifeStore((state) => state.setError);
  const portalUrl = resolvePortalUrl();
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          FoodLab AI
          <small>SHELF LIFE PREDICTOR · RESEARCH</small>
        </div>
        <nav className="nav">
          {nav.map(([to, I, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <I size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div
          style={{
            marginTop: "auto",
            fontSize: 11,
            color: "#89a4bd",
            lineHeight: 1.5,
          }}
        >
          V1.0 · Local browser data
          <br />
          Transparent models only
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="module-header-left">
            <Menu className="mobile" />
            {portalUrl ? (
              <a
                className="portal-link"
                href={portalUrl}
                rel="noopener noreferrer"
              >
                ← Back to Portal
              </a>
            ) : (
              <span
                className="portal-link"
                title="Set VITE_PORTAL_URL to enable the Portal link"
                aria-disabled="true"
              >
                Portal link not configured
              </span>
            )}
            <span className="module-name">Shelf Life Predictor</span>
          </div>
          <div className="module-header-right">
            <a className="disclaimer-link" href="/about#limitations">
              Scientific disclaimer
            </a>
            <span className="badge ok">READY · LOCAL JSON</span>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="notice" style={{ marginBottom: 16 }} role="alert">
              {error}{" "}
              <button className="btn" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/studies" element={<Studies />} />
            <Route path="/studies/:id" element={<StudyDetails />} />
            <Route path="/design" element={<StudyDesign />} />
            <Route path="/results" element={<Results />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/models" element={<Models />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/transfers" element={<TransferWorkspace />} />
            <Route path="/about" element={<About />} />
            <Route
              path="*"
              element={<div className="empty">Page not found.</div>}
            />
          </Routes>
        </div>
      </main>
      <div className="footer-notice">
        <b>Scientific-use notice:</b> {DISCLAIMER}
      </div>
    </div>
  );
}
const Header = ({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children?: React.ReactNode;
}) => (
  <>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "end",
      }}
    >
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="title">{title}</h1>
        <p className="sub">{sub}</p>
      </div>
      {children}
    </div>
  </>
);
const Status = ({ s }: { s: string }) => (
  <span
    className={`badge ${s === "ACCEPTABLE" || s === "COMPLETED" || s === "ACTIVE" ? "ok" : s === "WARNING" || s === "PLANNED" ? "warn" : s === "UNACCEPTABLE" ? "bad" : "muted"}`}
  >
    {s.replace("_", " ")}
  </span>
);
function Dashboard() {
  const studies = useShelfLifeStore((s) => s.studies),
    all = studies.filter((s) => !s.archived),
    samples = all.flatMap((s) => s.sampling_points),
    results = all.flatMap((s) => s.results);
  const byStatus = Object.entries(
    all.reduce<Record<string, number>>(
      (a, s) => ((a[s.study_status] = (a[s.study_status] || 0) + 1), a),
      {},
    ),
  ).map(([name, value]) => ({ name, value }));
  const estimates = all.map((s) => {
    const estimate = calculateStudyPlanningEstimate(s);
    return {
      name: s.study_code,
      proposed: s.proposed_shelf_life_days ?? 0,
      planning:
        estimate?.conservativeDay == null
          ? null
          : Math.round(estimate.conservativeDay),
    };
  });
  return (
    <>
      <Header
        eyebrow="Portfolio overview"
        title="Food Shelf Life Predictor"
        sub="Shelf-life study planning, stability monitoring and transparent predictive analysis"
      />
      <div className="grid stats">
        {[
          [
            "Active Studies",
            all.filter((s) => s.study_status === "ACTIVE").length,
          ],
          [
            "Storage Conditions",
            all.flatMap((s) => s.storage_conditions).length,
          ],
          ["Planned Samples", samples.length],
          [
            "Completed Samples",
            samples.filter((s) => s.sample_status === "COMPLETED").length,
          ],
          [
            "Parameters Monitored",
            new Set(
              all.flatMap((s) => s.parameters.map((p) => p.parameter_name)),
            ).size,
          ],
          ["Studies Near Endpoint", 1],
        ].map(([l, n]) => (
          <div className="card stat" key={l}>
            <div className="label">{l}</div>
            <div className="num">{n}</div>
          </div>
        ))}
      </div>
      <div className="grid two">
        <div className="card">
          <h2 className="section-title">Shelf life estimates by study</h2>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={estimates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis unit=" d" />
                <Tooltip />
                <Legend />
                <Bar dataKey="proposed" name="Proposed" fill="#91a4b8" />
                <Bar
                  dataKey="planning"
                  name="Conservative planning estimate"
                  fill="#7356b6"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2 className="section-title">Studies by status</h2>
          <div className="chart">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  label
                >
                  {byStatus.map((_, i) => (
                    <Cell
                      key={i}
                      fill={["#15977c", "#d99916", "#7356b6"][i % 3]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 className="section-title">Study sampling completion</h2>
          {all.map((s) => (
            <div key={s.study_id} style={{ margin: "15px 0" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <b>{s.study_name}</b>
                <span>
                  {calculateCompletionRate(s.sampling_points).toFixed(0)}%
                </span>
              </div>
              <div className="progress">
                <span
                  style={{
                    width: `${calculateCompletionRate(s.sampling_points)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="section-title">Recent study activity</h2>
          {all.map((s) => (
            <div
              key={s.study_id}
              style={{
                display: "flex",
                gap: 12,
                padding: "11px 0",
                borderBottom: "1px solid #edf1f5",
              }}
            >
              <Beaker size={17} color="#15977c" />
              <div>
                <b style={{ fontSize: 13 }}>{s.study_name}</b>
                <div className="sub">
                  {s.results.length} observations · updated{" "}
                  {s.updated_at.slice(0, 10)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function Studies() {
  const studies = useShelfLifeStore((s) => s.studies),
    dup = useShelfLifeStore((s) => s.duplicateStudy),
    del = useShelfLifeStore((s) => s.deleteStudy),
    archive = useShelfLifeStore((s) => s.archiveStudy),
    reset = useShelfLifeStore((s) => s.resetDemo),
    importStudy = useShelfLifeStore((s) => s.importStudy),
    [q, setQ] = useState("");
  const navg = useNavigate();
  const uploadJson = async (file: File) => importStudy(await file.text());
  return (
    <>
      <Header
        eyebrow="Research portfolio"
        title="Shelf-life studies"
        sub="Create, compare, archive and exchange complete study records"
      >
        <div className="actions">
          <label className="btn">
            <Upload size={14} /> Import JSON
            <input
              hidden
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadJson(file);
                event.target.value = "";
              }}
            />
          </label>
          <button className="btn" onClick={reset}>
            <RefreshCcw size={14} /> Reset demo
          </button>
          <button className="btn primary" onClick={() => navg("/design")}>
            <Plus size={14} /> New study
          </button>
        </div>
      </Header>
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 10, top: 10 }}
            />
            <input
              className="search"
              style={{ paddingLeft: 34 }}
              placeholder="Search study, code or category"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Study</th>
                <th>Status</th>
                <th>Category</th>
                <th>Conditions</th>
                <th>Completion</th>
                <th>Proposed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {studies
                .filter((s) =>
                  `${s.study_name}${s.study_code}${s.product_category}`
                    .toLowerCase()
                    .includes(q.toLowerCase()),
                )
                .map((s) => (
                  <tr key={s.study_id}>
                    <td>
                      <b>{s.study_name}</b>
                      <div className="sub">
                        {s.study_code} · {s.initial_product_notes}
                      </div>
                    </td>
                    <td>
                      <Status s={s.archived ? "ARCHIVED" : s.study_status} />
                    </td>
                    <td>{s.product_category}</td>
                    <td>{s.storage_conditions.length}</td>
                    <td>
                      {calculateCompletionRate(s.sampling_points).toFixed(0)}%
                    </td>
                    <td>{s.proposed_shelf_life_days} days</td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn"
                          onClick={() => navg(`/studies/${s.study_id}`)}
                        >
                          Open <ChevronRight size={13} />
                        </button>
                        <button
                          className="btn"
                          title="Duplicate"
                          onClick={() => dup(s.study_id)}
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          className="btn"
                          title="Archive"
                          onClick={() => archive(s.study_id)}
                        >
                          <Archive size={13} />
                        </button>
                        <button
                          className="btn danger"
                          title="Delete"
                          onClick={() =>
                            confirm("Delete this local study?") &&
                            del(s.study_id)
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
function StudyDesign() {
  const add = useShelfLifeStore((s) => s.addStudy),
    studies = useShelfLifeStore((s) => s.studies),
    nav = useNavigate(),
    [form, setForm] = useState({
      name: "",
      code: "",
      category: "Dairy",
      start: new Date().toISOString().slice(0, 10),
      days: "0, 3, 7, 10, 14, 21, 28",
      temperature: "4",
      proposed: "21",
    });
  const create = () => {
    const temperature = form.temperature.trim() === "" ? NaN : Number(form.temperature);
    const proposed = form.proposed.trim() === "" ? NaN : Number(form.proposed);
    const dayTokens = form.days.split(",").map((token) => token.trim());
    const parsedDays = dayTokens.map(Number);
    const invalidDay = dayTokens.some(
      (token, index) =>
        token === "" ||
        !Number.isFinite(parsedDays[index]) ||
        !Number.isInteger(parsedDays[index]) ||
        parsedDays[index] < 0,
    );
    const days = [...new Set(parsedDays)].sort((a, b) => a - b);
    const startDate = new Date(`${form.start}T00:00:00Z`);
    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(form.start) &&
      !Number.isNaN(startDate.valueOf()) &&
      startDate.toISOString().slice(0, 10) === form.start;
    if (!form.name.trim() || !form.code.trim())
      return alert("Study name and code are required.");
    if (
      !validDate ||
      !Number.isFinite(temperature) ||
      temperature <= -273.15 ||
      !Number.isFinite(proposed) ||
      proposed < 0 ||
      !days.length ||
      invalidDay
    )
      return alert("Enter a valid date, temperature, shelf life, and non-negative whole sampling days.");
    if (
      studies.some(
        (study) => study.study_code.toLowerCase() === form.code.trim().toLowerCase(),
      )
    )
      return alert("Study code must be unique.");
    const id = crypto.randomUUID(),
      condition = {
        condition_id: `c-${id}`,
        condition_name: `${temperature}°C Primary`,
        temperature_c: temperature,
        light_condition: "DARK",
        accelerated_or_real_time: "REAL_TIME",
        primary: true,
      };
    add({
         study_id: id,
         shelf_life_study_id: createFoodLabId("SL"),
         workspace_id: getOrCreateWorkspaceId(),
         study_name: form.name.trim(),
        study_code: form.code.trim(),
        product_name: form.name.trim(),
        product_category: form.category,
        study_start_date: form.start,
        proposed_shelf_life_days: proposed,
        study_status: "PLANNING",
        storage_conditions: [condition],
        sampling_points: generateSamplingSchedule(
          condition.condition_id,
          form.start,
          days,
        ),
        parameters: [],
        results: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });
    nav(`/studies/${id}`);
  };
  return (
    <>
      <Header
        eyebrow="Study design"
        title="Create a study"
        sub="Define the product, primary storage condition and initial sampling schedule"
      />
      <div className="notice" style={{ marginTop: 20 }}>
        Sampling templates are planning aids only and are not scientifically
        suitable for every product. A qualified reviewer should approve the
        final design.
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="form-grid">
          {[
            ["Study name", "name"],
            ["Study code", "code"],
            ["Start date", "start"],
            ["Proposed shelf life (days)", "proposed"],
            ["Primary temperature (°C)", "temperature"],
            ["Sampling days (comma separated)", "days"],
          ].map(([l, k]) => (
            <div className="field" key={k}>
              <label>{l}</label>
              <input
                type={k === "start" ? "date" : "text"}
                value={form[k as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </div>
          ))}
          <div className="field">
            <label>Product category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {[
                "Dairy",
                "Beverage",
                "Bakery",
                "Snack",
                "Protein Product",
                "Plant-Based",
                "Meat Product",
                "Seafood",
                "Sauce",
                "Confectionery",
                "Ready Meal",
                "Other",
              ].map((x) => (
                <option>{x}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          className="btn primary"
          style={{ marginTop: 18 }}
          onClick={create}
        >
          Create research study
        </button>
      </div>
    </>
  );
}
function StudyDetails() {
  const { id } = useParams(),
    s = useShelfLifeStore((x) => x.studies.find((y) => y.study_id === id)),
    update = useShelfLifeStore((x) => x.updateStudy),
    [tab, setTab] = useState("Overview"),
    navg = useNavigate();
  if (!s) return <div className="empty">Study not found.</div>;
  const tabs = [
    "Overview",
    "Product",
    "Storage Conditions",
    "Sampling Plan",
    "Parameters",
    "Results",
    "Trend Analysis",
    "Shelf Life Estimate",
    "Report",
  ];
  const estimate = calculateStudyPlanningEstimate(s);
  return (
    <>
      <Header
        eyebrow={s.study_code}
        title={s.study_name}
        sub={`${s.product_category} · Demo study data only.`}
      >
        <div className="actions">
          <button
            className="btn primary"
            onClick={() => navg(`/transfers?study=${encodeURIComponent(s.study_id)}`)}
          >
            <ArrowLeftRight size={14} /> Send approved product to QA
          </button>
          <button className="btn" onClick={() => exportStudyJson(s)}>
            <Download size={14} /> JSON
          </button>
          <select
            value={s.study_status}
            onChange={(e) =>
              update(s.study_id, {
                study_status: e.target.value as StudyStatus,
              })
            }
          >
            {["PLANNING", "ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"].map(
              (x) => (
                <option>{x}</option>
              ),
            )}
          </select>
        </div>
      </Header>
      <div className="tabs">
        {tabs.map((t) => (
          <button
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <div className="grid three">
          <InfoCard
            label="Project progress"
            value={`${calculateCompletionRate(s.sampling_points).toFixed(0)}% sampling complete`}
          />
          <InfoCard
            label="Proposed shelf life"
            value={`${s.proposed_shelf_life_days ?? "—"} days`}
          />
          <InfoCard
            label="Current planning estimate"
            value={
              estimate?.conservativeDay != null
                ? `${Math.round(estimate.conservativeDay)} days · planning estimate`
                : "Insufficient data"
            }
          />
          <div className="card" style={{ gridColumn: "1/-1" }}>
            <h2 className="section-title">Study objective</h2>
            <p>{s.study_objective || "Not yet documented."}</p>
            <div className="notice">
              No output proves product safety. Safety endpoints and quality
              endpoints must be interpreted separately.
            </div>
          </div>
        </div>
      )}
      {tab === "Product" && (
        <div className="grid two">
          <InfoCard
            label="Product description"
            value={s.product_description || "Not recorded"}
          />
          <InfoCard
            label="Packaging"
            value={s.packaging_type || "Not recorded"}
          />
          <InfoCard label="Batch" value={s.batch_number || "Not recorded"} />
          <InfoCard
            label="Processing"
            value={s.processing_method || "Not recorded"}
          />
        </div>
      )}
      {tab === "Storage Conditions" && (
        <SimpleTable
          heads={["Condition", "Temperature", "Mode", "Packaging", "Primary"]}
          rows={s.storage_conditions.map((c) => [
            c.condition_name,
            `${c.temperature_c} ± ${c.temperature_tolerance_c ?? "—"} °C`,
            c.accelerated_or_real_time,
            c.packaging_variant || "—",
            c.primary ? "Yes" : "No",
          ])}
        />
      )}{" "}
      {tab === "Sampling Plan" && (
        <SimpleTable
          heads={[
            "Condition",
            "Day",
            "Planned date",
            "Actual date",
            "Status",
            "Replicates",
          ]}
          rows={s.sampling_points.map((p) => [
            s.storage_conditions.find((c) => c.condition_id === p.condition_id)
              ?.condition_name ?? "",
            p.planned_day,
            p.planned_date,
            p.actual_date || "—",
            <Status s={p.sample_status} />,
            p.replicate_count,
          ])}
        />
      )}{" "}
      {tab === "Parameters" && (
        <SimpleTable
          heads={["Parameter", "Category", "Unit", "Lower", "Upper", "Method"]}
          rows={s.parameters.map((p) => [
            p.parameter_name,
            p.category,
            p.unit,
            p.lower_limit ?? "—",
            p.upper_limit ?? "—",
            p.test_method || "—",
          ])}
        />
      )}{" "}
      {tab === "Results" && <ResultsTable studies={[s]} />}{" "}
      {tab === "Trend Analysis" && <TrendPanel study={s} />}{" "}
      {tab === "Shelf Life Estimate" && (
        <div className="grid three">
          <InfoCard
            label="Observed shelf life"
            value={
              estimate?.firstUnacceptableDay != null
                ? `${estimate.lastAcceptableDay ?? "No acceptable point"} days before observed failure`
                : "No observed failure endpoint"
            }
          />
          <InfoCard
            label="Model estimate"
            value={
              estimate?.predictedCrossingDay != null
                ? `${estimate.predictedCrossingDay.toFixed(1)} days`
                : "Insufficient data"
            }
          />
          <InfoCard
            label="Conservative planning estimate"
            value={
              estimate?.conservativeDay != null
                ? `${estimate.conservativeDay.toFixed(1)} days${estimate.firstUnacceptableDay == null ? " (0.8 factor)" : " (observed endpoint)"}`
                : "Not available"
            }
          />
          <div className="notice" style={{ gridColumn: "1/-1" }}>
            The estimate is uncertain and depends on user-defined limits, study
            design and model assumptions. Further observations and qualified
            review are required.
          </div>
        </div>
      )}{" "}
      {tab === "Report" && <ReportView s={s} />}
    </>
  );
}
const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="card stat">
    <div className="label">{label}</div>
    <div style={{ fontSize: 17, fontWeight: 750, marginTop: 9 }}>{value}</div>
  </div>
);
function SimpleTable({
  heads,
  rows,
}: {
  heads: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="card table-wrap">
      {rows.length ? (
        <table className="table">
          <thead>
            <tr>
              {heads.map((h) => (
                <th>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((x, j) => (
                  <td className={typeof x === "number" ? "num" : ""}>{x}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">No data available yet.</div>
      )}
    </div>
  );
}
function Results() {
  const studies = useShelfLifeStore((s) => s.studies),
    add = useShelfLifeStore((s) => s.addResults),
    [issue, setIssue] = useState("");
  const upload = (file: File) =>
    file.text().then((t) => {
      const r = importResultsCsv(t, studies);
      add(r.results);
      setIssue(
        `${r.results.length} rows imported. ${r.issues.length} rows rejected.${r.issues[0] ? ` First issue: row ${r.issues[0].row} — ${r.issues[0].message}` : ""}`,
      );
    });
  return (
    <>
      <Header
        eyebrow="Laboratory observations"
        title="Results data explorer"
        sub="Search, review and export measured observations without altering source values"
      >
        <label className="btn primary">
          <Upload size={14} /> Import CSV
          <input
            hidden
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
      </Header>
      {issue && (
        <div className="notice" style={{ marginTop: 16 }}>
          {issue}
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <ResultsTable studies={studies} />
      </div>
    </>
  );
}
function ResultsTable({ studies }: { studies: ShelfLifeStudy[] }) {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(0);
  const rows = studies
    .flatMap((s) =>
      s.results.map((r) => ({
        s,
        r,
        c: s.storage_conditions.find((x) => x.condition_id === r.condition_id),
        p: s.parameters.find((x) => x.parameter_id === r.parameter_id),
        sp: s.sampling_points.find(
          (x) => x.sampling_point_id === r.sampling_point_id,
        ),
      })),
    )
    .filter((x) =>
      `${x.s.study_name}${x.c?.condition_name}${x.p?.parameter_name}${x.r.status}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  const shown = rows.slice(page * 20, page * 20 + 20);
  return (
    <div className="card">
      <div className="actions" style={{ marginBottom: 14 }}>
        <input
          className="search"
          style={{ maxWidth: 420 }}
          placeholder="Filter study, condition, parameter or status"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
        <button
          className="btn"
          disabled={rows.length === 0}
          onClick={() =>
            download(
              "filtered-results.csv",
              resultRowsToCsv(
                rows.map(({ s, r }) => ({ study: s, result: r })),
              ),
              "text/csv",
            )
          }
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {[
                "Study",
                "Condition",
                "Day",
                "Parameter",
                "Replicate",
                "Result",
                "Unit",
                "Qualifier",
                "Status",
                "Comments",
              ].map((h) => (
                <th>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(({ s, r, c, p, sp }) => (
              <tr key={r.result_id}>
                <td>{s.study_code}</td>
                <td>{c?.condition_name}</td>
                <td className="num">{sp?.planned_day}</td>
                <td>{p?.parameter_name}</td>
                <td className="num">{r.replicate_number}</td>
                <td className="num">
                  <b>{r.measured_value ?? r.text_value ?? "Missing"}</b>
                  {r.outlier && (
                    <span className="badge warn" style={{ marginLeft: 5 }}>
                      POTENTIAL OUTLIER
                    </span>
                  )}
                </td>
                <td>{p?.unit}</td>
                <td>{r.qualifier}</td>
                <td>
                  <Status s={r.status ?? "INCOMPLETE"} />
                </td>
                <td>{r.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="actions"
        style={{ marginTop: 12, justifyContent: "flex-end" }}
      >
        <button
          className="btn"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span className="sub">
          Page {page + 1} of {Math.max(1, Math.ceil(rows.length / 20))}
        </span>
        <button
          className="btn"
          disabled={(page + 1) * 20 >= rows.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
function trendData(s: ShelfLifeStudy, cid: string, pid: string) {
  return s.sampling_points
    .filter((x) => x.condition_id === cid)
    .map((sp) => {
      const v = s.results
        .filter(
          (r) =>
            r.sampling_point_id === sp.sampling_point_id &&
            r.parameter_id === pid &&
            r.measured_value != null,
        )
        .map((r) => r.measured_value!);
      return {
        day: sp.planned_day,
        mean: calculateMean(v),
        sd: calculateStandardDeviation(v),
      };
    })
    .filter((x) => Number.isFinite(x.mean));
}
function TrendPanel({ study }: { study: ShelfLifeStudy }) {
  const [cid, setC] = useState(study.storage_conditions[0]?.condition_id),
    [pid, setP] = useState(study.parameters[0]?.parameter_id),
    p = study.parameters.find((x) => x.parameter_id === pid),
    data = trendData(study, cid, pid);
  return (
    <div className="card">
      <div className="actions">
        <select value={cid} onChange={(e) => setC(e.target.value)}>
          {study.storage_conditions.map((c) => (
            <option value={c.condition_id}>{c.condition_name}</option>
          ))}
        </select>
        <select value={pid} onChange={(e) => setP(e.target.value)}>
          {study.parameters.map((p) => (
            <option value={p.parameter_id}>{p.parameter_name}</option>
          ))}
        </select>
      </div>
      <div className="chart" style={{ marginTop: 16 }}>
        {data.length ? (
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" unit=" d" />
              <YAxis unit={` ${p?.unit ?? ""}`} />
              <Tooltip />
              <Legend />
              <Line
                dataKey="mean"
                name="Observed mean"
                stroke="#135a91"
                strokeWidth={2}
              />
              {p?.upper_limit != null && (
                <ReferenceLine
                  y={p.upper_limit}
                  stroke="#c33232"
                  label="Upper limit"
                />
              )}
              {p?.lower_limit != null && (
                <ReferenceLine
                  y={p.lower_limit}
                  stroke="#c33232"
                  label="Lower limit"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty">
            Insufficient data for this selection. No prediction generated.
          </div>
        )}
      </div>
    </div>
  );
}
function Analysis() {
  const studies = useShelfLifeStore((s) => s.studies),
    [sid, setS] = useState(studies[0]?.study_id),
    s = studies.find((x) => x.study_id === sid)!;
  return (
    <>
      <Header
        eyebrow="Transparent analytics"
        title="Trend analysis"
        sub="Compare actual observations, user limits and model fit"
      />
      <div className="field" style={{ maxWidth: 420, margin: "20px 0" }}>
        <label>Study</label>
        <select value={sid} onChange={(e) => setS(e.target.value)}>
          {studies.map((x) => (
            <option value={x.study_id}>{x.study_name}</option>
          ))}
        </select>
      </div>
      {s && (
        <>
          <TrendPanel study={s} />
          <div className="grid two" style={{ marginTop: 16 }}>
            <InfoCard
              label="Packaging failures"
              value={`${s.results.filter((r) => s.parameters.find((p) => p.parameter_id === r.parameter_id)?.category === "Packaging" && r.status === "UNACCEPTABLE").length} observed failures`}
            />
            <InfoCard
              label="Potential outliers"
              value={`${s.results.filter((r) => r.outlier).length} flagged · none auto-deleted`}
            />
          </div>
        </>
      )}
    </>
  );
}
function Models() {
  const [q, setQ] = useState({
      t1: "4",
      t2: "14",
      r1: "1",
      r2: "2",
      target: "8",
    }),
    q10 = calculateQ10(+q.t1, +q.t2, +q.r1, +q.r2),
    targetRate =
      q10 == null
        ? null
        : estimateRateAtTemperature(+q.r1, +q.t1, +q.target, q10),
    arr = fitArrheniusModel([
      { temperatureC: 4, rate: 1 },
      { temperatureC: 14, rate: 2 },
      { temperatureC: 24, rate: 3.7 },
    ]);
  return (
    <>
      <Header
        eyebrow="Kinetic education"
        title="Accelerated shelf-life models"
        sub="Explore Q10 and Arrhenius assumptions with visible inputs and equations"
      />
      <div className="grid two" style={{ marginTop: 22 }}>
        <div className="card">
          <h2 className="section-title">Q10 rate model</h2>
          <div className="form-grid">
            {Object.entries(q).map(([k, v]) => (
              <div className="field">
                <label>
                  {
                    (
                      {
                        t1: "Reference temperature °C",
                        t2: "Elevated temperature °C",
                        r1: "Reference rate",
                        r2: "Elevated rate",
                        target: "Target temperature °C",
                      } as Record<string, string>
                    )[k]
                  }
                </label>
                <input
                  value={v}
                  onChange={(e) => setQ({ ...q, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 18 }}>
            {q10?.toFixed(3) ?? "Invalid input"}{" "}
            <small style={{ fontSize: 12, color: "#66758a" }}>Q10</small>
          </div>
          <p className="sub">
            Estimated target rate:{" "}
            {targetRate?.toFixed(3) ?? "—"}
          </p>
        </div>
        <div className="card">
          <h2 className="section-title">Arrhenius demonstration</h2>
          <p>
            <b>Activation energy:</b>{" "}
            {arr.activationEnergy
              ? (arr.activationEnergy / 1000).toFixed(2)
              : "—"}{" "}
            kJ/mol
          </p>
          <p>
            <b>Model R²:</b> {arr.rSquared?.toFixed(3) ?? "—"}
          </p>
          <p>
            <b>Transform:</b> °C + 273.15 = K; regress ln(k) against 1/T
          </p>
          <div className="notice">
            Real food reactions may not follow one Arrhenius mechanism across
            temperatures. At least three conditions are required; this
            educational calculation is not a validated expiry determination.
          </div>
        </div>
      </div>
    </>
  );
}
function ReportView({ s }: { s: ShelfLifeStudy }) {
  const text = `# Shelf Life Study Summary\n\n## Study Overview\n${s.study_name} (${s.study_code})\n\n## Product Description\n${s.product_description}\n\n## Storage Conditions\n${s.storage_conditions.map((c) => `- ${c.condition_name}: ${c.temperature_c} °C`).join("\n")}\n\n## Results Summary\n${s.results.length} observations are available. The available data suggest condition-dependent quality change. Further testing is required.\n\n## Conclusions\nThe current model estimates are planning outputs only. This parameter may be shelf-life limiting. The estimate should be confirmed using additional observations.\n\n## Disclaimer\n${DISCLAIMER}`;
  return (
    <div className="card">
      <div className="actions" style={{ marginBottom: 20 }}>
        <button className="btn" onClick={() => window.print()}>
          Print
        </button>
        <button
          className="btn"
          onClick={() => download(`${s.study_code}-report.md`, text)}
        >
          Export Markdown
        </button>
        <button className="btn" onClick={() => exportStudyJson(s)}>
          Export JSON
        </button>
        <button
          className="btn"
          onClick={() =>
            download(`${s.study_code}-results.csv`, resultsToCsv(s), "text/csv")
          }
        >
          Results CSV
        </button>
      </div>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}
function Reports() {
  const studies = useShelfLifeStore((s) => s.studies),
    [sid, setS] = useState(studies[0]?.study_id),
    s = studies.find((x) => x.study_id === sid);
  return (
    <>
      <Header
        eyebrow="Structured outputs"
        title="Study reports"
        sub="Generate cautious, review-ready summaries from the selected study"
      />
      <div className="field" style={{ maxWidth: 430, margin: "20px 0" }}>
        <label>Study</label>
        <select value={sid} onChange={(e) => setS(e.target.value)}>
          {studies.map((s) => (
            <option value={s.study_id}>{s.study_name}</option>
          ))}
        </select>
      </div>
      {s && <ReportView s={s} />}
    </>
  );
}
function About() {
  return (
    <>
      <Header
        eyebrow="Scientific context"
        title="About this platform"
        sub="An educational food stability workspace built for transparent reasoning"
      />
      <div className="grid two" style={{ marginTop: 22 }}>
        <div className="card">
          <h2 className="section-title">What it supports</h2>
          <p>
            Study design, storage conditions, sampling schedules, quality and
            safety observations, user-defined limits, trend models, microbial
            notation and structured reports.
          </p>
          <p>
            Safety endpoints and quality endpoints remain explicitly separate.
            No legal microbial limits are embedded.
          </p>
        </div>
        <div className="notice" id="limitations">
          <b>Important limitations</b>
          <br />
          {DISCLAIMER}
          <br />
          <br />
          The software cannot replace laboratory testing, challenge studies,
          regulatory review, method validation or qualified professional
          judgement. It cannot generate an official Use By or Best Before date.
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="section-title">Model transparency</h2>
        <p>
          Linear, log-linear, zero-order and first-order models require at least
          three observations. Weak fit (R² below 0.6) produces a warning. Q10
          and Arrhenius modules display their assumptions. Estimates include a
          planning safety factor and uncertainty language.
        </p>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="section-title">Developer</h2>
        <p>
          Tianyi Wang · Bachelor of Food Science · Lincoln University, New
          Zealand
        </p>
      </div>
    </>
  );
}
export default function App() {
  return <Layout />;
}
