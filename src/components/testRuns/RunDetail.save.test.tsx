// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({ get: vi.fn(), updateExecution: vi.fn() }));
vi.mock('@/src/api/test-runs.service.ts', () => ({
  TestRunsService: {
    get: serviceMocks.get,
    updateExecution: serviceMocks.updateExecution,
    updateStatus: vi.fn(),
  },
}));

import { RunDetail } from './TestRunsPage.tsx';

const untested = {
  id: 'execution-1', runId: 'run-1', sourceTestCaseId: 'case-1', result: 'Untested' as const,
  notes: '', updatedAt: '2026-08-17T00:00:00.000Z',
  snapshot: { tcNumber: 1, title: 'First case', steps: [] },
};
const second = {
  ...untested, id: 'execution-2', sourceTestCaseId: 'case-2', snapshot: { tcNumber: 2, title: 'Second case', steps: [] },
};

describe('RunDetail execution save', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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
    await user.selectOptions(screen.getByLabelText('Result'), 'Passed');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(serviceMocks.updateExecution).toHaveBeenCalledWith(
      'project-1', 'run-1', 'execution-1', { result: 'Passed', notes: '' },
    ));
    await screen.findByText('Completed');
    await screen.findByText('2 / 2 executed');
    expect(serviceMocks.get).toHaveBeenCalledTimes(2);
  });
});
