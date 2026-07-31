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
  testCasesCount?: number;
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
  externalReferences?: { referenceCount: number; references: Array<{ sourceId: string; consumerId: string; sourceTitle?: string; consumerTitle?: string }> };
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
