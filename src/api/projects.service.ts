import api from './axios';
import { getCached, invalidateReadCache, type ReadOptions } from './read-cache';
import type { ApiResponse, ProjectAssignmentRecord, ProjectMemberRecord, ProjectPayload, ProjectTestCaseRecord } from '@/src/types/api.ts';

type TestCasePayload = Pick<ProjectTestCaseRecord, 'title' | 'section' | 'priority' | 'status' | 'automationType' | 'preconditions' | 'steps' | 'tags'>;

export const ProjectsService = {
  // The backend scopes this collection to the authenticated caller.  Do not
  // replace it with a client-side filter of a global collection.
  list: (options?: ReadOptions) => getCached('/v1/projects', () => api.get('/v1/projects') as Promise<ApiResponse<ProjectAssignmentRecord[]>>, options),
  listMembers: (projectId: string, options?: ReadOptions) =>
    getCached(`/v1/projects/${projectId}/members`, () => api.get(`/v1/projects/${projectId}/members`) as Promise<ApiResponse<ProjectMemberRecord[]>>, options),
  create: async (payload: ProjectPayload) => {
    const response = await api.post('/v1/projects', payload) as ApiResponse<ProjectAssignmentRecord>;
    invalidateReadCache('/v1/projects');
    return response;
  },
  update: async (projectId: string, payload: Partial<ProjectPayload>) => {
    const response = await api.patch(`/v1/projects/${projectId}`, payload) as ApiResponse<ProjectAssignmentRecord>;
    invalidateReadCache('/v1/projects');
    return response;
  },
  remove: async (projectId: string) => {
    const response = await api.delete(`/v1/projects/${projectId}`) as ApiResponse<null>;
    invalidateReadCache('/v1/projects');
    return response;
  },
  listTestCases: (projectId: string, options?: ReadOptions) =>
    getCached(`/v1/projects/${projectId}/test-cases`, () => api.get(`/v1/projects/${projectId}/test-cases`) as Promise<ApiResponse<ProjectTestCaseRecord[]>>, options),
  createTestCase: async (projectId: string, payload: TestCasePayload) => {
    const response = await api.post(`/v1/projects/${projectId}/test-cases`, payload) as ApiResponse<ProjectTestCaseRecord>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    return response;
  },
  updateTestCase: async (projectId: string, id: string, payload: TestCasePayload) => {
    const response = await api.patch(`/v1/projects/${projectId}/test-cases/${id}`, payload) as ApiResponse<ProjectTestCaseRecord>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    return response;
  },
  removeTestCase: async (projectId: string, id: string) => {
    const response = await api.delete(`/v1/projects/${projectId}/test-cases/${id}`) as ApiResponse<null>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    return response;
  },
};
