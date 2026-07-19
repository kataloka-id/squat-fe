import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Project, TestCase } from '@/src/components/projectsTestCases/types.ts';
import { TestCaseForm } from '@/src/components/projectsTestCases/TestCaseForm.tsx';
import { TestCaseList } from '@/src/components/projectsTestCases/TestCaseList.tsx';
import { formatTestCaseDisplayId } from './testCaseDisplayId.ts';

const project: Project = { id: 'project-pay', name: 'Payments', key: 'PAY', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), members: [], stats: { testCasesCount: 12, passRate: 0 } };
const testCase: TestCase = { id: '2be5d38e-8c29-4f1c-9f3f-a3d1e1d041f4', projectId: project.id, projectKey: 'PAY', tcNumber: 12, title: 'Pay', section: 'Checkout', priority: 'Medium' as TestCase['priority'], status: 'Draft' as TestCase['status'], automationType: 'Manual' as TestCase['automationType'], steps: [], tags: [], updatedAt: new Date(), createdBy: 'admin' };

describe('test-case display ID', () => {
  it('uses canonical projectKey and sequence, never the UUID', () => {
    expect(formatTestCaseDisplayId(testCase, 'OTHER')).toBe('PAY-12');
    expect(formatTestCaseDisplayId({ tcNumber: 7 }, 'MOB')).toBe('MOB-7');
    expect(formatTestCaseDisplayId({ tcNumber: 13 }, 'PAY')).toBe('PAY-13');
    expect(formatTestCaseDisplayId({ tcNumber: undefined }, 'PAY')).not.toContain(testCase.id);
  });

  it('renders PAY-12, not the UUID, in the table and edit header', () => {
    const common = { projects: [project], selectedIds: [], sortField: 'id' as const, sortOrder: 'asc' as const, onSort: () => {}, onToggleSelect: () => {}, onToggleSelectAll: () => {}, onEdit: () => {}, onDelete: () => {}, onUpdate: () => {}, hasProjectSelected: true };
    const table = renderToStaticMarkup(<TestCaseList {...common} testCases={[testCase]} />);
    const form = renderToStaticMarkup(<TestCaseForm isOpen initialData={testCase} projects={[project]} sectionsByProject={{ [project.id]: ['Checkout'] }} onClose={() => {}} onSave={() => {}} />);
    expect(table).toContain('PAY-12');
    expect(form).toContain('PAY-12');
    expect(table).not.toContain(testCase.id);
    expect(form).not.toContain(testCase.id);
  });
});
