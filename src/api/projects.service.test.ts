import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));

vi.mock('./axios.ts', () => ({ default: api }));
vi.mock('./read-cache.ts', () => ({
  getCached: vi.fn((_key: string, request: () => Promise<unknown>) => request()),
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

  it('uses the pending-deletion lifecycle endpoints and invalidates both project lists', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { id: 'project-1' } });
    api.delete.mockResolvedValue({ data: null });

    await ProjectsService.listPendingDeletion();
    await ProjectsService.restore('project-1');
    await ProjectsService.permanentlyRemove('project-1');

    expect(api.get).toHaveBeenCalledWith('/v1/projects/pending-deletion');
    expect(api.post).toHaveBeenCalledWith('/v1/projects/project-1/restore');
    expect(api.delete).toHaveBeenCalledWith('/v1/projects/project-1/permanent');
    expect(invalidateReadCache).toHaveBeenCalledWith('/v1/projects/pending-deletion');
  });

  it('sends every Automation Readiness value without changing Testing Type or Status', async () => {
    const automationType = AutomationType.Manual;
    const status = Status.Draft;
    api.post.mockResolvedValue({ data: { id: 'case-1' } });
    api.patch.mockResolvedValue({ data: { id: 'case-1' } });

    for (const automationReadiness of Object.values(AutomationReadiness)) {
      const payload = {
        title: 'Case', sectionId: 'section-1', priority: 'Medium', status, automationType, automationReadiness,
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

  it('uses the project-scoped reusable selector and persists only linked reference IDs and sort orders', async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { id: 'case-1' } });
    await ProjectsService.listReusableTestCases('project-1', { search: 'login', excludeTestCaseId: 'case-1' });
    await ProjectsService.createTestCase('project-1', {
      title: 'Case', sectionId: 'section-1', priority: 'Medium', status: Status.Ready, automationType: AutomationType.Manual, automationReadiness: AutomationReadiness.Candidate,
      isReusable: true, linkedPreconditions: [{ testCaseId: 'case-2', sortOrder: 1 }], steps: [], tags: [],
    });
    expect(api.get).toHaveBeenCalledWith('/v1/projects/project-1/test-cases/reusable', { params: { search: 'login', excludeTestCaseId: 'case-1' } });
    expect(api.post).toHaveBeenCalledWith('/v1/projects/project-1/test-cases', expect.objectContaining({ isReusable: true, linkedPreconditions: [{ testCaseId: 'case-2', sortOrder: 1 }] }));
  });

  it('scopes section catalog mutations to a project', async () => {
    const { SectionsService } = await import('./projects.service.ts');
    api.post.mockResolvedValue({ data: { id: 'section-1', name: 'General', projectId: 'project-1' } });
    api.patch.mockResolvedValue({ data: { id: 'section-1', name: 'Renamed', projectId: 'project-1' } });
    await SectionsService.create('project-1', { name: 'General' });
    await SectionsService.update('project-1', 'section-1', { name: 'Renamed' });
    expect(api.post).toHaveBeenCalledWith('/v1/projects/project-1/sections', { name: 'General' });
    expect(api.patch).toHaveBeenCalledWith('/v1/projects/project-1/sections/section-1', { name: 'Renamed' });
  });

  it('posts the validated JSON contract to the project-scoped import endpoint', async () => {
    api.post.mockResolvedValue({ data: { importedCount: 2 } });
    const payload = { version: '1.0' as const, projectKey: 'ATTE', testCases: [{ title: 'Case', section: 'General', priority: 'Medium', status: 'Draft', automationType: 'Manual', automationReadiness: 'Candidate', steps: [{ action: 'Open', expectedResult: 'Shown' }] }] };
    await ProjectsService.importTestCases('project-1', payload);
    expect(api.post).toHaveBeenCalledWith('/v1/projects/project-1/test-cases/import', payload);
  });
});
