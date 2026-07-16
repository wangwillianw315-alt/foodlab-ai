import {ChangeEvent, useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  FileJson,
  FileUp,
  Link2,
  ShieldCheck,
} from 'lucide-react';
import {Card, Empty, PageHeader, fmt} from '../components/ui/Common';
import {useSensoryStore} from '../store/sensoryStore';
import {
  ProductToSensoryEnvelope,
  SensoryToShelfLifeEnvelope,
  TransferHistoryEntry,
} from '../types/transfers';
import {downloadText} from '../utils/exportData';
import {
  createSensoryToShelfLifeTransfer,
  parseProductToSensoryTransfer,
} from '../utils/transfers';
import {
  getTransferHistory,
  recordTransferHistory,
} from '../utils/transferHistory';

const splitLines = (value: string) =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const safeFilenamePart = (value: string) =>
  value
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'sensory-project';

const SelectProject = () => {
  const projects = useSensoryStore((state) => state.projects);
  const selectedProjectId = useSensoryStore((state) => state.selectedProjectId);
  const selectProject = useSensoryStore((state) => state.selectProject);
  return (
    <select
      aria-label="Selected sensory project"
      value={selectedProjectId}
      onChange={(event) => selectProject(event.target.value)}
    >
      {projects
        .filter((project) => !project.archived)
        .map((project) => (
          <option key={project.project_id} value={project.project_id}>
            {project.project_name}
          </option>
        ))}
    </select>
  );
};

function LinkedSourceCard() {
  const projects = useSensoryStore((state) => state.projects);
  const selectedProjectId = useSensoryStore((state) => state.selectedProjectId);
  const project = projects.find((item) => item.project_id === selectedProjectId);
  if (!project?.product_project_id) {
    return (
      <Card className="linked-source muted-card">
        <div className="card-top">
          <h2>Linked source</h2>
          <span className="badge">LEGACY / LOCAL</span>
        </div>
        <p>
          This existing project has no Product Development mapping. Old data remains
          fully readable; cross-module IDs are added only through an explicit import.
        </p>
      </Card>
    );
  }

  return (
    <Card className="linked-source">
      <div className="card-top">
        <h2>
          <Link2 aria-hidden="true" /> Linked source
        </h2>
        <span className="badge green">LINKED</span>
      </div>
      <dl>
        <div>
          <dt>Source</dt>
          <dd>Food Product Development AI</dd>
        </div>
        <div>
          <dt>Product project</dt>
          <dd className="mono">{project.product_project_id}</dd>
        </div>
        <div>
          <dt>Product</dt>
          <dd className="mono">{project.product_id}</dd>
        </div>
        <div>
          <dt>Formula versions</dt>
          <dd>
            {project.samples
              .map(
                (sample) =>
                  `${sample.formula_version || sample.sample_name} (${sample.formula_version_id || 'unmapped'})`,
              )
              .join(', ')}
          </dd>
        </div>
        <div>
          <dt>Source transfer</dt>
          <dd className="mono">{project.source_transfer_id}</dd>
        </div>
      </dl>
    </Card>
  );
}

function ProductImportPanel({onHistoryChange}: {onHistoryChange: () => void}) {
  const importProductTransfer = useSensoryStore(
    (state) => state.importProductTransfer,
  );
  const existingProjects = useSensoryStore((state) => state.projects);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ProductToSensoryEnvelope | null>(null);
  const [filename, setFilename] = useState('');
  const [projectName, setProjectName] = useState('');
  const [sampleNames, setSampleNames] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    const result = parseProductToSensoryTransfer(text);
    setFilename(file.name);
    setPreview(null);
    setWarnings(result.warnings);

    if (!result.ok) {
      setMessage({kind: 'error', text: result.error});
      recordTransferHistory({
        transfer_id: 'TX-UNKNOWN',
        transfer_type: 'PRODUCT_TO_SENSORY',
        imported_or_exported: 'IMPORTED',
        timestamp: new Date().toISOString(),
        linked_record_id: '',
        filename: file.name,
        status: 'FAILED',
        warning_count: 0,
      });
      onHistoryChange();
      return;
    }

    const alreadyImported = existingProjects.some(
      (project) => project.source_transfer_id === result.value.transfer_id,
    );
    setPreview(result.value);
    setProjectName(`${result.value.payload.product_name} Sensory Study`);
    setSampleNames(result.value.payload.samples.map((sample) => sample.sample_name));
    setWarnings([
      ...result.warnings,
      ...(alreadyImported
        ? ['This transfer was imported before. Confirming will still create a separate new project; no existing project will be overwritten.']
        : []),
    ]);
    setMessage(null);
  };

  const confirmImport = () => {
    if (!preview) return;
    const result = importProductTransfer(preview, {
      filename,
      projectName,
      sampleNames,
    });
    if (!result.ok) {
      setMessage({kind: 'error', text: result.message});
      onHistoryChange();
      return;
    }
    setMessage({
      kind: 'success',
      text: `${result.message} ${result.warningCount} warning(s). No existing project was changed.`,
    });
    setPreview(null);
    onHistoryChange();
  };

  return (
    <Card className="transfer-panel">
      <div className="transfer-panel__head">
        <span className="transfer-step">1</span>
        <div>
          <h2>Import from Product Development</h2>
          <p>Validate and preview a PRODUCT_TO_SENSORY v1 JSON file.</p>
        </div>
      </div>
      <input
        hidden
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={loadFile}
      />
      <button onClick={() => inputRef.current?.click()}>
        <FileUp aria-hidden="true" /> Choose transfer JSON
      </button>
      <p className="privacy-inline">
        Import is explicit and local. Selecting a file does not send it anywhere.
      </p>

      {message && (
        <div className={message.kind === 'success' ? 'success' : 'error-box'}>
          {message.text}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="notice transfer-warnings">
          <strong>Warnings</strong>
          <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      )}

      {preview && (
        <div className="transfer-preview">
          <div className="preview-heading">
            <div>
              <span className="badge green">VALID v{preview.schema_version}</span>
              <h3>Import preview</h3>
            </div>
            <span className="mono">{preview.transfer_id}</span>
          </div>
          <dl className="preview-facts">
            <div><dt>Product project</dt><dd>{preview.payload.product_project_id}</dd></div>
            <div><dt>Product</dt><dd>{preview.payload.product_id}</dd></div>
            <div><dt>Category</dt><dd>{preview.payload.product_category}</dd></div>
            <div><dt>Workspace</dt><dd>{preview.workspace_id}</dd></div>
          </dl>
          <div className="form-grid">
            <label className="span-2">
              New sensory project name
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </label>
            {preview.payload.samples.map((sample, index) => (
              <label key={sample.formula_version_id}>
                Sample name · {sample.formula_version_name}
                <input
                  value={sampleNames[index] || ''}
                  onChange={(event) =>
                    setSampleNames((current) =>
                      current.map((name, itemIndex) =>
                        itemIndex === index ? event.target.value : name,
                      ),
                    )
                  }
                />
                <small className="mono">{sample.formula_version_id}</small>
              </label>
            ))}
          </div>
          <div className="notice">
            Unique non-repeating three-digit blind codes will be generated when you
            confirm. Formula mappings are retained; supplier cost details are not
            copied into the sensory project.
          </div>
          <button
            disabled={
              projectName.trim().length < 1 ||
              sampleNames.some((name) => name.trim().length < 1)
            }
            onClick={confirmImport}
          >
            <CheckCircle2 aria-hidden="true" /> Create as a new project
          </button>
        </div>
      )}
    </Card>
  );
}

function ShelfLifeExportPanel({onHistoryChange}: {onHistoryChange: () => void}) {
  const projects = useSensoryStore((state) => state.projects);
  const selectedProjectId = useSensoryStore((state) => state.selectedProjectId);
  const project = projects.find((item) => item.project_id === selectedProjectId);
  const [sampleId, setSampleId] = useState('');
  const [testId, setTestId] = useState('');
  const [mainObservations, setMainObservations] = useState('');
  const [jarFindings, setJarFindings] = useState('');
  const [positiveKeywords, setPositiveKeywords] = useState('');
  const [negativeKeywords, setNegativeKeywords] = useState('');
  const [limitations, setLimitations] = useState('');
  const [recommendedFocus, setRecommendedFocus] = useState(
    'Appearance, Flavour, Texture, Overall Acceptability',
  );
  const [preview, setPreview] = useState<SensoryToShelfLifeEnvelope | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!project) return;
    if (!project.samples.some((sample) => sample.sample_id === sampleId)) {
      setSampleId(project.samples[0]?.sample_id || '');
    }
    if (!project.tests.some((test) => test.test_id === testId)) {
      setTestId(
        project.tests.find((test) => test.test_type === 'HEDONIC')?.test_id ||
          project.tests[0]?.test_id ||
          '',
      );
    }
    setPreview(null);
    setError('');
  }, [project, sampleId, testId]);

  if (!project) return <Empty text="Create or import a sensory project first." />;

  const prepare = () => {
    const result = createSensoryToShelfLifeTransfer(project, {
      sampleId,
      testId: testId || undefined,
      mainObservations: splitLines(mainObservations),
      jarFindings: jarFindings.trim() ? splitLines(jarFindings) : undefined,
      positiveKeywords: positiveKeywords.trim()
        ? splitLines(positiveKeywords)
        : undefined,
      negativeKeywords: negativeKeywords.trim()
        ? splitLines(negativeKeywords)
        : undefined,
      limitations: limitations.trim() ? splitLines(limitations) : undefined,
      recommendedFocus: splitLines(recommendedFocus),
    });
    if (!result.ok) {
      setPreview(null);
      setError(result.error);
      return;
    }
    setPreview(result.value);
    setError('');
  };

  const download = () => {
    if (!preview) return;
    const filename = `${safeFilenamePart(project.project_code)}-sensory-to-shelf-life.json`;
    downloadText(filename, JSON.stringify(preview, null, 2), 'application/json');
    recordTransferHistory({
      transfer_id: preview.transfer_id,
      transfer_type: 'SENSORY_TO_SHELF_LIFE',
      imported_or_exported: 'EXPORTED',
      timestamp: new Date().toISOString(),
      linked_record_id: preview.payload.formula_version_id,
      filename,
      status: 'SUCCESS',
      warning_count: 0,
    });
    onHistoryChange();
  };

  const summary = preview?.payload.aggregated_sensory_summary;
  return (
    <Card className="transfer-panel">
      <div className="transfer-panel__head">
        <span className="transfer-step">2</span>
        <div>
          <h2>Send selected formula to Shelf Life</h2>
          <p>Prepare an aggregated SENSORY_TO_SHELF_LIFE v1 JSON file.</p>
        </div>
      </div>
      <div className="privacy-banner">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Privacy protected</strong>
          <span>Individual panelist records are not included.</span>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Shortlisted formula / sample
          <select value={sampleId} onChange={(event) => setSampleId(event.target.value)}>
            {project.samples.map((sample) => (
              <option key={sample.sample_id} value={sample.sample_id}>
                {sample.blind_code} · {sample.sample_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Relevant sensory test
          <select value={testId} onChange={(event) => setTestId(event.target.value)}>
            {project.tests.map((test) => (
              <option key={test.test_id} value={test.test_id}>
                {test.test_name}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Main sensory observations (one per line)
          <textarea
            value={mainObservations}
            onChange={(event) => setMainObservations(event.target.value)}
            placeholder="Example: Formula retained its preferred flavour profile."
          />
        </label>
        <label>
          JAR findings (optional override)
          <textarea
            value={jarFindings}
            onChange={(event) => setJarFindings(event.target.value)}
            placeholder="Leave blank to aggregate available JAR data."
          />
        </label>
        <label>
          Positive keywords (optional override)
          <textarea
            value={positiveKeywords}
            onChange={(event) => setPositiveKeywords(event.target.value)}
            placeholder="Leave blank to aggregate recognised terms."
          />
        </label>
        <label>
          Negative keywords (optional override)
          <textarea
            value={negativeKeywords}
            onChange={(event) => setNegativeKeywords(event.target.value)}
            placeholder="Leave blank to aggregate recognised terms."
          />
        </label>
        <label>
          Scientific limitations (optional override)
          <textarea
            value={limitations}
            onChange={(event) => setLimitations(event.target.value)}
            placeholder="Leave blank for the default limitations."
          />
        </label>
        <label className="span-2">
          Recommended shelf-life focus
          <input
            value={recommendedFocus}
            onChange={(event) => setRecommendedFocus(event.target.value)}
          />
        </label>
      </div>
      {error && <div className="error-box">{error}</div>}
      <button onClick={prepare} disabled={!sampleId || !recommendedFocus.trim()}>
        <FileJson aria-hidden="true" /> Prepare transfer preview
      </button>

      {preview && summary && (
        <div className="transfer-preview">
          <div className="preview-heading">
            <div>
              <span className="badge green">AGGREGATED ONLY</span>
              <h3>Export preview</h3>
            </div>
            <span className="mono">{preview.transfer_id}</span>
          </div>
          <div className="preview-metrics">
            <div><span>Overall liking</span><strong>{fmt(summary.overall_liking_mean)}</strong></div>
            <div><span>Response count</span><strong>{summary.response_count}</strong></div>
            <div><span>Purchase top-two</span><strong>{fmt(summary.purchase_intent_top_two_box)}%</strong></div>
          </div>
          <dl className="preview-facts">
            <div><dt>Formula mapping</dt><dd>{preview.payload.formula_version_id}</dd></div>
            <div><dt>Sample</dt><dd>{preview.payload.selected_sample.sample_name}</dd></div>
            <div><dt>JAR findings</dt><dd>{summary.jar_findings.join(' ') || 'None aggregated'}</dd></div>
            <div><dt>Keywords</dt><dd>{[...summary.positive_keywords, ...summary.negative_keywords].join(', ') || 'None aggregated'}</dd></div>
          </dl>
          <div className="notice">
            This download contains summary statistics and selected observations only.
            It does not create safety limits or an official shelf-life decision.
          </div>
          <button onClick={download}>
            <ArrowDownToLine aria-hidden="true" /> Download Shelf Life transfer JSON
          </button>
        </div>
      )}
    </Card>
  );
}

function TransferHistoryPanel({entries}: {entries: TransferHistoryEntry[]}) {
  return (
    <Card className="transfer-history">
      <div className="card-top">
        <h2>Transfer history</h2>
        <span className="badge">LOCAL METADATA ONLY</span>
      </div>
      <p>
        History stores IDs, filenames, outcomes and warning counts. Full transfer
        payloads are never retained here.
      </p>
      {entries.length === 0 ? (
        <Empty text="No transfer attempts recorded in this browser." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th><th>Direction</th><th>Type</th><th>Transfer ID</th>
                <th>Linked record</th><th>File</th><th>Result</th><th>Warnings</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${entry.transfer_id}-${entry.timestamp}-${index}`}>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td>{entry.imported_or_exported}</td>
                  <td>{entry.transfer_type}</td>
                  <td className="mono">{entry.transfer_id}</td>
                  <td className="mono">{entry.linked_record_id || '—'}</td>
                  <td>{entry.filename}</td>
                  <td>
                    <span className={`badge ${entry.status === 'SUCCESS' ? 'green' : 'red'}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td>{entry.warning_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function TransfersPage() {
  const [historyRevision, setHistoryRevision] = useState(0);
  const entries = useMemo(() => getTransferHistory(), [historyRevision]);
  const refreshHistory = () => setHistoryRevision((value) => value + 1);

  return (
    <>
      <PageHeader
        title="Lifecycle transfers"
        subtitle="Explicit, versioned JSON handoffs connect Sensory to the FoodLab AI product lifecycle."
        action={<SelectProject />}
      />
      <div className="lifecycle-mini">
        <span>Product Development</span>
        <ArrowRight aria-hidden="true" />
        <strong>Sensory Evaluation</strong>
        <ArrowRight aria-hidden="true" />
        <span>Shelf-Life Validation</span>
      </div>
      <LinkedSourceCard />
      <div className="grid-2 transfer-grid">
        <ProductImportPanel onHistoryChange={refreshHistory} />
        <ShelfLifeExportPanel onHistoryChange={refreshHistory} />
      </div>
      <TransferHistoryPanel entries={entries} />
    </>
  );
}
