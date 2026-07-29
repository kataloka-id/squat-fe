import api from './axios';
import { getCached, invalidateReadCache, type ReadOptions } from './read-cache';
import type { ApiResponse, ProjectAssignmentRecord, ProjectMemberRecord, ProjectPayload, ProjectTestCaseRecord, SectionRecord, TestCaseImportPayload, TestCaseImportResult } from '@/src/types/api.ts';

type TestCasePayload = Pick<ProjectTestCaseRecord, 'title' | 'sectionId' | 'priority' | 'status' | 'automationType' | 'automationReadiness' | 'description' | 'preconditions' | 'mainExpectedResult' | 'steps' | 'tags'>;

export const ProjectsService = {
  // The backend scopes this collection to the authenticated caller.  Do not
  // replace it with a client-side filter of a global collection.
  list: (options?: ReadOptions) => getCached('/v1/projects', () => api.get('/v1/projects') as Promise<ApiResponse<ProjectAssignmentRecord[]>>, options),
  invalidateList: () => invalidateReadCache('/v1/projects'),
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
  listSections: (projectId: string, options?: ReadOptions) =>
    getCached(`/v1/projects/${projectId}/sections`, () => api.get(`/v1/projects/${projectId}/sections`) as Promise<ApiResponse<SectionRecord[]>>, options),
  createTestCase: async (projectId: string, payload: TestCasePayload) => {
    const response = await api.post(`/v1/projects/${projectId}/test-cases`, payload) as ApiResponse<ProjectTestCaseRecord>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    return response;
  },
  importTestCases: async (projectId: string, payload: TestCaseImportPayload) => {
    const response = await api.post(`/v1/projects/${projectId}/test-cases/import`, payload) as ApiResponse<TestCaseImportResult>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    invalidateReadCache('/v1/projects');
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

export const SectionsService = {
  list: (projectId: string, options?: ReadOptions) =>
    getCached(`/v1/projects/${projectId}/sections`, () => api.get(`/v1/projects/${projectId}/sections`) as Promise<ApiResponse<SectionRecord[]>>, options),
  create: async (projectId: string, payload: Pick<SectionRecord, 'name'>) => {
    const response = await api.post(`/v1/projects/${projectId}/sections`, payload) as ApiResponse<SectionRecord>;
    invalidateReadCache(`/v1/projects/${projectId}/sections`);
    return response;
  },
  update: async (projectId: string, id: string, payload: Pick<SectionRecord, 'name'>) => {
    const response = await api.patch(`/v1/projects/${projectId}/sections/${id}`, payload) as ApiResponse<SectionRecord>;
    invalidateReadCache(`/v1/projects/${projectId}/sections`);
    return response;
  },
  remove: async (projectId: string, id: string) => {
    const response = await api.delete(`/v1/projects/${projectId}/sections/${id}`) as ApiResponse<null>;
    invalidateReadCache(`/v1/projects/${projectId}/sections`);
    return response;
  },
};
