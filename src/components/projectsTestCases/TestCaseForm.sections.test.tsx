/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestCaseForm } from './TestCaseForm.tsx';
import { type Project } from './types.ts';

const projects: Project[] = [
  { id: 'p1', name: 'One', key: 'ONE', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [] },
  { id: 'p2', name: 'Two', key: 'TWO', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [] },
];

const initialSections = { p1: [{ id: 's1', name: 'General', projectId: 'p1' }] };

afterEach(cleanup);

describe('TestCaseForm section catalog', () => {
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
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p2', sectionId: 's2', section: 'Regression' }));
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
