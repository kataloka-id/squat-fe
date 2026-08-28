/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReportContent } from './ReportsPage.tsx';
import type { ProjectReportRecord } from '@/src/types/api.ts';

const serviceMocks = vi.hoisted(() => ({
  listExecutions: vi.fn(),
  getViewUrl: vi.fn(),
}));
vi.mock('@/src/api/test-runs.service.ts', () => ({
  TestRunsService: {
    listExecutions: serviceMocks.listExecutions,
  },
}));
vi.mock('@/src/api/attachments.service.ts', () => ({
  AttachmentsService: {
    getViewUrl: serviceMocks.getViewUrl,
  },
}));

const report: ProjectReportRecord = {
  hasData: true,
  availability: { hasTestRuns: true, hasRunCases: true, hasFilteredCases: true },
  summary: { executed: 8, passRate: 75, passed: 6, failed: 1, blocked: 1, skipped: 0, untested: 2, progress: 80 },
  distribution: [
    { result: 'Passed', count: 6 },
    { result: 'Failed', count: 1 },
    { result: 'Blocked', count: 1 },
    { result: 'Skipped', count: 0 },
    { result: 'Untested', count: 2 },
  ],
  trend: [{ date: '2026-08-26', passed: 6, failed: 1, blocked: 1, skipped: 0, untested: 2 }],
  breakdowns: { section: [] },
  userFlowQuality: [{ id: 'flow-1', label: 'Checkout', executed: 3, passed: 2, failed: 1, blocked: 0, passRate: 66.67, progress: 75, testRunIds: ['run-1'] }],
  attention: [],
};

describe('Reports dashboard interactions', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('filters from a status segment without changing the report calculation', async () => {
    const user = userEvent.setup();
    const onResultFilter = vi.fn();
    render(<ReportContent report={report} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={onResultFilter} onOpenUserFlow={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Filter Failed: 1' }));

    expect(onResultFilter).toHaveBeenCalledWith('Failed');
    expect(screen.getByText('Total test cases').parentElement?.textContent).toContain('10');
    expect(screen.getByText('Coverage', { selector: 'span' }).parentElement?.textContent).toContain('80%');
  });

  it('explains how Overall Health is calculated', async () => {
    const user = userEvent.setup();
    render(<ReportContent report={report} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={vi.fn()} onOpenUserFlow={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Explain Overall Health' }));

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toContain('pass rate minimal 80%');
    expect(tooltip.textContent).toContain('Coverage adalah Executed');
  });

  it('filters the report to the selected user flow instead of opening a test run', async () => {
    const user = userEvent.setup();
    const onOpenUserFlow = vi.fn();
    render(<ReportContent report={report} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={vi.fn()} onOpenUserFlow={onOpenUserFlow} />);

    await user.click(screen.getAllByRole('button', { name: 'Lihat hasil report untuk Checkout' })[0]);

    expect(onOpenUserFlow).toHaveBeenCalledWith('flow-1');
  });

  it('places trend points according to calendar distance', () => {
    const { container } = render(<ReportContent report={{ ...report, trend: [
      { date: '2026-08-01', passed: 1, failed: 0, blocked: 0, skipped: 0, untested: 0 },
      { date: '2026-08-11', passed: 1, failed: 0, blocked: 0, skipped: 0, untested: 0 },
      { date: '2026-08-31', passed: 1, failed: 0, blocked: 0, skipped: 0, untested: 0 },
    ] }} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={vi.fn()} onOpenUserFlow={vi.fn()} />);

    const points = container.querySelector('[data-testid="pass-rate-trend-chart"] polyline')?.getAttribute('points') || '';
    const [first, middle, last] = points.split(' ').map((point) => point.split(',').map(Number));
    expect(first[0]).toBe(52);
    expect(middle[0]).toBeCloseTo(213.333, 2);
    expect(last[0]).toBe(536);
    expect(first[1]).toBe(20);
  });

  it('uses a consistent 0–100% scale and exposes complete point tooltips', () => {
    const { container } = render(<ReportContent report={{ ...report, trend: [
      { date: '2026-08-01', passed: 0, failed: 2, blocked: 0, skipped: 0, untested: 0 },
      { date: '2026-08-02', passed: 2, failed: 0, blocked: 0, skipped: 0, untested: 1 },
    ] }} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={vi.fn()} onOpenUserFlow={vi.fn()} />);

    const chart = container.querySelector('[data-testid="pass-rate-trend-chart"]')!;
    expect(Array.from(chart.querySelectorAll('text')).map((node) => node.textContent)).toEqual(['100%', '75%', '50%', '25%', '0%', '08-01', '08-02']);
    expect(chart.querySelector('circle')?.querySelector('title')?.textContent).toContain('Pass Rate 0%');
    expect(chart.querySelectorAll('circle')[1]?.querySelector('title')?.textContent).toContain('2 executed / 3 total');
  });

  it('does not connect points across periods without an executable denominator', () => {
    const { container } = render(<ReportContent report={{ ...report, trend: [
      { date: '2026-08-01', passed: 1, failed: 0, blocked: 0, skipped: 0, untested: 0 },
      { date: '2026-08-02', passed: 0, failed: 0, blocked: 0, skipped: 0, untested: 2 },
      { date: '2026-08-03', passed: 0, failed: 1, blocked: 0, skipped: 0, untested: 0 },
    ] }} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={vi.fn()} onOpenUserFlow={vi.fn()} />);

    const chart = container.querySelector('[data-testid="pass-rate-trend-chart"]')!;
    expect(chart.querySelectorAll('polyline')).toHaveLength(0);
    expect(chart.querySelectorAll('circle')).toHaveLength(2);
  });

  it('keeps a no-data user-flow state readable', () => {
    render(<ReportContent report={{ ...report, userFlowQuality: [] }} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={vi.fn()} onOpenUserFlow={vi.fn()} />);

    expect(screen.getByText('Belum ada data User Flow pada scope ini.')).toBeTruthy();
  });

  it('shows execution and step notes in the Perlu Perhatian detail', async () => {
    serviceMocks.getViewUrl.mockResolvedValue({ data: { url: 'https://cdn.example.com/error.png' } });
    serviceMocks.listExecutions.mockResolvedValue({
      data: [{
        id: 'execution-1',
        runId: 'run-1',
        sourceTestCaseId: 'case-1',
        result: 'Failed',
        notes: 'Investigate the [checkout docs](https://example.com). ![Failure screenshot](attachment://123e4567-e89b-12d3-a456-426614174000)',
        updatedAt: '2026-08-26T10:00:00.000Z',
        snapshot: { projectKey: 'KAT', tcNumber: 42, title: 'Checkout succeeds', expectedResult: 'Order is created' },
        steps: [{ id: 'step-1', position: 1, action: 'Submit the [order form](https://example.com/order). ![Action screenshot](attachment://123e4567-e89b-12d3-a456-426614174000)', expectedResult: 'Order is created; show `px`; the canvas. [confirmation](https://example.com/confirmation). ![Expected screenshot](attachment://123e4567-e89b-12d3-a456-426614174001)', result: 'Blocked', notes: 'API returned 500. ![Error screenshot](https://example.com/error.png)' }],
      }],
    });
    const user = userEvent.setup();
    render(<ReportContent report={{ ...report, attention: [{ id: 'execution-1', runId: 'run-1', executionId: 'execution-1', runName: 'Regression', projectKey: 'KAT', tcNumber: 42, title: 'Checkout succeeds', result: 'FAILED', updatedAt: null }] }} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={vi.fn()} onOpenUserFlow={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Lihat detail hasil Checkout succeeds' }));

    expect(await screen.findByRole('link', { name: 'checkout docs' })).toBeTruthy();
    expect(screen.getAllByLabelText('Result: Failed')).toHaveLength(1);
    expect(screen.getByLabelText('Result: Failed').className).toContain('bg-red-50');
    expect(screen.getByLabelText('Result: Blocked').className).toContain('bg-amber-50');
    expect(screen.getByText(/API returned 500\./)).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Error screenshot' }).getAttribute('src')).toBe('https://example.com/error.png');
    expect((await screen.findByRole('img', { name: 'Failure screenshot' })).getAttribute('src')).toBe('https://cdn.example.com/error.png');
    expect(screen.getByRole('link', { name: 'order form' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'confirmation' })).toBeTruthy();
    expect(screen.getByText('px').tagName).toBe('CODE');
    expect(screen.getByText('px').className).not.toContain('px-');
    expect(screen.getByRole('img', { name: 'Action screenshot' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Expected screenshot' })).toBeTruthy();
    expect(serviceMocks.listExecutions).toHaveBeenCalledWith('project-1', 'run-1');
  });

  it('handles a missing attachment without replacing the surrounding note', async () => {
    serviceMocks.getViewUrl.mockRejectedValue(new Error('not found'));
    serviceMocks.listExecutions.mockResolvedValue({
      data: [{
        id: 'execution-1', runId: 'run-1', sourceTestCaseId: 'case-1', result: 'Failed',
        notes: 'Keep this context. ![Deleted evidence](attachment://123e4567-e89b-12d3-a456-426614174000)',
        updatedAt: '2026-08-26T10:00:00.000Z', snapshot: { title: 'Checkout succeeds' }, steps: [],
      }],
    });
    const user = userEvent.setup();
    render(<ReportContent report={{ ...report, attention: [{ id: 'execution-1', runId: 'run-1', executionId: 'execution-1', runName: 'Regression', projectKey: 'KAT', tcNumber: 42, title: 'Checkout succeeds', result: 'FAILED', updatedAt: null }] }} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={vi.fn()} onOpenUserFlow={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Lihat detail hasil Checkout succeeds' }));

    expect(screen.getByText('Keep this context.')).toBeTruthy();
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to load image preview.');
  });

  it('opens the exact source Test Run and execution from result detail', async () => {
    const onOpenTestRun = vi.fn();
    serviceMocks.listExecutions.mockResolvedValue({
      data: [{ id: 'execution-1', runId: 'run-1', sourceTestCaseId: 'case-1', result: 'Failed', updatedAt: '2026-08-26T10:00:00.000Z', snapshot: { title: 'Checkout succeeds' }, steps: [] }],
    });
    const user = userEvent.setup();
    render(<ReportContent report={{ ...report, attention: [{ id: 'execution-1', runId: 'run-1', executionId: 'execution-1', runName: 'Regression', projectKey: 'KAT', tcNumber: 42, title: 'Checkout succeeds', result: 'FAILED', updatedAt: null }] }} projectId="project-1" scopeLabel="Demo" tab="section" setTab={vi.fn()} onResultFilter={vi.fn()} onOpenUserFlow={vi.fn()} onOpenTestRun={onOpenTestRun} />);

    await user.click(screen.getByRole('button', { name: 'Lihat detail hasil Checkout succeeds' }));
    await user.click(await screen.findByRole('button', { name: 'View Test Run' }));

    expect(onOpenTestRun).toHaveBeenCalledWith('run-1', 'execution-1');
  });
});
