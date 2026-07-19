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
      role: string;
    };
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}
