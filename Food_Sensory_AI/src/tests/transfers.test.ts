import {beforeEach, describe, expect, it} from 'vitest';
import {demoSensoryProjects} from '../data/demoSensoryProjects';
import {useSensoryStore} from '../store/sensoryStore';
import {ProductToSensoryEnvelope} from '../types/transfers';
import {createFoodLabId, isFoodLabId} from '../utils/foodlabIds';
import {
  buildSensoryProjectFromProductTransfer,
  createSensoryToShelfLifeTransfer,
  parseProductToSensoryTransfer,
} from '../utils/transfers';
import {
  SENSORY_TRANSFER_HISTORY_KEY,
  StorageLike,
  getTransferHistory,
  recordTransferHistory,
} from '../utils/transferHistory';

const transfer = (): ProductToSensoryEnvelope => ({
  foodlab_transfer: true,
  schema_version: '1.0.0',
  transfer_id: 'TX-A1B2C3D4',
  transfer_type: 'PRODUCT_TO_SENSORY',
  source_module: 'PRODUCT_DEVELOPMENT',
  target_module: 'SENSORY',
  exported_at: '2026-07-16T00:00:00.000Z',
  exported_by: 'Local user',
  workspace_id: 'WS-A1B2C3D4',
  source_record_id: 'PD-A1B2C3D4',
  payload: {
    product_project_id: 'PD-A1B2C3D4',
    product_id: 'PR-A1B2C3D4',
    product_name: 'Plant Protein Bar',
    product_category: 'Snack',
    project_objective: 'Compare shortlisted variants.',
    target_consumer: 'Active adults',
    samples: [
      {
        formula_version_id: 'FV-A1B2C3D4',
        formula_version_name: 'Formula 2',
        sample_name: 'Protein Bar F2',
        allergens: ['Soy'],
        ingredient_summary: ['Oat', 'Pea protein'],
        demo_only: true,
      },
      {
        formula_version_id: 'FV-B1C2D3E4',
        formula_version_name: 'Formula 3',
        sample_name: 'Protein Bar F3',
        allergens: [],
        ingredient_summary: ['Oat', 'Date paste'],
        demo_only: true,
      },
    ],
    suggested_test_design: {
      test_types: ['9-point Hedonic', 'JAR', 'Purchase Intent'],
      attributes: ['Appearance', 'Flavour', 'Texture'],
      notes: 'Use blinded, randomised presentation.',
    },
  },
  metadata: {
    application_version: '1.0.0',
    notes: 'Explicit local JSON transfer',
    disclaimer: 'Planning data only; confirm the study design before use.',
  },
});

describe('FoodLab transfer validation', () => {
  it('accepts the exact v1 Product to Sensory envelope and ignores future fields', () => {
    const input = {...transfer(), future_optional_field: {safe: true}};
    const result = parseProductToSensoryTransfer(input);
    expect(result.ok).toBe(true);
  });

  it('accepts at-least-eight hex IDs, emits uppercase, and rejects non-hex IDs', () => {
    const compatible = transfer();
    compatible.transfer_id = 'TX-abcdef123';
    compatible.workspace_id = 'WS-abcdef123';
    compatible.source_record_id = 'PD-abcdef123';
    compatible.payload.product_project_id = 'PD-abcdef123';
    compatible.payload.product_id = 'PR-abcdef123';
    compatible.payload.samples.forEach((sample) => {
      sample.formula_version_id = 'FV-abcdef123';
    });
    expect(parseProductToSensoryTransfer(compatible).ok).toBe(true);
    compatible.payload.samples[0].formula_version_id = 'FV-ABCDEF12Z';
    expect(parseProductToSensoryTransfer(compatible).ok).toBe(false);
    expect(isFoodLabId('WS-abcdef123', 'WS')).toBe(true);
    expect(isFoodLabId('WS-ABCDEF12Z', 'WS')).toBe(false);
    expect(createFoodLabId('TX', 'abcdef123')).toBe('TX-ABCDEF123');
  });

  it('rejects a missing disclaimer and mismatched source record ID', () => {
    const {disclaimer: _disclaimer, ...metadata} = transfer().metadata;
    expect(parseProductToSensoryTransfer({...transfer(), metadata}).ok).toBe(false);
    expect(
      parseProductToSensoryTransfer({...transfer(), source_record_id: 'PD-ABCDEF12'}).ok,
    ).toBe(false);
  });

  it('warns for opt-in sample cost summaries without importing them', () => {
    const input = transfer();
    input.payload.samples[0].cost_summary = 8.75;
    const parsed = parseProductToSensoryTransfer(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.warnings.join(' ')).toMatch(/cost summary/i);

    const built = buildSensoryProjectFromProductTransfer(parsed.value);
    expect(built.warnings.join(' ')).toMatch(/cost summary/i);
    expect(JSON.stringify(built.project)).not.toContain('cost_summary');
  });

  it('rejects the wrong transfer type and direction', () => {
    const input = {
      ...transfer(),
      transfer_type: 'SENSORY_TO_SHELF_LIFE',
      source_module: 'SENSORY',
      target_module: 'SHELF_LIFE',
    };
    const result = parseProductToSensoryTransfer(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('transfer_type');
  });

  it('rejects unsupported major and newer minor versions with friendly errors', () => {
    const major = parseProductToSensoryTransfer({...transfer(), schema_version: '2.0.0'});
    const minor = parseProductToSensoryTransfer({...transfer(), schema_version: '1.1.0'});
    expect(major.ok).toBe(false);
    expect(minor.ok).toBe(false);
    if (!major.ok) expect(major.error).toContain('Incompatible schema major');
    if (!minor.ok) expect(minor.error).toContain('supports exactly 1.0.0');
  });

  it('rejects missing payload and malformed JSON without throwing', () => {
    const {payload: _payload, ...missingPayload} = transfer();
    expect(parseProductToSensoryTransfer(missingPayload).ok).toBe(false);
    expect(parseProductToSensoryTransfer('{broken').ok).toBe(false);
  });
});

describe('Product to Sensory import mapping', () => {
  it('preserves lifecycle mappings, applies edited names and creates unique blind codes', () => {
    const built = buildSensoryProjectFromProductTransfer(
      transfer(),
      {projectName: 'Edited sensory study', sampleNames: ['Code A', 'Code B']},
      '2026-07-16T01:00:00.000Z',
    ).project;
    expect(built.project_name).toBe('Edited sensory study');
    expect(built.product_project_id).toBe('PD-A1B2C3D4');
    expect(built.product_id).toBe('PR-A1B2C3D4');
    expect(built.workspace_id).toBe('WS-A1B2C3D4');
    expect(built.samples.map((sample) => sample.formula_version_id)).toEqual([
      'FV-A1B2C3D4',
      'FV-B1C2D3E4',
    ]);
    expect(built.samples.map((sample) => sample.sample_name)).toEqual(['Code A', 'Code B']);
    const blindCodes = built.samples.map((sample) => sample.blind_code);
    expect(blindCodes.every((code) => /^\d{3}$/.test(code))).toBe(true);
    expect(new Set(blindCodes).size).toBe(blindCodes.length);
  });

  it('always creates new records and never overwrites an existing project', () => {
    useSensoryStore.getState().resetDemo();
    const original = structuredClone(useSensoryStore.getState().projects[0]);
    const first = useSensoryStore.getState().importProductTransfer(transfer());
    const second = useSensoryStore.getState().importProductTransfer(transfer());
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first.projectId).not.toBe(second.projectId);
    expect(useSensoryStore.getState().projects).toHaveLength(demoSensoryProjects.length + 2);
    expect(useSensoryStore.getState().projects.find((project) => project.project_id === original.project_id)).toEqual(original);
  });
});

describe('Sensory to Shelf Life privacy boundary', () => {
  it('exports only aggregate results and no individual or demographic records', () => {
    const project = buildSensoryProjectFromProductTransfer(transfer()).project;
    const sample = project.samples[0];
    const test = project.tests[0];
    project.panelists = [{
      panelist_id: 'secret-person-id',
      participant_code: 'PRIVATE-001',
      age_group: '25-34',
      gender: 'Private value',
      dietary_pattern: 'Private diet',
      consent_confirmed: true,
      panel_type: 'Consumer',
    }];
    project.hedonicResponses = [
      {
        response_id: 'r1', test_id: test.test_id, panelist_id: 'secret-person-id',
        sample_id: sample.sample_id, appearance: 8, aroma: 7, flavour: 8,
        sweetness: 7, texture: 8, aftertaste: 7, overall_liking: 8,
        purchase_intent: 5, comments: 'smooth balanced',
      },
      {
        response_id: 'r2', test_id: test.test_id, panelist_id: 'another-secret-id',
        sample_id: sample.sample_id, appearance: 6, aroma: 6, flavour: 6,
        sweetness: 6, texture: 6, aftertaste: 6, overall_liking: 6,
        purchase_intent: 2, comments: 'dry',
      },
    ];

    const result = createSensoryToShelfLifeTransfer(project, {
      sampleId: sample.sample_id,
      testId: test.test_id,
      transferId: 'TX-B1C2D3E4',
      exportedAt: '2026-07-16T02:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.payload.aggregated_sensory_summary.overall_liking_mean).toBe(7);
    expect(result.value.payload.aggregated_sensory_summary.response_count).toBe(2);
    expect(result.value.payload.aggregated_sensory_summary.purchase_intent_top_two_box).toBe(50);
    expect(result.value.metadata.disclaimer).toMatch(/Individual panelist records are not included/i);
    const json = JSON.stringify(result.value);
    for (const privateValue of [
      'secret-person-id', 'another-secret-id', 'PRIVATE-001', '25-34',
      'Private value', 'Private diet', 'panelists', 'panelist_id', 'hedonicResponses',
    ]) expect(json).not.toContain(privateValue);
  });

  it('keeps cross-module IDs optional for old sensory data', () => {
    const oldProject = structuredClone(demoSensoryProjects[0]);
    expect(oldProject.product_project_id).toBeUndefined();
    const result = createSensoryToShelfLifeTransfer(oldProject, {
      sampleId: oldProject.samples[0].sample_id,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Import it from Product Development');
  });
});

describe('module-specific transfer history', () => {
  let values: Map<string, string>;
  let storage: StorageLike;
  beforeEach(() => {
    values = new Map();
    storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
  });

  it('records result metadata without storing a transfer payload', () => {
    recordTransferHistory({
      transfer_id: 'TX-A1B2C3D4', transfer_type: 'PRODUCT_TO_SENSORY',
      imported_or_exported: 'IMPORTED', timestamp: '2026-07-16T00:00:00.000Z',
      linked_record_id: 'SN-A1B2C3D4', filename: 'transfer.json',
      status: 'SUCCESS', warning_count: 1,
    }, storage);
    expect(getTransferHistory(storage)).toHaveLength(1);
    expect(values.has(SENSORY_TRANSFER_HISTORY_KEY)).toBe(true);
    expect(values.get(SENSORY_TRANSFER_HISTORY_KEY)).not.toContain('payload');
  });
});
