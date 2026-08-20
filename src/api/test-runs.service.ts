import api from './axios';
import { getCached, invalidateReadCache, type ReadOptions } from './read-cache';
import { notifyExecutionDataChanged } from './execution-refresh';
import type { ApiResponse, TestRunDetailRecord, TestRunExecutionRecord, TestRunListResponse, TestRunRecord, TestRunResult, TestRunStatus } from '@/src/types/api.ts';

export type TestRunFilters = { search?: string; status?: string; type?: string; ownerId?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number };
export type ExecutionFilters = { search?: string; result?: string; priority?: string; assigneeId?: string };
export type UserFlowResolution = {
  selectedUserFlowCount: number;
  linkedTestCases: number;
  uniqueLinkedTestCases: number;
  uniqueEligibleTestCaseIds: string[];
  uniqueEligibleTestCases: number;
  excludedDeprecatedTestCases?: number;
  excludedDeprecatedCount: number;
  draftRequiringOptInTestCases?: number;
  draftRequiringOptInCount: number;
};
const base = (projectId: string) => `/v1/projects/${projectId}/test-runs`;
const queryKey = (path: string, params?: object) => `${path}?${new URLSearchParams(Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)])).toString()}`;
const invalidate = (projectId: string) => {
  invalidateReadCache(base(projectId));
  invalidateReadCache(`/v1/projects/${projectId}/reports`);
  invalidateReadCache(`/v1/projects/${projectId}/user-flows`);
  invalidateReadCache('/v1/projects');
  notifyExecutionDataChanged(projectId);
};

export const TestRunsService = {
  list: (projectId: string, filters: TestRunFilters = {}, options?: ReadOptions) => {
    const path = base(projectId);
    return getCached(queryKey(path, filters), async () => {
      const response = await api.get(path, { params: filters }) as ApiResponse<TestRunListResponse>;
      return { ...response, data: { ...response.data, items: response.data.items.map((run: any) => ({ ...run, progress: { ...run.summary, percentage: run.summary?.progress ?? 0 }, owner: run.ownerName ? { id: run.ownerId || '', username: run.ownerName } : null })) } };
    }, options);
  },
  create: async (projectId: string, payload: { name: string; description?: string; type?: string; ownerId?: string; testCaseIds?: string[]; allowDraftTestCases?: boolean; userFlowIds?: string[]; allowDraftUserFlows?: boolean }) => {
    const response = await api.post(base(projectId), payload) as ApiResponse<TestRunRecord>; invalidate(projectId); return response;
  },
  resolveUserFlows: async (projectId: string, payload: { userFlowIds: string[]; allowDraftTestCases?: boolean }) =>
    api.post(`${base(projectId)}/resolve-user-flows`, payload) as Promise<ApiResponse<UserFlowResolution>>,
  get: (projectId: string, runId: string, options?: ReadOptions) => getCached(`${base(projectId)}/${runId}`, async () => { const [response, executionResponse] = await Promise.all([api.get(`${base(projectId)}/${runId}`) as Promise<ApiResponse<any>>, api.get(`${base(projectId)}/${runId}/executions`) as Promise<ApiResponse<any[]>>]); const executions = executionResponse.data.map((execution) => ({ ...execution, result: execution.result || 'Untested', snapshot: execution.testCaseSnapshot, assignee: execution.assigneeName ? { id: execution.assigneeId || '', username: execution.assigneeName } : null, updatedAt: execution.lastSaved, userFlows: execution.userFlows || [] })); const userFlows = [...new Map([...(response.data.userFlows || []), ...executions.flatMap((execution) => execution.userFlows)].map((flow: any) => [flow.id, flow])).values()]; return { ...response, data: { ...response.data, progress: { ...response.data.summary, percentage: response.data.summary?.progress ?? 0 }, owner: response.data.ownerName ? { id: response.data.ownerId || '', username: response.data.ownerName } : null, userFlows, executions } as TestRunDetailRecord }; }, options),
  update: async (projectId: string, runId: string, payload: { name?: string; description?: string; ownerId?: string }) => {
    const response = await api.patch(`${base(projectId)}/${runId}`, payload) as ApiResponse<TestRunRecord>; invalidate(projectId); return response;
  },
  updateStatus: async (projectId: string, runId: string, status: TestRunStatus) => { const response = status === 'Completed' ? await api.post(`${base(projectId)}/${runId}/complete`) as ApiResponse<TestRunRecord> : await api.patch(`${base(projectId)}/${runId}`, { status }) as ApiResponse<TestRunRecord>; invalidate(projectId); return response; },
  listExecutions: (projectId: string, runId: string, filters: ExecutionFilters = {}, options?: ReadOptions) => {
    const path = `${base(projectId)}/${runId}/executions`;
    return getCached(queryKey(path, filters), async () => { const response = await api.get(path, { params: filters }) as ApiResponse<any[]>; return { ...response, data: response.data.map((execution) => ({ ...execution, result: execution.result || 'Untested', snapshot: execution.testCaseSnapshot, assignee: execution.assigneeName ? { id: execution.assigneeId || '', username: execution.assigneeName } : null, updatedAt: execution.lastSaved, userFlows: execution.userFlows || [] })) as TestRunExecutionRecord[] }; }, options);
  },
  updateExecution: async (projectId: string, runId: string, executionId: string, payload: { result?: TestRunResult | null; notes?: string; assigneeId?: string; durationSeconds?: number | null }) => {
    await api.patch(`${base(projectId)}/${runId}/executions/${executionId}`, payload);
    invalidate(projectId);
    try {
      const executions = await TestRunsService.listExecutions(projectId, runId, {}, { force: true });
      const execution = executions.data.find((item) => item.id === executionId);
      if (!execution) throw new Error('TEST_RUN_EXECUTION_NOT_FOUND');
      return { success: true, code: 'TEST_RUN_EXECUTION_UPDATE_SUCCESS', message: '', data: execution } as ApiResponse<TestRunExecutionRecord>;
    } catch (cause) {
      if ((cause as Error).message === 'TEST_RUN_EXECUTION_NOT_FOUND') throw cause;
      throw {
        executionSaved: true,
        message: 'Hasil eksekusi sudah tersimpan, tetapi data terbaru tidak dapat dimuat. Muat ulang halaman untuk melihat pembaruan.',
      };
    }
  },
};
