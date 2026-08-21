import { useEffect, useSyncExternalStore } from 'react';
import { UserFlowAreasService, type UserFlowArea } from '@/src/api/user-flow-areas.service.ts';
type State = { areas: UserFlowArea[]; loading: boolean; error: string | null };
let state: State = { areas: [], loading: false, error: null };
const listeners = new Set<() => void>();
let request: Promise<UserFlowArea[]> | null = null;
let requestProjectId = '';
let currentProjectId = '';
const emit = () => listeners.forEach((listener) => listener());
const load = (projectId: string, force = false): Promise<UserFlowArea[]> => {
  const changedProject = currentProjectId !== projectId;
  currentProjectId = projectId;
  if (!projectId) return Promise.resolve([]);
  if (changedProject) { state = { areas: [], loading: false, error: null }; emit(); }
  if (!force && state.areas.length) return Promise.resolve(state.areas);
  if (request && requestProjectId === projectId) return request;
  state = { ...state, loading: true, error: null }; emit();
  requestProjectId = projectId;
  request = UserFlowAreasService.list(projectId, force ? { force: true } : undefined).then((response) => { if (currentProjectId !== projectId) return []; state = { areas: response.data, loading: false, error: null }; emit(); return response.data; }).catch((error) => { if (currentProjectId !== projectId) return []; state = { ...state, loading: false, error: error instanceof Error ? error.message : 'Katalog Area tidak dapat dimuat.' }; emit(); return []; }).finally(() => { if (requestProjectId === projectId) request = null; });
  return request;
};
export const userFlowAreaCatalogStore = { getSnapshot: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); }, load, refresh: () => load(currentProjectId, true), mutate: async <T>(mutation: () => Promise<T>) => { const result = await mutation(); await load(currentProjectId, true); return result; } };
export const useUserFlowAreaCatalog = (projectId: string, enabled = true) => { const snapshot = useSyncExternalStore(userFlowAreaCatalogStore.subscribe, userFlowAreaCatalogStore.getSnapshot, userFlowAreaCatalogStore.getSnapshot); useEffect(() => { if (enabled) void load(projectId); }, [enabled, projectId]); return { ...snapshot, refresh: userFlowAreaCatalogStore.refresh }; };
