import api from './axios';
import { getCached, invalidateReadCache, type ReadOptions } from './read-cache';
import type { ApiResponse } from '@/src/types/api.ts';

export interface UserFlowArea { id: string; name: string; usageCount: number; createdAt?: string; updatedAt?: string; }
const key = '/v1/user-flow-areas';
export const UserFlowAreasService = {
  list: (options?: ReadOptions) => getCached(key, () => api.get(key) as Promise<ApiResponse<UserFlowArea[]>>, options),
  create: async (payload: Pick<UserFlowArea, 'name'>) => { const response = await api.post(key, payload) as ApiResponse<UserFlowArea>; invalidateReadCache(key); return response; },
  update: async (id: string, payload: Pick<UserFlowArea, 'name'>) => { const response = await api.patch(`${key}/${id}`, payload) as ApiResponse<UserFlowArea>; invalidateReadCache(key); return response; },
  remove: async (id: string) => { const response = await api.delete(`${key}/${id}`) as ApiResponse<null>; invalidateReadCache(key); return response; },
};
