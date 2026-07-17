import type { ReactNode } from "react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRightLeft,
  Beaker,
  ChartNoAxesCombined,
  ChartSpline,
  ClipboardList,
  FileText,
  FlaskConical,
  Info,
  LayoutDashboard,
  Menu,
  Scale,
  X,
} from "lucide-react";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import { resolvePortalUrl } from "../utils/portalUrl";
const nav = [
  ["Dashboard", "/", LayoutDashboard],
  ["Projects", "/projects", ClipboardList],
  ["Ingredients", "/ingredients", FlaskConical],
  ["Formula Builder", "/formula", Beaker],
  ["Analysis", "/analysis", ChartSpline],
  ["Sensory", "/sensory", ChartNoAxesCombined],
  ["Compare", "/compare", Scale],
  ["Reports", "/reports", FileText],
  ["Send to Sensory", "/transfers", ArrowRightLeft],
  ["About", "/about", Info],
] as const;
export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false),
    error = useProductDevelopmentStore((s) => s.storageError),
    reset = useProductDevelopmentStore((s) => s.resetDemoData);
  const portalUrl = resolvePortalUrl();
  return (
    <div className="min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-5">
          <div className="rounded-xl bg-navy p-2 text-white">
            <Beaker size={24} />
          </div>
          <div>
            <p className="font-bold text-navy">FoodLab AI</p>
            <p className="text-xs text-slate-500">Product Development</p>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? "bg-slate-100 text-navy" : "text-slate-600 hover:bg-slate-50"}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-4 mx-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p>Demonstration and educational use only.</p>
          <NavLink
            className="mt-2 inline-block font-medium text-teal hover:underline"
            to="/about#disclaimer"
          >
            Shared disclaimer
          </NavLink>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-slate-200 bg-white/95 px-4 py-2 shadow-[inset_0_-3px_0_#0f766e] backdrop-blur lg:px-8">
          <button
            className="mr-3 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <div>
            <h1 className="font-semibold text-navy">
              Food Product Development AI
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Formula, cost, nutrition and sensory management for food
              innovation projects
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {portalUrl ? (
              <a
                className="btn-secondary !px-2.5 sm:!px-3.5"
                href={portalUrl}
                rel="noopener noreferrer"
                title="Back to FoodLab AI Portal"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back to Portal</span>
              </a>
            ) : (
              <span
                className="btn-secondary cursor-not-allowed !px-2.5 opacity-60 sm:!px-3.5"
                title="Set VITE_PORTAL_URL to enable the Portal link"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Portal link not configured</span>
              </span>
            )}
            <NavLink
              className="hidden text-xs font-medium text-slate-500 hover:text-teal md:inline"
              to="/about#disclaimer"
            >
              Disclaimer
            </NavLink>
            <span className="badge bg-emerald-100 text-emerald-700">
              V1.0 · Export ready
            </span>
          </div>
        </header>
        {error && (
          <div className="m-4 notice">
            {error}{" "}
            <button className="ml-2 underline" onClick={reset}>
              Restore demo data
            </button>
          </div>
        )}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
      {open && (
        <button
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close overlay"
        />
      )}
    </div>
  );
}
