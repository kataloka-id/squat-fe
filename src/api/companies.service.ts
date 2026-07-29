import api from './axios';
import { getCached, invalidateReadCache, type ReadOptions } from './read-cache';
import type { ApiResponse, CompanyDetailsRecord, CompanyRecord, EnterpriseCategoryRecord, EnterpriseTypeRecord, ManagedCompanyRecord } from '@/src/types/api.ts';

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
    getCached('/v1/company/profile', () => api.get('/v1/company/profile') as Promise<ApiResponse<CompanyRecord>>, options),
  updateProfile: async (payload: CompanyProfilePayload) => {
    const response = await api.patch('/v1/company/profile', payload) as ApiResponse<CompanyRecord>;
    invalidateReadCache('/v1/company/profile');
    return response;
  },
  getLogoBlob: () => api.get('/v1/company/logo', { responseType: 'blob' }) as Promise<Blob>,
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Clear the instance JSON default. In browsers Axios then delegates the
    // multipart Content-Type (including its boundary) to FormData/XHR.
    const response = await api.post('/v1/company/logo', formData, {
      headers: { 'Content-Type': undefined },
    }) as ApiResponse<CompanyLogoMetadata>;
    invalidateReadCache('/v1/company/profile');
    return response;
  },
  removeLogo: async () => {
    const response = await api.delete('/v1/company/logo') as ApiResponse<CompanyLogoMetadata>;
    invalidateReadCache('/v1/company/profile');
    return response;
  },
  listManaged: (options?: ReadOptions) =>
    getCached('/v1/companies', () => api.get('/v1/companies') as Promise<ApiResponse<ManagedCompanyRecord[]>>, options),
  createManaged: async (payload: ManagedCompanyPayload) => {
    const response = await api.post('/v1/companies', payload) as ApiResponse<ManagedCompanyRecord>;
    invalidateReadCache('/v1/companies');
    return response;
  },
  updateManagedStatus: async (id: string, isActive: boolean) => {
    const response = await api.patch(`/v1/companies/${id}/status`, { isActive }) as ApiResponse<ManagedCompanyRecord>;
    invalidateReadCache('/v1/companies');
    return response;
  },
  getManaged: (id: string) => api.get(`/v1/companies/${id}`) as Promise<ApiResponse<ManagedCompanyRecord>>,
  deleteManaged: async (id: string) => {
    const response = await api.delete(`/v1/companies/${id}`) as ApiResponse<null>;
    invalidateReadCache('/v1/companies');
    return response;
  },
  getDetails: () => api.get('/v1/company/details') as Promise<ApiResponse<CompanyDetailsRecord>>,
  updateDetails: (payload: Omit<CompanyDetailsRecord, 'id' | 'isActive' | 'hasLogo' | 'logoVersion'>) => api.patch('/v1/company/details', payload) as Promise<ApiResponse<CompanyDetailsRecord>>,
  listCategories: async (activeOnly = true) => {
    const response = await api.get(activeOnly ? '/v1/enterprise-categories?is_active=true' : '/v1/enterprise-categories') as { data: EnterpriseCategoryApiRecord[] };
    return { ...response, data: response.data.map(normalizeCategory) };
  },
  listTypes: async (activeOnly = true) => {
    const response = await api.get(activeOnly ? '/v1/enterprise-types?is_active=true' : '/v1/enterprise-types') as { data: EnterpriseTypeApiRecord[] };
    return { ...response, data: response.data.map(normalizeType) };
  },
  createType: (payload: Omit<EnterpriseTypeRecord, 'isActive'> & { isActive?: boolean }) => api.post('/v1/enterprise-types', payload) as Promise<ApiResponse<EnterpriseTypeRecord>>,
  updateType: (id: number, payload: Partial<Omit<EnterpriseTypeRecord, 'id'>>) => api.patch(`/v1/enterprise-types/${id}`, payload) as Promise<ApiResponse<EnterpriseTypeRecord>>,
  deleteType: (id: number) => api.delete(`/v1/enterprise-types/${id}`) as Promise<ApiResponse<null>>,
  createCategory: (payload: Omit<EnterpriseCategoryRecord, 'isActive' | 'description'> & { description: string; isActive?: boolean }) => api.post('/v1/enterprise-categories', payload) as Promise<ApiResponse<EnterpriseCategoryRecord>>,
  updateCategory: (id: number, payload: Partial<Omit<EnterpriseCategoryRecord, 'id'>>) => api.patch(`/v1/enterprise-categories/${id}`, payload) as Promise<ApiResponse<EnterpriseCategoryRecord>>,
  deleteCategory: (id: number) => api.delete(`/v1/enterprise-categories/${id}`) as Promise<ApiResponse<null>>,
};
