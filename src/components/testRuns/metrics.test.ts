import { describe, expect, it } from 'vitest';
import { progressFromExecutions } from './metrics.ts';

describe('progressFromExecutions', () => {
  it('counts only final results as executed and leaves untested out of progress', () => {
    const progress = progressFromExecutions([
      { result: 'Passed' }, { result: 'Failed' }, { result: 'Blocked' }, { result: 'Skipped' }, { result: 'Untested' },
    ] as any);
    expect(progress).toMatchObject({ total: 5, executed: 4, passed: 1, failed: 1, blocked: 1, skipped: 1, untested: 1, percentage: 80 });
  });
});
