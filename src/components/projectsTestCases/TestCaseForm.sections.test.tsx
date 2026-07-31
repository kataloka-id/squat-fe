/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestCaseForm } from './TestCaseForm.tsx';
import { AutomationReadiness, AutomationType, Priority, Status, type Project, type TestCase } from './types.ts';
import { ProjectsService } from '@/src/api/projects.service.ts';

const projects: Project[] = [
  { id: 'p1', name: 'One', key: 'ONE', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [] },
  { id: 'p2', name: 'Two', key: 'TWO', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [] },
];

const initialSections = { p1: [{ id: 's1', name: 'General', projectId: 'p1' }] };

afterEach(cleanup);

describe('TestCaseForm section catalog', () => {
  it('selects a reusable candidate and saves its reference when creating a test case', async () => {
    const onSave = vi.fn();
    const reusableCandidate = { id: 'case-2', projectKey: 'ONE', tcNumber: 2, title: 'Login', section: 'General', status: Status.Ready, automationType: AutomationType.Manual };
    const selector = vi.spyOn(ProjectsService, 'listReusableTestCases').mockResolvedValue({ data: [reusableCandidate] } as never);
    render(<TestCaseForm isOpen onClose={vi.fn()} onSave={onSave} projects={[projects[0]]} sectionsByProject={initialSections} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New parent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link Test Case' }));
    await waitFor(() => expect(selector).toHaveBeenCalledWith('p1', { search: undefined, excludeTestCaseId: undefined }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Link ONE-2 — Login' })).toBeTruthy());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Link ONE-2 — Login' }));
    fireEvent.click(screen.getByRole('button', { name: 'Link selected' }));
    await waitFor(() => expect(screen.getByText(/ONE-2/)).toBeTruthy());
    fireEvent.submit(document.getElementById('testCaseForm')!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ linkedPreconditions: [{ testCaseId: 'case-2', sortOrder: 1 }] }), 'close');
  });

  it('keeps Markdown preconditions and saves reusable linked references in their displayed order', () => {
    const onSave = vi.fn();
    const initialData: TestCase = {
      id: 'parent', projectId: 'p1', projectKey: 'ONE', tcNumber: 1, title: 'Parent case', sectionId: 's1', section: 'General', priority: Priority.Medium, status: Status.Ready,
      automationType: AutomationType.Manual, automationReadiness: AutomationReadiness.Candidate, preconditions: '**Existing Markdown**', steps: [], tags: [], createdBy: 'user', updatedAt: new Date(), isReusable: false,
      linkedPreconditions: [
        { testCaseId: 'case-2', sortOrder: 1, projectKey: 'ONE', tcNumber: 2, title: 'Second', section: 'General', status: Status.Ready, automationType: AutomationType.Manual },
        { testCaseId: 'case-3', sortOrder: 2, projectKey: 'ONE', tcNumber: 3, title: 'Third', section: 'Regression', status: Status.Deprecated, isDeprecated: true, automationType: AutomationType.API },
      ],
    };
    render(<TestCaseForm initialData={initialData} isOpen onClose={vi.fn()} onSave={onSave} projects={[projects[0]]} sectionsByProject={initialSections} />);

    expect(screen.getByDisplayValue('**Existing Markdown**')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Reusable Test Case'));
    fireEvent.click(screen.getByRole('button', { name: 'Move linked precondition 2 up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove linked precondition 2' }));
    fireEvent.submit(document.getElementById('testCaseForm')!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      isReusable: true,
      preconditions: '**Existing Markdown**',
      linkedPreconditions: [{ testCaseId: 'case-3', sortOrder: 1 }],
    }), 'close');
    expect(screen.getByText('This linked test case is deprecated.')).toBeTruthy();
  });

  it('keeps a single accessible project selected', () => {
    render(<TestCaseForm isOpen onClose={vi.fn()} onSave={vi.fn()} projects={[projects[0]]} sectionsByProject={initialSections} />);
    expect((screen.getByLabelText('Project') as HTMLSelectElement).disabled).toBe(true);
  });

  it('resets the old section, preserves other fields, and submits the newly loaded section', async () => {
    const onSave = vi.fn();
    const onProjectChange = vi.fn().mockResolvedValue([{ id: 's2', name: 'Regression', projectId: 'p2' }]);
    render(<TestCaseForm isOpen onClose={vi.fn()} onSave={onSave} projects={projects} onProjectChange={onProjectChange} sectionsByProject={initialSections} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Project scoped case' } });
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p2' } });
    expect((screen.getByLabelText('Project') as HTMLSelectElement).value).toBe('p2');
    expect((screen.getByLabelText('Section') as HTMLSelectElement).value).toBe('');
    expect(screen.getByText('Loading sections…')).toBeTruthy();

    await waitFor(() => expect((screen.getByLabelText('Section') as HTMLSelectElement).value).toBe('s2'));
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Project scoped case');
    fireEvent.submit(document.getElementById('testCaseForm')!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p2', sectionId: 's2', section: 'Regression' }), 'close');
  });

  it('ignores an older section response after rapid project switching', async () => {
    let resolveP2!: () => void;
    const p2Request = new Promise<typeof initialSections.p1>((resolve) => {
      resolveP2 = () => resolve([{ id: 's2', name: 'Regression', projectId: 'p2' }]);
    });
    const onProjectChange = vi.fn((projectId: string) => projectId === 'p2'
      ? p2Request
      : Promise.resolve(initialSections.p1));
    render(<TestCaseForm isOpen onClose={vi.fn()} onSave={vi.fn()} projects={projects} onProjectChange={onProjectChange} sectionsByProject={initialSections} />);

    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p2' } });
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p1' } });
    await waitFor(() => expect((screen.getByLabelText('Section') as HTMLSelectElement).value).toBe('s1'));
    resolveP2();
    await waitFor(() => expect((screen.getByLabelText('Project') as HTMLSelectElement).value).toBe('p1'));
    expect((screen.getByLabelText('Section') as HTMLSelectElement).value).toBe('s1');
    expect(screen.queryByText('Regression')).toBeNull();
  });

  it('shows a retry action when loading the selected project sections fails', async () => {
    const onProjectChange = vi.fn()
      .mockRejectedValueOnce(new Error('Could not load sections'))
      .mockResolvedValueOnce([{ id: 's2', name: 'Regression', projectId: 'p2' }]);
    render(<TestCaseForm isOpen onClose={vi.fn()} onSave={vi.fn()} projects={projects} onProjectChange={onProjectChange} sectionsByProject={initialSections} />);

    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p2' } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Could not load sections'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect((screen.getByLabelText('Section') as HTMLSelectElement).value).toBe('s2'));
    expect(onProjectChange).toHaveBeenCalledTimes(2);
  });
});
