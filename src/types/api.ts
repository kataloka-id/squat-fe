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
  title: string;
  projectId?: string;
  section: string;
  priority: string;
  status: string;
  automationType: string;
  preconditions?: string | null;
  steps: Array<{ id: string; action: string; expectedResult: string }>;
  tags: string[];
  createdBy?: string;
  updatedAt?: string;
}
