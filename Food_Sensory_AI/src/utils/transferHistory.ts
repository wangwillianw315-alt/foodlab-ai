import {TransferHistoryEntry} from '../types/transfers';

export const SENSORY_TRANSFER_HISTORY_KEY =
  'foodlab-sensory-transfer-history-v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const resolveStorage = (storage?: StorageLike): StorageLike | null => {
  if (storage) return storage;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const isHistoryEntry = (value: unknown): value is TransferHistoryEntry => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.transfer_id === 'string' &&
    typeof entry.transfer_type === 'string' &&
    (entry.imported_or_exported === 'IMPORTED' ||
      entry.imported_or_exported === 'EXPORTED') &&
    typeof entry.timestamp === 'string' &&
    typeof entry.linked_record_id === 'string' &&
    typeof entry.filename === 'string' &&
    (entry.status === 'SUCCESS' || entry.status === 'FAILED') &&
    typeof entry.warning_count === 'number'
  );
};

export const getTransferHistory = (storage?: StorageLike) => {
  const target = resolveStorage(storage);
  if (!target) return [] as TransferHistoryEntry[];

  try {
    const raw = target.getItem(SENSORY_TRANSFER_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isHistoryEntry) : [];
  } catch {
    return [];
  }
};

export const recordTransferHistory = (
  entry: TransferHistoryEntry,
  storage?: StorageLike,
) => {
  const target = resolveStorage(storage);
  if (!target) return false;

  try {
    const next = [entry, ...getTransferHistory(target)].slice(0, 100);
    target.setItem(SENSORY_TRANSFER_HISTORY_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
};
