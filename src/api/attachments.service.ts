import api from './axios.ts';
import { getCached, invalidateReadCache, type ReadOptions } from './read-cache.ts';
import type { ApiResponse, AttachmentRecord, AttachmentUploadRequest, AttachmentUploadUrlResponse } from '@/src/types/api.ts';

const testCaseAttachmentPath = (projectId: string, testCaseId: string) =>
  `/v1/projects/${projectId}/test-cases/${testCaseId}/attachments`;
const attachmentConfigPath = '/v1/attachments/config';

export const AttachmentsService = {
  createUploadUrl: (payload: AttachmentUploadRequest) =>
    api.post('/v1/attachments/upload-url', payload) as Promise<ApiResponse<AttachmentUploadUrlResponse>>,
  complete: async (attachmentId: string) =>
    api.post(`/v1/attachments/${attachmentId}/complete`) as Promise<ApiResponse<AttachmentRecord>>,
  listForTestCase: (projectId: string, testCaseId: string, options?: ReadOptions) => {
    const path = testCaseAttachmentPath(projectId, testCaseId);
    return getCached(path, () => api.get(path) as Promise<ApiResponse<AttachmentRecord[]>>, options);
  },
  getViewUrl: (attachmentId: string) =>
    api.get(`/v1/attachments/${attachmentId}/url`) as Promise<ApiResponse<{ url: string; expiresIn: number }>>,
  getConfig: () =>
    getCached(
      attachmentConfigPath,
      () => api.get(attachmentConfigPath) as Promise<ApiResponse<{ maxFileSizeBytes: number }>>,
    ),
  remove: async (attachmentId: string, projectId: string, testCaseId: string) => {
    const response = await api.delete(`/v1/attachments/${attachmentId}`) as ApiResponse<null>;
    invalidateReadCache(testCaseAttachmentPath(projectId, testCaseId));
    return response;
  },
  invalidateTestCase: (projectId: string, testCaseId: string) =>
    invalidateReadCache(testCaseAttachmentPath(projectId, testCaseId)),
};
