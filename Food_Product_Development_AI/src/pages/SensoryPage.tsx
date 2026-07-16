import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState, fmt, PageHeader } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import {
  calculateAttributeSummary,
  calculateCommentKeywordFrequency,
} from "../utils/sensoryAnalysis";
import { parseSensoryCsv } from "../utils/fileIO";
import type { SensoryResponse } from "../types/productDevelopment";
const attrs = [
  "appearance",
  "aroma",
  "flavour",
  "sweetness",
  "texture",
  "aftertaste",
  "overall_liking",
] as const;
const emptyResponse = (formulaVersion = ""): SensoryResponse => ({
  panelist_id: "",
  formula_version: formulaVersion,
  appearance: null,
  aroma: null,
  flavour: null,
  sweetness: null,
  texture: null,
  aftertaste: null,
  overall_liking: null,
  comments: "",
});
export default function SensoryPage() {
  const store = useProductDevelopmentStore(),
    project =
      store.projects.find((p) => p.project_id === store.selectedProjectId) ??
      store.projects[0],
    [testId, setTestId] = useState(""),
    [error, setError] = useState(""),
    [showCreate, setShowCreate] = useState(false),
    [showResponse, setShowResponse] = useState(false),
    [newTestName, setNewTestName] = useState(""),
    [newFormulaId, setNewFormulaId] = useState(""),
    [response, setResponse] = useState<SensoryResponse>(emptyResponse());
  if (!project)
    return (
      <EmptyState
        title="No projects"
        body="Create a project before sensory evaluation."
      />
    );
  const tests = project.sensory_tests,
    test = tests.find((t) => t.test_id === testId) || tests[0],
    radar = test
      ? attrs.map((k) => ({
          attribute: k.replace("_", " "),
          score:
            calculateAttributeSummary(test.responses.map((r) => r[k])).mean ??
            0,
        }))
      : [],
    keywords = calculateCommentKeywordFrequency(
      test?.responses.map((r) => r.comments ?? "") ?? [],
    ),
    duplicates = test
      ? test.responses
          .filter(
            (r, i, a) =>
              a.findIndex((x) => x.panelist_id === r.panelist_id) !== i,
          )
          .map((r) => r.panelist_id)
      : [];
  const importCsv = async (f?: File) => {
    if (!f || !project.formula_versions[0]) return;
    try {
      const responses = parseSensoryCsv(await f.text());
      const importedVersions = new Set(
        responses.map((item) => item.formula_version.trim()),
      );
      if (importedVersions.size !== 1)
        throw new Error(
          "Sensory CSV must contain exactly one formula_version.",
        );
      const importedVersion = [...importedVersions][0];
      const importedFormula = project.formula_versions.find(
        (formula) => formula.version_name === importedVersion,
      );
      if (!importedFormula)
        throw new Error(
          `Formula version "${importedVersion}" was not found in this project.`,
        );
      store.addSensoryTest(project.project_id, {
        test_id: crypto.randomUUID(),
        formula_id: importedFormula.formula_id,
        test_name: f.name.replace(/\.csv$/i, ""),
        test_date: new Date().toISOString().slice(0, 10),
        panel_type: "Demonstration",
        number_of_panellists: responses.length,
        test_method: "9-point hedonic scale CSV import",
        responses,
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  };
  const createTest = () => {
    const formula = project.formula_versions.find(
      (f) => f.formula_id === newFormulaId,
    );
    if (!newTestName.trim() || !formula) {
      setError("Test name and formula version are required.");
      return;
    }
    const id = crypto.randomUUID();
    store.addSensoryTest(project.project_id, {
      test_id: id,
      formula_id: formula.formula_id,
      test_name: newTestName.trim(),
      test_date: new Date().toISOString().slice(0, 10),
      panel_type: "Internal",
      number_of_panellists: 0,
      test_method: "9-point hedonic scale",
      responses: [],
    });
    setTestId(id);
    setNewTestName("");
    setShowCreate(false);
    setError("");
  };
  const addResponse = () => {
    if (!test) return;
    if (!response.panelist_id.trim()) {
      setError("Panelist ID is required.");
      return;
    }
    const invalid = attrs.some((key) => {
      const value = response[key];
      return (
        value != null && (!Number.isFinite(value) || value < 1 || value > 9)
      );
    });
    if (invalid) {
      setError("All sensory scores must be between 1 and 9.");
      return;
    }
    const next = [...test.responses, response];
    store.updateSensoryTest(project.project_id, test.test_id, {
      responses: next,
      number_of_panellists: new Set(next.map((r) => r.panelist_id)).size,
    });
    setResponse(emptyResponse(response.formula_version));
    setShowResponse(false);
    setError("");
  };
  return (
    <>
      <PageHeader
        title="Sensory Evaluation"
        subtitle="9-point hedonic summaries, variation and comment keyword frequencies."
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() => {
                setNewFormulaId(project.formula_versions[0]?.formula_id ?? "");
                setShowCreate((value) => !value);
              }}
            >
              <Plus size={16} />
              New test
            </button>
            <label className="btn-primary cursor-pointer">
              <Upload size={16} />
              Import sensory CSV
              <input
                className="hidden"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => importCsv(e.target.files?.[0])}
              />
            </label>
          </>
        }
      />
      {showCreate && (
        <section className="card mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label>
            <span className="label">Test name</span>
            <input
              className="field"
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              placeholder="e.g. Bench trial preference"
            />
          </label>
          <label>
            <span className="label">Formula version</span>
            <select
              className="field"
              value={newFormulaId}
              onChange={(e) => setNewFormulaId(e.target.value)}
            >
              {project.formula_versions.map((formula) => (
                <option key={formula.formula_id} value={formula.formula_id}>
                  {formula.version_name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary self-end" onClick={createTest}>
            Create test
          </button>
        </section>
      )}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <select
          className="field"
          value={project.project_id}
          onChange={(e) => {
            const p = store.projects.find(
              (x) => x.project_id === e.target.value,
            );
            store.setSelection(
              e.target.value,
              p?.formula_versions[0]?.formula_id,
            );
            setTestId("");
          }}
        >
          {store.projects.map((p) => (
            <option value={p.project_id} key={p.project_id}>
              {p.project_name}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={test?.test_id ?? ""}
          onChange={(e) => setTestId(e.target.value)}
        >
          {tests.length ? (
            tests.map((t) => (
              <option value={t.test_id} key={t.test_id}>
                {t.test_name} · {t.test_date}
              </option>
            ))
          ) : (
            <option>No tests</option>
          )}
        </select>
      </div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {!test ? (
        <EmptyState
          title="No sensory tests"
          body="Import a sensory CSV containing panelist_id, formula_version and 1–9 scores."
        />
      ) : (
        <>
          <section className="card mb-5">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h3 className="font-semibold text-navy">{test.test_name}</h3>
                <p className="text-sm text-slate-500">
                  {test.panel_type} panel · {test.test_method} ·{" "}
                  {test.responses.length} responses
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Missing scores are excluded from each attribute summary.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 no-print">
              <button
                className="btn-primary"
                onClick={() => {
                  const formulaName =
                    project.formula_versions.find(
                      (f) => f.formula_id === test.formula_id,
                    )?.version_name ?? "";
                  setResponse(emptyResponse(formulaName));
                  setShowResponse((value) => !value);
                }}
              >
                <Plus size={16} />
                Add panelist response
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (confirm(`Delete sensory test ${test.test_name}?`)) {
                    store.deleteSensoryTest(project.project_id, test.test_id);
                    setTestId("");
                  }
                }}
              >
                <Trash2 size={16} />
                Delete test
              </button>
            </div>
            {duplicates.length > 0 && (
              <p className="mt-3 notice">
                Duplicate panelist_id warning: {duplicates.join(", ")}
              </p>
            )}
          </section>
          {showResponse && (
            <section className="card mb-5">
              <h3 className="font-semibold text-navy">
                Manual panelist response
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label>
                  <span className="label">Panelist ID</span>
                  <input
                    className="field"
                    value={response.panelist_id}
                    onChange={(e) =>
                      setResponse({ ...response, panelist_id: e.target.value })
                    }
                  />
                </label>
                {attrs.map((key) => (
                  <label key={key}>
                    <span className="label">{key.replace("_", " ")} (1–9)</span>
                    <input
                      className="field"
                      type="number"
                      min="1"
                      max="9"
                      value={response[key] ?? ""}
                      onChange={(e) =>
                        setResponse({
                          ...response,
                          [key]:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
                <label className="sm:col-span-2 lg:col-span-4">
                  <span className="label">Comments</span>
                  <textarea
                    className="field"
                    rows={2}
                    value={response.comments ?? ""}
                    onChange={(e) =>
                      setResponse({ ...response, comments: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="btn-primary" onClick={addResponse}>
                  Save response
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowResponse(false)}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="card">
              <h3 className="font-semibold text-navy">Attribute profile</h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <RadarChart data={radar}>
                    <PolarGrid />
                    <PolarAngleAxis
                      dataKey="attribute"
                      tick={{ fontSize: 11 }}
                    />
                    <Radar
                      dataKey="score"
                      fill="#0f766e"
                      fillOpacity={0.25}
                      stroke="#0f766e"
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="card">
              <h3 className="font-semibold text-navy">Attribute means</h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={radar}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="attribute" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 9]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#12345b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="card xl:col-span-2 table-wrap">
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
                  {attrs.map((k) => {
                    const s = calculateAttributeSummary(
                      test.responses.map((r) => r[k]),
                    );
                    return (
                      <tr key={k}>
                        <td className="capitalize">{k.replace("_", " ")}</td>
                        <td>{fmt(s.mean)}</td>
                        <td>{fmt(s.median)}</td>
                        <td>{fmt(s.standardDeviation)}</td>
                        <td>{fmt(s.min)}</td>
                        <td>{fmt(s.max)}</td>
                        <td>{s.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
            <section className="card xl:col-span-2">
              <h3 className="font-semibold text-navy">
                Comment keyword frequency
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(keywords).map(([k, v]) => (
                  <span className="badge bg-slate-100 text-slate-700" key={k}>
                    {k}: {v}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Simple keyword counting only; no AI sentiment analysis is used.
              </p>
            </section>
          </div>
        </>
      )}
      <p className="notice mt-5">
        Demonstration and educational use only. Sensory results require an
        appropriate study design and interpretation.
      </p>
    </>
  );
}
