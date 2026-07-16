import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileJson, Send, ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import type { ProductToSensoryEnvelope } from "../types/foodlabTransfer";
import {
  applyProductTransferIdentity,
  buildProductToSensoryTransfer,
  createFoodLabId,
  getOrCreateWorkspaceId,
  transferFilename,
} from "../utils/foodlabTransfer";
import { downloadText } from "../utils/fileIO";
import {
  loadTransferHistory,
  recordTransferHistory,
} from "../utils/transferHistory";

const testTypeSuggestions = [
  "9-point Hedonic",
  "Preference",
  "JAR",
  "Purchase Intent",
];
const defaultAttributes = [
  "Appearance",
  "Aroma",
  "Flavour",
  "Texture",
  "Overall Acceptability",
];

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function TransfersPage() {
  const projects = useProductDevelopmentStore((state) => state.projects);
  const ingredients = useProductDevelopmentStore((state) => state.ingredients);
  const selectedProjectId = useProductDevelopmentStore(
    (state) => state.selectedProjectId,
  );
  const updateProject = useProductDevelopmentStore(
    (state) => state.updateProject,
  );
  const initialProject =
    projects.find(
      (project) =>
        project.project_id === selectedProjectId &&
        project.formula_versions.length > 0,
    ) ?? projects.find((project) => project.formula_versions.length > 0);

  const [projectId, setProjectId] = useState(initialProject?.project_id ?? "");
  const [selectedFormulaIds, setSelectedFormulaIds] = useState<string[]>([]);
  const [sampleNames, setSampleNames] = useState<Record<string, string>>({});
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [projectObjective, setProjectObjective] = useState("");
  const [targetConsumer, setTargetConsumer] = useState("");
  const [allergenNotes, setAllergenNotes] = useState("");
  const [sensoryObjective, setSensoryObjective] = useState("");
  const [testTypes, setTestTypes] = useState<string[]>(testTypeSuggestions);
  const [attributes, setAttributes] = useState(defaultAttributes.join(", "));
  const [includeCostSummary, setIncludeCostSummary] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastTransfer, setLastTransfer] =
    useState<ProductToSensoryEnvelope | null>(null);
  const [history, setHistory] = useState(() => loadTransferHistory());

  const project = useMemo(
    () => projects.find((item) => item.project_id === projectId),
    [projectId, projects],
  );

  useEffect(() => {
    if (!project) return;
    const preferred =
      project.formula_versions.find((formula) => formula.status === "SHORTLISTED") ??
      project.formula_versions[0];
    setSelectedFormulaIds(preferred ? [preferred.formula_id] : []);
    setSampleNames(
      Object.fromEntries(
        project.formula_versions.map((formula) => [
          formula.formula_id,
          formula.version_name,
        ]),
      ),
    );
    setProductName(project.project_name);
    setProductCategory(project.product_category);
    setProjectObjective(project.project_objective ?? "");
    setTargetConsumer(
      project.target_consumer ?? project.product_brief.target_consumer ?? "",
    );
    setAllergenNotes("");
    setSensoryObjective(
      `Compare selected ${project.project_name} formula versions and identify the strongest candidate for shelf-life validation.`,
    );
    setTestTypes(testTypeSuggestions);
    setAttributes(defaultAttributes.join(", "));
    setIncludeCostSummary(false);
    setError("");
    setSuccess("");
    setLastTransfer(null);
  }, [project?.project_id]);

  const toggleFormula = (formulaId: string, checked: boolean) => {
    if (checked && selectedFormulaIds.length >= 4) {
      setError("A transfer can include a maximum of four formula versions.");
      return;
    }
    setSelectedFormulaIds((current) =>
      checked
        ? [...new Set([...current, formulaId])]
        : current.filter((id) => id !== formulaId),
    );
    setError("");
  };

  const toggleTestType = (testType: string) =>
    setTestTypes((current) =>
      current.includes(testType)
        ? current.filter((item) => item !== testType)
        : [...current, testType],
    );

  const exportTransfer = () => {
    if (!project) return;
    const attemptedTransferId = createFoodLabId("TX");
    const attemptedFilename = transferFilename(
      productName || project.project_name,
      attemptedTransferId,
    );
    try {
      const { envelope, identity } = buildProductToSensoryTransfer({
        project,
        ingredients,
        selectedFormulaIds,
        sampleNames,
        productName,
        productCategory,
        projectObjective,
        targetConsumer,
        additionalAllergens: splitList(allergenNotes),
        testTypes,
        attributes: splitList(attributes),
        sensoryNotes: sensoryObjective,
        includeCostSummary,
        workspaceId: getOrCreateWorkspaceId(),
        metadataNotes:
          "Explicit user-controlled export from Food Product Development AI.",
        idFactory: (prefix) =>
          prefix === "TX" ? attemptedTransferId : createFoodLabId(prefix),
      });
      const filename = transferFilename(productName, envelope.transfer_id);

      updateProject(
        project.project_id,
        applyProductTransferIdentity(project, identity),
      );
      downloadText(
        filename,
        JSON.stringify(envelope, null, 2),
        "application/json",
      );
      setHistory(
        recordTransferHistory({
          transfer_id: envelope.transfer_id,
          transfer_type: envelope.transfer_type,
          imported_or_exported: "EXPORTED",
          timestamp: envelope.exported_at,
          linked_record_id: envelope.source_record_id,
          filename,
          status: "SUCCESS",
          warning_count: 0,
        }),
      );
      setLastTransfer(envelope);
      setSuccess(
        `Transfer ${envelope.transfer_id} downloaded. Import this JSON file explicitly in Food Sensory AI.`,
      );
      setError("");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Transfer export failed.";
      setHistory(
        recordTransferHistory({
          transfer_id: attemptedTransferId,
          transfer_type: "PRODUCT_TO_SENSORY",
          imported_or_exported: "EXPORTED",
          timestamp: new Date().toISOString(),
          linked_record_id: project.product_project_id ?? project.project_id,
          filename: attemptedFilename,
          status: "FAILED",
          warning_count: 1,
        }),
      );
      setError(message);
      setSuccess("");
    }
  };

  return (
    <>
      <PageHeader
        title="Send to Sensory"
        subtitle="Create an explicit, versioned Product Development → Sensory JSON transfer. Nothing is sent automatically."
      />

      <div className="notice mb-5 flex items-start gap-3">
        <ShieldCheck className="mt-0.5 shrink-0" size={18} />
        <div>
          <strong>User-controlled local transfer.</strong> The file contains only
          the formula references and summary fields shown below. Supplier names,
          supplier codes and line-level prices are never included. Aggregate cost
          is optional and off by default.
        </div>
      </div>

      {!project ? (
        <section className="card text-sm text-slate-600">
          Create a project with at least one formula version before exporting to
          Sensory.
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="card">
              <h3 className="font-semibold text-navy">1. Product project</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="label">Product development project</span>
                  <select
                    className="field"
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                  >
                    {projects
                      .filter((item) => item.formula_versions.length > 0)
                      .map((item) => (
                        <option value={item.project_id} key={item.project_id}>
                          {item.project_name} ({item.project_code})
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span className="label">Product name</span>
                  <input
                    className="field"
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                  />
                </label>
                <label>
                  <span className="label">Product category</span>
                  <input
                    className="field"
                    value={productCategory}
                    onChange={(event) => setProductCategory(event.target.value)}
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="label">Project objective</span>
                  <textarea
                    className="field"
                    rows={2}
                    value={projectObjective}
                    onChange={(event) => setProjectObjective(event.target.value)}
                  />
                </label>
                <label>
                  <span className="label">Target consumer</span>
                  <input
                    className="field"
                    value={targetConsumer}
                    onChange={(event) => setTargetConsumer(event.target.value)}
                  />
                </label>
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <p>
                    Product project ID: {project.product_project_id ?? "Assigned on first export"}
                  </p>
                  <p className="mt-1">
                    Product ID: {project.product_id ?? "Assigned on first export"}
                  </p>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy">
                    2. Formula versions and sample names
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Select one to four formulas ({selectedFormulaIds.length}/4).
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {project.formula_versions.map((formula) => {
                  const checked = selectedFormulaIds.includes(formula.formula_id);
                  return (
                    <div
                      className={`rounded-xl border p-4 ${checked ? "border-teal bg-teal/5" : "border-slate-200"}`}
                      key={formula.formula_id}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          className="mt-1 h-4 w-4 accent-teal"
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && selectedFormulaIds.length >= 4}
                          onChange={(event) =>
                            toggleFormula(formula.formula_id, event.target.checked)
                          }
                        />
                        <span>
                          <span className="font-medium text-slate-800">
                            {formula.version_name}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            {formula.status} · legacy {formula.formula_id}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            Formula version ID: {formula.formula_version_id ?? "Assigned on export"}
                          </span>
                        </span>
                      </label>
                      {checked && (
                        <label className="mt-3 block pl-7">
                          <span className="label">Sensory sample name</span>
                          <input
                            className="field"
                            value={sampleNames[formula.formula_id] ?? ""}
                            onChange={(event) =>
                              setSampleNames((current) => ({
                                ...current,
                                [formula.formula_id]: event.target.value,
                              }))
                            }
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <label className="mt-4 block">
                <span className="label">Additional allergen notes (comma-separated)</span>
                <input
                  className="field"
                  placeholder="e.g. Milk, Soy"
                  value={allergenNotes}
                  onChange={(event) => setAllergenNotes(event.target.value)}
                />
                {project.allergen_notes && (
                  <span className="mt-1 block text-xs text-slate-500">
                    Project note for review: {project.allergen_notes}
                  </span>
                )}
              </label>
            </section>

            <section className="card">
              <h3 className="font-semibold text-navy">3. Suggested sensory design</h3>
              <label className="mt-4 block">
                <span className="label">Suggested sensory objective</span>
                <textarea
                  className="field"
                  rows={3}
                  value={sensoryObjective}
                  onChange={(event) => setSensoryObjective(event.target.value)}
                />
              </label>
              <div className="mt-4">
                <span className="label">Optional test types</span>
                <div className="flex flex-wrap gap-2">
                  {testTypeSuggestions.map((testType) => (
                    <label
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${testTypes.includes(testType) ? "border-teal bg-teal/10 text-teal" : "border-slate-200"}`}
                      key={testType}
                    >
                      <input
                        className="sr-only"
                        type="checkbox"
                        checked={testTypes.includes(testType)}
                        onChange={() => toggleTestType(testType)}
                      />
                      {testType}
                    </label>
                  ))}
                </div>
              </div>
              <label className="mt-4 block">
                <span className="label">Suggested attributes (comma-separated)</span>
                <input
                  className="field"
                  value={attributes}
                  onChange={(event) => setAttributes(event.target.value)}
                />
              </label>
              <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  className="mt-1 h-4 w-4 accent-teal"
                  type="checkbox"
                  checked={includeCostSummary}
                  onChange={(event) => setIncludeCostSummary(event.target.checked)}
                />
                <span>
                  <span className="font-medium text-slate-800">Include cost summary</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Off by default. Includes aggregate estimated cost per kg only;
                    no supplier or line-level cost data.
                  </span>
                </span>
              </label>
            </section>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 shrink-0" size={17} /> {success}
              </p>
            )}
            <button className="btn-primary" onClick={exportTransfer}>
              <Download size={17} /> Export JSON for Sensory
            </button>

            {lastTransfer && (
              <details className="card">
                <summary className="cursor-pointer font-semibold text-navy">
                  Preview last exported envelope
                </summary>
                <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                  {JSON.stringify(lastTransfer, null, 2)}
                </pre>
              </details>
            )}
          </div>

          <aside className="space-y-5">
            <section className="card border-l-4 border-l-teal">
              <div className="flex items-center gap-2 text-teal">
                <Send size={18} />
                <h3 className="font-semibold">Workflow hand-off</h3>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-slate-600">
                <li>1. Review every selected field.</li>
                <li>2. Download the local JSON transfer.</li>
                <li>3. Open Food Sensory AI.</li>
                <li>4. Import and preview before creating a project.</li>
              </ol>
              <p className="mt-4 text-xs text-slate-500">
                No database, background sync or silent transmission is used.
              </p>
            </section>

            <section className="card">
              <div className="flex items-center gap-2">
                <FileJson className="text-teal" size={18} />
                <h3 className="font-semibold text-navy">Transfer History</h3>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Local metadata only; full transfer payloads are not stored here.
              </p>
              {history.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No transfers recorded.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {history.map((entry) => (
                    <article
                      className="rounded-lg border border-slate-200 p-3"
                      key={`${entry.transfer_id}-${entry.timestamp}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-slate-700">
                          {entry.transfer_id}
                        </span>
                        <span
                          className={`badge ${entry.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <p className="mt-2 break-all text-xs text-slate-500">
                        {entry.filename}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(entry.timestamp).toLocaleString()} · {entry.imported_or_exported.toLowerCase()}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
