import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  patch: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  invalidateReadCache: vi.fn(),
}));

vi.mock('./axios', () => ({ default: { patch: mocks.patch, get: mocks.get, post: mocks.post } }));
vi.mock('./read-cache', () => ({
  getCached: (_key: string, loader: () => unknown) => loader(),
  invalidateReadCache: mocks.invalidateReadCache,
}));

import { TestRunsService } from './test-runs.service.ts';

describe('TestRunsService.updateExecution', () => {
  it('PATCHes the execution resource with the execution payload, never the Test Run metadata resource', async () => {
    mocks.patch.mockResolvedValueOnce({ success: true, data: { id: 'execution-7' } });
    mocks.get.mockResolvedValueOnce({
      success: true,
      data: [{
        id: 'execution-7', result: 'Passed', testCaseSnapshot: { title: 'Can sign in' },
        lastSaved: '2026-08-17T00:00:00.000Z', userFlows: [],
      }],
    });

    await TestRunsService.updateExecution('project-1', 'run-3', 'execution-7', {
      result: 'Passed', notes: 'Verified', assigneeId: 'user-2', durationSeconds: 45,
    });

    expect(mocks.patch).toHaveBeenCalledWith(
      '/v1/projects/project-1/test-runs/run-3/executions/execution-7',
      { result: 'Passed', notes: 'Verified', assigneeId: 'user-2', durationSeconds: 45 },
    );
  });
});

describe('TestRunsService.resolveUserFlows', () => {
  it('uses the project-scoped resolver endpoint without client-side case resolution', async () => {
    mocks.post.mockResolvedValueOnce({ success: true, data: { selectedUserFlowCount: 1 } });
    await TestRunsService.resolveUserFlows('project-1', { userFlowIds: ['flow-1'], allowDraftTestCases: true });
    expect(mocks.post).toHaveBeenCalledWith('/v1/projects/project-1/test-runs/resolve-user-flows', {
      userFlowIds: ['flow-1'], allowDraftTestCases: true,
    });
  });
});

describe('TestRunsService.get', () => {
  it('retains persisted run User Flows when no eligible execution exists', async () => {
    mocks.get.mockResolvedValueOnce({ data: { id: 'run-1', summary: {}, userFlows: [{ id: 'flow-1', snapshot: { flowKey: 'UF-1', title: 'Checkout' } }] } });
    mocks.get.mockResolvedValueOnce({ data: [] });
    const response = await TestRunsService.get('project-1', 'run-1', { force: true });
    expect(response.data.userFlows).toEqual([{ id: 'flow-1', snapshot: { flowKey: 'UF-1', title: 'Checkout' } }]);
  });
});
