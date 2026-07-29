// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectForm } from './ProjectForm.tsx';
import type { Project } from './types.ts';

const existingProject: Project = {
  id: 'project-1',
  name: 'Existing project',
  key: 'Ab-1',
  description: 'Original description',
  lead: 'Unassigned',
  status: 'Active',
  dueDate: new Date(),
  updatedAt: new Date(),
  stats: { testCasesCount: 0, passRate: 0 },
  members: [],
  createdBy: 'Project owner',
};

describe('ProjectForm project key', () => {
  it('keeps the stored key disabled and unchanged when saving an edited project', () => {
    const onSave = vi.fn();
    const { container } = render(<ProjectForm isOpen initialData={existingProject} onClose={() => {}} onSave={onSave} createdBy="Current user" />);
    const key = container.querySelector('input[name="key"]') as HTMLInputElement;
    const createdBy = container.querySelector('input[name="createdBy"]') as HTMLInputElement;

    expect(key.value).toBe('Ab-1');
    expect(key.disabled).toBe(true);
    expect(key.className).toBe(createdBy.className);

    fireEvent.change(container.querySelector('input[name="name"]')!, { target: { value: 'Renamed project' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Renamed project', key: 'Ab-1' }));
  });

  it('keeps Project Key editable and normalized in create mode', () => {
    const { container } = render(<ProjectForm isOpen onClose={() => {}} onSave={vi.fn()} createdBy="Current user" />);
    const key = container.querySelector('input[name="key"]') as HTMLInputElement;

    expect(key.disabled).toBe(false);
    fireEvent.change(key, { target: { value: 'ab1' } });

    expect(key.value).toBe('AB1');
  });
});
