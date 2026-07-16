import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Download,
  FileJson,
  History,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useShelfLifeStore } from "../store/shelfLifeStore";
import type { SensoryToShelfLifeTransfer } from "../types/foodlabTransfer";
import type { ShelfLifeStudy } from "../types/shelfLife";
import {
  buildShelfLifeToQaTransfer,
  createFoodLabId,
  createSensoryParameterDrafts,
  createShelfLifeStudyFromSensoryTransfer,
  getOrCreateWorkspaceId,
  QA_LIMIT_WARNING,
  transferFilename,
  validateSensoryToShelfLifeTransfer,
} from "../utils/foodlabTransfer";
import { download } from "../utils/exportData";
import { calculateStudyPlanningEstimate } from "../utils/studyEstimate";
import {
  readTransferHistory,
  recordTransferHistory,
} from "../utils/transferHistory";

const Header = ({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) => (
  <div>
    <div className="eyebrow">{eyebrow}</div>
    <h1 className="title">{title}</h1>
    <p className="sub">{sub}</p>
  </div>
);

interface PreviewState {
  transfer: SensoryToShelfLifeTransfer;
  filename: string;
  warnings: string[];
}

interface ImportParameterRow {
  parameter_name: string;
  unit: string;
  lower: string;
  upper: string;
  required: boolean;
  selected: boolean;
  confirmed_by_user: boolean;
}

interface ImportFormState {
  study_name: string;
  study_code: string;
  start_date: string;
  proposed: string;
  condition_name: string;
  temperature: string;
  light_condition: string;
  storage_mode: string;
  packaging_variant: string;
  sampling_days: string;
  storage_confirmed: boolean;
  parameters: ImportParameterRow[];
}

function uniqueStudyCode(studies: ShelfLifeStudy[], baseValue: string) {
  const base =
    baseValue
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "TRANSFER";
  let code = `SL-${base}`;
  let suffix = 2;
  while (studies.some((study) => study.study_code.toLowerCase() === code.toLowerCase()))
    code = `SL-${base}-${suffix++}`;
  return code;
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid numeric value: ${value}`);
  return number;
}

function SensoryImportPanel({ onHistory }: { onHistory: () => void }) {
  const studies = useShelfLifeStore((state) => state.studies);
  const addStudy = useShelfLifeStore((state) => state.addStudy);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [form, setForm] = useState<ImportFormState | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [createdStudyId, setCreatedStudyId] = useState<string | null>(null);

  const recordFailure = (filename: string, linkedRecordId = "not-created") => {
    recordTransferHistory({
      transfer_id: createFoodLabId("TX"),
      transfer_type: "SENSORY_TO_SHELF_LIFE",
      imported_or_exported: "IMPORTED",
      timestamp: new Date().toISOString(),
      linked_record_id: linkedRecordId,
      filename,
      status: "FAILED",
      warning_count: 1,
    });
    onHistory();
  };

  const inspectFile = async (file: File) => {
    setMessage(null);
    setCreatedStudyId(null);
    let raw = "";
    try {
      raw = await file.text();
    } catch {
      setPreview(null);
      setForm(null);
      setMessage({ type: "error", text: "The selected file could not be read." });
      recordFailure(file.name);
      return;
    }
    const validated = validateSensoryToShelfLifeTransfer(raw);
    if (!validated.ok) {
      setPreview(null);
      setForm(null);
      setMessage({ type: "error", text: validated.error });
      recordFailure(file.name);
      return;
    }
    const transfer = validated.value;
    const payload = transfer.payload;
    const productName = payload.product_name ?? payload.selected_sample.sample_name;
    const parameters = createSensoryParameterDrafts(payload).map((parameter) => ({
      parameter_name: parameter.parameter_name,
      unit: parameter.unit,
      lower: "",
      upper: "",
      required: parameter.required,
      selected: true,
      confirmed_by_user: false,
    }));
    setPreview({ transfer, filename: file.name, warnings: validated.warnings });
    setForm({
      study_name: `${productName} shelf-life study`,
      study_code: uniqueStudyCode(
        studies,
        `${payload.selected_sample.blind_code}-${payload.formula_version_id.slice(-6)}`,
      ),
      start_date: new Date().toISOString().slice(0, 10),
      proposed: "",
      condition_name: "",
      temperature: "",
      light_condition: "DARK",
      storage_mode: "REAL_TIME",
      packaging_variant: "",
      sampling_days: "0, 7, 14, 21, 28",
      storage_confirmed: false,
      parameters,
    });
    setMessage({
      type: "ok",
      text: "Validation passed. Review the preview, define storage conditions and limits, then explicitly create the study.",
    });
  };

  const updateParameter = (
    index: number,
    patch: Partial<ImportParameterRow>,
  ) => {
    if (!form) return;
    setForm({
      ...form,
      parameters: form.parameters.map((parameter, rowIndex) =>
        rowIndex === index ? { ...parameter, ...patch } : parameter,
      ),
    });
  };

  const createStudy = () => {
    if (!preview || !form) return;
    const transfer = preview.transfer;
    try {
      if (studies.some((study) => study.source_transfer_id === transfer.transfer_id))
        throw new Error("This transfer has already been imported; no existing study was changed.");
      if (
        studies.some(
          (study) => study.study_code.toLowerCase() === form.study_code.trim().toLowerCase(),
        )
      )
        throw new Error("Study code already exists. Enter a unique code; no study was overwritten.");
      if (!form.storage_confirmed)
        throw new Error("Confirm that you defined and reviewed the storage condition.");
      const tokens = form.sampling_days.split(",").map((token) => token.trim());
      const days = tokens.map(Number);
      if (tokens.some((token) => !token))
        throw new Error("Sampling days must be a comma-separated list of whole days.");
      const study = createShelfLifeStudyFromSensoryTransfer(transfer, {
        study_name: form.study_name,
        study_code: form.study_code,
        start_date: form.start_date,
        proposed_shelf_life_days: optionalNumber(form.proposed),
        storage_condition: {
          condition_name: form.condition_name,
          temperature_c: Number(form.temperature),
          light_condition: form.light_condition,
          accelerated_or_real_time: form.storage_mode,
          packaging_variant: form.packaging_variant,
        },
        sampling_days: days,
        parameters: form.parameters
          .filter((parameter) => parameter.selected)
          .map((parameter) => ({
            parameter_name: parameter.parameter_name,
            unit: parameter.unit,
            lower_limit: optionalNumber(parameter.lower),
            upper_limit: optionalNumber(parameter.upper),
            required: parameter.required,
            confirmed_by_user: parameter.confirmed_by_user,
          })),
      });
      addStudy(study);
      const warningCount =
        preview.warnings.length +
        transfer.payload.aggregated_sensory_summary.limitations.length;
      recordTransferHistory({
        transfer_id: transfer.transfer_id,
        transfer_type: "SENSORY_TO_SHELF_LIFE",
        imported_or_exported: "IMPORTED",
        timestamp: new Date().toISOString(),
        linked_record_id: study.shelf_life_study_id ?? study.study_id,
        filename: preview.filename,
        status: "SUCCESS",
        warning_count: warningCount,
      });
      onHistory();
      setCreatedStudyId(study.study_id);
      setMessage({
        type: "ok",
        text: `Study created without overwriting existing data. ${warningCount} source warning/limitation item(s) were retained.`,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Study creation failed.";
      setMessage({ type: "error", text });
      recordTransferHistory({
        transfer_id: transfer.transfer_id,
        transfer_type: "SENSORY_TO_SHELF_LIFE",
        imported_or_exported: "IMPORTED",
        timestamp: new Date().toISOString(),
        linked_record_id: transfer.source_record_id,
        filename: preview.filename,
        status: "FAILED",
        warning_count: 1,
      });
      onHistory();
    }
  };

  const summary = preview?.transfer.payload.aggregated_sensory_summary;
  return (
    <section className="card transfer-section">
      <div className="transfer-section-heading">
        <div>
          <div className="eyebrow">Incoming lifecycle step</div>
          <h2 className="section-title transfer-title">Import from Sensory</h2>
          <p className="sub">
            Validate and preview aggregated results before explicitly creating a new study.
          </p>
        </div>
        <label className="btn primary">
          <Upload size={14} /> Select Sensory JSON
          <input
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void inspectFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {message && (
        <div className={message.type === "error" ? "transfer-error" : "transfer-success"} role="status">
          {message.text}
          {createdStudyId && (
            <a href={`/studies/${encodeURIComponent(createdStudyId)}`}> Open created study</a>
          )}
        </div>
      )}

      {preview && form && summary && (
        <>
          <div className="grid three transfer-preview-grid">
            <div className="transfer-preview">
              <span>Product</span>
              <b>
                {preview.transfer.payload.product_name ??
                  preview.transfer.payload.selected_sample.sample_name}
              </b>
              <small>{preview.transfer.payload.product_category ?? "Other"}</small>
            </div>
            <div className="transfer-preview">
              <span>Selected formula</span>
              <b>{preview.transfer.payload.selected_sample.formula_version_name}</b>
              <small>
                Sample {preview.transfer.payload.selected_sample.sample_name} · blind code {preview.transfer.payload.selected_sample.blind_code}
              </small>
            </div>
            <div className="transfer-preview">
              <span>Aggregated sensory summary</span>
              <b>
                Overall liking {summary.overall_liking_mean ?? "not available"} · n={summary.response_count}
              </b>
              <small>
                Purchase intent top-two-box {summary.purchase_intent_top_two_box ?? "not available"}
              </small>
            </div>
          </div>

          <div className="notice privacy-note">
            <ShieldCheck size={16} />
            <div>
              <b>Privacy-safe transfer:</b> individual panelist records and demographic data are not included.
              {summary.limitations.length > 0 && (
                <div>Source limitations: {summary.limitations.join("; ")}</div>
              )}
            </div>
          </div>

          <div className="transfer-form-block">
            <h3>1. Review study identity</h3>
            <div className="form-grid">
              <div className="field">
                <label>Study name</label>
                <input value={form.study_name} onChange={(event) => setForm({ ...form, study_name: event.target.value })} />
              </div>
              <div className="field">
                <label>Unique study code</label>
                <input value={form.study_code} onChange={(event) => setForm({ ...form, study_code: event.target.value })} />
              </div>
              <div className="field">
                <label>Start date</label>
                <input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
              </div>
              <div className="field">
                <label>Planning shelf life (days, optional)</label>
                <input value={form.proposed} onChange={(event) => setForm({ ...form, proposed: event.target.value })} placeholder="No value generated automatically" />
              </div>
            </div>
          </div>

          <div className="transfer-form-block">
            <h3>2. Define storage and sampling</h3>
            <p className="sub">Storage conditions are intentionally blank and must be supplied by the user.</p>
            <div className="form-grid transfer-form-grid">
              <div className="field">
                <label>Condition name</label>
                <input value={form.condition_name} onChange={(event) => setForm({ ...form, condition_name: event.target.value })} placeholder="e.g. Chilled primary condition" />
              </div>
              <div className="field">
                <label>Temperature °C</label>
                <input value={form.temperature} onChange={(event) => setForm({ ...form, temperature: event.target.value })} placeholder="User-defined" />
              </div>
              <div className="field">
                <label>Light condition</label>
                <select value={form.light_condition} onChange={(event) => setForm({ ...form, light_condition: event.target.value })}>
                  <option value="DARK">Dark</option>
                  <option value="AMBIENT_LIGHT">Ambient light</option>
                  <option value="CONTROLLED_LIGHT">Controlled light</option>
                </select>
              </div>
              <div className="field">
                <label>Study mode</label>
                <select value={form.storage_mode} onChange={(event) => setForm({ ...form, storage_mode: event.target.value })}>
                  <option value="REAL_TIME">Real time</option>
                  <option value="ACCELERATED">Accelerated</option>
                </select>
              </div>
              <div className="field">
                <label>Packaging variant</label>
                <input value={form.packaging_variant} onChange={(event) => setForm({ ...form, packaging_variant: event.target.value })} />
              </div>
              <div className="field">
                <label>Sampling days</label>
                <input value={form.sampling_days} onChange={(event) => setForm({ ...form, sampling_days: event.target.value })} />
              </div>
            </div>
            <label className="confirmation-row">
              <input type="checkbox" checked={form.storage_confirmed} onChange={(event) => setForm({ ...form, storage_confirmed: event.target.checked })} />
              I defined and reviewed this storage condition; it was not supplied as a safety recommendation.
            </label>
          </div>

          <div className="transfer-form-block">
            <h3>3. Define monitoring limits</h3>
            <div className="notice">
              No official or regulatory safety limits are generated. Every selected parameter requires at least one user-entered limit and explicit confirmation.
            </div>
            <div className="table-wrap transfer-table-wrap">
              <table className="table transfer-table">
                <thead>
                  <tr>
                    <th>Use</th>
                    <th>Parameter</th>
                    <th>Unit</th>
                    <th>Lower limit</th>
                    <th>Upper limit</th>
                    <th>User confirmed</th>
                  </tr>
                </thead>
                <tbody>
                  {form.parameters.map((parameter, index) => (
                    <tr key={`${parameter.parameter_name}-${index}`}>
                      <td><input type="checkbox" checked={parameter.selected} onChange={(event) => updateParameter(index, { selected: event.target.checked })} /></td>
                      <td>
                        <b>{parameter.parameter_name}</b>
                        {!parameter.required && <span className="badge muted optional-badge">OPTIONAL</span>}
                      </td>
                      <td><input className="compact-input" value={parameter.unit} disabled={!parameter.selected} onChange={(event) => updateParameter(index, { unit: event.target.value })} /></td>
                      <td><input className="compact-input" value={parameter.lower} disabled={!parameter.selected} onChange={(event) => updateParameter(index, { lower: event.target.value, confirmed_by_user: false })} placeholder="User value" /></td>
                      <td><input className="compact-input" value={parameter.upper} disabled={!parameter.selected} onChange={(event) => updateParameter(index, { upper: event.target.value, confirmed_by_user: false })} placeholder="User value" /></td>
                      <td><input type="checkbox" checked={parameter.confirmed_by_user} disabled={!parameter.selected} onChange={(event) => updateParameter(index, { confirmed_by_user: event.target.checked })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button className="btn primary" onClick={createStudy}>
            Create new shelf-life study <ArrowRight size={14} />
          </button>
        </>
      )}
    </section>
  );
}

interface QaRow {
  parameter_id: string;
  parameter_name: string;
  unit: string;
  lower: string;
  upper: string;
  warning_rule: string;
  include: boolean;
  confirmed: boolean;
}

function QaExportPanel({ study, onHistory }: { study: ShelfLifeStudy; onHistory: () => void }) {
  const updateStudy = useShelfLifeStore((state) => state.updateStudy);
  const estimate = calculateStudyPlanningEstimate(study);
  const [identity, setIdentity] = useState({
    workspace_id: study.workspace_id ?? getOrCreateWorkspaceId(),
    product_project_id: study.product_project_id ?? "",
    product_id: study.product_id ?? "",
    formula_version_id: study.formula_version_id ?? "",
    shelf_life_study_id: study.shelf_life_study_id ?? createFoodLabId("SL"),
  });
  const [conditionId, setConditionId] = useState(
    study.storage_conditions.find((condition) => condition.primary)?.condition_id ??
      study.storage_conditions[0]?.condition_id ??
      "",
  );
  const [planningDays, setPlanningDays] = useState(
    estimate?.conservativeDay != null
      ? estimate.conservativeDay.toFixed(1)
      : study.proposed_shelf_life_days?.toString() ?? "",
  );
  const [packagingNotes, setPackagingNotes] = useState(study.packaging_type ?? "");
  const [limitations, setLimitations] = useState("");
  const [approved, setApproved] = useState(false);
  const [rows, setRows] = useState<QaRow[]>(
    study.parameters.map((parameter) => ({
      parameter_id: parameter.parameter_id,
      parameter_name: parameter.parameter_name,
      unit: parameter.unit,
      lower: parameter.lower_limit?.toString() ?? "",
      upper: parameter.upper_limit?.toString() ?? "",
      warning_rule: "",
      include: false,
      confirmed: false,
    })),
  );
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const updateRow = (index: number, patch: Partial<QaRow>) =>
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );

  const exportToQa = () => {
    const transferId = createFoodLabId("TX");
    try {
      if (!approved)
        throw new Error("Explicitly approve the product and user-confirmed limits before export.");
      const transfer = buildShelfLifeToQaTransfer(
        study,
        {
          ...identity,
          storage_condition_id: conditionId,
          planning_shelf_life_days: optionalNumber(planningDays),
          packaging_notes: packagingNotes,
          parameters: rows.map((row) => ({
            parameter_id: row.parameter_id,
            lower_limit: optionalNumber(row.lower),
            upper_limit: optionalNumber(row.upper),
            warning_rule: row.warning_rule,
            confirmed_by_user: row.include && row.confirmed,
          })),
          scientific_limitations: limitations.split("\n"),
        },
        { transfer_id: transferId },
      );
      const filename = transferFilename(transfer, study.study_code);
      download(filename, JSON.stringify(transfer, null, 2), "application/json");
      updateStudy(study.study_id, {
        workspace_id: identity.workspace_id,
        product_project_id: identity.product_project_id,
        product_id: identity.product_id,
        formula_version_id: identity.formula_version_id,
        shelf_life_study_id: identity.shelf_life_study_id,
      });
      const excluded = rows.filter((row) => row.include && !row.confirmed).length;
      recordTransferHistory({
        transfer_id: transfer.transfer_id,
        transfer_type: "SHELF_LIFE_TO_QA",
        imported_or_exported: "EXPORTED",
        timestamp: transfer.exported_at,
        linked_record_id: identity.shelf_life_study_id,
        filename,
        status: "SUCCESS",
        warning_count: transfer.payload.scientific_limitations.length + excluded,
      });
      onHistory();
      setMessage({
        type: "ok",
        text: `Transfer downloaded with ${transfer.payload.qa_parameters.length} explicitly confirmed parameter(s). ${excluded} selected but unconfirmed parameter(s) were excluded.`,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : "QA transfer export failed.";
      setMessage({ type: "error", text });
      recordTransferHistory({
        transfer_id: transferId,
        transfer_type: "SHELF_LIFE_TO_QA",
        imported_or_exported: "EXPORTED",
        timestamp: new Date().toISOString(),
        linked_record_id: identity.shelf_life_study_id || study.study_id,
        filename: `foodlab-shelf-life-to-qa-${study.study_code.replace(/[^A-Za-z0-9_-]+/g, "-")}.json`,
        status: "FAILED",
        warning_count: 1,
      });
      onHistory();
    }
  };

  return (
    <div className="transfer-form-block qa-export-panel">
      <div className="grid three transfer-preview-grid">
        <div className="transfer-preview"><span>Product</span><b>{study.product_name}</b><small>{study.product_category}</small></div>
        <div className="transfer-preview"><span>Formula version</span><b>{study.formula_version ?? "Not recorded"}</b><small>{study.study_code}</small></div>
        <div className="transfer-preview"><span>Planning estimate</span><b>{planningDays || "Not available"} days</b><small>Planning output only</small></div>
      </div>

      <h3>1. Confirm lifecycle identifiers</h3>
      <div className="form-grid">
        {Object.entries(identity).map(([key, value]) => (
          <div className="field" key={key}>
            <label>{key.replaceAll("_", " ")}</label>
            <input value={value} onChange={(event) => setIdentity({ ...identity, [key]: event.target.value })} />
          </div>
        ))}
      </div>

      <h3>2. Select condition and planning context</h3>
      <div className="form-grid">
        <div className="field">
          <label>Main storage condition</label>
          <select value={conditionId} onChange={(event) => setConditionId(event.target.value)}>
            {study.storage_conditions.map((condition) => (
              <option value={condition.condition_id} key={condition.condition_id}>{condition.condition_name} · {condition.temperature_c} °C</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Recommended planning shelf life (days)</label>
          <input value={planningDays} onChange={(event) => setPlanningDays(event.target.value)} />
        </div>
        <div className="field">
          <label>Packaging notes</label>
          <textarea value={packagingNotes} onChange={(event) => setPackagingNotes(event.target.value)} rows={3} />
        </div>
        <div className="field">
          <label>Additional scientific limitations (one per line)</label>
          <textarea value={limitations} onChange={(event) => setLimitations(event.target.value)} rows={3} placeholder="Optional user-entered warnings" />
        </div>
      </div>

      <h3>3. Confirm QA planning limits</h3>
      <div className="notice">{QA_LIMIT_WARNING} Editing a value clears its confirmation.</div>
      <div className="table-wrap transfer-table-wrap">
        <table className="table transfer-table">
          <thead><tr><th>Include</th><th>Parameter</th><th>Lower</th><th>Upper</th><th>Warning rule</th><th>Confirm</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.parameter_id}>
                <td><input type="checkbox" checked={row.include} onChange={(event) => updateRow(index, { include: event.target.checked, confirmed: false })} /></td>
                <td><b>{row.parameter_name}</b><div className="sub">{row.unit}</div></td>
                <td><input className="compact-input" disabled={!row.include} value={row.lower} onChange={(event) => updateRow(index, { lower: event.target.value, confirmed: false })} /></td>
                <td><input className="compact-input" disabled={!row.include} value={row.upper} onChange={(event) => updateRow(index, { upper: event.target.value, confirmed: false })} /></td>
                <td><input className="compact-input wide" disabled={!row.include} value={row.warning_rule} onChange={(event) => updateRow(index, { warning_rule: event.target.value, confirmed: false })} placeholder="User-approved rule" /></td>
                <td><input type="checkbox" disabled={!row.include} checked={row.confirmed} onChange={(event) => updateRow(index, { confirmed: event.target.checked })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">This study has no parameters to transfer.</div>}
      </div>
      <label className="confirmation-row approval-row">
        <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
        I approve this explicit local transfer and confirm that checked limits are planning values entered or reviewed by me.
      </label>
      {message && <div className={message.type === "error" ? "transfer-error" : "transfer-success"}>{message.text}</div>}
      <button className="btn primary" onClick={exportToQa}>
        <Download size={14} /> Download QA transfer JSON
      </button>
    </div>
  );
}

function QaTransferSection({ onHistory }: { onHistory: () => void }) {
  const studies = useShelfLifeStore((state) => state.studies);
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("study");
  const [studyId, setStudyId] = useState(
    studies.some((study) => study.study_id === requested)
      ? (requested as string)
      : studies[0]?.study_id ?? "",
  );
  const study = studies.find((candidate) => candidate.study_id === studyId);
  return (
    <section className="card transfer-section">
      <div className="transfer-section-heading">
        <div>
          <div className="eyebrow">Outgoing lifecycle step</div>
          <h2 className="section-title transfer-title">Send Approved Product to QA</h2>
          <p className="sub">Choose the study, explicitly confirm QA planning values, and download a local JSON transfer.</p>
        </div>
        <FileJson size={28} color="#135a91" />
      </div>
      <div className="field study-picker">
        <label>Shelf-life study</label>
        <select value={studyId} onChange={(event) => setStudyId(event.target.value)}>
          {studies.map((candidate) => (
            <option value={candidate.study_id} key={candidate.study_id}>{candidate.study_name} · {candidate.study_status}</option>
          ))}
        </select>
      </div>
      {study ? <QaExportPanel key={study.study_id} study={study} onHistory={onHistory} /> : <div className="empty">Create or import a shelf-life study first.</div>}
    </section>
  );
}

function TransferHistoryPanel({ revision }: { revision: number }) {
  const history = useMemo(() => readTransferHistory(), [revision]);
  return (
    <section className="card transfer-section">
      <div className="transfer-section-heading">
        <div>
          <div className="eyebrow">Local audit trail</div>
          <h2 className="section-title transfer-title">Transfer History</h2>
          <p className="sub">Metadata only; complete transfer payloads are never stored here.</p>
        </div>
        <History size={24} color="#135a91" />
      </div>
      {history.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Time</th><th>Direction</th><th>Type</th><th>Transfer ID</th><th>Linked record</th><th>File</th><th>Status</th><th>Warnings</th></tr></thead>
            <tbody>
              {history.map((entry, index) => (
                <tr key={`${entry.transfer_id}-${entry.timestamp}-${index}`}>
                  <td>{entry.timestamp.slice(0, 19).replace("T", " ")}</td>
                  <td>{entry.imported_or_exported}</td>
                  <td>{entry.transfer_type.replaceAll("_", " ")}</td>
                  <td>{entry.transfer_id}</td>
                  <td>{entry.linked_record_id}</td>
                  <td>{entry.filename}</td>
                  <td><span className={`badge ${entry.status === "SUCCESS" ? "ok" : "bad"}`}>{entry.status}</span></td>
                  <td>{entry.warning_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="empty">No module transfers have been attempted on this browser.</div>}
    </section>
  );
}

export function TransferWorkspace() {
  const [historyRevision, setHistoryRevision] = useState(0);
  const refreshHistory = () => setHistoryRevision((value) => value + 1);
  return (
    <>
      <Header
        eyebrow="FoodLab AI lifecycle"
        title="Module transfers"
        sub="Versioned, explicit JSON exchange — no database, background sync or silent transmission"
      />
      <div className="workflow-strip" aria-label="FoodLab lifecycle workflow">
        <span>Product Development</span><ArrowRight size={15} /><span>Sensory</span><ArrowRight size={15} /><b>Shelf Life</b><ArrowRight size={15} /><span>QA</span>
      </div>
      <div className="transfer-stack">
        <SensoryImportPanel onHistory={refreshHistory} />
        <QaTransferSection onHistory={refreshHistory} />
        <TransferHistoryPanel revision={historyRevision} />
      </div>
    </>
  );
}
