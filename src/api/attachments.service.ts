import api from './axios.ts';
import { getCached, invalidateReadCache, invalidateReadCacheExact, type ReadOptions } from './read-cache.ts';
import type { ApiResponse, AttachmentRecord, AttachmentUploadRequest, AttachmentUploadUrlResponse } from '@/src/types/api.ts';

const testCaseAttachmentPath = (projectId: string, testCaseId: string) =>
  `/v1/projects/${projectId}/test-cases/${testCaseId}/attachments`;
const testRunCaseAttachmentPath = (projectId: string, testRunCaseId: string) =>
  `/v1/projects/${projectId}/test-run-cases/${testRunCaseId}/attachments`;
const attachmentConfigPath = '/v1/attachments/config';
const canonicalAttachmentId = (attachmentId: string) => attachmentId.trim();
const attachmentViewUrlPath = (attachmentId: string) =>
  `/v1/attachments/${encodeURIComponent(canonicalAttachmentId(attachmentId))}/url`;
const attachmentViewUrlCacheTtl = (value: unknown) => {
  const expiresIn = (value as { data?: { expiresIn?: unknown } })?.data?.expiresIn;
  // The backend starts the signed URL clock before the response reaches the
  // browser. Keep a small safety margin so a cached URL is never deliberately
  // reused at the exact expiry boundary.
  return typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0
    ? Math.max(0, expiresIn * 1000 - 1_000)
    : 0;
};
const invalidateAttachmentViewUrl = (attachmentId: string) =>
  invalidateReadCacheExact(attachmentViewUrlPath(attachmentId));

export const AttachmentsService = {
  createUploadUrl: (payload: AttachmentUploadRequest) =>
    api.post('/v1/attachments/upload-url', payload) as Promise<ApiResponse<AttachmentUploadUrlResponse>>,
  complete: async (attachmentId: string) => {
    const response = await api.post(`/v1/attachments/${attachmentId}/complete`) as ApiResponse<AttachmentRecord>;
    // Completion changes attachment metadata/state; never retain a URL that
    // could belong to an earlier object version.
    invalidateAttachmentViewUrl(attachmentId);
    return response;
  },
  listForTestCase: (projectId: string, testCaseId: string, options?: ReadOptions) => {
    const path = testCaseAttachmentPath(projectId, testCaseId);
    return getCached(path, () => api.get(path) as Promise<ApiResponse<AttachmentRecord[]>>, options);
  },
  listForTestRunCase: (projectId: string, testRunCaseId: string, options?: ReadOptions) => {
    const path = testRunCaseAttachmentPath(projectId, testRunCaseId);
    return getCached(path, () => api.get(path) as Promise<ApiResponse<AttachmentRecord[]>>, options);
  },
  getViewUrl: (attachmentId: string, options?: ReadOptions) => {
    const path = attachmentViewUrlPath(attachmentId);
    return getCached(
      path,
      () => api.get(path) as Promise<ApiResponse<{ url: string; expiresIn: number }>>,
      { ...options, cacheTtlMs: attachmentViewUrlCacheTtl },
    );
  },
  getConfig: () =>
    getCached(
      attachmentConfigPath,
      () => api.get(attachmentConfigPath) as Promise<ApiResponse<{ maxFileSizeBytes: number }>>,
    ),
  remove: async (attachmentId: string, projectId: string, testCaseId: string) => {
    const response = await api.delete(`/v1/attachments/${attachmentId}`) as ApiResponse<null>;
    invalidateAttachmentViewUrl(attachmentId);
    invalidateReadCache(testCaseAttachmentPath(projectId, testCaseId));
    return response;
  },
  removeForTestRunCase: async (attachmentId: string, projectId: string, testRunCaseId: string) => {
    const response = await api.delete(
      `${testRunCaseAttachmentPath(projectId, testRunCaseId)}/${attachmentId}`,
    ) as ApiResponse<null>;
    invalidateAttachmentViewUrl(attachmentId);
    invalidateReadCache(testRunCaseAttachmentPath(projectId, testRunCaseId));
    return response;
  },
  invalidateTestCase: (projectId: string, testCaseId: string) =>
    invalidateReadCache(testCaseAttachmentPath(projectId, testCaseId)),
};
