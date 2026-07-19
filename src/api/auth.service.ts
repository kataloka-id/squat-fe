import api from './axios';
import {
  AuthLoginPayload,
  AuthLoginResponse,
  AuthLogoutResponse,
  AuthSessionResponse,
} from '@/src/types/api.ts';
import { withRetry } from '@/src/utils/retry';

export const AuthService = {
  postAuthLogin(payload: AuthLoginPayload): Promise<AuthLoginResponse> {
    return withRetry(() => api.post('/v1/auth/login', payload));
  },
  postAuthLogout(): Promise<AuthLogoutResponse> {
    return withRetry(() => api.post('/v1/auth/logout'));
  },
  getAuthSession(): Promise<AuthSessionResponse> {
    return api.get('/v1/auth/session');
  },
};
