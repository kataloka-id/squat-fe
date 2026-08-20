/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './ProjectsTestCasesPage.tsx';

const session = vi.hoisted(() => ({ roleSlug: 'admin' }));
const service = vi.hoisted(() => ({
  list: vi.fn(),
  listPendingDeletion: vi.fn(),
  permanentlyRemove: vi.fn(),
}));

vi.mock('@/src/auth/SessionContext.tsx', () => ({
  useSessionUser: () => ({ username: 'Lifecycle admin', roleSlug: session.roleSlug }),
}));
vi.mock('@/src/api/projects.service.ts', () => ({
  ProjectsService: {
    list: service.list,
    listPendingDeletion: service.listPendingDeletion,
    permanentlyRemove: service.permanentlyRemove,
    listSections: vi.fn(),
  },
}));
vi.mock('@/src/components/projectsTestCases/ProjectBoard.tsx', () => ({ ProjectBoard: () => <p>Project board</p> }));
vi.mock('@/src/components/projectsTestCases/ui/ConfirmationModal.tsx', () => ({
  ConfirmationModal: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) => isOpen ? <button onClick={onConfirm}>Konfirmasi aksi</button> : null,
}));
vi.mock('@/src/components/projectsTestCases/ui/Toast.tsx', () => ({ Toast: ({ message }: { message: string }) => <p role="status">{message}</p> }));

describe('pending project deletion actions', () => {
  afterEach(cleanup);
  beforeEach(() => {
    session.roleSlug = 'admin';
    service.list.mockReset().mockResolvedValue({ data: [] });
    service.listPendingDeletion.mockReset().mockResolvedValue({ data: [{ id: 'project-1', key: 'QA', name: 'Checkout' }] });
    service.permanentlyRemove.mockReset().mockRejectedValue({ message: 'Object cleanup gagal.' });
  });

  it('warns of partial attachment cleanup and guards restore after permanent deletion fails', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Hapus permanen' });

    await user.click(screen.getByRole('button', { name: 'Hapus permanen' }));
    await user.click(screen.getByRole('button', { name: 'Konfirmasi aksi' }));

    await waitFor(() => expect(service.permanentlyRemove).toHaveBeenCalledWith('project-1'));
    const warning = await screen.findByRole('alert');
    expect(warning.textContent).toContain('Object cleanup gagal.');
    expect(warning.textContent).toContain('Sebagian file attachment mungkin sudah terhapus');
    expect(warning.textContent).toContain('hubungi admin company');
    expect(screen.getByRole('button', { name: 'Pulihkan' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Hapus permanen' }).hasAttribute('disabled')).toBe(false);
  });

  it('does not expose pending-deletion controls to kataloka_admin', async () => {
    session.roleSlug = 'kataloka_admin';
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByText('Project board');
    expect(screen.queryByText('Project menunggu penghapusan')).toBeNull();
    expect(service.listPendingDeletion).not.toHaveBeenCalled();
  });
});
