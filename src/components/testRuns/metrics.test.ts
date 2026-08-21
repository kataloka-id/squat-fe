import { describe, expect, it } from 'vitest';
import { formatTestRunDisplayId, progressFromExecutions, resultBreakdown } from './metrics.ts';

describe('progressFromExecutions', () => {
  it('counts only final results as executed and leaves untested out of progress', () => {
    const progress = progressFromExecutions([
      { result: 'Passed' }, { result: 'Failed' }, { result: 'Blocked' }, { result: 'Skipped' }, { result: 'Untested' },
    ] as any);
    expect(progress).toMatchObject({ total: 5, executed: 4, passed: 1, failed: 1, blocked: 1, skipped: 1, untested: 1, percentage: 80 });
  });
});

describe('resultBreakdown', () => {
  it('keeps the vertical breakdown aligned with total cases', () => {
    const progress = progressFromExecutions([
      { result: 'Passed' }, { result: 'Failed' }, { result: 'Blocked' },
      { result: 'Skipped' }, { result: 'Untested' },
    ] as any);
    expect(resultBreakdown(progress).map((item) => item.count)).toEqual([1, 1, 1, 1, 1]);
    expect(resultBreakdown(progress).reduce((sum, item) => sum + item.count, 0)).toBe(progress.total);
    expect(resultBreakdown(progress).map((item) => item.result)).toEqual(['Passed', 'Failed', 'Blocked', 'Skipped', 'Untested']);
  });
});

describe('formatTestRunDisplayId', () => {
  it('formats the project-scoped sequential number without exposing an internal id', () => {
    expect(formatTestRunDisplayId(1)).toBe('TR-1');
    expect(formatTestRunDisplayId(27)).toBe('TR-27');
    expect(formatTestRunDisplayId()).toBe('TR-legacy');
  });
});
