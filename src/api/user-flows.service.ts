import api from './axios';
import { invalidateReadCache } from './read-cache';
import type { ApiResponse, ProjectTestCaseRecord, TestRunProgress, TestRunStatus } from '@/src/types/api.ts';

export type FlowHealth = 'healthy' | 'at_risk' | 'broken' | 'unknown';
export type FlowPriority = 'critical' | 'high' | 'medium' | 'low';
export type FlowStatus = 'draft' | 'active' | 'deprecated';
export type DependencyRelationshipType = 'next' | 'requires' | 'optional' | 'alternative' | 'blocks';
export interface UserFlowStep { id: string; stepOrder: number; title: string; action?: string | null; expectedResult?: string | null; }
export interface UserFlowDependency { id?: string; sourceFlowId?: string; targetFlowId?: string; flowKey?: string; title?: string; health?: FlowHealth | null; relationshipType?: DependencyRelationshipType | null; }
export interface UserFlowLatestRun { id: string; name: string; status: TestRunStatus; updatedAt: string; progress?: TestRunProgress | null; }
export interface UserFlow { id: string; flowKey: string; title: string; description?: string | null; goal?: string | null; entryPoint?: string | null; successCriteria?: string | null; area?: string | null; priority: FlowPriority; health: FlowHealth; status: FlowStatus; linkedTestCaseCount: number; automatedTestCaseCount: number; coverage: number | null; lastTestedAt?: string | null; latestRun?: UserFlowLatestRun | null; updatedAt?: string; steps?: UserFlowStep[]; linkedTestCases?: ProjectTestCaseRecord[]; dependencies?: UserFlowDependency[]; incomingDependencies?: UserFlowDependency[]; }
export interface UserFlowSummary { total: number; healthy: number; atRisk: number; broken: number; coverage: number; }
export interface UserFlowCollection { flows: UserFlow[]; summary: UserFlowSummary; }
export type UserFlowPayload = Pick<UserFlow, 'title' | 'description' | 'goal' | 'entryPoint' | 'successCriteria' | 'area' | 'priority' | 'health' | 'status'>;

const base = (projectId: string) => `/v1/projects/${projectId}/user-flows`;
const invalidate = (projectId: string) => invalidateReadCache(base(projectId));

const normalizeFlow = (value: UserFlow & { latestTestRun?: { id: string; name: string; status: TestRunStatus; updatedAt: string; summary?: Partial<TestRunProgress> } | null }): UserFlow => {
  const legacy = value.latestTestRun;
  if (!legacy) return value;
  const summary = legacy.summary || {};
  const total = Number(summary.total || 0);
  const executed = Number(summary.passed || 0) + Number(summary.failed || 0) + Number(summary.blocked || 0) + Number(summary.skipped || 0);
  return {
    ...value,
    latestRun: {
      id: legacy.id,
      name: legacy.name,
      status: legacy.status,
      updatedAt: legacy.updatedAt,
      progress: { total, executed, passed: Number(summary.passed || 0), failed: Number(summary.failed || 0), blocked: Number(summary.blocked || 0), skipped: Number(summary.skipped || 0), untested: Math.max(0, total - executed), percentage: total ? Math.round((executed / total) * 100) : 0 },
    },
  };
};

export const UserFlowsService = {
  list: async (projectId: string) => {
    const response = await api.get(base(projectId)) as ApiResponse<UserFlowCollection>;
    return { ...response, data: { ...response.data, flows: response.data.flows.map((flow) => normalizeFlow(flow)) } };
  },
  get: async (projectId: string, id: string) => {
    const response = await api.get(`${base(projectId)}/${id}`) as ApiResponse<UserFlow>;
    return { ...response, data: normalizeFlow(response.data) };
  },
  create: async (projectId: string, payload: UserFlowPayload) => { const r = await api.post(base(projectId), payload) as ApiResponse<UserFlow>; invalidate(projectId); return r; },
  update: async (projectId: string, id: string, payload: Partial<UserFlowPayload>) => { const r = await api.patch(`${base(projectId)}/${id}`, payload) as ApiResponse<UserFlow>; invalidate(projectId); return r; },
  remove: async (projectId: string, id: string) => { const r = await api.delete(`${base(projectId)}/${id}`) as ApiResponse<null>; invalidate(projectId); return r; },
  addStep: (p: string, f: string, payload: Omit<UserFlowStep, 'id' | 'stepOrder'>) => api.post(`${base(p)}/${f}/steps`, payload) as Promise<ApiResponse<UserFlowStep>>,
  updateStep: (p: string, f: string, id: string, payload: Partial<UserFlowStep>) => api.patch(`${base(p)}/${f}/steps/${id}`, payload) as Promise<ApiResponse<UserFlowStep>>,
  removeStep: (p: string, f: string, id: string) => api.delete(`${base(p)}/${f}/steps/${id}`) as Promise<ApiResponse<null>>,
  reorderSteps: (p: string, f: string, stepIds: string[]) => api.put(`${base(p)}/${f}/steps/reorder`, { stepIds }) as Promise<ApiResponse<UserFlowStep[]>>,
  linkTestCases: (p: string, f: string, testCaseIds: string[]) => api.post(`${base(p)}/${f}/test-cases`, { testCaseIds }) as Promise<ApiResponse<UserFlow>>,
  unlinkTestCase: (p: string, f: string, id: string) => api.delete(`${base(p)}/${f}/test-cases/${id}`) as Promise<ApiResponse<null>>,
  addDependency: (p: string, f: string, targetFlowId: string, relationshipType: DependencyRelationshipType = 'requires') => api.post(`${base(p)}/${f}/dependencies`, { targetFlowId, relationshipType }) as Promise<ApiResponse<UserFlow>>,
  removeDependency: (p: string, f: string, dependencyId: string) => api.delete(`${base(p)}/${f}/dependencies/${dependencyId}`) as Promise<ApiResponse<null>>,
  graph: (p: string) => api.get(`${base(p)}/graph`) as Promise<ApiResponse<{ nodes: UserFlow[]; edges: Array<{ sourceFlowId: string; targetFlowId: string; relationshipType?: DependencyRelationshipType | null }> }>>,
};
