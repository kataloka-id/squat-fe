import api from './axios';
import {
  AuthLoginPayload,
  AuthLoginResponse,
  AuthLogoutResponse
} from '@/src/types/api.ts';
import { withRetry } from '@/src/utils/retry';

export const AuthService = {
  postAuthLogin(payload: AuthLoginPayload): Promise<AuthLoginResponse> {
    return withRetry(() => api.post('/v1/auth/login', payload));
  },
  postAuthLogout(): Promise<AuthLogoutResponse> {
    return withRetry(() => api.post('/v1/auth/logout'));
  },
};
