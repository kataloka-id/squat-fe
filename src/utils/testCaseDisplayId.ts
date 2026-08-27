/** Never fall back to the database UUID: it is not a user-facing TC number. */
export const formatTestCaseDisplayId = (testCase: { projectKey?: string | null; tcNumber?: number | null }, fallbackProjectKey?: string): string => {
  const projectKey = testCase.projectKey || fallbackProjectKey || 'TC';
  const sequence = Number.isInteger(testCase.tcNumber) && (testCase.tcNumber ?? 0) > 0 ? testCase.tcNumber : '—';
  return `${projectKey}-${sequence}`;
};
