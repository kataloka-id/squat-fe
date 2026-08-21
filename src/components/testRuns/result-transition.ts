import type { TestRunResult } from '@/src/types/api.ts';

export const executionResults: TestRunResult[] = [
  'Untested',
  'Passed',
  'Failed',
  'Blocked',
  'Skipped',
];

export const isTerminalExecutionResult = (result: TestRunResult) => result !== 'Untested';

/** Untested is an initial state, never a reset target after execution starts. */
export const canTransitionExecutionResult = (current: TestRunResult, next: TestRunResult) =>
  !isTerminalExecutionResult(current) || isTerminalExecutionResult(next);

export const selectableExecutionResults = (
  current: TestRunResult,
  executionStarted: boolean,
): TestRunResult[] =>
  executionStarted || isTerminalExecutionResult(current)
    ? executionResults.filter((result) => result !== 'Untested')
    : executionResults;

export const executionResultOptions = (current: TestRunResult, executionStarted: boolean) => {
  const results = selectableExecutionResults(current, executionStarted);
  if (current === 'Untested' && executionStarted) results.unshift('Untested');
  return results.map((result) => ({
    value: result,
    label: result,
    disabled: result === 'Untested' && executionStarted,
  }));
};
