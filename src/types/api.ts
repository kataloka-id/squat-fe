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
    };
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  roleSlug: string;
  isActive: boolean;
}

export interface RoleRecord {
  id?: string;
  slug: string;
  name?: string;
  description?: string;
}

export interface SectionRecord {
  id: string;
  name: string;
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
  section: string;
  priority: string;
  status: string;
  automationType: string;
  automationReadiness?: string;
  description?: string | null;
  preconditions?: string | null;
  mainExpectedResult?: string | null;
  steps: Array<{ id: string; action: string; expectedResult: string }>;
  tags: string[];
  createdBy?: string;
  updatedAt?: string;
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
