import { useEffect, useSyncExternalStore } from 'react';
import { ProjectsService } from '@/src/api/projects.service.ts';
import type { SectionRecord } from '@/src/types/api.ts';

type CatalogState = {
  sectionsByProject: Record<string, SectionRecord[]>;
  loadingByProject: Record<string, boolean>;
  errorsByProject: Record<string, string | null>;
};

const initialState: CatalogState = { sectionsByProject: {}, loadingByProject: {}, errorsByProject: {} };
let state = initialState;
const listeners = new Set<() => void>();
const inFlight = new Map<string, Promise<SectionRecord[]>>();

const emit = () => listeners.forEach((listener) => listener());
const errorMessage = (error: unknown) =>
  typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Katalog Section tidak dapat dimuat.';

const setState = (next: Partial<CatalogState>) => {
  state = { ...state, ...next };
  emit();
};

export const sectionCatalogStore = {
  getSnapshot: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  load: (projectId: string, force = false): Promise<SectionRecord[]> => {
    if (!projectId) return Promise.resolve([]);
    if (!force && state.sectionsByProject[projectId]) return Promise.resolve(state.sectionsByProject[projectId]);
    if (!force && inFlight.has(projectId)) return inFlight.get(projectId)!;
    setState({ loadingByProject: { ...state.loadingByProject, [projectId]: true }, errorsByProject: { ...state.errorsByProject, [projectId]: null } });
    const listSections = ProjectsService.listSections;
    if (!listSections) {
      setState({ loadingByProject: { ...state.loadingByProject, [projectId]: false } });
      return Promise.resolve([]);
    }
    const request = listSections(projectId, force ? { force: true } : undefined)
      .then((response) => {
        setState({
          sectionsByProject: { ...state.sectionsByProject, [projectId]: response.data },
          loadingByProject: { ...state.loadingByProject, [projectId]: false },
        });
        return response.data;
      })
      .catch((error) => {
        setState({ loadingByProject: { ...state.loadingByProject, [projectId]: false }, errorsByProject: { ...state.errorsByProject, [projectId]: errorMessage(error) } });
        throw error;
      })
      .finally(() => inFlight.delete(projectId));
    inFlight.set(projectId, request);
    return request;
  },
  refresh: (projectId: string) => sectionCatalogStore.load(projectId, true),
  mutate: async <T>(projectId: string, mutation: () => Promise<T>) => {
    const result = await mutation();
    await sectionCatalogStore.refresh(projectId);
    return result;
  },
  replace: (projectId: string, sections: SectionRecord[]) => setState({ sectionsByProject: { ...state.sectionsByProject, [projectId]: sections } }),
  clearProject: (projectId: string) => {
    const next = { ...state.sectionsByProject };
    delete next[projectId];
    setState({ sectionsByProject: next });
  },
};

export const useSectionCatalogs = (projectIds: string[]) => {
  const snapshot = useSyncExternalStore(sectionCatalogStore.subscribe, sectionCatalogStore.getSnapshot, sectionCatalogStore.getSnapshot);
  const projectKey = projectIds.join('|');
  useEffect(() => {
    projectIds.forEach((projectId) => {
      if (!snapshot.sectionsByProject[projectId] && !snapshot.loadingByProject[projectId]) void sectionCatalogStore.load(projectId);
    });
  // projectKey intentionally represents the complete project scope.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);
  return snapshot.sectionsByProject;
};

export const useSectionCatalog = (projectId: string) => {
  const snapshot = useSyncExternalStore(sectionCatalogStore.subscribe, sectionCatalogStore.getSnapshot, sectionCatalogStore.getSnapshot);
  useEffect(() => {
    if (projectId) void sectionCatalogStore.load(projectId);
  }, [projectId]);
  return {
    sections: snapshot.sectionsByProject[projectId] ?? [],
    loading: Boolean(snapshot.loadingByProject[projectId]),
    error: snapshot.errorsByProject[projectId] ?? null,
    refresh: () => sectionCatalogStore.refresh(projectId),
  };
};
