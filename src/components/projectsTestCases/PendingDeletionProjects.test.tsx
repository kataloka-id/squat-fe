/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PendingDeletionProjects } from './PendingDeletionProjects.tsx';

const project = { id: 'project-1', key: 'QA', name: 'Checkout', description: 'Checkout coverage' };

describe('PendingDeletionProjects', () => {
  afterEach(cleanup);
  it('offers restore and permanent deletion actions for a pending project', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    const onPermanentDelete = vi.fn();
    render(<PendingDeletionProjects projects={[project]} onRestore={onRestore} onPermanentDelete={onPermanentDelete} />);

    expect(screen.getByText('Project menunggu penghapusan')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Pulihkan' }));
    await user.click(screen.getByRole('button', { name: 'Hapus permanen' }));

    expect(onRestore).toHaveBeenCalledWith(project);
    expect(onPermanentDelete).toHaveBeenCalledWith(project);
  });

  it('renders an explicit error returned while loading pending projects', () => {
    render(<PendingDeletionProjects projects={[]} error="Tidak diizinkan memuat project." onRestore={vi.fn()} onPermanentDelete={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('Tidak diizinkan memuat project.');
  });

  it('keeps permanent deletion available but guards restore after cleanup failure', () => {
    render(<PendingDeletionProjects projects={[project]} restoreUnavailableProjectIds={new Set([project.id])} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Pulihkan' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Hapus permanen' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('status').textContent).toContain('cleanup attachment sebelumnya belum selesai');
  });

  it('guards restore from the persisted cleanup-started marker after reload', () => {
    render(<PendingDeletionProjects projects={[{ ...project, permanentDeletionStartedAt: '2026-08-17T12:00:00.000Z' }]} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Pulihkan' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Hapus permanen' }).hasAttribute('disabled')).toBe(false);
  });
});
