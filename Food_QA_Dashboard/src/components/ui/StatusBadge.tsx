import type { QualityStatus } from '../../types/quality';
const style:Record<QualityStatus,string>={PASS:'bg-emerald-50 text-emerald-700 ring-emerald-600/20',WARNING:'bg-amber-50 text-amber-700 ring-amber-600/20',FAIL:'bg-rose-50 text-rose-700 ring-rose-600/20',INCOMPLETE:'bg-slate-100 text-slate-600 ring-slate-500/20'};
export function StatusBadge({status}:{status:QualityStatus}){return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ring-1 ring-inset ${style[status]}`}>{status}</span>}
