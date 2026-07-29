import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
const cache = vi.hoisted(() => ({ getCached: vi.fn(), invalidateReadCache: vi.fn() }));
vi.mock('./axios.ts', () => ({ default: api }));
vi.mock('./read-cache.ts', () => cache);

import { CompaniesService } from './companies.service.ts';

describe('CompaniesService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the authenticated caller company profile endpoint and invalidates it after update', async () => {
    api.patch.mockResolvedValue({ data: { id: 'c1' } });
    const payload = { name: 'Acme', profileColour: '#123456' };
    await CompaniesService.updateProfile(payload);
    expect(api.patch).toHaveBeenCalledWith('/v1/company/profile', payload);
    expect(cache.invalidateReadCache).toHaveBeenCalledWith('/v1/company/profile');
  });

  it('uses authenticated blob and multipart endpoints for company logos', async () => {
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    api.get.mockResolvedValue(new Blob(['logo'], { type: 'image/png' }));
    api.post.mockResolvedValue({ data: { hasLogo: true, logoVersion: '2026-07-29T00:00:00.000Z' } });
    api.delete.mockResolvedValue({ data: { hasLogo: false, logoVersion: null } });
    await CompaniesService.getLogoBlob();
    await CompaniesService.uploadLogo(file);
    await CompaniesService.removeLogo();
    expect(api.get).toHaveBeenCalledWith('/v1/company/logo', { responseType: 'blob' });
    expect(api.post.mock.calls[0][0]).toBe('/v1/company/logo');
    expect(api.post.mock.calls[0][1]).toBeInstanceOf(FormData);
    expect((api.post.mock.calls[0][1] as FormData).get('file')).toBe(file);
    expect(api.post.mock.calls[0][2]).toEqual({ headers: { 'Content-Type': undefined } });
    expect(api.delete).toHaveBeenCalledWith('/v1/company/logo');
  });

  it('uses the global company lifecycle endpoints without a client-profile edit path', async () => {
    api.post.mockResolvedValue({ data: { id: 'c1' } });
    api.patch.mockResolvedValue({ data: { id: 'c1', isActive: false } });
    const payload = {
      name: 'Acme',
      businessType: 1,
      category: 2,
      address: 'Jakarta',
      phone: '0812',
      email: null,
      field: 'Technology',
      postalCode: '12190',
    };
    await CompaniesService.createManaged(payload);
    await CompaniesService.updateManagedStatus('c1', false);
    expect(api.post).toHaveBeenCalledWith('/v1/companies', payload);
    expect(api.patch).toHaveBeenCalledWith('/v1/companies/c1/status', { isActive: false });
    expect(cache.invalidateReadCache).toHaveBeenCalledWith('/v1/companies');
  });

  it('gets details and deletes only through the managed-company endpoint', async () => {
    api.get.mockResolvedValue({ data: { id: 'c1' } });
    api.delete.mockResolvedValue({ data: null });
    await CompaniesService.getManaged('c1');
    await CompaniesService.deleteManaged('c1');
    expect(api.get).toHaveBeenCalledWith('/v1/companies/c1');
    expect(api.delete).toHaveBeenCalledWith('/v1/companies/c1');
  });

  it('normalizes legacy snake_case and current camelCase master catalog responses', async () => {
    api.get
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            business_type: 'PT',
            legal_entity: true,
            description: 'Perseroan',
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { id: 2, code: 'TECH', name: 'Technology', description: 'Teknologi', is_active: false },
        ],
      });

    await expect(CompaniesService.listTypes(false)).resolves.toEqual({
      data: [
        { id: 1, businessType: 'PT', legalEntity: true, description: 'Perseroan', isActive: true },
      ],
    });
    await expect(CompaniesService.listCategories(false)).resolves.toEqual({
      data: [
        { id: 2, code: 'TECH', name: 'Technology', description: 'Teknologi', isActive: false },
      ],
    });
    expect(api.get).toHaveBeenNthCalledWith(1, '/v1/enterprise-types');
    expect(api.get).toHaveBeenNthCalledWith(2, '/v1/enterprise-categories');
  });
});
