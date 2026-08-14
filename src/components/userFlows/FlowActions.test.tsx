// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { FlowActions } from './FlowActions.tsx';
import { formatUserFlowDate } from './utils.ts';

it('exposes accessible row actions', async () => { const user = userEvent.setup(); const view = vi.fn(); const edit = vi.fn(); const remove = vi.fn(); render(<FlowActions onView={view} onEdit={edit} onDelete={remove}/>); await user.click(screen.getByRole('button', { name: 'Flow actions' })); await user.click(screen.getByRole('menuitem', { name: 'Edit' })); expect(edit).toHaveBeenCalled(); });
it('formats a non-ambiguous date', () => expect(formatUserFlowDate('2026-08-11T12:00:00.000Z')).toBe('11 Aug 2026'));
