import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('./axios.ts', () => ({ default: api }));
vi.mock('./read-cache.ts', () => ({ invalidateReadCache: vi.fn() }));

import { invalidateReadCache } from './read-cache.ts';
import { UserFlowsService } from './user-flows.service.ts';

describe('UserFlowsService', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses the agreed project-scoped collection and invalidates after create', async () => {
    api.post.mockResolvedValue({ data: { id: 'flow-1' } });
    await UserFlowsService.create('project-1', { title: 'Checkout', description: '', area: 'Store', priority: 'critical', health: 'unknown', status: 'draft' });
    expect(api.post).toHaveBeenCalledWith('/v1/projects/project-1/user-flows', expect.objectContaining({ title: 'Checkout' }));
    expect(invalidateReadCache).toHaveBeenCalledWith('/v1/projects/project-1/user-flows');
  });
  it('sends exact ordered step IDs and atomic relation payloads', async () => {
    api.put.mockResolvedValue({ data: [] }); api.post.mockResolvedValue({ data: {} });
    await UserFlowsService.reorderSteps('p1', 'f1', ['step-2', 'step-1']);
    await UserFlowsService.linkTestCases('p1', 'f1', ['case-1', 'case-2']);
    await UserFlowsService.addDependency('p1', 'f1', 'f2');
    expect(api.put).toHaveBeenCalledWith('/v1/projects/p1/user-flows/f1/steps/reorder', { stepIds: ['step-2', 'step-1'] });
    expect(api.post).toHaveBeenCalledWith('/v1/projects/p1/user-flows/f1/test-cases', { testCaseIds: ['case-1', 'case-2'] });
    expect(api.post).toHaveBeenCalledWith('/v1/projects/p1/user-flows/f1/dependencies', { targetFlowId: 'f2', relationshipType: 'requires' });
  });
});
