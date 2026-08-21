// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TestRunExecutionRecord } from '@/src/types/api.ts';

const serviceMocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), delete: vi.fn(), updateExecution: vi.fn() }));
vi.mock('@/src/api/test-runs.service.ts', () => ({
  TestRunsService: {
    get: serviceMocks.get,
    update: serviceMocks.update,
    delete: serviceMocks.delete,
    updateExecution: serviceMocks.updateExecution,
  },
}));

import { RunDetail } from './TestRunsPage.tsx';
import { selectCustomOption } from '@/src/test/selectTestUtils.ts';

const untested = {
  id: 'execution-1', runId: 'run-1', sourceTestCaseId: 'case-1', result: 'Untested' as const,
  notes: '', updatedAt: '2026-08-17T00:00:00.000Z',
  snapshot: { tcNumber: 1, title: 'First case', steps: [] },
};
const second = {
  ...untested, id: 'execution-2', sourceTestCaseId: 'case-2', snapshot: { tcNumber: 2, title: 'Second case', steps: [] },
};
const third = {
  ...untested, id: 'execution-3', sourceTestCaseId: 'case-3',
  snapshot: { tcNumber: 3, title: 'Third case', steps: [] },
};

const runResponse = (executions: TestRunExecutionRecord[]) => ({
  data: {
    id: 'run-1', projectId: 'project-1', name: 'Regression', status: 'In Progress' as const,
    createdAt: '2026-08-17T00:00:00.000Z', updatedAt: '2026-08-17T00:00:00.000Z', executions,
  },
});

describe('RunDetail execution save', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('replaces redundant detail/finish menu entries with edit/delete and confirms delete', async () => {
    serviceMocks.get.mockResolvedValue(runResponse([untested]));
    serviceMocks.delete.mockResolvedValue({ data: { id: 'run-1' } });
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<RunDetail projectId="project-1" runId="run-1" onBack={onBack} />);

    await screen.findByRole('heading', { name: 'First case' });
    await user.click(screen.getByRole('button', { name: 'Aksi' }));
    expect(screen.queryByText('Detail run')).toBeNull();
    expect(screen.queryByText('Selesaikan run')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit Run' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Delete Run' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(serviceMocks.delete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete Run' }));
    await waitFor(() => expect(serviceMocks.delete).toHaveBeenCalledWith('project-1', 'run-1'));
    expect(onBack).toHaveBeenCalled();
  });

  it('hides edit and finish actions for completed runs while retaining delete', async () => {
    serviceMocks.get.mockResolvedValue({ data: { ...runResponse([{ ...untested, result: 'Passed' as const }]).data, status: 'Completed' } });
    const user = userEvent.setup();
    render(<RunDetail projectId="project-1" runId="run-1" onBack={vi.fn()} />);

    await screen.findByRole('heading', { name: 'First case' });
    expect(screen.queryByRole('button', { name: 'Selesaikan Run' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Aksi' }));
    expect(screen.queryByRole('button', { name: 'Edit Run' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete Run' })).toBeTruthy();
  });

  it('renders Test Run header metadata as separate chips', async () => {
    serviceMocks.get.mockImplementationOnce(() => Promise.resolve({
      data: {
        ...runResponse([untested]).data,
        displayId: 'TR-6',
        description: 'Run **smoke** untuk checkout.',
        owner: { id: 'owner-1', username: 'qa_dayadi' },
        status: 'Draft',
        type: 'Mixed',
      },
    }));

    render(<RunDetail projectId="project-1" runId="run-1" currentUser={{ id: 'session-1', username: 'logged_in_user' }} onBack={vi.fn()} />);

    const metadata = await screen.findByLabelText('Test Run metadata');
    expect(metadata.textContent).toContain('TR-6');
    expect(metadata.textContent).toContain('qa_dayadi');
    expect(metadata.textContent).not.toContain('Logged In User');
    expect(metadata.textContent).toContain('Draft');
    expect(metadata.textContent).toContain('Mixed');
    expect(metadata.children).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Selesaikan Run' })).toBeNull();
    expect(screen.getByLabelText('Deskripsi Test Run').textContent).toContain('Run smoke untuk checkout.');
  });

  it('keeps assignee and User Flow metadata out of each compact list item', async () => {
    serviceMocks.get.mockResolvedValue(runResponse([{
      ...untested,
      assignee: { id: 'user-1', username: 'row-assignee' },
      userFlows: [{ id: 'flow-1', snapshot: { flowKey: 'UF-1', title: 'Sign in flow' } }],
    }]));

    render(<RunDetail projectId="project-1" runId="run-1" currentUser={{ id: 'session-1', username: 'logged_in_user' }} onBack={vi.fn()} />);

    await screen.findByRole('heading', { name: 'First case' });
    const list = screen.getByRole('heading', { name: 'Test cases in run' }).closest('aside');
    expect(list?.textContent).not.toContain('row-assignee');
    expect(list?.textContent).not.toContain('Dari UF-1');
    expect(screen.getByLabelText('Test case metadata').textContent).toContain('UF-1 · Sign in flow');
    expect(screen.getByLabelText('Assignee')).toBeTruthy();
  });

  it('keeps the owner chip sourced from the Test Run, not the authenticated user', async () => {
    serviceMocks.get.mockResolvedValue(runResponse([untested]));
    const { rerender } = render(
      <RunDetail projectId="project-1" runId="run-1" currentUser={{ id: 'session-1', username: 'first_user' }} onBack={vi.fn()} />,
    );

    const metadata = await screen.findByLabelText('Test Run metadata');
    expect(metadata.textContent).toContain('—');
    rerender(<RunDetail projectId="project-1" runId="run-1" currentUser={{ id: 'session-2', username: 'second_user' }} onBack={vi.fn()} />);
    expect(screen.getByLabelText('Test Run metadata').textContent).toContain('—');
  });

  it('refetches server-derived completed status and summary after a successful result save', async () => {
    serviceMocks.get.mockResolvedValueOnce({
      data: {
        id: 'run-1', projectId: 'project-1', name: 'Regression', status: 'In Progress',
        createdAt: '2026-08-17T00:00:00.000Z', updatedAt: '2026-08-17T00:00:00.000Z',
        executions: [untested, second],
      },
    });
    serviceMocks.get.mockResolvedValueOnce({
      data: {
        id: 'run-1', projectId: 'project-1', name: 'Regression', status: 'Completed',
        createdAt: '2026-08-17T00:00:00.000Z', updatedAt: '2026-08-17T00:01:00.000Z',
        summary: { total: 2, executed: 2, passed: 1, failed: 0, blocked: 0, skipped: 1, untested: 0, progress: 100 },
        executions: [{ ...untested, result: 'Passed' }, { ...second, result: 'Skipped' }],
      },
    });
    serviceMocks.updateExecution.mockResolvedValue({
      data: { ...untested, result: 'Passed', executedAt: '2026-08-17T00:01:00.000Z' },
    });
    const user = userEvent.setup();
    render(<RunDetail projectId="project-1" runId="run-1" onBack={vi.fn()} />);

    await screen.findByRole('heading', { name: 'First case' });
    await selectCustomOption(user, 'Result', 'Passed');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(serviceMocks.updateExecution).toHaveBeenCalledWith(
      'project-1', 'run-1', 'execution-1', { result: 'Passed', notes: '' },
    ));
    await screen.findByText('Completed');
    await screen.findByText('2 / 2 executed');
    expect(serviceMocks.get).toHaveBeenCalledTimes(2);
  });

  it('keeps Save & Next available for a middle case even when the sidebar is filtered', async () => {
    serviceMocks.get.mockResolvedValue(runResponse([untested, second, third]));
    const user = userEvent.setup();
    render(
      <RunDetail
        projectId="project-1"
        runId="run-1"
        executionId="execution-2"
        onBack={vi.fn()}
      />,
    );

    await screen.findByRole('heading', { name: 'Second case' });
    await user.type(screen.getByLabelText('Cari test case dalam run'), 'Second');
    expect(screen.getByRole('button', { name: 'Save & Next' })).toBeTruthy();
  });

  it('shows the completed state automatically for a fully executed case', async () => {
    const completedCase = { ...untested, result: 'Passed' as const };
    serviceMocks.get.mockResolvedValue({ data: { ...runResponse([completedCase]).data, status: 'Completed' } });
    render(<RunDetail projectId="project-1" runId="run-1" onBack={vi.fn()} />);

    await screen.findByRole('heading', { name: 'First case' });
    expect(screen.queryByRole('button', { name: 'Save & Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save & Finish Run' })).toBeNull();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('does not offer silent completion while any case remains Untested', async () => {
    serviceMocks.get.mockResolvedValue(runResponse([untested, { ...second, result: 'Passed' as const }]));
    render(<RunDetail projectId="project-1" runId="run-1" executionId="execution-2" onBack={vi.fn()} />);

    await screen.findByRole('heading', { name: 'Second case' });
    expect(screen.queryByRole('button', { name: 'Save & Finish Run' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save & Next' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('uses eligible project members for the assignee control and persists manual reassignment', async () => {
    serviceMocks.get
      .mockResolvedValueOnce(runResponse([untested, second]))
      .mockResolvedValueOnce(runResponse([
        { ...untested, assignee: { id: 'user-2', username: 'qa-two' }, assigneeId: 'user-2' },
        second,
      ]));
    serviceMocks.updateExecution.mockResolvedValue({
      data: { ...untested, assignee: { id: 'user-2', username: 'qa-two' }, assigneeId: 'user-2' },
    });
    const user = userEvent.setup();
    render(
      <RunDetail
        projectId="project-1"
        runId="run-1"
        onBack={vi.fn()}
        currentUser={{ id: 'user-current', username: 'current-user' }}
        members={[
          { userId: 'user-1', username: 'qa-one' },
          { userId: 'user-2', username: 'qa-two' },
        ]}
      />,
    );

    await screen.findByRole('heading', { name: 'First case' });
    await selectCustomOption(user, 'Assignee', 'user-2');

    await waitFor(() => expect(serviceMocks.updateExecution).toHaveBeenCalledWith(
      'project-1', 'run-1', 'execution-1', { assigneeId: 'user-2' },
    ));
    expect(screen.getByRole('button', { name: 'Assignee' }).textContent).toContain('qa-two');
    await user.click(screen.getByRole('button', { name: 'Filter assignee' }));
    expect(screen.getByRole('option', { name: 'qa-one' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'qa-two' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'current-user' })).toBeTruthy();
  });
});
