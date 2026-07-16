import type { TransferHistoryEntry } from "../types/foodlabTransfer";

export const SHELF_LIFE_TRANSFER_HISTORY_KEY =
  "foodlab-shelf-life-transfer-history";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): StorageLike | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

export function readTransferHistory(
  storage: StorageLike | null = browserStorage(),
): TransferHistoryEntry[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(SHELF_LIFE_TRANSFER_HISTORY_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is TransferHistoryEntry => {
      if (!entry || typeof entry !== "object") return false;
      const item = entry as Partial<TransferHistoryEntry>;
      return Boolean(
        typeof item.transfer_id === "string" &&
          (item.transfer_type === "SENSORY_TO_SHELF_LIFE" ||
            item.transfer_type === "SHELF_LIFE_TO_QA") &&
          (item.imported_or_exported === "IMPORTED" ||
            item.imported_or_exported === "EXPORTED") &&
          typeof item.timestamp === "string" &&
          typeof item.linked_record_id === "string" &&
          typeof item.filename === "string" &&
          (item.status === "SUCCESS" || item.status === "FAILED") &&
          typeof item.warning_count === "number" &&
          Number.isInteger(item.warning_count) &&
          item.warning_count >= 0,
      );
    });
  } catch {
    return [];
  }
}

export function recordTransferHistory(
  entry: TransferHistoryEntry,
  storage: StorageLike | null = browserStorage(),
) {
  if (!storage) return false;
  try {
    const history = readTransferHistory(storage);
    storage.setItem(
      SHELF_LIFE_TRANSFER_HISTORY_KEY,
      JSON.stringify([entry, ...history].slice(0, 100)),
    );
    return true;
  } catch {
    return false;
  }
}
