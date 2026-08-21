import { describe, expect, it } from 'vitest';
import { formatBulkUpdateConfirmation } from './bulkUpdateConfirmation.ts';

describe('formatBulkUpdateConfirmation', () => {
  it('uses human-readable labels while keeping IDs out of the message', () => {
    const message = formatBulkUpdateConfirmation({
      count: 3,
      updates: { sectionId: 'section-uuid', priority: 'High', status: 'Ready', automationType: 'UI', automationReadiness: 'Candidate', folderId: 'folder-uuid' },
      sections: [{ id: 'section-uuid', projectId: 'p1', name: 'Template Settings' }],
      folders: [{ id: 'folder-uuid', projectId: 'p1', name: 'standard-template', parentId: null }],
    });

    expect(message).toContain('Update 3 selected test cases?');
    expect(message).toContain('Section will be changed to "Template Settings".');
    expect(message).toContain('Folder will be changed to "standard-template".');
    expect(message).not.toContain('section-uuid');
    expect(message).not.toContain('folder-uuid');
  });

  it('uses generic safe fallbacks when an internal value cannot be resolved', () => {
    const message = formatBulkUpdateConfirmation({ count: 2, updates: { sectionId: '4bee-internal-id', folderId: 'missing-folder' } });

    expect(message).toContain('Section will be changed to "Selected section".');
    expect(message).toContain('Folder will be changed to "Selected folder".');
    expect(message).not.toContain('4bee-internal-id');
    expect(message).not.toContain('missing-folder');
  });
});
