import { describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn() }));
const cache = vi.hoisted(() => ({ getCached: vi.fn((_path: string, request: () => unknown) => request()), invalidateReadCache: vi.fn() }));
vi.mock('./axios.ts', () => ({ default: api }));
vi.mock('./read-cache.ts', () => cache);

import { RolesService, UsersService } from './users.service.ts';

describe('UsersService filters', () => {
  it('sends the agreed server-side q and companyId query contract', () => {
    api.get.mockResolvedValue({ data: [] });
    void UsersService.list(undefined, { q: '  user@example.test ', companyId: 'company-1' });
    expect(api.get).toHaveBeenCalledWith('/v1/users?q=user%40example.test&companyId=company-1');
  });

  it('uses the assignable-role endpoint for user creation choices', () => {
    api.get.mockResolvedValue({ data: [] });
    void RolesService.assignable();
    expect(api.get).toHaveBeenCalledWith('/v1/roles/assignable');
  });
});
