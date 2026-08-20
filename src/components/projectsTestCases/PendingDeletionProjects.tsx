/* eslint-disable no-unused-vars -- repository lint misidentifies TypeScript callback props. */
import React from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import type { ProjectAssignmentRecord } from '@/src/types/api.ts';
import { Button } from './ui/Button.tsx';

interface PendingDeletionProjectsProps {
  projects: ProjectAssignmentRecord[];
  loading?: boolean;
  error?: string | null;
  busyProjectId?: string | null;
  restoreUnavailableProjectIds?: ReadonlySet<string>;
  onRestore: (project: ProjectAssignmentRecord) => void;
  onPermanentDelete: (project: ProjectAssignmentRecord) => void;
}

export const PendingDeletionProjects: React.FC<PendingDeletionProjectsProps> = ({ projects, loading = false, error, busyProjectId, restoreUnavailableProjectIds = new Set(), onRestore, onPermanentDelete }) => (
  <section aria-labelledby="pending-deletion-projects-title" className="mx-auto max-w-7xl rounded-xl border border-amber-200 bg-amber-50/60 p-5">
    <div className="flex gap-3">
      <div className="rounded-lg bg-amber-100 p-2 text-amber-700"><AlertTriangle size={20} /></div>
      <div>
        <h2 id="pending-deletion-projects-title" className="font-bold text-slate-900">Project menunggu penghapusan</h2>
        <p className="mt-1 text-sm text-slate-700">Project di bawah tidak tersedia di alur kerja biasa. Anda dapat memulihkan atau menghapusnya secara permanen.</p>
      </div>
    </div>
    {loading && <p className="mt-4 text-sm text-slate-600" role="status">Memuat project menunggu penghapusan…</p>}
    {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
    {!loading && (projects.length === 0 ? <p className="mt-4 text-sm text-slate-600">Tidak ada project yang menunggu penghapusan.</p> : <ul className="mt-4 space-y-3">
      {projects.map((project) => {
        const busy = busyProjectId === project.id;
        const restoreUnavailable = restoreUnavailableProjectIds.has(project.id) || Boolean(project.permanentDeletionStartedAt);
        return <li key={project.id} className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-semibold text-slate-900">{project.key ? `${project.key} — ` : ''}{project.name}</p><p className="mt-1 text-sm text-slate-600">{project.description || 'Project ini menunggu penghapusan.'}</p>{restoreUnavailable && <p className="mt-2 text-sm text-amber-800" role="status">Pemulihan tidak tersedia karena cleanup attachment sebelumnya belum selesai. Coba hapus permanen lagi atau hubungi admin company.</p>}</div>
          <div className="flex shrink-0 gap-2"><Button disabled={busy || restoreUnavailable} icon={<RotateCcw size={16} />} onClick={() => onRestore(project)} size="sm" title={restoreUnavailable ? 'Pemulihan tidak tersedia sampai cleanup attachment selesai' : undefined} variant="secondary">Pulihkan</Button><Button disabled={busy} icon={<Trash2 size={16} />} onClick={() => onPermanentDelete(project)} size="sm" variant="danger">Hapus permanen</Button></div>
        </li>;
      })}
    </ul>)}
  </section>
);
