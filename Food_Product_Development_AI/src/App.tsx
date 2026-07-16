import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailsPage = lazy(() => import("./pages/ProjectDetailsPage"));
const IngredientLibraryPage = lazy(
  () => import("./pages/IngredientLibraryPage"),
);
const FormulaBuilderPage = lazy(() => import("./pages/FormulaBuilderPage"));
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));
const FormulaComparePage = lazy(() => import("./pages/FormulaComparePage"));
const SensoryPage = lazy(() => import("./pages/SensoryPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const TransfersPage = lazy(() => import("./pages/TransfersPage"));
export default function App() {
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="card py-16 text-center text-sm text-slate-500">
            Loading workspace…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/ingredients" element={<IngredientLibraryPage />} />
          <Route path="/formula" element={<FormulaBuilderPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/sensory" element={<SensoryPage />} />
          <Route path="/compare" element={<FormulaComparePage />} />
          <Route path="/reports" element={<ReportPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
