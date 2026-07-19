import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Project, TestCase } from '@/src/components/projectsTestCases/types.ts';
import { ProjectBoard } from '@/src/components/projectsTestCases/ProjectBoard.tsx';
import { decrementProjectTestCaseCounts, incrementProjectTestCaseCount, isCurrentProjectRequest } from './projectStats.ts';

const projects: Project[] = [
  { id: 'project-a', name: 'A', key: 'A', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), members: [], stats: { testCasesCount: 7, passRate: 0 } },
  { id: 'project-b', name: 'B', key: 'B', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), members: [], stats: { testCasesCount: 3, passRate: 0 } },
];

const testCases = [
  { id: 'a-1', projectId: 'project-a' },
  { id: 'b-1', projectId: 'project-b' },
] as TestCase[];

describe('project card canonical test-case counts', () => {
  it('does not derive counts from a filtered or deselected case list', () => {
    // ProjectBoard receives only canonical projects, so filtering/deselecting
    // cases has no stats mutation to apply.
    const filteredAndDeselectedCases = testCases.filter((testCase) => testCase.projectId === 'project-a');
    expect(filteredAndDeselectedCases).toHaveLength(1);
    expect(projects.map((project) => project.stats.testCasesCount)).toEqual([7, 3]);
    const markup = renderToStaticMarkup(<ProjectBoard projects={projects} onViewTestCases={() => {}} onViewReports={() => {}} onViewTestRuns={() => {}} onCreate={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(markup).toContain('>7<');
    expect(markup).toContain('>3<');
  });

  it('increments only the project that successfully receives a new case', () => {
    expect(incrementProjectTestCaseCount(projects, 'project-b').map((project) => project.stats.testCasesCount)).toEqual([7, 4]);
  });

  it('decrements only projects for successfully deleted cases', () => {
    expect(decrementProjectTestCaseCounts(projects, testCases, ['a-1']).map((project) => project.stats.testCasesCount)).toEqual([6, 3]);
  });

  it('rejects a stale project-list response after a newer refresh begins', () => {
    expect(isCurrentProjectRequest(2, 2)).toBe(true);
    expect(isCurrentProjectRequest(1, 2)).toBe(false);
  });
});
