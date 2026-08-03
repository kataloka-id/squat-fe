// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

type MockAttachmentProps = {
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onDeleted?: (attachmentId: string) => void;
};

vi.mock('./Attachments.tsx', () => ({
  Attachments: ({ onDeleted }: MockAttachmentProps) => (
    <button onClick={() => onDeleted?.('9896259b-3ace-45e3-9760-95830b04a6b3')} type="button">
      Delete uploaded image
    </button>
  ),
}));

import { TestCaseForm } from './TestCaseForm.tsx';
import { AutomationType, Priority, Status, type Project, type TestCase } from './types.ts';

const attachmentId = '9896259b-3ace-45e3-9760-95830b04a6b3';
const reference = `![image.png](attachment://${attachmentId})`;
const project: Project = {
  id: 'project-1', key: 'PROJ', name: 'Project', description: '', lead: '', status: 'Active',
  dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [],
};

describe('TestCaseForm attachment deletion cleanup', () => {
  it('removes the deleted reference from every Markdown field and submits the cleaned draft', () => {
    const initialData: TestCase = {
      id: 'case-1', projectId: project.id, title: 'Case', section: 'General',
      description: `Description\n\n${reference}\n\nAfter`,
      preconditions: reference,
      mainExpectedResult: `Result ${reference}`,
      priority: Priority.Medium, status: Status.Draft, automationType: AutomationType.Manual,
      tags: [], updatedAt: new Date(), createdBy: 'tester',
      steps: [
        { id: 'step-1', action: reference, expectedResult: `Expected\n${reference}` },
        { id: 'step-2', action: 'Unchanged', expectedResult: 'Also unchanged' },
      ],
    };
    const onSave = vi.fn();
    const { container } = render(
      <TestCaseForm
        initialData={initialData}
        isOpen
        onClose={() => {}}
        onSave={onSave}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete uploaded image' }));
    for (const label of ['Description', 'Preconditions', 'Main Expected Result', 'Step 1 action', 'Step 1 expected result']) {
      expect((screen.getByRole('textbox', { name: label }) as HTMLTextAreaElement).value).not.toContain(attachmentId);
    }
    expect((screen.getByRole('textbox', { name: 'Step 2 action' }) as HTMLTextAreaElement).value).toBe('Unchanged');

    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Description\n\nAfter',
        preconditions: '',
        mainExpectedResult: 'Result ',
        steps: [
          expect.objectContaining({ action: '', expectedResult: 'Expected' }),
          expect.objectContaining({ action: 'Unchanged', expectedResult: 'Also unchanged' }),
        ],
      }),
      'close',
    );
  });
});
