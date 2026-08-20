import api from './axios';
import { getCached, type ReadOptions } from './read-cache';
import type { ApiResponse, ProjectReportRecord } from '@/src/types/api.ts';

export type ReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  runId?: string;
  sectionId?: string;
  folderId?: string;
  tag?: string;
  priority?: string;
  automationType?: string;
  assigneeId?: string;
  result?: string;
  userFlowId?: string;
};
const base = (projectId: string) => `/v1/projects/${projectId}/reports`;
const normalizeUserFlowRows = (rows: any[] = []) => rows.map((row) => ({
  ...row,
  id: row.userFlowId || row.id,
  label: row.label || [row.flowKey, row.title].filter(Boolean).join(' — ') || 'User Flow',
  testRunIds: row.testRunIds || [],
}));
export const ReportsService = {
  get: (projectId: string, filters: ReportFilters, options?: ReadOptions) => {
    const key = `${base(projectId)}?${new URLSearchParams(
      Object.entries(filters)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)]),
    ).toString()}`;
    return getCached(
      key,
      async () => {
        const response = (await api.get(base(projectId), { params: filters })) as ApiResponse<any>;
        const raw = response.data;
        const byDate = new Map<string, any>();
        (raw.trend || []).forEach((row: any) => {
          const item = byDate.get(row.date) || {
            date: row.date,
            passed: 0,
            failed: 0,
            blocked: 0,
            skipped: 0,
            untested: 0,
          };
          item[String(row.result || 'Untested').toLowerCase()] = Number(row.count);
          byDate.set(row.date, item);
        });
        const summary = raw.summary || {};
        const distribution = raw.distribution || [];
        const availability = raw.availability || {};
        const hasFilteredCases = Boolean(availability.hasFilteredCases);
        return {
          ...response,
          data: {
            // Untested is meaningful report data only when the user explicitly
            // requests it. The server availability flag prevents an empty
            // project from being presented as a zero-valued report.
            hasData:
              hasFilteredCases &&
              (Number(summary.executed || 0) > 0 || filters.result === 'Untested'),
            availability: {
              hasTestRuns: Boolean(availability.hasTestRuns),
              hasRunCases: Boolean(availability.hasRunCases),
              hasFilteredCases,
            },
            summary: {
              executed: summary.executed ?? null,
              passRate: summary.passRate ?? null,
              passed: summary.passed ?? null,
              failed: summary.failed ?? null,
              blocked: summary.blocked ?? null,
              skipped: summary.skipped ?? null,
              untested: summary.untested ?? null,
              progress: summary.progress ?? null,
            },
            distribution,
            trend: [...byDate.values()],
            breakdowns: { ...(raw.breakdowns || {}), userFlow: normalizeUserFlowRows(raw.breakdowns?.userFlow) },
            userFlowQuality: normalizeUserFlowRows(raw.userFlowQuality),
            attention: (raw.attentionItems || []).map((item: any) => ({
              id: item.executionId,
              runId: item.testRunId,
              executionId: item.executionId,
              runName: item.testRunName,
              tcNumber: item.tcNumber ? Number(item.tcNumber) : null,
              title: item.title,
              result: item.result,
              updatedAt: item.updatedAt,
            })),
          } as ProjectReportRecord,
        };
      },
      options,
    );
  },
};
