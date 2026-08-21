export interface AuthLoginResponse {
  success: boolean;
  code: string;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}

export interface AuthLoginPayload {
  email: string;
  password: string;
}

export interface AuthLogoutResponse {
  success: boolean;
  code: string;
  message: string;
  data: null;
  meta: {
    request_id: string;
    timestamp: string;
  };
}

export interface AuthSessionResponse {
  success: boolean;
  code: string;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      username?: string;
      role: string;
      company: CompanyRecord | null;
    };
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}

export interface CompanyRecord {
  id: string;
  name: string;
  /** Optional client display breadcrumb; the API tree supplies parent relationships. */
  path?: string;
  hasLogo: boolean;
  logoVersion: string | null;
  profileColour: string | null;
}

export interface ManagedCompanyRecord extends CompanyDetailsRecord {}

export interface CompanyDetailsRecord extends CompanyRecord {
  businessType: number;
  category: number;
  address: string;
  phone: string;
  email: string | null;
  field: string;
  postalCode: string;
  isActive: boolean;
}

export interface EnterpriseCategoryRecord {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface EnterpriseTypeRecord {
  id: number;
  businessType: string;
  legalEntity?: boolean | null;
  description?: string | null;
  isActive: boolean;
}

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  roleSlug: string;
  isActive: boolean;
  company?: CompanyRecord | null;
}

export interface RoleRecord {
  id?: string;
  slug: string;
  name?: string;
  description?: string;
  isActive: boolean;
}

export interface SectionRecord {
  id: string;
  name: string;
  projectId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
}

export interface AttachmentRecord {
  id: string;
  projectId: string;
  testCaseId: string | null;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  status: 'PENDING' | 'READY' | 'FAILED' | 'DELETING';
  createdAt: string;
}

export interface AttachmentUploadRequest {
  projectId: string;
  /** Omit for a project-level attachment while a new test case is still unsaved. */
  testCaseId?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface AttachmentUploadUrlResponse {
  attachment: AttachmentRecord;
  uploadUrl: string;
  method: 'PUT';
  requiredHeaders: { 'Content-Type': string };
  expiresIn: number;
}

export interface ProjectAssignmentRecord {
  id: string;
  name: string;
  key?: string;
  description?: string;
  lead?: string;
  status?: string;
  dueDate?: string;
  externalLink?: string;
  createdBy?: string;
  updatedAt?: string;
  /** Set once permanent attachment cleanup has started; restoration is unsafe. */
  permanentDeletionStartedAt?: string | null;
  testCasesCount?: number;
  /** Additive project-list metric; absent while an older API is deployed. */
  userFlowsCount?: number;
  qualitySnapshot?: { testRunId?: string | null; passRate?: number | null } | null;
  passRate?: number | null;
}

export interface ProjectMemberRecord {
  id?: string;
  userId?: string;
  email?: string;
  userEmail?: string;
  username?: string;
  roleSlug?: string;
  role?: string;
}

export interface ProjectPayload {
  name: string;
  key: string;
  description?: string;
  lead?: string;
  status?: string;
  dueDate?: string;
  externalLink?: string;
}

export interface ProjectTestCaseRecord {
  id: string;
  tcNumber?: number;
  projectKey?: string;
  title: string;
  projectId?: string;
  folderId?: string | null;
  folderPath?: Array<{ id: string; name: string }>;
  sectionId?: string;
  section: string;
  priority: string;
  status: string;
  automationType: string;
  automationReadiness?: string;
  isReusable?: boolean;
  linkedPreconditions?: LinkedPreconditionRecord[];
  description?: string | null;
  preconditions?: string | null;
  mainExpectedResult?: string | null;
  steps: Array<{ id: string; action: string; expectedResult: string }>;
  tags: string[];
  createdBy?: string;
  updatedAt?: string;
}

export type TestRunStatus = 'Draft' | 'In Progress' | 'Completed' | 'Blocked';
export type TestRunResult = 'Passed' | 'Failed' | 'Blocked' | 'Skipped' | 'Untested';
export interface TestRunExecutionStepRecord {
  id: string;
  sourceStepId?: string | null;
  position: number;
  action: string;
  expectedResult: string;
  result: TestRunResult;
  notes?: string | null;
  updatedAt?: string;
}

export interface TestRunOwnerRecord {
  id: string;
  username?: string | null;
  email?: string | null;
}

export interface TestRunRecord {
  id: string;
  projectId: string;
  runNumber?: number;
  displayId?: string;
  name: string;
  description?: string | null;
  status: TestRunStatus;
  type?: 'Manual' | 'Automated' | 'Mixed' | string | null;
  owner?: TestRunOwnerRecord | null;
  ownerId?: string | null;
  progress?: TestRunProgress;
  createdAt: string;
  updatedAt: string;
  userFlows?: TestRunUserFlowRecord[];
}

/** Immutable User Flow context captured when a Test Run is created. */
export interface TestRunUserFlowRecord {
  id: string;
  sourceUserFlowId?: string | null;
  snapshot: {
    flowKey: string;
    title: string;
    status?: string | null;
    steps?: Array<{
      id?: string;
      stepOrder?: number;
      title: string;
      action?: string | null;
      expectedResult?: string | null;
    }>;
    updatedAt?: string | null;
  };
}

export interface TestRunProgress {
  total: number;
  executed: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  untested: number;
  percentage: number;
}

export interface TestRunExecutionRecord {
  id: string;
  runId: string;
  sourceTestCaseId: string;
  result: TestRunResult;
  assignee?: TestRunOwnerRecord | null;
  assigneeId?: string | null;
  durationSeconds?: number | null;
  notes?: string | null;
  steps?: TestRunExecutionStepRecord[];
  executedAt?: string | null;
  updatedAt: string;
  snapshot: {
    tcNumber?: number | null;
    title: string;
    section?: string | null;
    folderId?: string | null;
    folderPath?: Array<{ id: string; name: string }> | null;
    priority?: string | null;
    automationType?: string | null;
    preconditions?: string | null;
    expectedResult?: string | null;
    steps?: Array<{ id?: string; action: string; expectedResult: string }>;
  };
  /** User Flows that supplied this case to the run; a case may have more than one. */
  userFlows?: TestRunUserFlowRecord[];
}

export interface TestRunDetailRecord extends TestRunRecord {
  project?: { id: string; name: string; key?: string | null };
  executions: TestRunExecutionRecord[];
}

export interface TestRunListResponse {
  items: TestRunRecord[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export interface ProjectReportRecord {
  hasData: boolean;
  availability: {
    hasTestRuns: boolean;
    hasRunCases: boolean;
    hasFilteredCases: boolean;
  };
  summary: {
    executed: number | null;
    passRate: number | null;
    passed: number | null;
    failed: number | null;
    blocked: number | null;
    skipped: number | null;
    untested: number | null;
    progress: number | null;
  };
  distribution: Array<{ result: TestRunResult; count: number }>;
  trend: Array<{
    date: string;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    untested: number;
  }>;
  breakdowns: {
    section?: ProjectReportBreakdown[];
    folder?: ProjectReportBreakdown[];
    priority?: ProjectReportBreakdown[];
    automationType?: ProjectReportBreakdown[];
    userFlow?: ProjectReportBreakdown[];
  };
  userFlowQuality?: ProjectReportBreakdown[];
  attention: Array<{
    id: string;
    runId: string;
    executionId: string;
    runName: string;
    tcNumber?: number | null;
    title: string;
    result: 'FAILED' | 'BLOCKED';
    updatedAt?: string | null;
  }>;
}

export interface ProjectReportBreakdown {
  id?: string;
  testRunIds?: string[];
  label: string;
  executed?: number | null;
  passed?: number | null;
  failed?: number | null;
  blocked?: number | null;
  skipped?: number | null;
  untested?: number | null;
  passRate?: number | null;
  progress?: number | null;
}

export interface TestCaseFolderRecord {
  id: string;
  projectId: string;
  name: string;
  parentId?: string | null;
  depth?: number;
  sortOrder?: number;
  directTestCaseCount?: number;
  totalTestCaseCount?: number;
  children?: TestCaseFolderRecord[];
}

export interface TestCaseFolderTreeResponse {
  allTestCaseCount: number;
  unfiledTestCaseCount: number;
  folders: TestCaseFolderRecord[];
}

export interface FolderDeleteImpact {
  directTestCaseCount?: number;
  totalTestCaseCount?: number;
  directChildFolderCount?: number;
  descendantFolderCount?: number;
  descendantTestCaseCount?: number;
  externalReferences?: {
    referenceCount: number;
    references: Array<{
      sourceId: string;
      consumerId: string;
      sourceTitle?: string;
      consumerTitle?: string;
    }>;
  };
}

/** A reference returned with its current source-test-case display data. */
export interface LinkedPreconditionRecord {
  id?: string;
  testCaseId: string;
  sortOrder: number;
  projectKey?: string;
  tcNumber?: number;
  title?: string;
  section?: string;
  status?: string;
  automationType?: string;
  isReusable?: boolean;
  isDeprecated?: boolean;
}

export interface ReusableTestCaseRecord {
  id: string;
  tcNumber?: number;
  projectKey?: string;
  title: string;
  section: string;
  sectionId?: string;
  status: string;
  automationType: string;
  warning?: boolean;
}

export interface TestCaseImportIssue {
  path: string;
  code: string;
  message: string;
}

export interface TestCaseImportPayload {
  version: '1.0';
  projectKey?: string;
  testCases: Array<{
    title: string;
    description?: string;
    section: string;
    priority: string;
    status: string;
    automationType: string;
    automationReadiness: string;
    preconditions?: string;
    mainExpectedResult?: string;
    steps: Array<{ action: string; expectedResult: string }>;
    tags?: string[];
  }>;
}

export interface TestCaseImportResult {
  totalRequested: number;
  importedCount: number;
  created: Array<{ id: string; key?: string }>;
  warnings?: TestCaseImportIssue[];
}
