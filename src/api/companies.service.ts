import api from './axios';
import { getCached, type ReadOptions } from './read-cache';
import { invalidateSettingsResources } from './cache-invalidation.ts';
import { queryKeys } from './query-keys.ts';
import type {
  ApiResponse,
  CompanyDetailsRecord,
  CompanyRecord,
  EnterpriseCategoryRecord,
  EnterpriseTypeRecord,
  ManagedCompanyRecord,
} from '@/src/types/api.ts';

type EnterpriseTypeApiRecord = Partial<EnterpriseTypeRecord> & {
  business_type?: string;
  legal_entity?: boolean | null;
  is_active?: boolean;
};
type EnterpriseCategoryApiRecord = Partial<EnterpriseCategoryRecord> & { is_active?: boolean };

const normalizeType = (record: EnterpriseTypeApiRecord): EnterpriseTypeRecord => ({
  id: record.id ?? 0,
  businessType: record.businessType ?? record.business_type ?? '',
  legalEntity: record.legalEntity ?? record.legal_entity ?? null,
  description: record.description ?? null,
  isActive: record.isActive ?? record.is_active ?? false,
});

const normalizeCategory = (record: EnterpriseCategoryApiRecord): EnterpriseCategoryRecord => ({
  id: record.id ?? 0,
  code: record.code ?? '',
  name: record.name ?? '',
  description: record.description ?? '',
  isActive: record.isActive ?? record.is_active ?? false,
});

export type CompanyProfilePayload = Pick<CompanyRecord, 'name' | 'profileColour'>;
export type CompanyLogoMetadata = Pick<CompanyRecord, 'hasLogo' | 'logoVersion'>;
export interface ManagedCompanyPayload {
  name: string;
  businessType: number;
  category: number;
  address: string;
  phone: string;
  email?: string | null;
  field: string;
  postalCode: string;
}

export const CompaniesService = {
  getProfile: (options?: ReadOptions) =>
    getCached(
      '/v1/company/profile',
      () => api.get('/v1/company/profile') as Promise<ApiResponse<CompanyRecord>>,
      options,
    ),
  updateProfile: async (payload: CompanyProfilePayload) => {
    const response = (await api.patch(
      '/v1/company/profile',
      payload,
    )) as ApiResponse<CompanyRecord>;
    invalidateSettingsResources('company');
    return response;
  },
  getLogoBlob: () => api.get('/v1/company/logo', { responseType: 'blob' }) as Promise<Blob>,
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Clear the instance JSON default. In browsers Axios then delegates the
    // multipart Content-Type (including its boundary) to FormData/XHR.
    const response = (await api.post('/v1/company/logo', formData, {
      headers: { 'Content-Type': undefined },
    })) as ApiResponse<CompanyLogoMetadata>;
    invalidateSettingsResources('company');
    return response;
  },
  removeLogo: async () => {
    const response = (await api.delete('/v1/company/logo')) as ApiResponse<CompanyLogoMetadata>;
    invalidateSettingsResources('company');
    return response;
  },
  listManaged: (options?: ReadOptions) =>
    getCached(
      '/v1/companies',
      () => api.get('/v1/companies') as Promise<ApiResponse<ManagedCompanyRecord[]>>,
      options,
    ),
  createManaged: async (payload: ManagedCompanyPayload) => {
    const response = (await api.post(
      '/v1/companies',
      payload,
    )) as ApiResponse<ManagedCompanyRecord>;
    invalidateSettingsResources('company');
    return response;
  },
  updateManagedStatus: async (id: string, isActive: boolean) => {
    const response = (await api.patch(`/v1/companies/${id}/status`, {
      isActive,
    })) as ApiResponse<ManagedCompanyRecord>;
    invalidateSettingsResources('company');
    return response;
  },
  getManaged: (id: string) =>
    api.get(`/v1/companies/${id}`) as Promise<ApiResponse<ManagedCompanyRecord>>,
  deleteManaged: async (id: string) => {
    const response = (await api.delete(`/v1/companies/${id}`)) as ApiResponse<null>;
    invalidateSettingsResources('company');
    return response;
  },
  getDetails: () => api.get('/v1/company/details') as Promise<ApiResponse<CompanyDetailsRecord>>,
  updateDetails: async (
    payload: Omit<CompanyDetailsRecord, 'id' | 'isActive' | 'hasLogo' | 'logoVersion'>,
  ) => {
    const response = (await api.patch(
      '/v1/company/details',
      payload,
    )) as ApiResponse<CompanyDetailsRecord>;
    invalidateSettingsResources('company');
    return response;
  },
  listCategories: (activeOnly = true, options?: ReadOptions) =>
    getCached(
      `${queryKeys.enterpriseCategories()}${activeOnly ? '?is_active=true' : ''}`,
      async () => {
        const response = (await api.get(
          activeOnly
            ? `${queryKeys.enterpriseCategories()}?is_active=true`
            : queryKeys.enterpriseCategories(),
        )) as { data: EnterpriseCategoryApiRecord[] };
        return { ...response, data: response.data.map(normalizeCategory) };
      },
      options,
    ),
  listTypes: (activeOnly = true, options?: ReadOptions) =>
    getCached(
      `${queryKeys.enterpriseTypes()}${activeOnly ? '?is_active=true' : ''}`,
      async () => {
        const response = (await api.get(
          activeOnly
            ? `${queryKeys.enterpriseTypes()}?is_active=true`
            : queryKeys.enterpriseTypes(),
        )) as { data: EnterpriseTypeApiRecord[] };
        return { ...response, data: response.data.map(normalizeType) };
      },
      options,
    ),
  createType: async (payload: Omit<EnterpriseTypeRecord, 'isActive'> & { isActive?: boolean }) => {
    const r = (await api.post(
      '/v1/enterprise-types',
      payload,
    )) as ApiResponse<EnterpriseTypeRecord>;
    invalidateSettingsResources('catalogs');
    return r;
  },
  updateType: async (id: number, payload: Partial<Omit<EnterpriseTypeRecord, 'id'>>) => {
    const r = (await api.patch(
      `/v1/enterprise-types/${id}`,
      payload,
    )) as ApiResponse<EnterpriseTypeRecord>;
    invalidateSettingsResources('catalogs');
    return r;
  },
  deleteType: async (id: number) => {
    const r = (await api.delete(`/v1/enterprise-types/${id}`)) as ApiResponse<null>;
    invalidateSettingsResources('catalogs');
    return r;
  },
  createCategory: async (
    payload: Omit<EnterpriseCategoryRecord, 'isActive' | 'description'> & {
      description: string;
      isActive?: boolean;
    },
  ) => {
    const r = (await api.post(
      '/v1/enterprise-categories',
      payload,
    )) as ApiResponse<EnterpriseCategoryRecord>;
    invalidateSettingsResources('catalogs');
    return r;
  },
  updateCategory: async (id: number, payload: Partial<Omit<EnterpriseCategoryRecord, 'id'>>) => {
    const r = (await api.patch(
      `/v1/enterprise-categories/${id}`,
      payload,
    )) as ApiResponse<EnterpriseCategoryRecord>;
    invalidateSettingsResources('catalogs');
    return r;
  },
  deleteCategory: async (id: number) => {
    const r = (await api.delete(`/v1/enterprise-categories/${id}`)) as ApiResponse<null>;
    invalidateSettingsResources('catalogs');
    return r;
  },
};
