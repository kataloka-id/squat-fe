import type { TestCaseFolderRecord } from '@/src/types/api.ts';
import type { SectionRecord } from '@/src/types/api.ts';

type BulkUpdate = Partial<Record<'sectionId' | 'folderId' | 'priority' | 'status' | 'automationType' | 'automationReadiness', string | null>>;

const fieldLabels: Record<string, string> = {
  sectionId: 'Section',
  folderId: 'Folder',
  priority: 'Priority',
  status: 'Status',
  automationType: 'Testing Type',
  automationReadiness: 'Automation Readiness',
};

const fallbackLabels: Record<string, string> = {
  sectionId: 'Selected section',
  folderId: 'Selected folder',
};

const displayValue = (field: string, value: unknown, sections: SectionRecord[], folders: TestCaseFolderRecord[]) => {
  if (field === 'sectionId') return sections.find((section) => section.id === value)?.name ?? fallbackLabels[field];
  if (field === 'folderId') {
    if (value === null) return 'Unfiled';
    return folders.find((folder) => folder.id === value)?.name ?? fallbackLabels[field];
  }
  return typeof value === 'string' && value ? value : 'Selected value';
};

export const formatBulkUpdateConfirmation = ({
  count,
  updates,
  sections = [],
  folders = [],
}: {
  count: number;
  updates: BulkUpdate;
  sections?: SectionRecord[];
  folders?: TestCaseFolderRecord[];
}) => {
  const changes = Object.entries(updates)
    .filter(([field]) => fieldLabels[field])
    .map(([field, value]) => `${fieldLabels[field]} will be changed to "${displayValue(field, value, sections, folders)}".`);

  const subject = count > 1 ? `Update ${count} selected test cases?` : 'Update this test case?';
  return [subject, ...changes].join(' ');
};
