import api from './axios';
import { getCached, type ReadOptions } from './read-cache';
import { invalidateProjectResources } from './cache-invalidation.ts';
import { queryKeys } from './query-keys.ts';
import type { ApiResponse } from '@/src/types/api.ts';

export interface UserFlowArea {
  id: string;
  name: string;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
}
const key = '/v1/user-flow-areas';
export const UserFlowAreasService = {
  list: (projectId: string, options?: ReadOptions) =>
    getCached(
      queryKeys.userFlowAreas(projectId),
      () => api.get(key, { params: { projectId } }) as Promise<ApiResponse<UserFlowArea[]>>,
      options,
    ),
  create: async (projectId: string, payload: Pick<UserFlowArea, 'name'>) => {
    const response = (await api.post(key, payload, {
      params: { projectId },
    })) as ApiResponse<UserFlowArea>;
    invalidateProjectResources(projectId, ['areas', 'flows']);
    return response;
  },
  update: async (projectId: string, id: string, payload: Pick<UserFlowArea, 'name'>) => {
    const response = (await api.patch(`${key}/${id}`, payload, {
      params: { projectId },
    })) as ApiResponse<UserFlowArea>;
    invalidateProjectResources(projectId, ['areas', 'flows']);
    return response;
  },
  remove: async (projectId: string, id: string) => {
    const response = (await api.delete(`${key}/${id}`, {
      params: { projectId },
    })) as ApiResponse<null>;
    invalidateProjectResources(projectId, ['areas', 'flows']);
    return response;
  },
};
