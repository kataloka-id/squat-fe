import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));

vi.mock('./axios.ts', () => ({ default: api }));
vi.mock('./read-cache.ts', () => ({
  getCached: vi.fn(),
  invalidateReadCache: vi.fn(),
}));

import { invalidateReadCache } from './read-cache.ts';
import { ProjectsService } from './projects.service.ts';
import { AutomationReadiness, AutomationType, Status } from '@/src/components/projectsTestCases/types.ts';

describe('ProjectsService cache invalidation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates the canonical project collection before a mutation refetch', () => {
    ProjectsService.invalidateList();
    expect(invalidateReadCache).toHaveBeenCalledWith('/v1/projects');
  });

  it('sends every Automation Readiness value without changing Testing Type or Status', async () => {
    const automationType = AutomationType.Manual;
    const status = Status.Draft;
    api.post.mockResolvedValue({ data: { id: 'case-1' } });
    api.patch.mockResolvedValue({ data: { id: 'case-1' } });

    for (const automationReadiness of Object.values(AutomationReadiness)) {
      const payload = {
        title: 'Case', section: 'General', priority: 'Medium', status, automationType, automationReadiness,
        description: '**Purpose**\n\n- scope', preconditions: null, mainExpectedResult: null, steps: [], tags: [],
      };

      await ProjectsService.createTestCase('project-1', payload);
      await ProjectsService.updateTestCase('project-1', 'case-1', payload);

      expect(api.post).toHaveBeenCalledWith('/v1/projects/project-1/test-cases', expect.objectContaining({
        automationReadiness, automationType, status,
      }));
      expect(api.patch).toHaveBeenCalledWith('/v1/projects/project-1/test-cases/case-1', expect.objectContaining({
        automationReadiness, automationType, status,
      }));
    }
  });

  it('posts the validated JSON contract to the project-scoped import endpoint', async () => {
    api.post.mockResolvedValue({ data: { importedCount: 2 } });
    const payload = { version: '1.0' as const, projectKey: 'ATTE', testCases: [{ title: 'Case', section: 'General', priority: 'Medium', status: 'Draft', automationType: 'Manual', automationReadiness: 'Candidate', steps: [{ action: 'Open', expectedResult: 'Shown' }] }] };
    await ProjectsService.importTestCases('project-1', payload);
    expect(api.post).toHaveBeenCalledWith('/v1/projects/project-1/test-cases/import', payload);
  });
});
