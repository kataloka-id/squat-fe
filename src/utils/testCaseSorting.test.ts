import { describe, expect, it } from 'vitest';
import { AutomationType, Priority, Status, type FilterState, type TestCase } from '@/src/components/projectsTestCases/types.ts';
import { getVisibleTestCases, sortTestCases } from './testCaseSorting.ts';

const noFilters: FilterState = { search: '', section: [], priority: [], status: [], projectId: [], automationType: [], automationReadiness: [] };

const testCase = (id: string, tcNumber: number, updatedAt: string, overrides: Partial<TestCase> = {}): TestCase => ({
  id,
  tcNumber,
  projectKey: 'DEFAULT',
  title: id,
  projectId: 'project-1',
  section: 'General',
  priority: Priority.Medium,
  status: Status.Draft,
  automationType: AutomationType.Manual,
  steps: [],
  tags: [],
  updatedAt: new Date(updatedAt),
  createdBy: 'tester',
  ...overrides,
});

describe('test-case table sorting', () => {
  it('sorts TC Number numerically in both directions', () => {
    const cases = [
      testCase('ten', 10, '2025-01-01', { projectKey: 'AAA' }),
      testCase('two', 2, '2025-01-02', { projectKey: 'ZZZ' }),
      testCase('one', 1, '2025-01-03', { projectKey: 'MID' }),
    ];

    expect(sortTestCases(cases, { field: 'id', order: 'asc' }).map(({ id }) => id)).toEqual(['one', 'two', 'ten']);
    expect(sortTestCases(cases, { field: 'id', order: 'desc' }).map(({ id }) => id)).toEqual(['ten', 'two', 'one']);
  });

  it('sorts Updated by the local calendar date only and preserves input order for equal dates', () => {
    const cases = [
      testCase('later-same-day', 1, '2025-06-20T23:59:59.999'),
      testCase('earlier-same-day', 2, '2025-06-20T00:00:00.001'),
      testCase('next-day', 3, '2025-06-21T00:00:00'),
    ];

    expect(sortTestCases(cases, { field: 'updatedAt', order: 'asc' }).map(({ id }) => id)).toEqual(['later-same-day', 'earlier-same-day', 'next-day']);
    expect(sortTestCases(cases, { field: 'updatedAt', order: 'desc' }).map(({ id }) => id)).toEqual(['next-day', 'later-same-day', 'earlier-same-day']);
  });

  it('uses the page filter-sort-pagination pipeline after search/filter and across project switches', () => {
    const projectOneCases = [
      testCase('one-10', 10, '2025-06-20', { projectId: 'project-one', title: 'Login regression', section: 'Auth' }),
      testCase('one-2', 2, '2025-06-19', { projectId: 'project-one', title: 'Login smoke', section: 'Auth' }),
      testCase('one-1', 1, '2025-06-18', { projectId: 'project-one', title: 'Checkout', section: 'Store' }),
    ];
    const filters = { ...noFilters, search: 'login', section: ['Auth'] };

    expect(getVisibleTestCases(projectOneCases, filters, { field: 'id', order: 'asc' }, 1, 1).map(({ id }) => id)).toEqual(['one-2']);
    expect(getVisibleTestCases(projectOneCases, filters, { field: 'id', order: 'asc' }, 2, 1).map(({ id }) => id)).toEqual(['one-10']);

    const projectTwoCases = [
      testCase('two-9', 9, '2025-06-20', { projectId: 'project-two', title: 'Login regression', section: 'Auth' }),
      testCase('two-3', 3, '2025-06-19', { projectId: 'project-two', title: 'Login smoke', section: 'Auth' }),
    ];
    expect(getVisibleTestCases(projectTwoCases, filters, { field: 'id', order: 'desc' }, 1, 20).map(({ id }) => id)).toEqual(['two-9', 'two-3']);
  });
});
