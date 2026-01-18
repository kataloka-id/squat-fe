import api from './axios';
import { ExternalOssResponse } from '@/src/types/api';

export const ExternalService = {
  getOss(search: string): Promise<ExternalOssResponse> {
    return api.get('/external/oss/autocomplete', {
      params: {
        kategori: 'kbli',
        search,
        lang: 'id',
        localization: 'id',
      },
    });
  },
};
