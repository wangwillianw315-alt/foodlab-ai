import { useState } from "react";
import { Copy, Download, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader, Status } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import type { ProductDevelopmentProject } from "../types/productDevelopment";
import { downloadText, parseProjectJson } from "../utils/fileIO";
const categories = [
    "Dairy",
    "Beverage",
    "Bakery",
    "Snack",
    "Protein Product",
    "Plant-Based",
    "Meat Product",
    "Sauce",
    "Confectionery",
    "Other",
  ],
  stages = [
    "Idea",
    "Concept",
    "Bench Trial",
    "Pilot Trial",
    "Sensory Testing",
    "Reformulation",
    "Commercial Review",
    "Approved",
    "On Hold",
  ];
const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Project name is required."),
  category: z.string().min(1),
});
type ProjectForm = z.infer<typeof projectFormSchema>;
const makeProject = (
  name: string,
  category: string,
): ProductDevelopmentProject => {
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  return {
    project_id: id,
    project_name: name,
    product_category: category,
    project_code: `NPD-${Date.now().toString().slice(-6)}`,
    development_stage: "Idea",
    start_date: now.slice(0, 10),
    product_brief: {
      target_serving_size_g: null,
      target_cost_per_kg: null,
      target_protein_percent: null,
      target_fat_percent: null,
      target_sugar_percent: null,
      target_moisture_percent: null,
      target_energy_kj_per_100g: null,
      target_shelf_life_days: null,
      claims: [],
      constraints: [],
    },
    formula_versions: [],
    sensory_tests: [],
    development_notes: {
      trial_observations: "",
      processing_issues: "",
      texture_observations: "",
      flavour_observations: "",
      packaging_considerations: "",
      open_questions: "",
      next_actions: "",
    },
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
    is_demo: false,
  };
};
export default function ProjectsPage() {
  const {
      projects,
      createProject,
      deleteProject,
      duplicateProject,
      importProject,
      resetDemoData,
    } = useProductDevelopmentStore(),
    [show, setShow] = useState(false),
    [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: "", category: "Snack" },
  });
  const create = handleSubmit(({ name, category }) => {
    createProject(makeProject(name, category));
    reset();
    setShow(false);
  });
  const read = async (f?: File) => {
    if (!f) return;
    if (f.size > 5_000_000) {
      setError("File is too large (maximum 5 MB).");
      return;
    }
    try {
      const imported = parseProjectJson(await f.text());
      const existing = projects.find(
        (project) => project.project_id === imported.project_id,
      );
      if (
        existing &&
        !confirm(
          `Replace the existing project "${existing.project_name}" with the imported project?`,
        )
      )
        return;
      importProject(imported);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  };
  return (
    <>
      <PageHeader
        title="Product Development Projects"
        subtitle="Create, duplicate, import and manage structured NPD work."
        actions={
          <>
            <label className="btn-secondary cursor-pointer">
              <Upload size={16} />
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => read(e.target.files?.[0])}
              />
            </label>
            <button className="btn-secondary" onClick={resetDemoData}>
              <RotateCcw size={16} />
              Reset demo
            </button>
            <button className="btn-primary" onClick={() => setShow(!show)}>
              <Plus size={16} />
              New project
            </button>
          </>
        }
      />
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {show && (
        <form
          className="card mb-5 grid gap-3 sm:grid-cols-[1fr_220px_auto]"
          onSubmit={create}
        >
          <div>
            <label className="label">Project name</label>
            <input
              className="field"
              {...register("name")}
              placeholder="e.g. Fibre-rich cracker"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="label">Category</label>
            <select className="field" {...register("category")}>
              {categories.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary self-end" type="submit">
            Create project
          </button>
        </form>
      )}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <article className="card flex flex-col" key={p.project_id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-teal">
                  {p.project_code}
                </p>
                <Link
                  className="mt-1 block text-lg font-bold text-navy hover:underline"
                  to={`/projects/${p.project_id}`}
                >
                  {p.project_name}
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  {p.product_category} · {p.development_stage}
                </p>
              </div>
              <Status value={p.status} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Formula versions</p>
                <p className="metric font-semibold">
                  {p.formula_versions.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Sensory tests</p>
                <p className="metric font-semibold">{p.sensory_tests.length}</p>
              </div>
            </div>
            <div className="mt-auto flex gap-1 pt-4">
              <button
                title="Duplicate"
                className="btn-secondary !p-2"
                onClick={() => duplicateProject(p.project_id)}
              >
                <Copy size={16} />
              </button>
              <button
                title="Export JSON"
                className="btn-secondary !p-2"
                onClick={() =>
                  downloadText(
                    `${p.project_code}.json`,
                    JSON.stringify(p, null, 2),
                    "application/json",
                  )
                }
              >
                <Download size={16} />
              </button>
              <button
                title="Delete"
                className="btn-danger !p-2"
                onClick={() =>
                  confirm(`Delete ${p.project_name}?`) &&
                  deleteProject(p.project_id)
                }
              >
                <Trash2 size={16} />
              </button>
              <Link
                className="btn-primary ml-auto"
                to={`/projects/${p.project_id}`}
              >
                Open
              </Link>
            </div>
            {p.is_demo && (
              <p className="mt-3 text-xs text-slate-400">
                Demo project data only.
              </p>
            )}
          </article>
        ))}
      </div>
      <datalist id="stages">
        {stages.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </datalist>
    </>
  );
}
