export enum Priority {
  Critical = 'Critical',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low'
}

export enum Status {
  Draft = 'Draft',
  Ready = 'Ready',
  Deprecated = 'Deprecated',
  Review = 'Review'
}

export enum AutomationType {
  UI = 'UI',
  API = 'API',
  Manual = 'Manual'
}

export enum AutomationReadiness {
  NotAutomatable = 'Not Automatable',
  Candidate = 'Candidate',
  Ready = 'Ready',
  Automated = 'Automated'
}

/** Maps missing or unsupported API values safely for legacy test cases. */
export const normalizeAutomationReadiness = (value: unknown): AutomationReadiness =>
  Object.values(AutomationReadiness).includes(value as AutomationReadiness)
    ? value as AutomationReadiness
    : AutomationReadiness.Candidate;

export const matchesAutomationReadinessFilter = (
  value: unknown,
  selectedReadiness: AutomationReadiness[],
): boolean =>
  selectedReadiness.length === 0 || selectedReadiness.includes(normalizeAutomationReadiness(value));

export interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  /** Immutable, project-scoped sequence supplied by the API. */
  tcNumber?: number;
  /** Canonical project key supplied with the test-case response. */
  projectKey?: string;
  title: string;
  projectId: string;
  sectionId?: string;
  section: string;
  priority: Priority;
  status: Status;
  automationType: AutomationType;
  /** Optional only at the type boundary so legacy records can still be opened. */
  automationReadiness?: AutomationReadiness;
  /** Whether this case is eligible to be linked as a reusable precondition. */
  isReusable?: boolean;
  linkedPreconditions?: LinkedPrecondition[];
  preconditions?: string;
  /** Optional context for the test case, stored as raw Markdown. */
  description?: string;
  /** Optional overall outcome for the test case, stored as raw Markdown. */
  mainExpectedResult?: string;
  steps: TestStep[];
  tags: string[];
  updatedAt: Date;
  createdBy: string;
}

export interface LinkedPrecondition {
  id?: string;
  testCaseId: string;
  sortOrder: number;
  /** Current source fields returned by the API; save requests contain only ID/order. */
  projectKey?: string;
  tcNumber?: number;
  title?: string;
  section?: string;
  status?: Status;
  automationType?: AutomationType;
  isDeprecated?: boolean;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  lead: string;
  status: 'Active' | 'Completed';
  dueDate: Date;
  updatedAt: Date;
  stats: {
    testCasesCount: number;
    passRate: number;
  };
  members: string[];
  externalLink?: string;
  createdBy?: string;
}

export type SortField = 'id' | 'title' | 'priority' | 'status' | 'updatedAt' | 'projectId' | 'section' | 'automationType' | 'automationReadiness';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  search: string;
  section: string[];
  priority: Priority[];
  status: Status[];
  projectId: string[];
  automationType: AutomationType[];
  automationReadiness: AutomationReadiness[];
}
