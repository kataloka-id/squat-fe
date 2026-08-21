import { useEffect, useSyncExternalStore } from 'react';
import { UserFlowAreasService, type UserFlowArea } from '@/src/api/user-flow-areas.service.ts';
type State = { areas: UserFlowArea[]; loading: boolean; error: string | null };
let state: State = { areas: [], loading: false, error: null };
const listeners = new Set<() => void>();
let request: Promise<UserFlowArea[]> | null = null;
const emit = () => listeners.forEach((listener) => listener());
const load = (force = false): Promise<UserFlowArea[]> => {
  if (!force && state.areas.length) return Promise.resolve(state.areas);
  if (request) return request;
  state = { ...state, loading: true, error: null }; emit();
  request = UserFlowAreasService.list(force ? { force: true } : undefined).then((response) => { state = { areas: response.data, loading: false, error: null }; emit(); return response.data; }).catch((error) => { state = { ...state, loading: false, error: error instanceof Error ? error.message : 'Katalog Area tidak dapat dimuat.' }; emit(); return []; }).finally(() => { request = null; });
  return request;
};
export const userFlowAreaCatalogStore = { getSnapshot: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); }, load, refresh: () => load(true), mutate: async <T>(mutation: () => Promise<T>) => { const result = await mutation(); await load(true); return result; } };
export const useUserFlowAreaCatalog = (enabled = true) => { const snapshot = useSyncExternalStore(userFlowAreaCatalogStore.subscribe, userFlowAreaCatalogStore.getSnapshot, userFlowAreaCatalogStore.getSnapshot); useEffect(() => { if (enabled) void load(); }, [enabled]); return { ...snapshot, refresh: userFlowAreaCatalogStore.refresh }; };
