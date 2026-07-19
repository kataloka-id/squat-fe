import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./axios.ts', () => ({ default: {} }));
vi.mock('./read-cache.ts', () => ({
  getCached: vi.fn(),
  invalidateReadCache: vi.fn(),
}));

import { invalidateReadCache } from './read-cache.ts';
import { ProjectsService } from './projects.service.ts';

describe('ProjectsService cache invalidation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates the canonical project collection before a mutation refetch', () => {
    ProjectsService.invalidateList();
    expect(invalidateReadCache).toHaveBeenCalledWith('/v1/projects');
  });
});
