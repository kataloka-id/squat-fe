import type { TestRunExecutionRecord, TestRunProgress } from '@/src/types/api.ts';

export const progressFromExecutions = (executions: TestRunExecutionRecord[]): TestRunProgress => {
  const counts = { Passed: 0, Failed: 0, Blocked: 0, Skipped: 0, Untested: 0 };
  executions.forEach((execution) => { counts[execution.result] += 1; });
  const executed = counts.Passed + counts.Failed + counts.Blocked + counts.Skipped;
  const total = executions.length;
  return { total, executed, passed: counts.Passed, failed: counts.Failed, blocked: counts.Blocked, skipped: counts.Skipped, untested: counts.Untested, percentage: total ? Math.round((executed / total) * 100) : 0 };
};

export const resultLabel = (result: string) => result.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
