import api from './axios';
import { getCached, invalidateReadCache, type ReadOptions } from './read-cache';
import type { ApiResponse, FolderDeleteImpact, ProjectAssignmentRecord, ProjectMemberRecord, ProjectPayload, ProjectTestCaseRecord, ReusableTestCaseRecord, SectionRecord, TestCaseFolderRecord, TestCaseFolderTreeResponse, TestCaseImportPayload, TestCaseImportResult } from '@/src/types/api.ts';

export type TestCasePayload = Pick<ProjectTestCaseRecord, 'title' | 'sectionId' | 'priority' | 'status' | 'automationType' | 'automationReadiness' | 'isReusable' | 'description' | 'preconditions' | 'mainExpectedResult' | 'steps' | 'tags'> & {
  folderId?: string | null;
  linkedPreconditions?: Array<{ testCaseId: string; sortOrder: number }>;
};
export type BulkTestCaseUpdates = Partial<Pick<ProjectTestCaseRecord, 'sectionId' | 'priority' | 'status' | 'automationType' | 'automationReadiness'>> & { folderId?: string | null };

export const ProjectsService = {
  // The backend scopes this collection to the authenticated caller.  Do not
  // replace it with a client-side filter of a global collection.
  list: (options?: ReadOptions) => getCached('/v1/projects', () => api.get('/v1/projects') as Promise<ApiResponse<ProjectAssignmentRecord[]>>, options),
  /** Pending projects are server-scoped to eligible project lifecycle admins. */
  listPendingDeletion: (options?: ReadOptions) => getCached('/v1/projects/pending-deletion', () => api.get('/v1/projects/pending-deletion') as Promise<ApiResponse<ProjectAssignmentRecord[]>>, options),
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
  restore: async (projectId: string) => {
    const response = await api.post(`/v1/projects/${projectId}/restore`) as ApiResponse<ProjectAssignmentRecord>;
    invalidateReadCache('/v1/projects');
    invalidateReadCache('/v1/projects/pending-deletion');
    return response;
  },
  permanentlyRemove: async (projectId: string) => {
    const response = await api.delete(`/v1/projects/${projectId}/permanent`) as ApiResponse<null>;
    invalidateReadCache('/v1/projects');
    invalidateReadCache('/v1/projects/pending-deletion');
    return response;
  },
  listTestCases: (projectId: string, options?: ReadOptions) =>
    getCached(`/v1/projects/${projectId}/test-cases`, () => api.get(`/v1/projects/${projectId}/test-cases`) as Promise<ApiResponse<ProjectTestCaseRecord[]>>, options),
  listTestCasesInFolder: (projectId: string, query: { folderId?: string; unfiled?: boolean; includeSubfolders?: boolean } = {}) =>
    api.get(`/v1/projects/${projectId}/test-cases`, { params: { scope: query.folderId ? 'folder' : query.unfiled ? 'unfiled' : 'all', folderId: query.folderId, includeSubfolders: query.includeSubfolders } }) as Promise<ApiResponse<ProjectTestCaseRecord[]>>,
  listTestCaseFolders: (projectId: string, options?: ReadOptions) =>
    getCached(`/v1/projects/${projectId}/test-case-folders`, () => api.get(`/v1/projects/${projectId}/test-case-folders`) as Promise<ApiResponse<TestCaseFolderTreeResponse>>, options),
  createTestCaseFolder: async (projectId: string, payload: { name: string; parentId?: string | null }) => {
    const response = await api.post(`/v1/projects/${projectId}/test-case-folders`, payload) as ApiResponse<TestCaseFolderRecord>;
    invalidateReadCache(`/v1/projects/${projectId}/test-case-folders`); return response;
  },
  updateTestCaseFolder: async (projectId: string, folderId: string, payload: { name: string }) => {
    const response = await api.patch(`/v1/projects/${projectId}/test-case-folders/${folderId}`, payload) as ApiResponse<TestCaseFolderRecord>;
    invalidateReadCache(`/v1/projects/${projectId}/test-case-folders`); return response;
  },
  getTestCaseFolderDeleteImpact: (projectId: string, folderId: string) => api.get(`/v1/projects/${projectId}/test-case-folders/${folderId}/delete-impact`) as Promise<ApiResponse<FolderDeleteImpact>>,
  removeTestCaseFolder: async (projectId: string, folderId: string, payload: { strategy: 'MOVE_TO_PARENT' | 'MOVE_TEST_CASES_TO_UNFILED' | 'DELETE_ALL'; confirmation?: string }) => {
    const response = await api.delete(`/v1/projects/${projectId}/test-case-folders/${folderId}`, { data: payload }) as ApiResponse<null>;
    invalidateReadCache(`/v1/projects/${projectId}/test-case-folders`); invalidateReadCache(`/v1/projects/${projectId}/test-cases`); return response;
  },
  bulkMoveTestCases: async (projectId: string, payload: { testCaseIds: string[]; destinationFolderId: string | null }) => {
    const response = await api.post(`/v1/projects/${projectId}/test-cases/bulk-move`, payload) as ApiResponse<ProjectTestCaseRecord[]>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    invalidateReadCache(`/v1/projects/${projectId}/test-case-folders`);
    return response;
  },
  bulkUpdateTestCases: async (projectId: string, payload: { testCaseIds: string[]; updates: BulkTestCaseUpdates }) => {
    const response = await api.patch(`/v1/projects/${projectId}/test-cases/bulk`, payload) as ApiResponse<{ updatedCount: number; failedCount: number; skippedCount: number }>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    invalidateReadCache(`/v1/projects/${projectId}/test-case-folders`);
    invalidateReadCache('/v1/projects');
    return response;
  },
  listReusableTestCases: (projectId: string, query: { search?: string; sectionId?: string; status?: string; excludeTestCaseId?: string } = {}) =>
    api.get(`/v1/projects/${projectId}/test-cases/reusable`, { params: query }) as Promise<ApiResponse<ReusableTestCaseRecord[]>>,
  listSections: (projectId: string, options?: ReadOptions) =>
    getCached(`/v1/projects/${projectId}/sections`, () => api.get(`/v1/projects/${projectId}/sections`) as Promise<ApiResponse<SectionRecord[]>>, options),
  createTestCase: async (projectId: string, payload: TestCasePayload) => {
    const response = await api.post(`/v1/projects/${projectId}/test-cases`, payload) as ApiResponse<ProjectTestCaseRecord>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    invalidateReadCache(`/v1/projects/${projectId}/test-case-folders`);
    return response;
  },
  importTestCases: async (projectId: string, payload: TestCaseImportPayload) => {
    const response = await api.post(`/v1/projects/${projectId}/test-cases/import`, payload) as ApiResponse<TestCaseImportResult>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    invalidateReadCache(`/v1/projects/${projectId}/test-case-folders`);
    invalidateReadCache('/v1/projects');
    return response;
  },
  updateTestCase: async (projectId: string, id: string, payload: TestCasePayload) => {
    const response = await api.patch(`/v1/projects/${projectId}/test-cases/${id}`, payload) as ApiResponse<ProjectTestCaseRecord>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    invalidateReadCache(`/v1/projects/${projectId}/test-case-folders`);
    return response;
  },
  removeTestCase: async (projectId: string, id: string) => {
    const response = await api.delete(`/v1/projects/${projectId}/test-cases/${id}`) as ApiResponse<null>;
    invalidateReadCache(`/v1/projects/${projectId}/test-cases`);
    invalidateReadCache(`/v1/projects/${projectId}/test-case-folders`);
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
