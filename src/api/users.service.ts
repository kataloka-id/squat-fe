import api from './axios';
import { getCached, type ReadOptions } from './read-cache';
import { invalidateSettingsResources } from './cache-invalidation.ts';
import type { ApiResponse, RoleRecord, UserRecord } from '@/src/types/api.ts';

export const invalidateSettingsReadRequests = () => {
  invalidateSettingsResources('users', 'roles');
};

export type UserPayload = Partial<
  Pick<UserRecord, 'email' | 'username' | 'roleSlug' | 'isActive'>
> & {
  password?: string;
  companyId?: string;
};
export type RoleDeleteData = null | (Pick<RoleRecord, 'slug' | 'isActive'> & { archived: true });

export interface ProjectAssignmentsPayload {
  projectIds: string[];
}

export interface UserListFilters {
  q?: string;
  companyId?: string;
}

export const UsersService = {
  getMe: (options?: ReadOptions) =>
    getCached(
      '/v1/users/me',
      () => api.get('/v1/users/me') as Promise<ApiResponse<UserRecord>>,
      options,
    ),
  updateMe: async (payload: UserPayload) => {
    const response = (await api.patch('/v1/users/me', payload)) as ApiResponse<UserRecord>;
    invalidateSettingsResources('users');
    return response;
  },
  list: (options?: ReadOptions, filters?: UserListFilters) => {
    const params = new URLSearchParams();
    if (filters?.q?.trim()) params.set('q', filters.q.trim());
    if (filters?.companyId) params.set('companyId', filters.companyId);
    const path = params.size ? `/v1/users?${params.toString()}` : '/v1/users';
    return getCached(path, () => api.get(path) as Promise<ApiResponse<UserRecord[]>>, options);
  },
  create: async (
    payload: Required<Pick<UserPayload, 'email' | 'username' | 'password' | 'roleSlug'>> &
      Pick<UserPayload, 'isActive' | 'companyId'>,
  ) => {
    const response = (await api.post('/v1/users', payload)) as ApiResponse<UserRecord>;
    invalidateSettingsResources('users');
    return response;
  },
  update: async (id: string, payload: UserPayload) => {
    const response = (await api.patch(`/v1/users/${id}`, payload)) as ApiResponse<UserRecord>;
    invalidateSettingsResources('users', 'assignments');
    return response;
  },
  remove: async (id: string) => {
    const response = (await api.delete(`/v1/users/${id}`)) as ApiResponse<null>;
    invalidateSettingsResources('users', 'assignments');
    return response;
  },
  getProjectAssignments: (id: string, options?: ReadOptions) =>
    getCached(
      `/v1/users/${id}/project-assignments`,
      () =>
        api.get(`/v1/users/${id}/project-assignments`) as Promise<
          ApiResponse<ProjectAssignmentsPayload>
        >,
      options,
    ),
  updateProjectAssignments: async (id: string, payload: ProjectAssignmentsPayload) => {
    const response = (await api.put(
      `/v1/users/${id}/project-assignments`,
      payload,
    )) as ApiResponse<ProjectAssignmentsPayload>;
    invalidateSettingsResources('assignments');
    return response;
  },
};

export const RolesService = {
  list: (options?: ReadOptions) =>
    getCached(
      '/v1/roles',
      () => api.get('/v1/roles') as Promise<ApiResponse<RoleRecord[]>>,
      options,
    ),
  assignable: (options?: ReadOptions) =>
    getCached(
      '/v1/roles/assignable',
      () => api.get('/v1/roles/assignable') as Promise<ApiResponse<RoleRecord[]>>,
      options,
    ),
  create: async (payload: Pick<RoleRecord, 'slug' | 'name' | 'description'>) => {
    const response = (await api.post('/v1/roles', payload)) as ApiResponse<RoleRecord>;
    invalidateSettingsResources('roles');
    return response;
  },
  update: async (slug: string, payload: Partial<Pick<RoleRecord, 'name' | 'description'>>) => {
    const response = (await api.patch(`/v1/roles/${slug}`, payload)) as ApiResponse<RoleRecord>;
    invalidateSettingsResources('roles');
    return response;
  },
  remove: async (slug: string) => {
    const response = (await api.delete(`/v1/roles/${slug}`)) as ApiResponse<RoleDeleteData>;
    invalidateSettingsResources('roles');
    return response;
  },
};
