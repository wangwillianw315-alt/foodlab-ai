import {z} from 'zod';
import {
  ProductToSensoryEnvelope,
  SensoryToShelfLifeEnvelope,
} from '../types/transfers';
import {
  SensoryProject,
  SensorySample,
  SensoryTest,
  SensoryTestType,
} from '../types/sensory';
import {generateBlindCodes} from './blindCodes';
import {calculateKeywordFrequency, removeStopWords, tokeniseComments} from './commentAnalysis';
import {
  createSensoryProjectId,
  createSensoryTestId,
  createTransferId,
} from './foodlabIds';
import {calculatePurchaseIntentSummary} from './hedonicAnalysis';
import {calculateMean} from './statistics';

export const FOODLAB_SCHEMA_VERSION = '1.0.0' as const;

const prefixedId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}-[A-Fa-f0-9]{8,}$`));

const hexEnvelopeId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}-[A-Fa-f0-9]{8,}$`));

const metadataSchema = z
  .object({
    application_version: z.string().min(1),
    notes: z.string(),
    disclaimer: z.string().min(1),
  })
  .passthrough();

const productSampleSchema = z
  .object({
    formula_version_id: prefixedId('FV'),
    formula_version_name: z.string().min(1),
    sample_name: z.string().min(1),
    allergens: z.array(z.string()),
    ingredient_summary: z.array(z.string()),
    demo_only: z.boolean(),
    cost_summary: z.number().finite().nonnegative().nullable().optional(),
  })
  .passthrough();

const productPayloadSchema = z
  .object({
    product_project_id: prefixedId('PD'),
    product_id: prefixedId('PR'),
    product_name: z.string().min(1),
    product_category: z.string().min(1),
    project_objective: z.string().optional().default(''),
    target_consumer: z.string().optional().default(''),
    samples: z.array(productSampleSchema).min(1).max(4),
    suggested_test_design: z
      .object({
        test_types: z.array(z.string()),
        attributes: z.array(z.string()),
        notes: z.string(),
      })
      .passthrough(),
    cost_summary: z.unknown().optional(),
  })
  .passthrough();

export const productToSensoryEnvelopeSchema = z
  .object({
    foodlab_transfer: z.literal(true),
    schema_version: z.literal(FOODLAB_SCHEMA_VERSION),
    transfer_id: hexEnvelopeId('TX'),
    transfer_type: z.literal('PRODUCT_TO_SENSORY'),
    source_module: z.literal('PRODUCT_DEVELOPMENT'),
    target_module: z.literal('SENSORY'),
    exported_at: z.string().datetime({offset: true}),
    exported_by: z.string().min(1),
    workspace_id: hexEnvelopeId('WS'),
    source_record_id: prefixedId('PD'),
    payload: productPayloadSchema,
    metadata: metadataSchema,
  })
  .passthrough()
  .superRefine((value, context) => {
    if (value.source_record_id !== value.payload.product_project_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source_record_id'],
        message: 'Source record ID must match payload product project ID.',
      });
    }
  });

const sensorySummarySchema = z
  .object({
    overall_liking_mean: z.number().finite().nullable(),
    response_count: z.number().int().nonnegative(),
    purchase_intent_top_two_box: z.number().finite().min(0).max(100).nullable(),
    jar_findings: z.array(z.string()),
    positive_keywords: z.array(z.string()),
    negative_keywords: z.array(z.string()),
    limitations: z.array(z.string()),
    main_observations: z.array(z.string()).optional(),
  })
  .passthrough();

const sensoryPayloadSchema = z
  .object({
    product_project_id: prefixedId('PD'),
    product_id: prefixedId('PR'),
    formula_version_id: prefixedId('FV'),
    sensory_project_id: prefixedId('SN'),
    sensory_test_id: prefixedId('ST').optional(),
    product_name: z.string().min(1).optional(),
    product_category: z.string().min(1).optional(),
    selected_sample: z
      .object({
        sample_name: z.string().min(1),
        blind_code: z.string().regex(/^\d{3}$/),
        formula_version_name: z.string().min(1),
      })
      .passthrough(),
    aggregated_sensory_summary: sensorySummarySchema,
    recommended_shelf_life_focus: z.array(z.string()).min(1),
  })
  .passthrough();

export const sensoryToShelfLifeEnvelopeSchema = z
  .object({
    foodlab_transfer: z.literal(true),
    schema_version: z.literal(FOODLAB_SCHEMA_VERSION),
    transfer_id: hexEnvelopeId('TX'),
    transfer_type: z.literal('SENSORY_TO_SHELF_LIFE'),
    source_module: z.literal('SENSORY'),
    target_module: z.literal('SHELF_LIFE'),
    exported_at: z.string().datetime({offset: true}),
    exported_by: z.string().min(1),
    workspace_id: hexEnvelopeId('WS'),
    source_record_id: prefixedId('SN'),
    payload: sensoryPayloadSchema,
    metadata: metadataSchema,
  })
  .passthrough()
  .superRefine((value, context) => {
    if (value.source_record_id !== value.payload.sensory_project_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source_record_id'],
        message: 'Source record ID must match payload sensory project ID.',
      });
    }
  });

type ValidationSuccess<T> = {ok: true; value: T; warnings: string[]};
type ValidationFailure = {ok: false; error: string; warnings: string[]};
export type TransferValidation<T> = ValidationSuccess<T> | ValidationFailure;

const decodeInput = (input: string | unknown): TransferValidation<unknown> => {
  if (typeof input !== 'string') return {ok: true, value: input, warnings: []};
  try {
    return {ok: true, value: JSON.parse(input) as unknown, warnings: []};
  } catch {
    return {ok: false, error: 'The selected file is not valid JSON.', warnings: []};
  }
};

const checkVersion = (value: unknown): ValidationFailure | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {ok: false, error: 'The transfer file must contain a JSON object.', warnings: []};
  }

  const version = (value as Record<string, unknown>).schema_version;
  if (typeof version !== 'string') {
    return {ok: false, error: 'Missing required schema_version.', warnings: []};
  }
  if (version === FOODLAB_SCHEMA_VERSION) return null;

  const supportedMajor = Number(FOODLAB_SCHEMA_VERSION.split('.')[0]);
  const incomingMajor = Number(version.split('.')[0]);
  if (!Number.isFinite(incomingMajor) || incomingMajor !== supportedMajor) {
    return {
      ok: false,
      error: `Incompatible schema major version ${version}. This module supports ${FOODLAB_SCHEMA_VERSION}.`,
      warnings: [],
    };
  }

  return {
    ok: false,
    error: `Schema version ${version} is newer or unsupported. This module currently supports exactly ${FOODLAB_SCHEMA_VERSION}.`,
    warnings: [],
  };
};

const formatIssues = (error: z.ZodError) =>
  error.issues
    .slice(0, 4)
    .map((issue) => `${issue.path.join('.') || 'transfer'}: ${issue.message}`)
    .join(' ');

export const parseProductToSensoryTransfer = (
  input: string | unknown,
): TransferValidation<ProductToSensoryEnvelope> => {
  const decoded = decodeInput(input);
  if (!decoded.ok) return decoded;
  const versionError = checkVersion(decoded.value);
  if (versionError) return versionError;

  const result = productToSensoryEnvelopeSchema.safeParse(decoded.value);
  if (!result.success) {
    return {ok: false, error: formatIssues(result.error), warnings: []};
  }

  const warnings: string[] = [];
  if (result.data.payload.samples.some((sample) => sample.cost_summary !== undefined)) {
    warnings.push('The optional cost summary was not imported into Sensory.');
  }
  if (result.data.payload.samples.some((sample) => sample.demo_only)) {
    warnings.push('One or more source samples are marked demo-only.');
  }

  return {
    ok: true,
    value: result.data as ProductToSensoryEnvelope,
    warnings,
  };
};

export const validateSensoryToShelfLifeTransfer = (
  input: string | unknown,
): TransferValidation<SensoryToShelfLifeEnvelope> => {
  const decoded = decodeInput(input);
  if (!decoded.ok) return decoded;
  const versionError = checkVersion(decoded.value);
  if (versionError) return versionError;
  const result = sensoryToShelfLifeEnvelopeSchema.safeParse(decoded.value);
  if (!result.success) {
    return {ok: false, error: formatIssues(result.error), warnings: []};
  }
  return {
    ok: true,
    value: result.data as SensoryToShelfLifeEnvelope,
    warnings: [],
  };
};

const localRecordId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Math.random().toString(16).slice(2)}-${Math.random()
    .toString(16)
    .slice(2)}`;
};

const TEST_TYPE_MAP: Record<string, SensoryTestType> = {
  '9-point hedonic': 'HEDONIC',
  hedonic: 'HEDONIC',
  preference: 'PREFERENCE',
  ranking: 'RANKING',
  jar: 'JAR',
  'purchase intent': 'PURCHASE_INTENT',
  cata: 'CATA',
  triangle: 'TRIANGLE',
  'paired comparison': 'PAIRED_COMPARISON',
  descriptive: 'DESCRIPTIVE',
};

const testScale = (type: SensoryTestType) => {
  if (type === 'HEDONIC') return '9-point Hedonic';
  if (type === 'JAR') return 'JAR 3-point';
  if (type === 'PURCHASE_INTENT') return '5-point Purchase Intent';
  return 'Method-specific scale';
};

export interface ProductImportEdits {
  projectName?: string;
  sampleNames?: string[];
}

export const buildSensoryProjectFromProductTransfer = (
  envelope: ProductToSensoryEnvelope,
  edits: ProductImportEdits = {},
  timestamp = new Date().toISOString(),
) => {
  const sensoryProjectId = createSensoryProjectId();
  const projectId = localRecordId();
  const blindCodes = generateBlindCodes(envelope.payload.samples.length);
  const samples: SensorySample[] = envelope.payload.samples.map((source, index) => ({
    sample_id: localRecordId(),
    sample_name: edits.sampleNames?.[index]?.trim() || source.sample_name,
    source_sample_name: source.sample_name,
    internal_code: source.formula_version_id,
    blind_code: blindCodes[index],
    formula_version: source.formula_version_name,
    formula_version_id: source.formula_version_id,
    allergens: [...source.allergens],
    sample_notes: source.demo_only
      ? 'Imported from Product Development; source formula is marked demo-only.'
      : 'Imported from Product Development.',
    display_order: index + 1,
  }));

  const warnings: string[] = [];
  const testTypes = Array.from(
    new Set(
      envelope.payload.suggested_test_design.test_types
        .map((name) => {
          const mapped = TEST_TYPE_MAP[name.trim().toLowerCase()];
          if (!mapped) warnings.push(`Unsupported suggested test type ignored: ${name}`);
          return mapped;
        })
        .filter((value): value is SensoryTestType => Boolean(value)),
    ),
  );

  const tests: SensoryTest[] = testTypes.map((type) => ({
    test_id: localRecordId(),
    sensory_test_id: createSensoryTestId(),
    project_id: projectId,
    test_name:
      type === 'HEDONIC'
        ? '9-point Hedonic Test'
        : `${type.replaceAll('_', ' ')} Test`,
    test_type: type,
    test_objective:
      envelope.payload.suggested_test_design.notes ||
      envelope.payload.project_objective,
    panel_type: 'Consumer',
    planned_panelists: 30,
    actual_panelists: 0,
    scale_type: testScale(type),
    randomisation_enabled: true,
    blind_coding_enabled: true,
    mandatory_attributes: [
      ...envelope.payload.suggested_test_design.attributes,
    ],
    sample_ids: samples.map((sample) => sample.sample_id),
    notes: 'Imported test suggestion; confirm the study design before collection.',
  }));

  const project: SensoryProject = {
    project_id: projectId,
    sensory_project_id: sensoryProjectId,
    workspace_id: envelope.workspace_id,
    product_project_id: envelope.payload.product_project_id,
    product_id: envelope.payload.product_id,
    product_name: envelope.payload.product_name,
    source_transfer_id: envelope.transfer_id,
    source_module: 'PRODUCT_DEVELOPMENT',
    project_name: edits.projectName?.trim() || `${envelope.payload.product_name} Sensory Study`,
    project_code: sensoryProjectId,
    product_category: envelope.payload.product_category,
    research_objective: envelope.payload.project_objective,
    target_consumer: envelope.payload.target_consumer,
    project_status: 'PLANNING',
    notes: 'Created from an explicit FoodLab AI Product Development transfer.',
    samples,
    tests,
    panelists: [],
    hedonicResponses: [],
    jarResponses: [],
    triangleResponses: [],
    cataResponses: [],
    blind_code_history: [...blindCodes],
    demo: envelope.payload.samples.every((sample) => sample.demo_only),
    created_at: timestamp,
    updated_at: timestamp,
  };

  if (envelope.payload.samples.some((sample) => sample.cost_summary !== undefined)) {
    warnings.push('Cost summary was deliberately excluded from the sensory project.');
  }

  return {project, warnings};
};

const rounded = (value: number | null, digits = 2) =>
  value === null ? null : Number(value.toFixed(digits));

const splitList = (values: string[] | undefined) =>
  (values || []).map((value) => value.trim()).filter(Boolean);

const makeJarFindings = (project: SensoryProject, sampleId: string) => {
  const rows = project.jarResponses.filter((row) => row.sample_id === sampleId);
  const attributes = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.attribute_scores))),
  );

  return attributes.flatMap((attribute) => {
    const scores = rows
      .map((row) => row.attribute_scores[attribute])
      .filter((value): value is number => value !== null && Number.isFinite(value));
    if (!scores.length) return [];
    const tooLow = (scores.filter((value) => value === 1).length / scores.length) * 100;
    const tooHigh = (scores.filter((value) => value === 3).length / scores.length) * 100;
    const findings: string[] = [];
    if (tooLow >= 20) findings.push(`${attribute}: ${tooLow.toFixed(1)}% rated too low.`);
    if (tooHigh >= 20) findings.push(`${attribute}: ${tooHigh.toFixed(1)}% rated too high.`);
    return findings;
  });
};

const keywordGroups = (project: SensoryProject, sampleId: string) => {
  const comments = project.hedonicResponses
    .filter((row) => row.sample_id === sampleId)
    .map((row) => row.comments || '');
  const terms = project.cataResponses
    .filter((row) => row.sample_id === sampleId)
    .flatMap((row) => row.selected_terms);
  const frequencies = calculateKeywordFrequency(
    removeStopWords([...tokeniseComments(comments), ...terms.map((term) => term.toLowerCase())]),
  );
  const positiveLexicon = new Set([
    'balanced',
    'creamy',
    'fresh',
    'good',
    'natural',
    'nice',
    'pleasant',
    'rich',
    'smooth',
    'soft',
    'tasty',
  ]);
  const negativeLexicon = new Set([
    'artificial',
    'bitter',
    'bland',
    'chalky',
    'dry',
    'grainy',
    'watery',
  ]);
  return {
    positive: frequencies
      .filter(({keyword}) => positiveLexicon.has(keyword))
      .slice(0, 8)
      .map(({keyword}) => keyword),
    negative: frequencies
      .filter(({keyword}) => negativeLexicon.has(keyword))
      .slice(0, 8)
      .map(({keyword}) => keyword),
  };
};

export interface SensoryExportOptions {
  sampleId: string;
  testId?: string;
  workspaceId?: string;
  mainObservations?: string[];
  jarFindings?: string[];
  positiveKeywords?: string[];
  negativeKeywords?: string[];
  limitations?: string[];
  recommendedFocus?: string[];
  transferId?: string;
  exportedAt?: string;
}

export const createSensoryToShelfLifeTransfer = (
  project: SensoryProject,
  options: SensoryExportOptions,
): TransferValidation<SensoryToShelfLifeEnvelope> => {
  const sample = project.samples.find((item) => item.sample_id === options.sampleId);
  if (!sample) return {ok: false, error: 'Select a valid sample.', warnings: []};

  const missing = [
    ['workspace_id', options.workspaceId || project.workspace_id],
    ['product_project_id', project.product_project_id],
    ['product_id', project.product_id],
    ['formula_version_id', sample.formula_version_id],
    ['sensory_project_id', project.sensory_project_id],
  ].filter(([, value]) => !value);
  if (missing.length) {
    return {
      ok: false,
      error: `This record is not linked for transfer. Missing ${missing
        .map(([field]) => field)
        .join(', ')}. Import it from Product Development first.`,
      warnings: [],
    };
  }

  const test = options.testId
    ? project.tests.find((item) => item.test_id === options.testId)
    : undefined;
  if (options.testId && !test) {
    return {ok: false, error: 'Select a valid sensory test.', warnings: []};
  }

  const responses = project.hedonicResponses.filter(
    (row) =>
      row.sample_id === sample.sample_id &&
      (!options.testId || row.test_id === options.testId),
  );
  const keywords = keywordGroups(project, sample.sample_id);
  const defaultLimitations = [
    'Results are aggregated and descriptive.',
    'Confirm storage conditions, safety criteria and acceptance limits independently.',
  ];

  const envelope: SensoryToShelfLifeEnvelope = {
    foodlab_transfer: true,
    schema_version: FOODLAB_SCHEMA_VERSION,
    transfer_id: options.transferId || createTransferId(),
    transfer_type: 'SENSORY_TO_SHELF_LIFE',
    source_module: 'SENSORY',
    target_module: 'SHELF_LIFE',
    exported_at: options.exportedAt || new Date().toISOString(),
    exported_by: 'Local user',
    workspace_id: (options.workspaceId || project.workspace_id) as string,
    source_record_id: project.sensory_project_id as string,
    payload: {
      product_project_id: project.product_project_id as string,
      product_id: project.product_id as string,
      formula_version_id: sample.formula_version_id as string,
      sensory_project_id: project.sensory_project_id as string,
      sensory_test_id: test?.sensory_test_id,
      product_name: project.product_name || project.project_name,
      product_category: project.product_category,
      selected_sample: {
        sample_name: sample.sample_name,
        blind_code: sample.blind_code,
        formula_version_name: sample.formula_version || sample.sample_name,
      },
      aggregated_sensory_summary: {
        overall_liking_mean: rounded(
          calculateMean(responses.map((row) => row.overall_liking)),
        ),
        response_count: responses.filter((row) => row.overall_liking !== null).length,
        purchase_intent_top_two_box: rounded(
          calculatePurchaseIntentSummary(
            responses.map((row) => row.purchase_intent),
          ).top2,
        ),
        jar_findings:
          options.jarFindings === undefined
            ? makeJarFindings(project, sample.sample_id)
            : splitList(options.jarFindings),
        positive_keywords:
          options.positiveKeywords === undefined
            ? keywords.positive
            : splitList(options.positiveKeywords),
        negative_keywords:
          options.negativeKeywords === undefined
            ? keywords.negative
            : splitList(options.negativeKeywords),
        limitations:
          options.limitations === undefined
            ? defaultLimitations
            : splitList(options.limitations),
        main_observations: splitList(options.mainObservations),
      },
      recommended_shelf_life_focus:
        options.recommendedFocus === undefined
          ? ['Appearance', 'Flavour', 'Texture', 'Overall Acceptability']
          : splitList(options.recommendedFocus),
    },
    metadata: {
      application_version: '1.0.0',
      notes:
        'Aggregated sensory results only. Individual and demographic records are excluded. This transfer does not define safety or regulatory limits.',
      disclaimer:
        'Individual panelist records are not included. Aggregated results are educational planning evidence and require qualified interpretation.',
    },
  };

  return validateSensoryToShelfLifeTransfer(envelope);
};
