import api from './axios';
import { getCached, invalidateReadCache, type ReadOptions } from './read-cache';
import type { ApiResponse, RoleRecord, UserRecord } from '@/src/types/api.ts';

export const invalidateSettingsReadRequests = () => {
  invalidateReadCache('/v1/users');
  invalidateReadCache('/v1/roles');
};

export type UserPayload = Partial<Pick<UserRecord, 'email' | 'username' | 'roleSlug' | 'isActive'>> & {
  password?: string;
};

export interface ProjectAssignmentsPayload {
  projectIds: string[];
}

export const UsersService = {
  getMe: (options?: ReadOptions) => getCached('/v1/users/me', () => api.get('/v1/users/me') as Promise<ApiResponse<UserRecord>>, options),
  updateMe: async (payload: UserPayload) => {
    const response = await api.patch('/v1/users/me', payload) as ApiResponse<UserRecord>;
    invalidateReadCache('/v1/users/me');
    return response;
  },
  list: (options?: ReadOptions) => getCached('/v1/users', () => api.get('/v1/users') as Promise<ApiResponse<UserRecord[]>>, options),
  create: async (payload: Required<Pick<UserPayload, 'email' | 'username' | 'password' | 'roleSlug'>> & Pick<UserPayload, 'isActive'>) => {
    const response = await api.post('/v1/users', payload) as ApiResponse<UserRecord>;
    invalidateReadCache('/v1/users');
    return response;
  },
  update: async (id: string, payload: UserPayload) => {
    const response = await api.patch(`/v1/users/${id}`, payload) as ApiResponse<UserRecord>;
    invalidateReadCache('/v1/users');
    invalidateReadCache('/v1/projects');
    return response;
  },
  remove: async (id: string) => {
    const response = await api.delete(`/v1/users/${id}`) as ApiResponse<null>;
    invalidateReadCache('/v1/users');
    invalidateReadCache('/v1/projects');
    return response;
  },
  getProjectAssignments: (id: string, options?: ReadOptions) =>
    getCached(`/v1/users/${id}/project-assignments`, () => api.get(`/v1/users/${id}/project-assignments`) as Promise<ApiResponse<ProjectAssignmentsPayload>>, options),
  updateProjectAssignments: async (id: string, payload: ProjectAssignmentsPayload) => {
    const response = await api.put(`/v1/users/${id}/project-assignments`, payload) as ApiResponse<ProjectAssignmentsPayload>;
    invalidateReadCache(`/v1/users/${id}/project-assignments`);
    invalidateReadCache('/v1/projects');
    return response;
  },
};

export const RolesService = {
  list: (options?: ReadOptions) => getCached('/v1/roles', () => api.get('/v1/roles') as Promise<ApiResponse<RoleRecord[]>>, options),
  create: async (payload: Pick<RoleRecord, 'slug' | 'name' | 'description'>) => {
    const response = await api.post('/v1/roles', payload) as ApiResponse<RoleRecord>;
    invalidateReadCache('/v1/roles');
    return response;
  },
  update: async (slug: string, payload: Partial<Pick<RoleRecord, 'name' | 'description'>>) => {
    const response = await api.patch(`/v1/roles/${slug}`, payload) as ApiResponse<RoleRecord>;
    invalidateReadCache('/v1/roles');
    return response;
  },
  remove: async (slug: string) => {
    const response = await api.delete(`/v1/roles/${slug}`) as ApiResponse<null>;
    invalidateReadCache('/v1/roles');
    return response;
  },
};
