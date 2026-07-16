import type { TransferHistoryEntry } from "../types/foodlabTransfer";

export const PRODUCT_TRANSFER_HISTORY_KEY =
  "foodlab-product-development-transfer-history-v1";

const isHistoryEntry = (value: unknown): value is TransferHistoryEntry => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.transfer_id === "string" &&
    typeof entry.transfer_type === "string" &&
    (entry.imported_or_exported === "IMPORTED" ||
      entry.imported_or_exported === "EXPORTED") &&
    typeof entry.timestamp === "string" &&
    typeof entry.linked_record_id === "string" &&
    typeof entry.filename === "string" &&
    (entry.status === "SUCCESS" || entry.status === "FAILED") &&
    typeof entry.warning_count === "number"
  );
};

export const parseTransferHistory = (raw: string | null) => {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isHistoryEntry) : [];
  } catch {
    return [];
  }
};

export const loadTransferHistory = (
  storage: Pick<Storage, "getItem"> = localStorage,
) => parseTransferHistory(storage.getItem(PRODUCT_TRANSFER_HISTORY_KEY));

export const recordTransferHistory = (
  entry: TransferHistoryEntry,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
) => {
  const history = [entry, ...loadTransferHistory(storage)].slice(0, 100);
  storage.setItem(PRODUCT_TRANSFER_HISTORY_KEY, JSON.stringify(history));
  return history;
};

