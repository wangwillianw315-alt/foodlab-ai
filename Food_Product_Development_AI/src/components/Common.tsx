import type { ReactNode } from "react";
export const PageHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) => (
  <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
    <div>
      <h2 className="text-2xl font-bold text-navy">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
  </div>
);
export const EmptyState = ({
  title,
  body,
}: {
  title: string;
  body: string;
}) => (
  <div className="card py-12 text-center">
    <p className="font-semibold text-slate-700">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{body}</p>
  </div>
);
export const fmt = (n: number | null | undefined, d = 2) =>
  n == null || !Number.isFinite(n) ? "Data missing" : n.toFixed(d);
export const Status = ({ value }: { value: string }) => {
  const color =
    value.includes("MEETS") || value === "APPROVED" || value === "COMPLETED"
      ? "bg-emerald-100 text-emerald-700"
      : value.includes("CLOSE") ||
          value === "SHORTLISTED" ||
          value === "ON_HOLD"
        ? "bg-amber-100 text-amber-700"
        : value.includes("OUTSIDE") ||
            value === "REJECTED" ||
            value === "CANCELLED"
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-600";
  return <span className={`badge ${color}`}>{value.replaceAll("_", " ")}</span>;
};
