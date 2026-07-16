import { useMemo, useState } from "react";
import { Copy, Download, Plus, Search, Trash2, Upload } from "lucide-react";
import { PageHeader, fmt } from "../components/Common";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";
import type { Ingredient } from "../types/productDevelopment";
import {
  downloadText,
  ingredientsToCsv,
  parseIngredientCsv,
} from "../utils/fileIO";
const blank = (): Ingredient => ({
  ingredient_id: crypto.randomUUID(),
  ingredient_name: "",
  category: "Other",
  supplier: "",
  supplier_code: "",
  cost_per_kg: null,
  protein_per_100g: null,
  fat_per_100g: null,
  carbohydrate_per_100g: null,
  sugar_per_100g: null,
  fibre_per_100g: null,
  moisture_per_100g: null,
  energy_kj_per_100g: null,
  allergens: [],
  notes: "",
  is_demo: false,
});
export default function IngredientLibraryPage() {
  const {
      projects,
      ingredients,
      addIngredient,
      updateIngredient,
      deleteIngredient,
    } = useProductDevelopmentStore(),
    [q, setQ] = useState(""),
    [cat, setCat] = useState("All"),
    [edit, setEdit] = useState<Ingredient | null>(null),
    [error, setError] = useState("");
  const categories = ["All", ...new Set(ingredients.map((i) => i.category))],
    shown = useMemo(
      () =>
        ingredients.filter(
          (i) =>
            (cat === "All" || i.category === cat) &&
            i.ingredient_name.toLowerCase().includes(q.toLowerCase()),
        ),
      [ingredients, q, cat],
    );
  const save = () => {
    if (!edit?.ingredient_name.trim()) {
      setError("Ingredient name is required.");
      return;
    }
    if (!edit.category.trim()) {
      setError("Ingredient category is required.");
      return;
    }
    const numericValues = [
      edit.cost_per_kg,
      edit.protein_per_100g,
      edit.fat_per_100g,
      edit.carbohydrate_per_100g,
      edit.sugar_per_100g,
      edit.fibre_per_100g,
      edit.moisture_per_100g,
      edit.energy_kj_per_100g,
    ];
    if (
      numericValues.some(
        (value) => value != null && (!Number.isFinite(value) || value < 0),
      )
    ) {
      setError("Ingredient numeric values must be non-negative numbers.");
      return;
    }
    ingredients.some((i) => i.ingredient_id === edit.ingredient_id)
      ? updateIngredient(edit.ingredient_id, edit)
      : addIngredient(edit);
    setEdit(null);
    setError("");
  };
  const importCsv = async (f?: File) => {
    if (!f) return;
    if (f.size > 5_000_000) {
      setError("File is too large (maximum 5 MB).");
      return;
    }
    try {
      const imported = parseIngredientCsv(await f.text());
      const existingIds = new Set(
        ingredients.map((item) => item.ingredient_id),
      );
      const conflict = imported.find((item) =>
        existingIds.has(item.ingredient_id),
      );
      if (conflict)
        throw new Error(
          `Ingredient ID ${conflict.ingredient_id} already exists. Import cancelled.`,
        );
      imported.forEach(addIngredient);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  };
  const removeIngredient = (ingredient: Ingredient) => {
    const projectUsingIngredient = projects.find((project) =>
      project.formula_versions.some((formula) =>
        formula.ingredients.some(
          (line) => line.ingredient_id === ingredient.ingredient_id,
        ),
      ),
    );
    if (projectUsingIngredient) {
      setError(
        `Cannot delete ${ingredient.ingredient_name}; it is used by ${projectUsingIngredient.project_name}.`,
      );
      return;
    }
    deleteIngredient(ingredient.ingredient_id);
    setError("");
  };
  return (
    <>
      <PageHeader
        title="Ingredient Library"
        subtitle={`${ingredients.length} ingredients · supplier, cost and illustrative composition data`}
        actions={
          <>
            <label className="btn-secondary cursor-pointer">
              <Upload size={16} />
              Import CSV
              <input
                className="hidden"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => importCsv(e.target.files?.[0])}
              />
            </label>
            <button
              className="btn-secondary"
              onClick={() =>
                downloadText(
                  "ingredients.csv",
                  ingredientsToCsv(ingredients),
                  "text/csv",
                )
              }
            >
              <Download size={16} />
              Export CSV
            </button>
            <button className="btn-primary" onClick={() => setEdit(blank())}>
              <Plus size={16} />
              Custom ingredient
            </button>
          </>
        }
      />
      <div className="notice mb-5">
        Illustrative values only. Verify against supplier specifications before
        use.
      </div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {edit && (
        <section className="card mb-5">
          <h3 className="mb-4 font-semibold text-navy">
            {edit.is_demo ? "Copy demo ingredient" : "Custom ingredient"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span className="label">Name</span>
              <input
                className="field"
                value={edit.ingredient_name}
                onChange={(e) =>
                  setEdit({ ...edit, ingredient_name: e.target.value })
                }
              />
            </label>
            <label>
              <span className="label">Category</span>
              <input
                className="field"
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              />
            </label>
            {[
              ["Cost", "cost_per_kg"],
              ["Protein", "protein_per_100g"],
              ["Fat", "fat_per_100g"],
              ["Carbohydrate", "carbohydrate_per_100g"],
              ["Sugar", "sugar_per_100g"],
              ["Fibre", "fibre_per_100g"],
              ["Moisture", "moisture_per_100g"],
              ["Energy", "energy_kj_per_100g"],
            ].map(([l, k]) => (
              <label key={k}>
                <span className="label">
                  {l} (
                  {k === "cost_per_kg"
                    ? "$/kg"
                    : k === "energy_kj_per_100g"
                      ? "kJ/100g"
                      : "g/100g"}
                  )
                </span>
                <input
                  className="field"
                  type="number"
                  min="0"
                  value={(edit as any)[k] ?? ""}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      [k]:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={save}>
              Save ingredient
            </button>
            <button className="btn-secondary" onClick={() => setEdit(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search
            className="absolute left-3 top-2.5 text-slate-400"
            size={18}
          />
          <input
            className="field pl-10"
            placeholder="Search ingredients"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          className="field sm:w-56"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          {categories.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="card !p-0 table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Category</th>
              <th>Cost $/kg</th>
              <th>Protein</th>
              <th>Fat</th>
              <th>Sugar</th>
              <th>Energy</th>
              <th>Allergens</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.ingredient_id}>
                <td>
                  <p className="font-medium">{i.ingredient_name}</p>
                  <p className="text-xs text-slate-400">
                    {i.is_demo ? "Demo" : "Custom"}
                  </p>
                </td>
                <td>{i.category}</td>
                <td className="metric">{fmt(i.cost_per_kg)}</td>
                <td className="metric">{fmt(i.protein_per_100g, 1)}</td>
                <td className="metric">{fmt(i.fat_per_100g, 1)}</td>
                <td className="metric">{fmt(i.sugar_per_100g, 1)}</td>
                <td className="metric">{fmt(i.energy_kj_per_100g, 0)}</td>
                <td>{i.allergens.join(", ") || "—"}</td>
                <td>
                  <div className="flex gap-1">
                    <button
                      className="btn-secondary !p-2"
                      title={i.is_demo ? "Copy to custom" : "Edit"}
                      onClick={() =>
                        setEdit({
                          ...structuredClone(i),
                          ingredient_id: i.is_demo
                            ? crypto.randomUUID()
                            : i.ingredient_id,
                          ingredient_name: i.is_demo
                            ? `${i.ingredient_name} Copy`
                            : i.ingredient_name,
                          is_demo: false,
                        })
                      }
                    >
                      <Copy size={15} />
                    </button>
                    {!i.is_demo && (
                      <button
                        className="btn-danger !p-2"
                        onClick={() => removeIngredient(i)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
