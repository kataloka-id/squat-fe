/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({ createUploadUrl: vi.fn(), complete: vi.fn(), listForTestCase: vi.fn(), getViewUrl: vi.fn(), getConfig: vi.fn(), remove: vi.fn() }));
vi.mock('@/src/api/attachments.service.ts', () => ({ AttachmentsService: service }));

import { Attachments } from './Attachments.tsx';

const notify = vi.fn();
const renderAttachments = () => render(<Attachments onNotify={notify} projectId="project-1" testCaseId="case-1" />);

describe('Attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listForTestCase.mockResolvedValue({ data: [] });
    service.getConfig.mockResolvedValue({ data: { maxFileSizeBytes: 10 * 1024 * 1024 } });
  });
  afterEach(cleanup);

  it('rejects an unsupported image before requesting an upload URL', async () => {
    renderAttachments();
    await screen.findByText('No images attached.');
    fireEvent.change(screen.getByLabelText('Select image attachment'), { target: { files: [new File(['pdf'], 'note.pdf', { type: 'application/pdf' })] } });
    expect(service.createUploadUrl).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Choose a PNG, JPEG, WebP, or GIF image.', 'error');
  });

  it('rejects an image exceeding the default 10 MB limit', async () => {
    renderAttachments();
    await screen.findByText('No images attached.');
    await screen.findByText('PNG, JPEG, WebP, or GIF up to 10.0 MB.');
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Select image attachment'), { target: { files: [file] } });
    expect(service.createUploadUrl).not.toHaveBeenCalled();
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Images must be 10.0 MB or smaller.', 'error'));
  });

  it('uses the configured server limit for client-side size guidance', async () => {
    service.getConfig.mockResolvedValue({ data: { maxFileSizeBytes: 12 * 1024 * 1024 } });
    renderAttachments();
    await screen.findByText(/up to 12.0 MB/);
    const file = new File([new Uint8Array(13 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Select image attachment'), { target: { files: [file] } });
    expect(service.createUploadUrl).not.toHaveBeenCalled();
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Images must be 12.0 MB or smaller.', 'error'));
  });

  it('does not treat the default guidance as an authoritative limit when server configuration is unavailable', async () => {
    service.getConfig.mockRejectedValue(new Error('unavailable'));
    renderAttachments();
    await screen.findByText('No images attached.');
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'server-allows-this.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Select image attachment'), { target: { files: [file] } });
    await waitFor(() => expect(service.createUploadUrl).toHaveBeenCalledWith(expect.objectContaining({ fileSize: file.size })));
  });

  it('uploads directly with the exact signed Content-Type and completes only after PUT succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    service.createUploadUrl.mockResolvedValue({ data: { attachment: { id: 'attachment-1' }, uploadUrl: 'https://r2.example/upload', method: 'PUT', requiredHeaders: { 'Content-Type': 'image/png' }, expiresIn: 300 } });
    service.complete.mockResolvedValue({ data: { id: 'attachment-1' } });
    renderAttachments();
    await screen.findByText('No images attached.');
    const file = new File(['image'], 'failure.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Select image attachment'), { target: { files: [file] } });

    await waitFor(() => expect(service.complete).toHaveBeenCalledWith('attachment-1'));
    expect(fetchMock).toHaveBeenCalledWith('https://r2.example/upload', {
      method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: file, credentials: 'omit',
    });
    expect(service.createUploadUrl).toHaveBeenCalledWith({ projectId: 'project-1', testCaseId: 'case-1', fileName: 'failure.png', mimeType: 'image/png', fileSize: file.size });
  });

  it('does not complete an upload when R2 rejects the PUT', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    service.createUploadUrl.mockResolvedValue({ data: { attachment: { id: 'attachment-1' }, uploadUrl: 'https://r2.example/upload', method: 'PUT', requiredHeaders: { 'Content-Type': 'image/png' }, expiresIn: 300 } });
    renderAttachments();
    await screen.findByText('No images attached.');
    fireEvent.change(screen.getByLabelText('Select image attachment'), { target: { files: [new File(['image'], 'failure.png', { type: 'image/png' })] } });
    await waitFor(() => expect(notify).toHaveBeenCalledWith('The image upload was rejected. Please retry.', 'error'));
    expect(service.complete).not.toHaveBeenCalled();
  });

  it('lists attachments, loads a private preview URL, and deletes after confirmation', async () => {
    const attachment = { id: 'attachment-1', projectId: 'project-1', testCaseId: 'case-1', originalFileName: 'failure.png', mimeType: 'image/png', fileSize: 1234, status: 'READY', createdAt: '2026-01-01T00:00:00.000Z' };
    service.listForTestCase.mockResolvedValue({ data: [attachment] });
    service.getViewUrl.mockResolvedValue({ data: { url: 'https://r2.example/private-preview', expiresIn: 600 } });
    service.remove.mockResolvedValue({ data: null });
    renderAttachments();

    await screen.findByText('failure.png');
    fireEvent.click(screen.getByRole('button', { name: 'Preview failure.png' }));
    await waitFor(() => expect(service.getViewUrl).toHaveBeenCalledWith('attachment-1'));
    expect(screen.getByRole('img', { name: 'failure.png' }).getAttribute('src')).toBe('https://r2.example/private-preview');

    fireEvent.click(screen.getByLabelText('Close image preview'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete failure.png' }));
    expect(screen.getByText('Delete attachment')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete image' }));
    await waitFor(() => expect(service.remove).toHaveBeenCalledWith('attachment-1', 'project-1', 'case-1'));
    expect(notify).toHaveBeenCalledWith('Attachment deleted.', 'success');
  });

  it('notifies its edit-form owner only after attachment deletion succeeds', async () => {
    const attachment = { id: 'attachment-1', projectId: 'project-1', testCaseId: 'case-1', originalFileName: 'failure.png', mimeType: 'image/png', fileSize: 1234, status: 'READY', createdAt: '2026-01-01T00:00:00.000Z' };
    const onDeleted = vi.fn();
    service.listForTestCase.mockResolvedValue({ data: [attachment] });
    service.remove.mockResolvedValue({ data: null });
    render(<Attachments onDeleted={onDeleted} onNotify={notify} projectId="project-1" testCaseId="case-1" />);

    await screen.findByText('failure.png');
    fireEvent.click(screen.getByRole('button', { name: 'Delete failure.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete image' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('attachment-1'));
  });

  it('cleans the edit form even if refreshing the attachment list fails after deletion', async () => {
    const attachment = { id: 'attachment-1', projectId: 'project-1', testCaseId: 'case-1', originalFileName: 'failure.png', mimeType: 'image/png', fileSize: 1234, status: 'READY', createdAt: '2026-01-01T00:00:00.000Z' };
    const onDeleted = vi.fn();
    service.listForTestCase.mockResolvedValueOnce({ data: [attachment] }).mockRejectedValueOnce(new Error('refresh failed'));
    service.remove.mockResolvedValue({ data: null });
    render(<Attachments onDeleted={onDeleted} onNotify={notify} projectId="project-1" testCaseId="case-1" />);

    await screen.findByText('failure.png');
    fireEvent.click(screen.getByRole('button', { name: 'Delete failure.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete image' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('attachment-1'));
    expect(notify).toHaveBeenCalledWith('refresh failed', 'error');
  });

  it('does not expose deletion in a read-only attachment panel', async () => {
    const attachment = { id: 'attachment-1', projectId: 'project-1', testCaseId: 'case-1', originalFileName: 'failure.png', mimeType: 'image/png', fileSize: 1234, status: 'READY', createdAt: '2026-01-01T00:00:00.000Z' };
    service.listForTestCase.mockResolvedValue({ data: [attachment] });
    render(<Attachments canDelete={false} onNotify={notify} projectId="project-1" testCaseId="case-1" />);
    await screen.findByText('failure.png');
    expect(screen.queryByRole('button', { name: 'Delete failure.png' })).toBeNull();
  });
});
