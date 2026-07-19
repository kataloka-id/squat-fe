import api from './axios';
import {
  AuthLoginPayload,
  AuthLoginResponse,
  AuthLogoutResponse,
  AuthSessionResponse,
} from '@/src/types/api.ts';
import { withRetry } from '@/src/utils/retry';

// React Strict Mode intentionally remounts effects in development. Reuse an
// active session check so that route guards from that remount do not make a
// second identical network request.
let activeSessionRequest: Promise<AuthSessionResponse> | undefined;

const invalidateActiveSessionRequest = () => {
  activeSessionRequest = undefined;
};

export const AuthService = {
  postAuthLogin(payload: AuthLoginPayload): Promise<AuthLoginResponse> {
    invalidateActiveSessionRequest();
    return withRetry(() => api.post('/v1/auth/login', payload));
  },
  postAuthLogout(): Promise<AuthLogoutResponse> {
    invalidateActiveSessionRequest();
    return withRetry(() => api.post('/v1/auth/logout'));
  },
  getAuthSession(): Promise<AuthSessionResponse> {
    if (activeSessionRequest) {
      return activeSessionRequest;
    }

    const request = api.get('/v1/auth/session') as Promise<AuthSessionResponse>;
    activeSessionRequest = request;

    void request.then(
      () => {
        if (activeSessionRequest === request) activeSessionRequest = undefined;
      },
      () => {
        if (activeSessionRequest === request) activeSessionRequest = undefined;
      },
    );

    return request;
  },
};
