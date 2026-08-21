/**
 * Canonical server-resource keys. Keys are URL prefixes on purpose: the read
 * cache invalidator can invalidate every filtered/detail consumer below one
 * resource without knowing how a component constructed its query string.
 */
export const queryKeys = {
  projects: () => '/v1/projects',
  pendingProjects: () => '/v1/projects/pending-deletion',
  project: (projectId: string) => `/v1/projects/${projectId}`,
  projectTestCases: (projectId: string) => `${queryKeys.project(projectId)}/test-cases`,
  projectFolders: (projectId: string) => `${queryKeys.project(projectId)}/test-case-folders`,
  projectSections: (projectId: string) => `${queryKeys.project(projectId)}/sections`,
  projectMembers: (projectId: string) => `${queryKeys.project(projectId)}/members`,
  projectFlows: (projectId: string) => `${queryKeys.project(projectId)}/user-flows`,
  projectRuns: (projectId: string) => `${queryKeys.project(projectId)}/test-runs`,
  projectReports: (projectId: string) => `${queryKeys.project(projectId)}/reports`,
  users: () => '/v1/users',
  managedCompanies: () => '/v1/companies',
  roles: () => '/v1/roles',
  assignableRoles: () => '/v1/roles/assignable',
  userFlowAreas: (projectId: string) =>
    `/v1/user-flow-areas?projectId=${encodeURIComponent(projectId)}`,
  companyProfile: () => '/v1/company/profile',
  companyDetails: () => '/v1/company/details',
  enterpriseCategories: () => '/v1/enterprise-categories',
  enterpriseTypes: () => '/v1/enterprise-types',
} as const;
