import { describe, expect, it } from 'vitest';
import { canManageTestRuns, testRunActions } from './test-run-actions.ts';

describe('Test Run actions', () => {
  it('keeps active actions consistent for editable users', () => {
    expect(testRunActions({ status: 'In Progress' }, { canManage: true })).toEqual([
      'view',
      'edit',
      'delete',
    ]);
  });

  it('removes edit and finish for completed runs', () => {
    expect(testRunActions({ status: 'Completed' }, { canManage: true })).toEqual([
      'view',
      'delete',
    ]);
  });


  it('keeps viewers read-only', () => {
    expect(canManageTestRuns('viewer')).toBe(false);
    expect(testRunActions({ status: 'Draft' }, { canManage: false })).toEqual(['view']);
  });
});
