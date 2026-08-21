import type { TestRunRecord } from '@/src/types/api.ts';

export type TestRunAction = 'view' | 'edit' | 'delete';

export type TestRunActionContext = {
  canManage: boolean;
};

export const canManageTestRuns = (role?: string | null) =>
  Boolean(role && role.toLowerCase() !== 'viewer');

export const testRunActions = (
  run: Pick<TestRunRecord, 'status'>,
  { canManage }: TestRunActionContext,
): TestRunAction[] => [
  'view',
  ...(canManage && run.status !== 'Completed' ? (['edit'] as const) : []),
  ...(canManage ? (['delete'] as const) : []),
];
