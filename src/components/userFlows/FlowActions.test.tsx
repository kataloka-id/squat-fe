// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { FlowActions } from './FlowActions.tsx';
import { formatUserFlowDate } from './utils.ts';

afterEach(cleanup);

it('exposes direct accessible row actions', async () => { const user = userEvent.setup(); const view = vi.fn(); const edit = vi.fn(); const remove = vi.fn(); render(<FlowActions onView={view} onEdit={edit} onDelete={remove}/>); expect(screen.queryByRole('button', { name: /Flow actions/i })).toBeNull(); await user.click(screen.getByRole('button', { name: 'Edit' })); await user.click(screen.getByRole('button', { name: 'View' })); await user.click(screen.getByRole('button', { name: 'Delete' })); expect(edit).toHaveBeenCalled(); expect(view).toHaveBeenCalled(); expect(remove).toHaveBeenCalled(); });
it('hides management actions without permission', () => { render(<FlowActions onView={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} canManage={false} />); expect(screen.getByRole('button', { name: 'View' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull(); });
it('formats a non-ambiguous date', () => expect(formatUserFlowDate('2026-08-11T12:00:00.000Z')).toBe('11 Aug 2026'));
