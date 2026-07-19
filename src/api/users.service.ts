import api from './axios';
import type { ApiResponse, RoleRecord, UserRecord } from '@/src/types/api.ts';

// React Strict Mode deliberately re-runs mount effects in development. Settings
// loads several read-only resources on mount, so coalesce only concurrent reads
// to prevent that development remount from issuing duplicate API requests.
// The reference is cleared once the request settles; later explicit refreshes
// and post-mutation reloads therefore always request fresh data.
let settingsReadSessionGeneration = 0;

// The authenticated cookie changes synchronously during login/logout, while a
// previous Settings request may still be in flight.  Tie each coalesced read
// to a generation so a new account can never reuse that previous promise.
const coalesceActiveRequest = <T>(request: () => Promise<T>) => {
  let activeRequest: { generation: number; promise: Promise<T> } | undefined;

  return () => {
    if (activeRequest?.generation === settingsReadSessionGeneration) return activeRequest.promise;

    const pendingRequest = request();
    const pendingEntry = { generation: settingsReadSessionGeneration, promise: pendingRequest };
    activeRequest = pendingEntry;
    void pendingRequest.then(
      () => {
        if (activeRequest === pendingEntry) activeRequest = undefined;
      },
      () => {
        if (activeRequest === pendingEntry) activeRequest = undefined;
      },
    );

    return pendingRequest;
  };
};

export const invalidateSettingsReadRequests = () => {
  settingsReadSessionGeneration += 1;
};

export type UserPayload = Partial<Pick<UserRecord, 'email' | 'username' | 'roleSlug' | 'isActive'>> & {
  password?: string;
};

const getMe = coalesceActiveRequest(() => api.get('/v1/users/me') as Promise<ApiResponse<UserRecord>>);
const listUsers = coalesceActiveRequest(() => api.get('/v1/users') as Promise<ApiResponse<UserRecord[]>>);
const listRoles = coalesceActiveRequest(() => api.get('/v1/roles') as Promise<ApiResponse<RoleRecord[]>>);

export const UsersService = {
  getMe,
  updateMe: (payload: UserPayload) => api.patch('/v1/users/me', payload) as Promise<ApiResponse<UserRecord>>,
  list: listUsers,
  create: (payload: Required<Pick<UserPayload, 'email' | 'username' | 'password' | 'roleSlug'>> & Pick<UserPayload, 'isActive'>) =>
    api.post('/v1/users', payload) as Promise<ApiResponse<UserRecord>>,
  update: (id: string, payload: UserPayload) => api.patch(`/v1/users/${id}`, payload) as Promise<ApiResponse<UserRecord>>,
  remove: (id: string) => api.delete(`/v1/users/${id}`) as Promise<ApiResponse<null>>,
};

export const RolesService = {
  list: listRoles,
  create: (payload: Pick<RoleRecord, 'slug' | 'name' | 'description'>) =>
    api.post('/v1/roles', payload) as Promise<ApiResponse<RoleRecord>>,
  update: (slug: string, payload: Partial<Pick<RoleRecord, 'name' | 'description'>>) =>
    api.patch(`/v1/roles/${slug}`, payload) as Promise<ApiResponse<RoleRecord>>,
  remove: (slug: string) => api.delete(`/v1/roles/${slug}`) as Promise<ApiResponse<null>>,
};
