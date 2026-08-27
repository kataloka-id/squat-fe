import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, ImagePlus, LoaderCircle, Trash2, X } from 'lucide-react';
import { AttachmentsService } from '@/src/api/attachments.service.ts';
import type { AttachmentRecord } from '@/src/types/api.ts';
import { Button } from './ui/Button.tsx';
import { ConfirmationModal } from './ui/ConfirmationModal.tsx';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

type AttachmentsProps = {
  projectId: string;
  testCaseId?: string;
  testRunCaseId?: string;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onNotify: (message: string, type: 'success' | 'error') => void;
  /** Called only after the API has deleted the attachment successfully. */
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onDeleted?: (attachmentId: string) => void;
  /** Detail view is read-only so deletions always update the edit form state. */
  canDelete?: boolean;
  canUpload?: boolean;
  initialAttachments?: AttachmentRecord[];
};

const formatFileSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 ? 1 : 2)} MB`;
const errorMessage = (error: unknown, fallback: string) => error && typeof error === 'object' && 'message' in error ? String(error.message) : fallback;

/** Private-image upload and preview UI. Image bytes go only to the signed R2 URL. */
export const Attachments = ({
  projectId,
  testCaseId,
  testRunCaseId,
  onNotify,
  onDeleted,
  canDelete = true,
  canUpload = true,
  initialAttachments,
}: AttachmentsProps) => {
  const [attachments, setAttachments] = useState<AttachmentRecord[]>(initialAttachments || []);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState(MAX_ATTACHMENT_SIZE_BYTES);
  const [hasLoadedConfig, setHasLoadedConfig] = useState(false);
  const [preview, setPreview] = useState<{ id: string; name: string; url: string; refreshed: boolean } | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<AttachmentRecord | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (force = false) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = testRunCaseId
        ? await AttachmentsService.listForTestRunCase(projectId, testRunCaseId, { force })
        : await AttachmentsService.listForTestCase(projectId, testCaseId!, { force });
      setAttachments(response.data);
    } catch (error) {
      const message = errorMessage(error, 'Attachments could not be loaded.');
      setAttachments([]);
      setLoadError(message);
      onNotify(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onNotify, projectId, testCaseId, testRunCaseId]);

  useEffect(() => {
    if (initialAttachments) {
      setAttachments(initialAttachments);
      setIsLoading(false);
      return;
    }
    void refresh();
  }, [initialAttachments, refresh, testRunCaseId]);
  useEffect(() => {
    if (testRunCaseId) {
      setHasLoadedConfig(true);
      return;
    }
    let active = true;
    void AttachmentsService.getConfig()
      .then((response) => {
        if (active && Number.isSafeInteger(response.data.maxFileSizeBytes) && response.data.maxFileSizeBytes > 0) {
          setMaxFileSizeBytes(response.data.maxFileSizeBytes);
          setHasLoadedConfig(true);
        }
      })
      .catch(() => {
        // Upload creation is still server-authoritative; retain the default as guidance if configuration cannot load.
      });
    return () => { active = false; };
  }, [testRunCaseId]);

  const upload = async (file: File) => {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      onNotify('Choose a PNG, JPEG, WebP, or GIF image.', 'error');
      return;
    }
    if (file.size <= 0) {
      onNotify('The selected image is empty.', 'error');
      return;
    }
    if (hasLoadedConfig && file.size > maxFileSizeBytes) {
      onNotify(`Images must be ${formatFileSize(maxFileSizeBytes)} or smaller.`, 'error');
      return;
    }

    setIsUploading(true);
    try {
      const uploadRequest = await AttachmentsService.createUploadUrl({
        projectId,
        ...(testRunCaseId ? { testRunCaseId } : { testCaseId: testCaseId! }),
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      const { attachment, uploadUrl, method, requiredHeaders } = uploadRequest.data;
      const putResponse = await fetch(uploadUrl, {
        method,
        headers: requiredHeaders,
        body: file,
        credentials: 'omit',
      });
      if (!putResponse.ok) throw new Error('The image upload was rejected. Please retry.');
      await AttachmentsService.complete(attachment.id);
      await refresh(true);
      onNotify('Image attached.', 'success');
    } catch (error) {
      onNotify(errorMessage(error, 'Image upload failed. Please retry.'), 'error');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const openPreview = async (attachment: AttachmentRecord) => {
    try {
      const response = await AttachmentsService.getViewUrl(attachment.id);
      setPreview({ id: attachment.id, name: attachment.originalFileName, url: response.data.url, refreshed: false });
    } catch (error) {
      onNotify(errorMessage(error, 'Image preview could not be opened.'), 'error');
    }
  };

  const refreshPreview = async () => {
    if (!preview || preview.refreshed) {
      setPreview(null);
      onNotify('Image preview expired or is no longer available.', 'error');
      return;
    }
    try {
      const response = await AttachmentsService.getViewUrl(preview.id, { force: true });
      setPreview((current) => current ? { ...current, url: response.data.url, refreshed: true } : current);
    } catch (error) {
      setPreview(null);
      onNotify(errorMessage(error, 'Image preview could not be opened.'), 'error');
    }
  };

  const remove = async () => {
    if (!attachmentToDelete) return;
    const target = attachmentToDelete;
    setAttachmentToDelete(null);
    try {
      if (testRunCaseId)
        await AttachmentsService.removeForTestRunCase(target.id, projectId, testRunCaseId);
      else await AttachmentsService.remove(target.id, projectId, testCaseId!);
      onDeleted?.(target.id);
      await refresh(true);
      onNotify('Attachment deleted.', 'success');
    } catch (error) {
      onNotify(errorMessage(error, 'Attachment could not be deleted.'), 'error');
    }
  };

  return (
    <section aria-label={testRunCaseId ? 'Test Run attachments' : 'Attachments'} className="border-b border-slate-100 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{testRunCaseId ? 'Test Run attachments & master references' : 'Attachments'}</h3>
          <p className="mt-1 text-xs text-slate-500">PNG, JPEG, WebP, or GIF up to {formatFileSize(maxFileSizeBytes)}{hasLoadedConfig ? '.' : ' (checking server limit…)'} </p>
        </div>
        {canUpload && <><input accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Select image attachment" className="sr-only" disabled={isUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} ref={inputRef} type="file" />
        <Button disabled={isUploading} icon={isUploading ? <LoaderCircle className="animate-spin" size={16} /> : <ImagePlus size={16} />} onClick={() => inputRef.current?.click()} size="sm" type="button">
          {isUploading ? 'Uploading…' : 'Attach image'}
        </Button></>}
      </div>

      {isLoading ? <p className="mt-4 text-sm text-slate-500" role="status">Loading attachments…</p> : loadError ? <div className="mt-4 flex items-center gap-3 text-sm text-red-700" role="alert"><span>{loadError}</span><Button onClick={() => void refresh(true)} size="sm" variant="secondary" type="button">Retry</Button></div> : testRunCaseId ? (() => {
        const master = attachments.filter((attachment) => (attachment.ownership ?? (attachment.testRunCaseId ? 'TEST_RUN' : 'TEST_CASE')) === 'TEST_CASE');
        const evidence = attachments.filter((attachment) => (attachment.ownership ?? (attachment.testRunCaseId ? 'TEST_RUN' : 'TEST_CASE')) === 'TEST_RUN');
        const list = (items: AttachmentRecord[], deletable: boolean) => items.length === 0 ? <p className="mt-2 text-sm text-slate-400">No images attached.</p> : <ul className="mt-2 space-y-2">{items.map((attachment) => <li className="flex items-center gap-3 rounded-lg border border-slate-200 p-3" key={attachment.id}><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800" title={attachment.originalFileName}>{attachment.originalFileName}</p><p className="mt-0.5 text-xs text-slate-500">{attachment.mimeType} · {formatFileSize(attachment.fileSize)}{deletable ? '' : ' · Read-only reference'}</p></div><button aria-label={`Preview ${attachment.originalFileName}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20" onClick={() => void openPreview(attachment)} type="button"><Eye size={16} /></button>{deletable && canDelete && <button aria-label={`Delete ${attachment.originalFileName}`} className="rounded-md p-2 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20" onClick={() => setAttachmentToDelete(attachment)} type="button"><Trash2 size={16} /></button>}</li>)}</ul>;
        return <><section aria-label="Master Test Case references"><h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Master Test Case references (read-only)</h4>{list(master, false)}</section><section aria-label="Test Run evidence"><h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Test Run evidence</h4>{list(evidence, true)}</section></>;
      })() : attachments.length === 0 ? <p className="mt-4 text-sm text-slate-400">No images attached.</p> : (
        <ul className="mt-4 space-y-2">
          {attachments.map((attachment) => <li className="flex items-center gap-3 rounded-lg border border-slate-200 p-3" key={attachment.id}>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800" title={attachment.originalFileName}>{attachment.originalFileName}</p><p className="mt-0.5 text-xs text-slate-500">{attachment.mimeType} · {formatFileSize(attachment.fileSize)}</p></div>
            <button aria-label={`Preview ${attachment.originalFileName}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20" onClick={() => void openPreview(attachment)} type="button"><Eye size={16} /></button>
            {canDelete && !(testRunCaseId && (attachment.ownership ?? (attachment.testRunCaseId ? 'TEST_RUN' : 'TEST_CASE')) === 'TEST_CASE') && <button aria-label={`Delete ${attachment.originalFileName}`} className="rounded-md p-2 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20" onClick={() => setAttachmentToDelete(attachment)} type="button"><Trash2 size={16} /></button>}
          </li>)}
        </ul>
      )}

      {preview && <div aria-label="Image preview" aria-modal="true" className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" onClick={() => setPreview(null)}>
        <div className="relative max-h-full max-w-4xl" onClick={(event) => event.stopPropagation()}><img alt={preview.name} className="max-h-[85vh] max-w-full rounded-lg bg-white object-contain shadow-2xl" onError={() => void refreshPreview()} src={preview.url} /><button aria-label="Close image preview" className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-white" onClick={() => setPreview(null)} type="button"><X size={18} /></button></div>
      </div>}

      <ConfirmationModal confirmLabel="Delete image" isOpen={Boolean(attachmentToDelete)} message={`Delete ${attachmentToDelete?.originalFileName ?? 'this image'}? This cannot be undone.`} onClose={() => setAttachmentToDelete(null)} onConfirm={() => { void remove(); }} title="Delete attachment" variant="danger" />
    </section>
  );
};
