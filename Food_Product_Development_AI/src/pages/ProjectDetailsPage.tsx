import { useState } from "react";
import { Save } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, PageHeader, Status } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
const claims = [
  "High Protein",
  "Reduced Sugar",
  "Low Fat",
  "High Fibre",
  "Plant-Based",
  "Gluten Free",
  "Dairy Free",
  "Vegan",
  "No Artificial Colours",
  "No Artificial Flavours",
];
export default function ProjectDetailsPage() {
  const { id } = useParams(),
    p = useProductDevelopmentStore((s) =>
      s.projects.find((x) => x.project_id === id),
    ),
    update = useProductDevelopmentStore((s) => s.updateProject),
    [tab, setTab] = useState<"overview" | "brief">("overview");
  if (!p)
    return (
      <EmptyState
        title="Project not found"
        body="Return to Projects and choose an available project."
      />
    );
  const set = (key: string, value: unknown) =>
    update(p.project_id, { [key]: value });
  const brief = (key: string, value: unknown) =>
    update(p.project_id, {
      product_brief: { ...p.product_brief, [key]: value },
    });
  const number = (k: string, v: string) => {
    if (v === "") {
      brief(k, null);
      return;
    }
    const parsed = Number(v);
    if (Number.isFinite(parsed) && parsed >= 0) brief(k, parsed);
  };
  return (
    <>
      <PageHeader
        title={p.project_name}
        subtitle={`${p.project_code} · ${p.product_category}`}
        actions={
          <>
            <Link
              to="/formula"
              onClick={() =>
                useProductDevelopmentStore
                  .getState()
                  .setSelection(p.project_id, p.formula_versions[0]?.formula_id)
              }
              className="btn-primary"
            >
              Open Formula Builder
            </Link>
            <Status value={p.status} />
          </>
        }
      />
      <div className="mb-5 flex gap-2">
        <button
          className={tab === "overview" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("overview")}
        >
          Project overview
        </button>
        <button
          className={tab === "brief" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("brief")}
        >
          Product Brief
        </button>
      </div>
      {tab === "overview" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="card grid gap-4 sm:grid-cols-2">
            {[
              ["Project name", "project_name"],
              ["Project code", "project_code"],
              ["Customer / brand", "customer_or_brand"],
              ["Target market", "target_market"],
              ["Project owner", "project_owner"],
              ["Target launch date", "target_launch_date"],
            ].map(([l, k]) => (
              <label key={k}>
                <span className="label">{l}</span>
                <input
                  className="field"
                  type={k.includes("date") ? "date" : "text"}
                  value={String((p as any)[k] ?? "")}
                  onChange={(e) => set(k, e.target.value)}
                />
              </label>
            ))}
            <label>
              <span className="label">Development stage</span>
              <input
                className="field"
                list="stages"
                value={p.development_stage}
                onChange={(e) => set("development_stage", e.target.value)}
              />
            </label>
            <label>
              <span className="label">Status</span>
              <select
                className="field"
                value={p.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="label">Project objective</span>
              <textarea
                className="field"
                rows={4}
                value={p.project_objective ?? ""}
                onChange={(e) => set("project_objective", e.target.value)}
              />
            </label>
          </section>
          <section className="card">
            <h3 className="font-semibold text-navy">Development context</h3>
            {[
              ["Allergen notes", "allergen_notes"],
              ["Packaging notes", "packaging_notes"],
              ["Processing notes", "processing_notes"],
            ].map(([l, k]) => (
              <label className="mt-4 block" key={k}>
                <span className="label">{l}</span>
                <textarea
                  className="field"
                  rows={3}
                  value={String((p as any)[k] ?? "")}
                  onChange={(e) => set(k, e.target.value)}
                />
              </label>
            ))}
          </section>
        </div>
      ) : (
        <>
          <div className="notice mb-5">
            Claims are planning labels only. Regulatory eligibility is not
            assessed in V1.
          </div>
          <section className="card">
            <label>
              <span className="label">Product description</span>
              <textarea
                className="field"
                rows={3}
                value={p.product_brief.product_description ?? ""}
                onChange={(e) => brief("product_description", e.target.value)}
              />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Serving size", "target_serving_size_g", "g"],
                ["Cost", "target_cost_per_kg", "$/kg"],
                ["Protein", "target_protein_percent", "%"],
                ["Fat", "target_fat_percent", "%"],
                ["Sugar", "target_sugar_percent", "%"],
                ["Moisture", "target_moisture_percent", "%"],
                ["Energy", "target_energy_kj_per_100g", "kJ/100g"],
                ["Shelf life", "target_shelf_life_days", "days"],
              ].map(([l, k, u]) => (
                <label key={k}>
                  <span className="label">
                    Target {l} ({u})
                  </span>
                  <input
                    className="field metric"
                    type="number"
                    min="0"
                    value={(p.product_brief as any)[k] ?? ""}
                    onChange={(e) => number(k, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Storage condition", "storage_condition"],
                ["Target texture", "target_texture"],
                ["Target flavour", "target_flavour"],
                ["Target colour", "target_colour"],
              ].map(([l, k]) => (
                <label key={k}>
                  <span className="label">{l}</span>
                  <input
                    className="field"
                    value={String((p.product_brief as any)[k] ?? "")}
                    onChange={(e) => brief(k, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="mt-5">
              <span className="label">Planning claims</span>
              <div className="flex flex-wrap gap-2">
                {claims.map((c) => (
                  <label
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${p.product_brief.claims.includes(c) ? "border-teal bg-teal/10 text-teal" : "border-slate-200"}`}
                    key={c}
                  >
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={p.product_brief.claims.includes(c)}
                      onChange={(e) =>
                        brief(
                          "claims",
                          e.target.checked
                            ? [...p.product_brief.claims, c]
                            : p.product_brief.claims.filter((x) => x !== c),
                        )
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Save size={14} /> Changes save automatically to this browser.
      </p>
    </>
  );
}
