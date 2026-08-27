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

  it('scopes execution attachment reads to the run-case owner', async () => {
    api.get.mockResolvedValue({ data: [] });
    await AttachmentsService.listForTestRunCase('project-1', 'run-case-1', { force: true });
    expect(api.get).toHaveBeenCalledWith(
      '/v1/projects/project-1/test-run-cases/run-case-1/attachments',
    );
  });

  it('requests a short-lived private view URL from the attachment endpoint', async () => {
    api.get.mockResolvedValue({ data: { url: 'https://signed.example', expiresIn: 600 } });
    await AttachmentsService.getViewUrl('attachment-1');
    expect(api.get).toHaveBeenCalledWith('/v1/attachments/attachment-1/url');
  });

  it('reuses a successful view URL for the same canonical attachment ID', async () => {
    const response = { data: { url: 'https://signed.example', expiresIn: 600 } };
    api.get.mockResolvedValue(response);

    await AttachmentsService.getViewUrl(' attachment-1 ');
    await AttachmentsService.getViewUrl('attachment-1');

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/v1/attachments/attachment-1/url');
  });

  it('deduplicates concurrent view URL requests without mixing attachment IDs', async () => {
    // eslint-disable-next-line no-unused-vars -- deferred resolver signature.
    let resolveA!: (value: unknown) => void;
    // eslint-disable-next-line no-unused-vars -- deferred resolver signature.
    let resolveB!: (value: unknown) => void;
    api.get.mockImplementation((path: string) => new Promise((resolve) => {
      if (path.includes('attachment-a')) resolveA = resolve;
      else resolveB = resolve;
    }));

    const firstA = AttachmentsService.getViewUrl('attachment-a');
    const secondA = AttachmentsService.getViewUrl('attachment-a');
    const firstB = AttachmentsService.getViewUrl('attachment-b');
    resolveA({ data: { url: 'https://signed/a', expiresIn: 600 } });
    resolveB({ data: { url: 'https://signed/b', expiresIn: 600 } });

    await expect(Promise.all([firstA, secondA, firstB])).resolves.toEqual([
      { data: { url: 'https://signed/a', expiresIn: 600 } },
      { data: { url: 'https://signed/a', expiresIn: 600 } },
      { data: { url: 'https://signed/b', expiresIn: 600 } },
    ]);
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith('/v1/attachments/attachment-a/url');
    expect(api.get).toHaveBeenCalledWith('/v1/attachments/attachment-b/url');
  });

  it('does not cache failures and retries the next request', async () => {
    api.get.mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ data: { url: 'https://signed/retry', expiresIn: 600 } });

    await expect(AttachmentsService.getViewUrl('attachment-1')).rejects.toThrow('temporary failure');
    await expect(AttachmentsService.getViewUrl('attachment-1')).resolves.toEqual({
      data: { url: 'https://signed/retry', expiresIn: 600 },
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('refetches an expired signed URL and replaces the cached value', async () => {
    vi.useFakeTimers();
    api.get.mockResolvedValueOnce({ data: { url: 'https://signed/old', expiresIn: 1 } })
      .mockResolvedValueOnce({ data: { url: 'https://signed/new', expiresIn: 600 } });

    await expect(AttachmentsService.getViewUrl('attachment-1')).resolves.toEqual({
      data: { url: 'https://signed/old', expiresIn: 1 },
    });
    vi.advanceTimersByTime(1_000);
    await expect(AttachmentsService.getViewUrl('attachment-1')).resolves.toEqual({
      data: { url: 'https://signed/new', expiresIn: 600 },
    });
    expect(api.get).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('invalidates the view URL after a successful delete', async () => {
    api.get.mockResolvedValue({ data: { url: 'https://signed/example', expiresIn: 600 } });
    api.delete.mockResolvedValue({ data: null });

    await AttachmentsService.getViewUrl('attachment-1');
    await AttachmentsService.remove('attachment-1', 'project-1', 'case-1');
    await AttachmentsService.getViewUrl('attachment-1');

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('clears view URL cache for a new in-memory session', async () => {
    api.get.mockResolvedValue({ data: { url: 'https://signed/example', expiresIn: 600 } });

    await AttachmentsService.getViewUrl('attachment-1');
    invalidateReadCache();
    await AttachmentsService.getViewUrl('attachment-1');

    expect(api.get).toHaveBeenCalledTimes(2);
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
