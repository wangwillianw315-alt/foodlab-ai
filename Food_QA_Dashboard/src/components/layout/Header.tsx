import {ArrowUpRight, FlaskConical} from 'lucide-react';
import {resolvePortalUrl} from '../../utils/portalUrl';

export function Header() {
  const portalUrl = resolvePortalUrl();

  return (
    <div className="border-t-4 border-t-emerald-600">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy-700 text-white">
          <FlaskConical size={23} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-700">
            FoodLab AI · QA Monitoring
          </p>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Food QA Dashboard
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
            COMPLETE
          </span>
          <a
            className="font-semibold text-slate-500 hover:text-navy-700"
            href="#/about"
          >
            Disclaimer
          </a>
          {portalUrl ? (
            <a
              className="btn-secondary"
              href={portalUrl}
              rel="noopener noreferrer"
            >
              Back to Portal <ArrowUpRight size={14} />
            </a>
          ) : (
            <span
              className="btn-secondary cursor-not-allowed opacity-60"
              title="Set VITE_PORTAL_URL to enable the Portal link"
              aria-disabled="true"
            >
              Portal link not configured
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
