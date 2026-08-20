import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn() }));
const cache = vi.hoisted(() => ({
  getCached: vi.fn((_key: string, request: () => unknown) => request()),
}));

vi.mock('./axios.ts', () => ({ default: api }));
vi.mock('./read-cache.ts', () => ({ getCached: cache.getCached }));

import { ReportsService } from './reports.service.ts';

describe('ReportsService availability normalization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps an explicitly filtered Untested run report visible without executed cases', async () => {
    api.get.mockResolvedValue({
      data: {
        availability: { hasTestRuns: true, hasRunCases: true, hasFilteredCases: true },
        summary: { executed: 0, passRate: null, untested: 2, progress: 0 },
        distribution: [{ result: 'Untested', count: 2 }],
      },
    });

    const response = await ReportsService.get('project-1', { result: 'Untested' }, { force: true });

    expect(response.data.hasData).toBe(true);
    expect(response.data.availability).toEqual({
      hasTestRuns: true,
      hasRunCases: true,
      hasFilteredCases: true,
    });
  });

  it('does not present a project without run cases as a report', async () => {
    api.get.mockResolvedValue({
      data: {
        availability: { hasTestRuns: false, hasRunCases: false, hasFilteredCases: false },
        summary: { executed: 0 },
      },
    });

    const response = await ReportsService.get('project-1', {}, { force: true });

    expect(response.data.hasData).toBe(false);
  });

  it('maps backend User Flow rows to report breakdown and drill-down fields', async () => {
    api.get.mockResolvedValue({ data: { availability: { hasFilteredCases: true }, summary: { executed: 1 }, breakdowns: { userFlow: [{ userFlowId: 'flow-1', flowKey: 'UF-1', title: 'Checkout', testRunIds: ['run-1'] }] }, userFlowQuality: [{ userFlowId: 'flow-1', flowKey: 'UF-1', title: 'Checkout', testRunIds: ['run-1'] }] } });
    const response = await ReportsService.get('project-1', {}, { force: true });
    expect(response.data.breakdowns.userFlow?.[0]).toMatchObject({ id: 'flow-1', label: 'UF-1 — Checkout', testRunIds: ['run-1'] });
    expect(response.data.userFlowQuality?.[0]).toMatchObject({ id: 'flow-1', label: 'UF-1 — Checkout', testRunIds: ['run-1'] });
  });
});
