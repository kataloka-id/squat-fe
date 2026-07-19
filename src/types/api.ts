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
