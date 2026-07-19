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
  section: string;
  priority: Priority;
  status: Status;
  automationType: AutomationType;
  preconditions?: string;
  steps: TestStep[];
  tags: string[];
  updatedAt: Date;
  createdBy: string;
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

export type SortField = 'id' | 'title' | 'priority' | 'status' | 'updatedAt' | 'projectId' | 'section' | 'automationType';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  search: string;
  section: string[];
  priority: Priority[];
  status: Status[];
  projectId: string[];
  automationType: AutomationType[];
}
