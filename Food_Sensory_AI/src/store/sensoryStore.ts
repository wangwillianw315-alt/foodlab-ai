import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {demoSensoryProjects} from '../data/demoSensoryProjects';
import {
  HedonicResponse,
  Panelist,
  SensoryProject,
  SensorySample,
  SensoryTest,
} from '../types/sensory';
import {ProductImportEdits, buildSensoryProjectFromProductTransfer, parseProductToSensoryTransfer} from '../utils/transfers';
import {generateBlindCode} from '../utils/blindCodes';
import {shuffle} from '../utils/randomisation';
import {isSensoryProjectShape, validateStoredJson} from '../utils/storage';
import {recordTransferHistory} from '../utils/transferHistory';

type TransferImportOptions = ProductImportEdits & {filename?: string};

type Store = {
  projects: SensoryProject[];
  selectedProjectId: string;
  storageError: string | null;
  selectProject: (id: string) => void;
  createProject: (project: Partial<SensoryProject>) => void;
  updateProject: (id: string, project: Partial<SensoryProject>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  archiveProject: (id: string) => void;
  addSample: (
    id: string,
    sample: Omit<SensorySample, 'sample_id' | 'blind_code'>,
  ) => void;
  addTest: (id: string, test: Omit<SensoryTest, 'test_id' | 'project_id'>) => void;
  addPanelist: (id: string, panelist: Omit<Panelist, 'panelist_id'>) => void;
  addResponses: (id: string, responses: HedonicResponse[]) => void;
  deleteResponse: (id: string, responseId: string) => void;
  regenerateBlindCodes: (id: string) => void;
  generateServingOrder: (id: string) => string[];
  importProject: (json: string) => {ok: boolean; message: string};
  importProductTransfer: (
    input: string | unknown,
    options?: TransferImportOptions,
  ) => {
    ok: boolean;
    message: string;
    projectId?: string;
    sensoryProjectId?: string;
    transferId?: string;
    warningCount: number;
  };
  resetDemo: () => void;
};

const clone = () => structuredClone(demoSensoryProjects);
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const safeStorage = {
  getItem: (name: string) => {
    try {
      const raw = localStorage.getItem(name);
      const checked = validateStoredJson(raw);
      if (!checked.valid && raw) {
        localStorage.setItem(`${name}-corrupt-backup-${Date.now()}`, raw);
        return null;
      }
      return raw;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // The UI remains usable when browser storage is unavailable.
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // No-op when browser storage is unavailable.
    }
  },
};

const failedTransferId = (input: unknown) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'TX-UNKNOWN';
  const candidate = (input as Record<string, unknown>).transfer_id;
  return typeof candidate === 'string' ? candidate : 'TX-UNKNOWN';
};

export const useSensoryStore = create<Store>()(
  persist(
    (set, get) => ({
      projects: clone(),
      selectedProjectId: 'bar-project',
      storageError: null,
      selectProject: (selectedProjectId) => set({selectedProjectId}),
      createProject: (project) =>
        set((state) => {
          const project_id = id();
          return {
            projects: [
              ...state.projects,
              {
                project_id,
                project_name: project.project_name || 'Untitled sensory project',
                project_code: project.project_code || `FS-${Date.now()}`,
                product_category: project.product_category || 'Other',
                research_objective: project.research_objective || '',
                target_consumer: project.target_consumer || '',
                project_status: 'PLANNING',
                samples: [],
                tests: [],
                panelists: [],
                hedonicResponses: [],
                jarResponses: [],
                triangleResponses: [],
                cataResponses: [],
                created_at: now(),
                updated_at: now(),
              },
            ],
            selectedProjectId: project_id,
          };
        }),
      updateProject: (projectId, update) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.project_id === projectId
              ? {...project, ...update, updated_at: now()}
              : project,
          ),
        })),
      deleteProject: (projectId) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.project_id !== projectId),
          selectedProjectId:
            state.selectedProjectId === projectId
              ? state.projects.find((project) => project.project_id !== projectId)
                  ?.project_id || ''
              : state.selectedProjectId,
        })),
      duplicateProject: (projectId) =>
        set((state) => {
          const source = state.projects.find((project) => project.project_id === projectId);
          if (!source) return state;
          const copy = structuredClone(source);
          const newId = id();
          copy.project_id = newId;
          copy.project_name += ' (Copy)';
          copy.project_code += '-COPY';
          copy.demo = false;
          copy.sensory_project_id = undefined;
          copy.source_transfer_id = undefined;
          copy.tests = copy.tests.map((test) => ({
            ...test,
            test_id: id(),
            sensory_test_id: undefined,
            project_id: newId,
          }));
          copy.created_at = copy.updated_at = now();
          return {projects: [...state.projects, copy], selectedProjectId: newId};
        }),
      archiveProject: (projectId) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.project_id === projectId
              ? {...project, archived: true, updated_at: now()}
              : project,
          ),
        })),
      addSample: (projectId, value) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.project_id !== projectId) return project;
            const used = project.samples.map((sample) => sample.blind_code);
            return {
              ...project,
              samples: [
                ...project.samples,
                {...value, sample_id: id(), blind_code: generateBlindCode(used)},
              ],
              updated_at: now(),
            };
          }),
        })),
      addTest: (projectId, value) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.project_id === projectId
              ? {
                  ...project,
                  tests: [
                    ...project.tests,
                    {...value, test_id: id(), project_id: projectId},
                  ],
                  updated_at: now(),
                }
              : project,
          ),
        })),
      addPanelist: (projectId, value) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.project_id === projectId
              ? {
                  ...project,
                  panelists: [...project.panelists, {...value, panelist_id: id()}],
                  updated_at: now(),
                }
              : project,
          ),
        })),
      addResponses: (projectId, responses) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.project_id !== projectId) return project;
            const seen = new Set(
              project.hedonicResponses.map(
                (response) =>
                  `${response.test_id}|${response.panelist_id}|${response.sample_id}`,
              ),
            );
            const unique = responses.filter((response) => {
              const key = `${response.test_id}|${response.panelist_id}|${response.sample_id}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return {
              ...project,
              hedonicResponses: [...project.hedonicResponses, ...unique],
              updated_at: now(),
            };
          }),
        })),
      deleteResponse: (projectId, responseId) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.project_id === projectId
              ? {
                  ...project,
                  hedonicResponses: project.hedonicResponses.filter(
                    (response) => response.response_id !== responseId,
                  ),
                }
              : project,
          ),
        })),
      regenerateBlindCodes: (projectId) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.project_id !== projectId) return project;
            const codes: string[] = [];
            return {
              ...project,
              samples: project.samples.map((sample) => {
                const blind_code = generateBlindCode(codes);
                codes.push(blind_code);
                return {...sample, blind_code};
              }),
              blind_code_history: [...(project.blind_code_history || []), ...codes],
              updated_at: now(),
            };
          }),
        })),
      generateServingOrder: (projectId) =>
        shuffle(
          get()
            .projects.find((project) => project.project_id === projectId)
            ?.samples.map((sample) => sample.blind_code) || [],
        ),
      importProject: (json) => {
        try {
          const value: unknown = JSON.parse(json);
          if (!isSensoryProjectShape(value)) {
            throw new Error('Invalid sensory project structure');
          }
          const project = value as SensoryProject;
          set((state) => ({
            projects: [
              ...state.projects,
              {
                ...project,
                project_id: id(),
                demo: false,
                created_at: now(),
                updated_at: now(),
              },
            ],
          }));
          return {ok: true, message: 'Project imported'};
        } catch (error) {
          try {
            localStorage.setItem(`food-sensory-ai-corrupt-backup-${Date.now()}`, json);
          } catch {
            // No-op when browser storage is unavailable.
          }
          return {
            ok: false,
            message: error instanceof Error ? error.message : 'Invalid JSON',
          };
        }
      },
      importProductTransfer: (input, options = {}) => {
        const parsed = parseProductToSensoryTransfer(input);
        if (!parsed.ok) {
          recordTransferHistory({
            transfer_id: failedTransferId(input),
            transfer_type: 'PRODUCT_TO_SENSORY',
            imported_or_exported: 'IMPORTED',
            timestamp: now(),
            linked_record_id: '',
            filename: options.filename || 'product-to-sensory.json',
            status: 'FAILED',
            warning_count: 0,
          });
          return {ok: false, message: parsed.error, warningCount: 0};
        }

        const built = buildSensoryProjectFromProductTransfer(parsed.value, options);
        set((state) => ({
          projects: [...state.projects, built.project],
          selectedProjectId: built.project.project_id,
        }));
        const warningCount = parsed.warnings.length + built.warnings.length;
        recordTransferHistory({
          transfer_id: parsed.value.transfer_id,
          transfer_type: 'PRODUCT_TO_SENSORY',
          imported_or_exported: 'IMPORTED',
          timestamp: now(),
          linked_record_id: built.project.sensory_project_id || built.project.project_id,
          filename: options.filename || 'product-to-sensory.json',
          status: 'SUCCESS',
          warning_count: warningCount,
        });
        return {
          ok: true,
          message: `Created a new sensory project with ${built.project.samples.length} linked samples.`,
          projectId: built.project.project_id,
          sensoryProjectId: built.project.sensory_project_id,
          transferId: parsed.value.transfer_id,
          warningCount,
        };
      },
      resetDemo: () =>
        set({projects: clone(), selectedProjectId: 'bar-project', storageError: null}),
    }),
    {
      name: 'food-sensory-ai',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        projects: state.projects,
        selectedProjectId: state.selectedProjectId,
      }),
    },
  ),
);
