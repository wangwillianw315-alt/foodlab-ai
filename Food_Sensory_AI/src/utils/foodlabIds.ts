const PREFIXES = {
  workspace: 'WS',
  productProject: 'PD',
  product: 'PR',
  formulaVersion: 'FV',
  sensoryProject: 'SN',
  sensoryTest: 'ST',
  transfer: 'TX',
} as const;

type FoodLabIdPrefix = (typeof PREFIXES)[keyof typeof PREFIXES];

export const FOODLAB_WORKSPACE_ID_KEY = 'foodlab-workspace-id';

const randomSuffix = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  const bytes = Array.from({length: 12}, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
  return bytes.join('');
};

export const createFoodLabId = (prefix: FoodLabIdPrefix, suffix = randomSuffix()) => {
  if (!/^[A-Fa-f0-9]{8,}$/.test(suffix)) {
    throw new Error('A FoodLab ID suffix must contain at least eight hexadecimal characters.');
  }
  return `${prefix}-${suffix.toUpperCase()}`;
};

export const createWorkspaceId = () => createFoodLabId(PREFIXES.workspace);
export const createProductProjectId = () => createFoodLabId(PREFIXES.productProject);
export const createProductId = () => createFoodLabId(PREFIXES.product);
export const createFormulaVersionId = () => createFoodLabId(PREFIXES.formulaVersion);
export const createSensoryProjectId = () => createFoodLabId(PREFIXES.sensoryProject);
export const createSensoryTestId = () => createFoodLabId(PREFIXES.sensoryTest);
export const createTransferId = () => createFoodLabId(PREFIXES.transfer);

export const isFoodLabId = (value: string, prefix: string) =>
  new RegExp(`^${prefix}-[A-Fa-f0-9]{8,}$`).test(value);

interface WorkspaceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const getOrCreateWorkspaceId = (storage?: WorkspaceStorage) => {
  let target = storage;
  if (!target) {
    try {
      target = typeof localStorage === 'undefined' ? undefined : localStorage;
    } catch {
      target = undefined;
    }
  }

  if (!target) return createWorkspaceId();

  try {
    const existing = target.getItem(FOODLAB_WORKSPACE_ID_KEY);
    if (existing && isFoodLabId(existing, 'WS')) return existing;
    const created = createWorkspaceId();
    target.setItem(FOODLAB_WORKSPACE_ID_KEY, created);
    return created;
  } catch {
    return createWorkspaceId();
  }
};
