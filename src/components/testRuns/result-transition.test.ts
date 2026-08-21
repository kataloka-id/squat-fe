import { describe, expect, it } from 'vitest';
import { canTransitionExecutionResult, executionResultOptions } from './result-transition.ts';

describe('execution result transitions', () => {
  it('allows initial and terminal-to-terminal transitions but never a reset', () => {
    expect(canTransitionExecutionResult('Untested', 'Passed')).toBe(true);
    expect(canTransitionExecutionResult('Untested', 'Failed')).toBe(true);
    expect(canTransitionExecutionResult('Untested', 'Blocked')).toBe(true);
    expect(canTransitionExecutionResult('Untested', 'Skipped')).toBe(true);
    expect(canTransitionExecutionResult('Failed', 'Passed')).toBe(true);
    expect(canTransitionExecutionResult('Blocked', 'Passed')).toBe(true);
    expect(canTransitionExecutionResult('Skipped', 'Passed')).toBe(true);
    expect(canTransitionExecutionResult('Passed', 'Untested')).toBe(false);
  });

  it('disables Untested after execution starts', () => {
    expect(executionResultOptions('Untested', false).find((option) => option.value === 'Untested')?.disabled).toBe(false);
    expect(executionResultOptions('Untested', true).find((option) => option.value === 'Untested')?.disabled).toBe(true);
  });
});
