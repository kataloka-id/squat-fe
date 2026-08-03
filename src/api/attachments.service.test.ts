import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));

vi.mock('./axios.ts', () => ({ default: api }));

import { AttachmentsService } from './attachments.service.ts';
import { invalidateReadCache } from './read-cache.ts';

describe('AttachmentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateReadCache();
  });

  it('uses the agreed upload and complete endpoints', async () => {
    const payload = { projectId: 'project-1', testCaseId: 'case-1', fileName: 'failure.png', mimeType: 'image/png', fileSize: 42 };
    api.post.mockResolvedValue({ data: { attachment: { id: 'attachment-1' } } });

    await AttachmentsService.createUploadUrl(payload);
    await AttachmentsService.complete('attachment-1');

    expect(api.post).toHaveBeenNthCalledWith(1, '/v1/attachments/upload-url', payload);
    expect(api.post).toHaveBeenNthCalledWith(2, '/v1/attachments/attachment-1/complete');
  });

  it('scopes reads and cache invalidation to the test case', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.delete.mockResolvedValue({ data: null });

    await AttachmentsService.listForTestCase('project-1', 'case-1', { force: true });
    await AttachmentsService.remove('attachment-1', 'project-1', 'case-1');

    expect(api.get).toHaveBeenCalledWith('/v1/projects/project-1/test-cases/case-1/attachments');
    expect(api.delete).toHaveBeenCalledWith('/v1/attachments/attachment-1');

    await AttachmentsService.listForTestCase('project-1', 'case-1');
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('requests a short-lived private view URL from the attachment endpoint', async () => {
    api.get.mockResolvedValue({ data: { url: 'https://signed.example', expiresIn: 600 } });
    await AttachmentsService.getViewUrl('attachment-1');
    expect(api.get).toHaveBeenCalledWith('/v1/attachments/attachment-1/url');
  });

  it('shares and deduplicates attachment config reads until the default cache TTL expires', async () => {
    vi.useFakeTimers();
    const response = { data: { maxFileSizeBytes: 20 * 1024 * 1024 } };
    let resolveRequest!: () => void;
    api.get.mockImplementation(
      () => new Promise<typeof response>((resolve) => { resolveRequest = () => resolve(response); }),
    );

    const firstEditor = AttachmentsService.getConfig();
    const strictModeRemount = AttachmentsService.getConfig();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/v1/attachments/config');

    resolveRequest();
    await expect(Promise.all([firstEditor, strictModeRemount])).resolves.toEqual([response, response]);

    await expect(AttachmentsService.getConfig()).resolves.toEqual(response);
    expect(api.get).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    api.get.mockResolvedValue(response);

    await expect(AttachmentsService.getConfig()).resolves.toEqual(response);
    expect(api.get).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
