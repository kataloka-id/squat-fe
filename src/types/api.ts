export interface ApiResponse<T, M = undefined> {
  success: boolean;
  message: string;
  data: T;
  meta?: M;
}

export interface EnterpriseType {
  id: number;
  business_type: string;
  legal_entity: boolean | null;
  description: string;
  is_active: boolean;
}

export interface EnterpriseTypeMeta {
  count: number;
}

export interface EnterpriseTypeResponse {
  success: boolean;
  message: string;
  data: EnterpriseType[];
  meta: EnterpriseTypeMeta;
}

export interface EnterpriseCategory {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface EnterpriseCategoryMeta {
  count: number;
}

export interface EnterpriseCategoryResponse {
  success: boolean;
  message: string;
  data: EnterpriseCategory[];
  meta: EnterpriseCategoryMeta;
}

export interface ExternalOssResponse {
  success: boolean;
  data: string[];
  code: number;
}

export interface EnterpriseRegisterRequest {
  owner: {
    full_name: string;
    dob: string;
    address: {
      street: string;
      postal_code: string;
    };
    contact: {
      phone: string;
      email: string;
    };
  };
  business: {
    name: string;
    address: {
      street: string;
      postal_code: string;
    };
    contact: {
      phone: string;
      email: string;
    };
    classification: {
      field: string;
      field_label: string;
      business_type: number;
      category: number;
    };
  };
}

export interface EnterpriseRegisterResponse {
  success: boolean;
  code: string;
  message: string;
  meta: {
    request_id: string;
    timestamp: string;
  };
}
