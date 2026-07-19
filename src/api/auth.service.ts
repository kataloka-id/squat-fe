import api from './axios';
import {
  AuthLoginPayload,
  AuthLoginResponse,
  AuthLogoutResponse,
  AuthSessionResponse,
} from '@/src/types/api.ts';
import { withRetry } from '@/src/utils/retry';
import { invalidateSettingsReadRequests } from '@/src/api/users.service.ts';
import { getCached, invalidateReadCacheForSessionChange } from '@/src/api/read-cache.ts';

// React Strict Mode intentionally remounts effects in development. Reuse an
// active session check so that route guards from that remount do not make a
// second identical network request.
const invalidateActiveSessionRequest = () => {
  invalidateReadCacheForSessionChange();
};

export const AuthService = {
  postAuthLogin(payload: AuthLoginPayload): Promise<AuthLoginResponse> {
    invalidateActiveSessionRequest();
    invalidateSettingsReadRequests();
    return withRetry(() => api.post('/v1/auth/login', payload));
  },
  postAuthLogout(): Promise<AuthLogoutResponse> {
    invalidateActiveSessionRequest();
    invalidateSettingsReadRequests();
    return withRetry(() => api.post('/v1/auth/logout'));
  },
  getAuthSession(): Promise<AuthSessionResponse> {
    // Keep session checks coalesced, but do not cache a completed check: its
    // expiry/authorization state must always be revalidated on a new route.
    return getCached('/v1/auth/session', () => api.get('/v1/auth/session') as Promise<AuthSessionResponse>, { cacheTtlMs: 0 });
  },
};
