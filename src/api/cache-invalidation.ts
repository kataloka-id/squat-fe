import { notifyExecutionDataChanged } from './execution-refresh.ts';
import { invalidateReadCache, invalidateReadCacheExact } from './read-cache.ts';
import { queryKeys } from './query-keys.ts';

const invalidate = (...keys: string[]) =>
  [...new Set(keys)].forEach((key) => invalidateReadCache(key));

/** Shared dependency graph for successful project mutations. */
export const invalidateProjectResources = (
  projectId: string,
  resources: Array<
    | 'projects'
    | 'testCases'
    | 'folders'
    | 'sections'
    | 'areas'
    | 'flows'
    | 'runs'
    | 'reports'
    | 'members'
  >,
) => {
  const exactKeys = resources.flatMap((resource) => {
    if (resource === 'projects') return [queryKeys.projects(), queryKeys.pendingProjects()];
    return [];
  });
  const keys = resources.flatMap((resource) => {
    switch (resource) {
      case 'projects':
        return [];
      case 'testCases':
        return [queryKeys.projectTestCases(projectId)];
      case 'folders':
        return [queryKeys.projectFolders(projectId)];
      case 'sections':
        return [queryKeys.projectSections(projectId)];
      case 'areas':
        return [queryKeys.userFlowAreas(projectId)];
      case 'flows':
        return [queryKeys.projectFlows(projectId)];
      case 'runs':
        return [queryKeys.projectRuns(projectId)];
      case 'reports':
        return [queryKeys.projectReports(projectId)];
      case 'members':
        return [queryKeys.projectMembers(projectId)];
    }
  });
  exactKeys.forEach((key) => invalidateReadCacheExact(key));
  invalidate(...keys);
  if (
    resources.includes('runs') ||
    resources.includes('testCases') ||
    resources.includes('flows')
  ) {
    notifyExecutionDataChanged(projectId);
  }
};

export const invalidateSettingsResources = (
  ...resources: Array<'users' | 'roles' | 'assignments' | 'company' | 'catalogs'>
) => {
  const keys = resources.flatMap((resource) => {
    switch (resource) {
      case 'users':
        return [queryKeys.users()];
      case 'roles':
        return [queryKeys.roles(), queryKeys.assignableRoles()];
      case 'assignments':
        return [queryKeys.users(), queryKeys.projects()];
      case 'company':
        return [
          queryKeys.companyProfile(),
          queryKeys.companyDetails(),
          queryKeys.managedCompanies(),
        ];
      case 'catalogs':
        return [queryKeys.enterpriseCategories(), queryKeys.enterpriseTypes()];
    }
  });
  invalidate(...keys);
};
