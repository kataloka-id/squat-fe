// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TestRunExecutionRecord } from '@/src/types/api.ts';
import { ExecutionDetail } from './TestRunsPage.tsx';
import { selectCustomOption } from '@/src/test/selectTestUtils.ts';

const execution = (result: TestRunExecutionRecord['result'] = 'Untested'): TestRunExecutionRecord => ({
  id: 'execution-1', runId: 'run-1', sourceTestCaseId: 'case-1', result,
  notes: '', updatedAt: '2026-08-17T00:00:00.000Z',
  snapshot: { tcNumber: 1, title: 'Can sign in', steps: [] },
});

describe('Test Run execution Save & Next', () => {
  afterEach(cleanup);
  it.each(['Failed', 'Blocked', 'Skipped'] as const)(
    'saves %s through the execution resource before moving to the next case',
    async (result) => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onNext = vi.fn();
      render(<ExecutionDetail execution={execution()} onSave={onSave} onPrevious={vi.fn()} onNext={onNext} />);

      await selectCustomOption(user, 'Result', result);
      await user.click(screen.getByRole('button', { name: 'Save & Next' }));

      await waitFor(() => expect(onSave).toHaveBeenCalledWith('execution-1', { result, notes: '' }));
      expect(onNext).toHaveBeenCalledTimes(1);
    },
  );

  it('saves a Passed result and notes without navigating', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onNext = vi.fn();
    render(<ExecutionDetail execution={execution()} onSave={onSave} onPrevious={vi.fn()} onNext={onNext} />);

    await selectCustomOption(user, 'Result', 'Passed');
    await user.type(screen.getByLabelText('Notes'), 'Verified in staging');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('execution-1', { result: 'Passed', notes: 'Verified in staging' }));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('sends an explicit null result to reset a terminal execution to Untested', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ExecutionDetail execution={execution()} onSave={onSave} onPrevious={vi.fn()} onNext={vi.fn()} />);

    expect(screen.getByLabelText('Result').getAttribute('value')).toBe('Untested');
    await user.type(screen.getByLabelText('Notes'), 'Need access to test environment');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('execution-1', {
      result: null,
      notes: 'Need access to test environment',
    }));
  });

  it('moves next after an Untested notes-only save succeeds', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onNext = vi.fn();
    render(<ExecutionDetail execution={execution()} onSave={onSave} onPrevious={vi.fn()} onNext={onNext} />);

    await user.click(screen.getByRole('button', { name: 'Save & Next' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('execution-1', { result: null, notes: '' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does not move away and shows an error when saving fails', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Server tidak tersedia'));
    const onNext = vi.fn();
    render(<ExecutionDetail execution={execution('Failed')} onSave={onSave} onPrevious={vi.fn()} onNext={onNext} />);

    await user.click(screen.getByRole('button', { name: 'Save & Next' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Gagal menyimpan eksekusi. Server tidak tersedia');
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Can sign in' })).toBeTruthy();
  });

  it('suppresses duplicate rapid save requests', async () => {
    const user = userEvent.setup();
    let resolveSave: (() => void) | undefined;
    const onSave = vi.fn().mockImplementation(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
    render(<ExecutionDetail execution={execution()} onSave={onSave} onPrevious={vi.fn()} onNext={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Save & Next' });
    await user.click(button);
    await user.click(button);
    expect(onSave).toHaveBeenCalledTimes(1);
    resolveSave?.();
  });
});
