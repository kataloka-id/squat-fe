import type { Project, TestCase } from '@/src/components/projectsTestCases/types.ts';

/**
 * Project-card counts are a canonical API snapshot. These helpers only apply
 * successful mutations; filtering the case list must never call them.
 */
export const incrementProjectTestCaseCount = (projects: Project[], projectId: string): Project[] =>
  projects.map((project) => project.id === projectId ? {
    ...project,
    stats: { ...project.stats, testCasesCount: project.stats.testCasesCount + 1 },
  } : project);

export const decrementProjectTestCaseCounts = (projects: Project[], testCases: TestCase[], ids: string[]): Project[] => {
  const removedByProject = ids.reduce<Record<string, number>>((counts, id) => {
    const testCase = testCases.find((item) => item.id === id);
    if (testCase) counts[testCase.projectId] = (counts[testCase.projectId] ?? 0) + 1;
    return counts;
  }, {});

  return projects.map((project) => removedByProject[project.id] ? {
    ...project,
    stats: { ...project.stats, testCasesCount: Math.max(0, project.stats.testCasesCount - removedByProject[project.id]) },
  } : project);
};

/** A stale request may never replace a newer canonical Project snapshot. */
export const isCurrentProjectRequest = (requestVersion: number, currentVersion: number): boolean => requestVersion === currentVersion;
