/** @vitest-environment jsdom */
import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestCaseList } from './TestCaseList.tsx';
import { AutomationReadiness, AutomationType, Priority, Status, type TestCase } from './types.ts';

const testCase: TestCase = {
  id: 'tc-1', tcNumber: 1, projectId: 'project-1', projectKey: 'PRJ', sectionId: 'section-general', title: 'Example case', section: 'General',
  priority: Priority.Medium, status: Status.Draft, automationType: AutomationType.Manual, automationReadiness: AutomationReadiness.Candidate,
  isReusable: false, steps: [], tags: [], updatedAt: new Date(), createdBy: 'user',
};

// eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
const renderList = (onUpdate: (updates: Partial<TestCase>) => void | Promise<void>, canManage = true, currentTestCase = testCase) => render(
  <TestCaseList
    testCases={[currentTestCase]}
    projects={[]}
    selectedIds={[]}
    sortField="id"
    sortOrder="asc"
    onSort={() => {}}
    onToggleSelect={() => {}}
    onToggleSelectAll={() => {}}
    onEdit={() => {}}
    onDelete={() => {}}
    onUpdate={(_id, updates) => onUpdate(updates)}
    hasProjectSelected
    canManage={canManage}
    sectionsByProject={{ 'project-1': [
      { id: 'section-general', name: 'General', projectId: 'project-1' },
      { id: 'section-regression', name: 'Regression', projectId: 'project-1' },
    ] }}
  />,
);

const UpdatingList = () => {
  const [current, setCurrent] = useState(testCase);
  return <TestCaseList testCases={[current]} projects={[]} selectedIds={[]} sortField="id" sortOrder="asc" onSort={() => {}} onToggleSelect={() => {}} onToggleSelectAll={() => {}} onEdit={() => {}} onDelete={() => {}} onUpdate={async (_id, updates) => setCurrent((value) => ({ ...value, ...updates }))} hasProjectSelected canManage sectionsByProject={{ 'project-1': [
    { id: 'section-general', name: 'General', projectId: 'project-1' },
    { id: 'section-regression', name: 'Regression', projectId: 'project-1' },
  ] }} />;
};

afterEach(cleanup);

describe('TestCaseList inline Testing Type and Automation Readiness edits', () => {
  it('lists Not Defined first and persists an inline priority change', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(async () => {});
    renderList(onUpdate, true, { ...testCase, priority: Priority.NotDefined });

    await user.click(screen.getByRole('button', { name: 'Change Priority' }));
    const options = screen.getAllByRole('option');
    expect(options[0].textContent).toBe(Priority.NotDefined);
    await user.click(screen.getByRole('option', { name: Priority.Critical }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ priority: Priority.Critical }));
  });

  it('moves a test case between project sections without leaving the table', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(async () => {});
    renderList(onUpdate);

    await user.click(screen.getByRole('button', { name: 'Change Section' }));
    expect(screen.getByRole('option', { name: 'Regression' })).not.toBeNull();
    await user.click(screen.getByRole('option', { name: 'Regression' }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ sectionId: 'section-regression', section: 'Regression' }));
  });

  it('moves an Uncategorized test case into a project section', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(async () => {});
    renderList(onUpdate, true, { ...testCase, sectionId: undefined, section: 'Uncategorized' });

    await user.click(screen.getByRole('button', { name: 'Change Section' }));
    await user.click(screen.getByRole('option', { name: 'Regression' }));

    expect(onUpdate).toHaveBeenCalledWith({ sectionId: 'section-regression', section: 'Regression' });
  });

  it('keeps the previous section and closes the menu when the section update fails', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(async () => { throw new Error('Update failed'); });
    renderList(onUpdate);

    await user.click(screen.getByRole('button', { name: 'Change Section' }));
    await user.click(screen.getByRole('option', { name: 'Regression' }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Change Section' }).textContent).toContain('General');
    expect(screen.queryByRole('listbox', { name: 'Section options' })).toBeNull();
  });

  it('opens all Testing Type options from its badge and saves the selected value', async () => {
    const user = userEvent.setup();
    render(<UpdatingList />);

    await user.click(screen.getByRole('button', { name: 'Change Testing Type' }));
    expect(screen.getByRole('listbox', { name: 'Testing Type options' })).not.toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(Object.values(AutomationType).length);

    await user.click(screen.getByRole('option', { name: 'UI' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Change Testing Type' }).textContent).toContain('UI'));
    expect(screen.queryByRole('listbox', { name: 'Testing Type options' })).toBeNull();
  });

  it('saves Automation Readiness immediately and displays the API-updated value', async () => {
    const user = userEvent.setup();
    render(<UpdatingList />);

    await user.click(screen.getByRole('button', { name: 'Change Automation Readiness' }));
    await user.click(screen.getByRole('option', { name: 'Automated' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Change Automation Readiness' }).textContent).toContain(AutomationReadiness.Automated));
  });

  it('shows the full Not Automatable option without wrapping', async () => {
    const user = userEvent.setup();
    render(<UpdatingList />);

    await user.click(screen.getByRole('button', { name: 'Change Automation Readiness' }));

    const option = screen.getByRole('option', { name: AutomationReadiness.NotAutomatable });
    expect(option.textContent).toBe(AutomationReadiness.NotAutomatable);
    expect(option.className).toContain('whitespace-nowrap');
    expect(screen.getByRole('listbox', { name: 'Automation Readiness options' }).className).toContain('w-max');
  });

  it('shows a per-cell loading state until the inline API update completes', async () => {
    const user = userEvent.setup();
    let completeUpdate: (() => void) | undefined;
    renderList(() => new Promise<void>((resolve) => { completeUpdate = resolve; }));

    await user.click(screen.getByRole('button', { name: 'Change Testing Type' }));
    await user.click(screen.getByRole('option', { name: 'API' }));

    expect(screen.getByLabelText('Saving Testing Type')).not.toBeNull();
    completeUpdate?.();
    await waitFor(() => expect(screen.queryByLabelText('Saving Testing Type')).toBeNull());
  });

  it('keeps the previous value when saving fails', async () => {
    const user = userEvent.setup();
    const updateApi = vi.fn(async () => { throw new Error('Update failed'); });
    renderList(updateApi);

    await user.click(screen.getByRole('button', { name: 'Change Testing Type' }));
    await user.click(screen.getByRole('option', { name: 'API' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Change Testing Type' }).textContent).toContain(AutomationType.Manual));
    expect(updateApi).toHaveBeenCalledWith({ automationType: AutomationType.API });
    expect(screen.queryByRole('listbox', { name: 'Testing Type options' })).toBeNull();
  });

  it('does not expose inline controls without test case management permission', () => {
    renderList(() => {}, false);
    expect(screen.queryByRole('button', { name: 'Change Testing Type' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Change Automation Readiness' })).toBeNull();
  });
});
