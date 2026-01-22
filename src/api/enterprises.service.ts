import api from './axios';
import {
  EnterpriseTypeResponse,
  EnterpriseCategoryResponse,
  EnterpriseRegisterRequest,
  EnterpriseRegisterResponse,
} from '@/src/types/api.ts';
import { withRetry } from '@/src/utils/retry';

export const EnterpriseService = {
  getEnterpriseTypes(): Promise<EnterpriseTypeResponse> {
    return withRetry(() => api.get('/v1/enterprise-types?is_active=1'));
  },
  getEnterpriseCategories(): Promise<EnterpriseCategoryResponse> {
    return withRetry(() => api.get('/v1/enterprise-categories?is_active=1'));
  },
  registerEnterprise(payload: EnterpriseRegisterRequest): Promise<EnterpriseRegisterResponse> {
    return api.post('/v1/enterprise/register', payload);
  },
};
