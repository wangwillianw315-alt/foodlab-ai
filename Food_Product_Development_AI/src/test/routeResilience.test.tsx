import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AnalysisPage from "../pages/AnalysisPage";
import SensoryPage from "../pages/SensoryPage";
import { useProductDevelopmentStore } from "../store/productDevelopmentStore";

describe("route resilience", () => {
  beforeEach(() => {
    useProductDevelopmentStore.getState().resetDemoData();
  });

  afterEach(cleanup);

  it("keeps analysis rendered when selection changes to an empty project", () => {
    render(
      <MemoryRouter>
        <AnalysisPage />
      </MemoryRouter>,
    );

    const source = useProductDevelopmentStore.getState().projects[0];
    const emptyProject = {
      ...structuredClone(source),
      project_id: "empty-analysis-project",
      project_name: "Empty analysis project",
      project_code: "EMPTY-ANALYSIS",
      formula_versions: [],
      sensory_tests: [],
    };

    act(() => {
      useProductDevelopmentStore.setState((state) => ({
        projects: [...state.projects, emptyProject],
        selectedProjectId: emptyProject.project_id,
        selectedFormulaId: "",
      }));
    });

    expect(screen.getByText("No formula versions")).toBeInTheDocument();
  });

  it("keeps sensory rendered when all projects are removed", () => {
    render(
      <MemoryRouter>
        <SensoryPage />
      </MemoryRouter>,
    );

    act(() => {
      useProductDevelopmentStore.setState({
        projects: [],
        selectedProjectId: "",
        selectedFormulaId: "",
      });
    });

    expect(screen.getByText("No projects")).toBeInTheDocument();
  });

  it("blocks a sensory CSV containing multiple formula versions", async () => {
    render(
      <MemoryRouter>
        <SensoryPage />
      </MemoryRouter>,
    );
    const file = {
      name: "mixed.csv",
      text: async () =>
        "panelist_id,formula_version,overall_liking\np1,V1 Base Formula,7\np2,V2 Higher Protein,8",
    } as File;

    fireEvent.change(screen.getByLabelText("Import sensory CSV"), {
      target: { files: [file] },
    });

    expect(
      await screen.findByText(
        "Sensory CSV must contain exactly one formula_version.",
      ),
    ).toBeInTheDocument();
  });
});
