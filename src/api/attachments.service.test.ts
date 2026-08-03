import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
const cache = vi.hoisted(() => ({ getCached: vi.fn(), invalidateReadCache: vi.fn() }));

vi.mock('./axios.ts', () => ({ default: api }));
vi.mock('./read-cache.ts', () => cache);

import { AttachmentsService } from './attachments.service.ts';

describe('AttachmentsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the agreed upload and complete endpoints', async () => {
    const payload = { projectId: 'project-1', testCaseId: 'case-1', fileName: 'failure.png', mimeType: 'image/png', fileSize: 42 };
    api.post.mockResolvedValue({ data: { attachment: { id: 'attachment-1' } } });

    await AttachmentsService.createUploadUrl(payload);
    await AttachmentsService.complete('attachment-1');

    expect(api.post).toHaveBeenNthCalledWith(1, '/v1/attachments/upload-url', payload);
    expect(api.post).toHaveBeenNthCalledWith(2, '/v1/attachments/attachment-1/complete');
  });

  it('scopes reads and cache invalidation to the test case', async () => {
    cache.getCached.mockResolvedValue({ data: [] });
    api.delete.mockResolvedValue({ data: null });

    await AttachmentsService.listForTestCase('project-1', 'case-1', { force: true });
    await AttachmentsService.remove('attachment-1', 'project-1', 'case-1');

    expect(cache.getCached).toHaveBeenCalledWith('/v1/projects/project-1/test-cases/case-1/attachments', expect.any(Function), { force: true });
    expect(api.delete).toHaveBeenCalledWith('/v1/attachments/attachment-1');
    expect(cache.invalidateReadCache).toHaveBeenCalledWith('/v1/projects/project-1/test-cases/case-1/attachments');
  });

  it('requests a short-lived private view URL from the attachment endpoint', async () => {
    api.get.mockResolvedValue({ data: { url: 'https://signed.example', expiresIn: 600 } });
    await AttachmentsService.getViewUrl('attachment-1');
    expect(api.get).toHaveBeenCalledWith('/v1/attachments/attachment-1/url');
  });

  it('gets the server-configured attachment size limit from the authenticated API', async () => {
    api.get.mockResolvedValue({ data: { maxFileSizeBytes: 20 * 1024 * 1024 } });
    await AttachmentsService.getConfig();
    expect(api.get).toHaveBeenCalledWith('/v1/attachments/config');
  });
});
