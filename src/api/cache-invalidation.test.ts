import { beforeEach, describe, expect, it, vi } from 'vitest';

const invalidateReadCache = vi.hoisted(() => vi.fn());
const invalidateReadCacheExact = vi.hoisted(() => vi.fn());
const notifyExecutionDataChanged = vi.hoisted(() => vi.fn());

vi.mock('./read-cache.ts', () => ({ invalidateReadCache, invalidateReadCacheExact }));
vi.mock('./execution-refresh.ts', () => ({ notifyExecutionDataChanged }));

import { invalidateProjectResources, invalidateSettingsResources } from './cache-invalidation.ts';

describe('shared mutation invalidation graph', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates dependent consumers once per resource for a bulk test-case mutation', () => {
    invalidateProjectResources('p1', ['testCases', 'folders', 'flows', 'runs', 'reports']);
    expect(invalidateReadCache.mock.calls.map(([key]) => key)).toEqual([
      '/v1/projects/p1/test-cases',
      '/v1/projects/p1/test-case-folders',
      '/v1/projects/p1/user-flows',
      '/v1/projects/p1/test-runs',
      '/v1/projects/p1/reports',
    ]);
    expect(notifyExecutionDataChanged).toHaveBeenCalledTimes(1);
  });

  it('does not evict nested project resources for ordinary project-list refreshes', () => {
    invalidateProjectResources('p1', ['projects']);
    expect(invalidateReadCache.mock.calls.map(([key]) => key)).toEqual([
      // Project collection keys use exact invalidation and therefore do not
      // appear in prefix invalidation calls.
    ]);
    expect(invalidateReadCacheExact.mock.calls.map(([key]) => key)).toEqual([
      '/v1/projects',
      '/v1/projects/pending-deletion',
    ]);
  });

  it('invalidates every settings catalog consumer after a catalog mutation', () => {
    invalidateSettingsResources('catalogs');
    expect(invalidateReadCache.mock.calls.map(([key]) => key)).toEqual([
      '/v1/enterprise-categories',
      '/v1/enterprise-types',
    ]);
  });
});
