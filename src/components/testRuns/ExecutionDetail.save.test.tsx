// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const executionWithMetadata = (): TestRunExecutionRecord => ({
  ...execution(),
  snapshot: { tcNumber: 2, title: 'Can sign in', automationType: 'UI', priority: 'Critical', steps: [] },
});

const executionWithStep = (): TestRunExecutionRecord => ({
  ...execution(),
  snapshot: {
    tcNumber: 1,
    title: 'Can sign in',
    steps: [{ id: 'step-1', action: 'Open the sign-in page', expectedResult: 'Page opens' }],
  },
  steps: [{ id: 'step-1', position: 1, action: 'Open the sign-in page', expectedResult: 'Page opens', result: 'Untested', notes: '' }],
});

const executionWithUserFlow = (): TestRunExecutionRecord => ({
  ...execution(),
  userFlows: [{
    id: 'flow-1',
    sourceUserFlowId: 'source-flow-1',
    snapshot: { flowKey: 'UF-1', title: 'Sign in flow' },
  }],
});

describe('Test Run execution Save & Next', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not show Saved before a mutation, then clears it after the transient confirmation', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ExecutionDetail execution={execution()} onSave={onSave} onPrevious={vi.fn()} onNext={vi.fn()} />);

    expect(screen.queryByLabelText('Saved')).toBeNull();
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Updated note' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByLabelText('Saved')).toBeTruthy();

    act(() => vi.advanceTimersByTime(3001));
    expect(screen.queryByLabelText('Saved')).toBeNull();
  });

  it('never shows Saved when the mutation fails', async () => {
    const user = userEvent.setup();
    render(<ExecutionDetail execution={execution()} onSave={vi.fn().mockRejectedValue(new Error('offline'))} onPrevious={vi.fn()} onNext={vi.fn()} />);

    await user.type(screen.getByLabelText('Notes'), 'Updated note');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('alert');
    expect(screen.queryByLabelText('Saved')).toBeNull();
  });

  it('keeps execution metadata hierarchy clean and moves User Flow into the header chips', () => {
    render(<ExecutionDetail execution={{ ...executionWithUserFlow(), assignee: { id: 'user-1', username: 'qa-one' } }} onSave={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} />);

    const metadata = screen.getByLabelText('Test case metadata');
    expect(metadata.textContent).toContain('UF-1 · Sign in flow');
    expect(metadata.children).toHaveLength(4);
    expect(screen.getByText(/^Last saved/).textContent).not.toContain('Assignee:');
    expect(screen.queryByText('User Flow asal')).toBeNull();
    expect(screen.queryByText('Assignee: qa-one')).toBeNull();
    expect(screen.getByLabelText('Assignee')).toBeTruthy();
  });

  it('preserves User Flow chip navigation when a handler is provided', async () => {
    const onOpenUserFlow = vi.fn();
    const user = userEvent.setup();
    render(<ExecutionDetail execution={executionWithUserFlow()} projectId="project-1" onOpenUserFlow={onOpenUserFlow} onSave={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'UF-1 · Sign in flow' }));
    expect(onOpenUserFlow).toHaveBeenCalledWith('project-1', 'source-flow-1');
  });

  it('constrains long User Flow labels without changing the natural metadata wrapping', () => {
    render(<ExecutionDetail execution={{ ...executionWithUserFlow(), userFlows: [{ ...executionWithUserFlow().userFlows![0], snapshot: { flowKey: 'UF-1', title: 'A very long User Flow title that needs truncation' } }] }} onSave={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} />);

    const chipText = screen.getByText('UF-1 · A very long User Flow title that needs truncation');
    expect(chipText.className).toContain('max-w-[16rem]');
    expect(chipText.getAttribute('title')).toBe('UF-1 · A very long User Flow title that needs truncation');
    expect(screen.getByLabelText('Test case metadata').className).toContain('flex-wrap');
  });

  it('renders execution metadata as separate semantic chips', () => {
    render(<ExecutionDetail execution={executionWithMetadata()} onSave={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} />);

    const metadata = screen.getByLabelText('Test case metadata');
    expect(metadata.textContent).toContain('TC-2');
    expect(metadata.textContent).toContain('UI');
    expect(metadata.textContent).toContain('Critical');
    expect(metadata.children).toHaveLength(3);
    expect(screen.queryByText('TC-2 · UI · Critical')).toBeNull();
  });

  it('keeps the action footer outside the scrollable content without overlay positioning', () => {
    render(<ExecutionDetail execution={execution()} onSave={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} />);

    const footer = screen.getByRole('contentinfo');
    expect(footer.className).toContain('shrink-0');
    expect(footer.className).not.toContain('sticky');
    expect(footer.className).not.toContain('absolute');
    expect(footer.className).not.toContain('fixed');
    expect(footer.previousElementSibling?.className).toContain('overflow-y-auto');
  });
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

  it('saves the initial Untested result without a reset sentinel', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ExecutionDetail execution={execution()} onSave={onSave} onPrevious={vi.fn()} onNext={vi.fn()} />);

    expect(screen.getByLabelText('Result').getAttribute('value')).toBe('Untested');
    await user.type(screen.getByLabelText('Notes'), 'Need access to test environment');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('execution-1', {
      result: 'Untested',
      notes: 'Need access to test environment',
    }));
  });

  it('moves next after an Untested notes-only save succeeds', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onNext = vi.fn();
    render(<ExecutionDetail execution={execution()} onSave={onSave} onPrevious={vi.fn()} onNext={onNext} />);

    await user.click(screen.getByRole('button', { name: 'Save & Next' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('execution-1', { result: 'Untested', notes: '' }));
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
    expect(screen.getByLabelText('Saving')).toBeTruthy();
    await user.click(button);
    expect(onSave).toHaveBeenCalledTimes(1);
    resolveSave?.();
  });

  it('keeps Result and step Notes in separate spacing groups and does not expose MVP copy', () => {
    render(<ExecutionDetail execution={executionWithStep()} onSave={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} />);

    const stepNotes = screen.getByLabelText('Step 1 Notes');
    const spacingGroup = stepNotes.closest('.border-t');
    expect(spacingGroup?.className).toContain('pt-3');
    expect(spacingGroup?.parentElement?.className).toContain('space-y-3');
    expect(screen.queryByText(/MVP/i)).toBeNull();
  });

  it('hides Save & Next on the last execution because completion is automatic', async () => {
    render(
      <ExecutionDetail
        execution={execution()}
        isLastExecution
        onSave={vi.fn().mockResolvedValue(undefined)}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Save & Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save & Finish Run' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
