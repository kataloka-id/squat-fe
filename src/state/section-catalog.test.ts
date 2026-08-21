/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { listSections } = vi.hoisted(() => ({ listSections: vi.fn() }));
vi.mock('@/src/api/projects.service.ts', () => ({
  ProjectsService: { listSections },
  SectionsService: { list: listSections },
}));

import { sectionCatalogStore } from './section-catalog.ts';

const section = (projectId: string, id: string, name: string) => ({ id, projectId, name });

afterEach(() => {
  listSections.mockReset();
  sectionCatalogStore.clearProject('store-p1');
  sectionCatalogStore.clearProject('store-p2');
});

describe('section catalog shared store', () => {
  it('deduplicates reads and keeps catalogs isolated by project', async () => {
    const p1 = [section('store-p1', 's1', 'General')];
    const p2 = [section('store-p2', 's2', 'Regression')];
    listSections.mockImplementation((projectId: string) => Promise.resolve({ data: projectId === 'store-p1' ? p1 : p2 }));

    await Promise.all([sectionCatalogStore.load('store-p1'), sectionCatalogStore.load('store-p1')]);
    await sectionCatalogStore.load('store-p2');

    expect(listSections).toHaveBeenCalledTimes(2);
    expect(sectionCatalogStore.getSnapshot().sectionsByProject).toEqual({ 'store-p1': p1, 'store-p2': p2 });
  });

  it('refreshes every consumer snapshot after mutation and retains old data on failure', async () => {
    const oldSection = section('store-p1', 's1', 'General');
    const renamedSection = section('store-p1', 's1', 'Smoke');
    listSections.mockResolvedValueOnce({ data: [oldSection] }).mockResolvedValueOnce({ data: [renamedSection] });
    await sectionCatalogStore.load('store-p1');

    await sectionCatalogStore.mutate('store-p1', async () => ({ ok: true }));
    expect(sectionCatalogStore.getSnapshot().sectionsByProject['store-p1']).toEqual([renamedSection]);

    await expect(sectionCatalogStore.mutate('store-p1', async () => { throw new Error('delete rejected'); })).rejects.toThrow('delete rejected');
    expect(sectionCatalogStore.getSnapshot().sectionsByProject['store-p1']).toEqual([renamedSection]);
  });
});
