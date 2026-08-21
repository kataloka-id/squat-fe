import type { TestRunExecutionRecord, TestRunProgress, TestRunResult } from '@/src/types/api.ts';

export const deriveExecutionResult = (results: TestRunResult[]): TestRunResult => {
  if (!results.length || results.every((result) => result === 'Untested')) return 'Untested';
  if (results.includes('Failed')) return 'Failed';
  if (results.includes('Blocked')) return 'Blocked';
  if (results.includes('Passed')) return 'Passed';
  return 'Skipped';
};

export const progressFromExecutions = (executions: TestRunExecutionRecord[]): TestRunProgress => {
  const counts = { Passed: 0, Failed: 0, Blocked: 0, Skipped: 0, Untested: 0 };
  executions.forEach((execution) => {
    counts[execution.result] += 1;
  });
  const executed = counts.Passed + counts.Failed + counts.Blocked + counts.Skipped;
  const total = executions.length;
  return {
    total,
    executed,
    passed: counts.Passed,
    failed: counts.Failed,
    blocked: counts.Blocked,
    skipped: counts.Skipped,
    untested: counts.Untested,
    percentage: total ? Math.round((executed / total) * 100) : 0,
  };
};

export const resultLabel = (result: string) =>
  result
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatTestRunDisplayId = (runNumber?: number | null) =>
  Number.isInteger(runNumber) && Number(runNumber) > 0 ? `TR-${runNumber}` : 'TR-legacy';

export const resultBreakdown = (progress: TestRunProgress) => [
  {
    result: 'Passed' as const,
    count: progress.passed,
    meaning: 'Test case memenuhi expected result.',
  },
  {
    result: 'Failed' as const,
    count: progress.failed,
    meaning: 'Test case tidak memenuhi expected result.',
  },
  {
    result: 'Blocked' as const,
    count: progress.blocked,
    meaning: 'Eksekusi terhenti karena blocker.',
  },
  {
    result: 'Skipped' as const,
    count: progress.skipped,
    meaning: 'Test case dilewati tanpa dieksekusi.',
  },
  {
    result: 'Untested' as const,
    count: progress.untested,
    meaning: 'Test case belum memiliki result terminal.',
  },
];
