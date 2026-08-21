/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestCaseForm } from './TestCaseForm.tsx';
import { type Project } from './types.ts';
import { selectCustomOptionSync } from '@/src/test/selectTestUtils.ts';

const projects: Project[] = [{
  id: 'p1', name: 'One', key: 'ONE', description: '', lead: '', status: 'Active',
  dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [],
}, {
  id: 'p2', name: 'Two', key: 'TWO', description: '', lead: '', status: 'Active',
  dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [],
}];

const renderForm = (onSave: Parameters<typeof TestCaseForm>[0]['onSave'], onProjectChange = vi.fn().mockResolvedValue([{ id: 's2', name: 'Fresh section', projectId: 'p1' }])) => {
  render(
    <TestCaseForm
      isOpen
      onClose={vi.fn()}
      onProjectChange={onProjectChange}
      onSave={onSave}
      projects={projects}
      sectionsByProject={{
        p1: [{ id: 's1', name: 'General', projectId: 'p1' }],
        p2: [{ id: 'p2-stale-section', name: 'Old Two section', projectId: 'p2' }],
      }}
    />,
  );
  return onProjectChange;
};

const enterTitle = (title = 'A test case') => fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });

afterEach(cleanup);

describe('TestCaseForm create another', () => {
  it('submits the regular Create Case action in close mode', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    renderForm(onSave);

    enterTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create Case' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'A test case' }), 'close'));
  });

  it('creates another, resets the form, preserves its project, reloads sections, and focuses Title', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const onProjectChange = vi.fn().mockResolvedValue([{ id: 'p2-fresh-section', name: 'Fresh Two section', projectId: 'p2' }]);
    renderForm(onSave, onProjectChange);

    selectCustomOptionSync('Project', 'p2');
    await waitFor(() => expect(screen.getByLabelText('Section').getAttribute('value')).toBe('p2-fresh-section'));
    enterTitle('First test case');
    fireEvent.click(screen.getByRole('button', { name: 'Create & Add Another' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'First test case', projectId: 'p2' }), 'create-another'));
    await waitFor(() => expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe(''));
    expect(screen.getByLabelText('Project').getAttribute('value')).toBe('p2');
    await waitFor(() => expect(screen.getByLabelText('Section').getAttribute('value')).toBe('p2-fresh-section'));
    expect(onProjectChange).toHaveBeenLastCalledWith('p2');
    expect(screen.getAllByText('Step 1')).toHaveLength(1);
    expect(document.activeElement).toBe(screen.getByLabelText('Title'));
  });

  it('keeps the entered form values when Create & Add Another fails', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    const onProjectChange = renderForm(onSave);

    enterTitle('Keep this title');
    fireEvent.click(screen.getByRole('button', { name: 'Create & Add Another' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Keep this title');
    expect(onProjectChange).not.toHaveBeenCalled();
  });

  it('disables both submission actions while a create request is in progress', async () => {
    let resolveSave!: (result: boolean) => void;
    const onSave = vi.fn().mockImplementation(() => new Promise<boolean>((resolve) => { resolveSave = resolve; }));
    renderForm(onSave);

    enterTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create & Add Another' }));

    await waitFor(() => expect((screen.getByRole('button', { name: 'Creating & Adding Another…' }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole('button', { name: 'Create Case' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Create Case' }));
    expect(onSave).toHaveBeenCalledTimes(1);

    resolveSave(true);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Create & Add Another' }) as HTMLButtonElement).disabled).toBe(false));
  });
});
