/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './ProjectsTestCasesPage.tsx';

const serviceMocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  movedTestCase: false,
  multiTestCases: false,
  listTestCasesInFolder: vi.fn((projectId: string, scope: { folderId?: string } = {}) => Promise.resolve({ data: scope.folderId === 'f1' && serviceMocks.movedTestCase ? [] : Array.from({ length: serviceMocks.multiTestCases ? 2 : 1 }, (_, index) => ({ id: `tc-${projectId}-${index + 1}`, tcNumber: index + 1, title: `Case ${projectId}-${index + 1}`, projectId, section: 'General', priority: 'Medium', status: 'Draft', automationType: 'Manual', automationReadiness: 'Candidate', steps: [], tags: [] })) })),
  bulkMoveTestCases: vi.fn().mockImplementation(async () => { serviceMocks.movedTestCase = true; return { data: [] }; }),
  bulkUpdateTestCases: vi.fn().mockResolvedValue({ data: { updatedCount: 2, failedCount: 0, skippedCount: 0 } }),
  updateTestCase: vi.fn().mockImplementation(async (projectId: string, id: string, payload: object) => ({ data: { id, projectId, tcNumber: 1, title: `Case ${projectId}`, section: 'Release', sectionId: 's2', ...payload } })),
  failUpdate: false,
  importTestCases: vi.fn().mockResolvedValue({ data: { importedCount: 0 } }),
  createTestCaseFolder: vi.fn().mockResolvedValue({ data: { id: 'f2', name: 'New folder' } }),
}));

vi.mock('@/src/auth/SessionContext.tsx', () => ({
  useSessionUser: () => ({ username: 'QA User', roleSlug: 'qa', company: { name: 'Kataloka' } }),
}));
vi.mock('@/src/components/projectsTestCases/ProjectBoard.tsx', () => ({
  ProjectBoard: ({ onViewTestCases, onViewUserFlows }: { onViewTestCases: (id: string) => void; onViewUserFlows: (id: string) => void }) => <><button onClick={() => onViewTestCases('p1')}>Open P1</button><button onClick={() => onViewTestCases('p2')}>Open P2</button><button onClick={() => onViewUserFlows('p1')}>Open User Flows P1</button><button onClick={() => onViewUserFlows('p2')}>Open User Flows P2</button></>,
}));
vi.mock('@/src/components/userFlows/UserFlowsPage.tsx', () => ({
  UserFlowsPage: ({ projectId, onProjectChange }: { projectId: string; onProjectChange: (projectId: string) => void }) => <><p>User Flow project: {projectId || 'none'}</p><button onClick={() => onProjectChange('p1')}>Choose User Flow P1</button><button onClick={() => onProjectChange('missing')}>Choose unavailable User Flow project</button></>,
}));
vi.mock('@/src/components/projectsTestCases/TestCaseStats.tsx', () => ({ TestCaseStats: () => null }));
vi.mock('@/src/components/projectsTestCases/TestCaseForm.tsx', () => ({ TestCaseForm: () => null }));
vi.mock('@/src/components/projectsTestCases/TestCaseDetail.tsx', () => ({ TestCaseDetail: () => null }));
vi.mock('@/src/components/projectsTestCases/TestCaseImportDialog.tsx', () => ({
  TestCaseImportDialog: ({ isOpen, onImport }: { isOpen: boolean; onImport: (projectId: string, payload: object) => Promise<unknown> }) => isOpen ? <button onClick={() => void onImport('p1', {})}>Run import</button> : null,
}));
vi.mock('@/src/components/projectsTestCases/TestCaseFolderTree.tsx', () => ({
  TestCaseFolderTree: ({ active, onSelect, onCreate }: { active: { folderId?: string; unfiled?: boolean }; onSelect: (scope: { folderId?: string; unfiled?: boolean; includeSubfolders: boolean }) => void; onCreate?: () => void }) => <><p>Folder scope: {active.unfiled ? 'unfiled' : active.folderId ?? 'all'}</p><button onClick={() => onSelect({ folderId: 'f1', includeSubfolders: false })}>Choose folder</button><button onClick={() => onSelect({ includeSubfolders: false })}>Choose all</button><button onClick={() => onSelect({ unfiled: true, includeSubfolders: false })}>Choose unfiled</button><button aria-label="Create folder" onClick={() => onCreate?.()}>+</button></>,
}));
vi.mock('@/src/components/testRuns/TestRunsPage.tsx', () => ({ TestRunsPage: () => <p>Other page</p> }));
vi.mock('@/src/components/reports/ReportsPage.tsx', () => ({ ReportsPage: () => <p>Other page</p> }));
vi.mock('@/src/components/projectsTestCases/ui/ConfirmationModal.tsx', () => ({ ConfirmationModal: ({ isOpen, message, onConfirm }: { isOpen: boolean; message: string; onConfirm: () => void }) => isOpen ? <><p role="dialog">{message}</p><button onClick={onConfirm}>Confirm update</button></> : null }));
vi.mock('@/src/components/projectsTestCases/ui/Toast.tsx', () => ({ Toast: ({ message }: { message: string }) => <div role="alert">{message}</div> }));
vi.mock('@/src/components/settings/SettingsPage.tsx', () => ({ SettingsPage: () => null }));
vi.mock('@/src/components/team/TeamPage.tsx', () => ({ TeamPage: () => null }));
vi.mock('@/src/components/projectsTestCases/ui/Button.tsx', () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock('@/src/components/projectsTestCases/ui/Select.tsx', () => ({ Select: ({ value, onChange, options, placeholder }: { value: string | number; onChange: (value: string | number) => void; options: Array<{ label: string; value: string | number }>; placeholder?: string }) => <select aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> }));
vi.mock('@/src/components/projectsTestCases/ui/MultiSelect.tsx', () => ({
  MultiSelect: ({ label, onChange }: { label: string; onChange: (values: string[]) => void }) => label === 'Project' ? <><button onClick={() => onChange(['p1'])}>Choose P1</button><button onClick={() => onChange(['p2'])}>Choose P2</button></> : null,
}));
vi.mock('@/src/api/projects.service.ts', () => {
  const projects = [
    { id: 'p1', name: 'Project one', key: 'ONE', status: 'Active' },
    { id: 'p2', name: 'Project two', key: 'TWO', status: 'Active' },
  ];
  const testCase = (projectId: string) => ({ id: `tc-${projectId}`, tcNumber: 1, title: `Case ${projectId}`, projectId, section: 'General', priority: 'Medium', status: 'Draft', automationType: 'Manual', automationReadiness: 'Candidate', steps: [], tags: [] });
  return { ProjectsService: {
    list: serviceMocks.listProjects,
    listSections: vi.fn().mockResolvedValue({ data: [{ id: 's1', projectId: 'p1', name: 'General' }, { id: 's2', projectId: 'p1', name: 'Release' }] }),
    listTestCasesInFolder: serviceMocks.listTestCasesInFolder,
    bulkMoveTestCases: serviceMocks.bulkMoveTestCases,
    bulkUpdateTestCases: serviceMocks.bulkUpdateTestCases,
    updateTestCase: serviceMocks.updateTestCase,
    listTestCases: vi.fn((projectId: string) => Promise.resolve({ data: [testCase(projectId)] })),
    importTestCases: serviceMocks.importTestCases,
    createTestCaseFolder: serviceMocks.createTestCaseFolder,
    invalidateList: vi.fn(),
    listTestCaseFolders: vi.fn((projectId: string) => Promise.resolve({ data: { folders: projectId === 'p1' ? [{ id: 'f1', name: 'Folder one', parentId: null }] : [] } })),
  } };
});

const rowCheckbox = (container: HTMLElement) => container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1];
const LocationProbe = () => {
  const location = useLocation();
  return <p>Location: {location.pathname}{location.search}</p>;
};

describe('Test Cases selection lifetime', () => {
  beforeEach(() => {
    serviceMocks.listTestCasesInFolder.mockClear();
    serviceMocks.bulkMoveTestCases.mockClear();
    serviceMocks.updateTestCase.mockClear();
    serviceMocks.failUpdate = false;
    serviceMocks.movedTestCase = false;
    serviceMocks.multiTestCases = false;
    serviceMocks.bulkUpdateTestCases.mockClear();
    serviceMocks.listProjects.mockReset().mockResolvedValue({ data: [
      { id: 'p1', name: 'Project one', key: 'ONE', status: 'Active' },
      { id: 'p2', name: 'Project two', key: 'TWO', status: 'Active' },
    ] });
  });
  afterEach(cleanup);
  it('clears selection explicitly, after navigation, and after active-project changes', async () => {
    const { container } = render(<MemoryRouter><App /><LocationProbe /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await waitFor(() => expect(rowCheckbox(container)).toBeDefined());

    fireEvent.click(rowCheckbox(container));
    await screen.findByRole('button', { name: 'Unselect All' });
    fireEvent.click(screen.getByRole('button', { name: 'Unselect All' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Unselect All' })).toBeNull());

    fireEvent.click(rowCheckbox(container));
    fireEvent.click(screen.getByRole('button', { name: 'Test Runs' }));
    await screen.findByText('Other page');
    fireEvent.click(screen.getByRole('button', { name: 'Test Cases' }));
    await waitFor(() => expect(rowCheckbox(container).checked).toBe(false));

    fireEvent.click(rowCheckbox(container));
    await screen.findByRole('button', { name: 'Unselect All' });
    fireEvent.click(screen.getByRole('button', { name: 'Choose P2' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Unselect All' })).toBeNull());
    await waitFor(() => expect(rowCheckbox(container).checked).toBe(false));
  });

  it('resets every bulk field and closes pending confirmation without changing table filters', async () => {
    const { container } = render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await waitFor(() => expect(rowCheckbox(container)).toBeDefined());
    fireEvent.change(screen.getByPlaceholderText('Search cases...'), { target: { value: 'Case' } });
    fireEvent.click(rowCheckbox(container));
    await screen.findByRole('button', { name: 'Unselect All' });

    fireEvent.change(screen.getByLabelText('Set Status'), { target: { value: 'Review' } });
    fireEvent.change(screen.getByLabelText('Set Priority'), { target: { value: 'High' } });
    fireEvent.change(screen.getByLabelText('Set Section'), { target: { value: 's2' } });
    fireEvent.change(screen.getByLabelText('Set Testing Type'), { target: { value: 'API' } });
    fireEvent.change(screen.getByLabelText('Set Automation Readiness'), { target: { value: 'Ready' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Unselect All' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Unselect All' })).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect((screen.getByPlaceholderText('Search cases...') as HTMLInputElement).value).toBe('Case');
    });

    fireEvent.click(rowCheckbox(container));
    await screen.findByRole('button', { name: 'Unselect All' });
    expect((screen.getByLabelText('Set Status') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Set Priority') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Set Section') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Set Testing Type') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Set Automation Readiness') as HTMLSelectElement).value).toBe('');
  });

  it('resets bulk values when individual unselection reaches zero and keeps new selection clean', async () => {
    serviceMocks.multiTestCases = true;
    const { container } = render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await waitFor(() => expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(3));
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    fireEvent.change(screen.getByLabelText('Set Priority'), { target: { value: 'High' } });
    fireEvent.click(checkboxes[2]);
    fireEvent.click(checkboxes[1]);

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Unselect All' })).toBeNull());
    fireEvent.click(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1]);
    await screen.findByRole('button', { name: 'Unselect All' });
    expect((screen.getByLabelText('Set Priority') as HTMLSelectElement).value).toBe('');
  });

  it('creates a folder through the app modal and refreshes the folder catalog', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    await user.click(screen.getByRole('button', { name: 'Open P1' }));
    await screen.findByRole('button', { name: 'Create folder' });

    await user.click(screen.getByRole('button', { name: 'Create folder' }));
    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Create Folder' }).hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByLabelText('Folder name'), ' Release ');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(serviceMocks.createTestCaseFolder).toHaveBeenCalledWith('p1', { name: 'Release', parentId: undefined }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('refreshes the scoped table and clears bulk state after a successful move', async () => {
    const { container } = render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Choose folder' }));
    await screen.findByText('Folder scope: f1');

    fireEvent.click(rowCheckbox(container));
    await screen.findByRole('button', { name: 'Unselect All' });
    fireEvent.change(screen.getByLabelText('Move to…'), { target: { value: '__unfiled__' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm update' }));

    await waitFor(() => expect(serviceMocks.bulkMoveTestCases).toHaveBeenCalledWith('p1', {
      testCaseIds: ['tc-p1-1'],
      destinationFolderId: null,
    }));
    await waitFor(() => expect(serviceMocks.listTestCasesInFolder).toHaveBeenLastCalledWith('p1', { folderId: 'f1', includeSubfolders: false }));
    expect(screen.queryByRole('button', { name: 'Unselect All' })).toBeNull();
    expect(screen.queryByText('Case p1')).toBeNull();
  });

  it('updates all extended fields through the single-test-case endpoint', async () => {
    const { container } = render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await waitFor(() => expect(rowCheckbox(container)).toBeDefined());
    fireEvent.click(rowCheckbox(container));
    await screen.findByRole('button', { name: 'Unselect All' });

    fireEvent.change(screen.getByLabelText('Set Section'), { target: { value: 's2' } });
    fireEvent.change(screen.getByLabelText('Set Testing Type'), { target: { value: 'API' } });
    fireEvent.change(screen.getByLabelText('Set Automation Readiness'), { target: { value: 'Ready' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm update' }));

    await waitFor(() => expect(serviceMocks.updateTestCase).toHaveBeenCalledWith('p1', 'tc-p1-1', expect.objectContaining({
      sectionId: 's2',
      automationType: 'API',
      automationReadiness: 'Ready',
    })));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Unselect All' })).toBeNull());
  });

  it('uses one dedicated API mutation for multiple selected test cases', async () => {
    serviceMocks.multiTestCases = true;
    const { container } = render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await waitFor(() => expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(3));
    fireEvent.click(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1]);
    fireEvent.click(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[2]);
    await screen.findByRole('button', { name: 'Unselect All' });
    fireEvent.change(screen.getByLabelText('Set Priority'), { target: { value: 'High' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm update' }));

    await waitFor(() => expect(serviceMocks.bulkUpdateTestCases).toHaveBeenCalledTimes(1));
    expect(serviceMocks.bulkUpdateTestCases).toHaveBeenCalledWith('p1', {
      testCaseIds: ['tc-p1-1', 'tc-p1-2'], updates: { priority: 'High' },
    });
    expect(serviceMocks.updateTestCase).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Unselect All' })).toBeNull());
    fireEvent.click(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1]);
    await screen.findByRole('button', { name: 'Unselect All' });
    expect((screen.getByLabelText('Set Priority') as HTMLSelectElement).value).toBe('');
  });

  it('shows display labels in bulk update confirmation and never renders the section ID', async () => {
    serviceMocks.multiTestCases = true;
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await waitFor(() => expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(3));
    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    fireEvent.change(screen.getByLabelText('Set Section'), { target: { value: 's2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    const confirmation = await screen.findByRole('dialog');
    expect(confirmation.textContent).toContain('Update 2 selected test cases?');
    expect(confirmation.textContent).toContain('Section will be changed to "Release".');
    expect(confirmation.textContent).not.toContain('s2');
  });

  it('keeps failed selections and refreshes authoritative data after a bulk update failure', async () => {
    serviceMocks.failUpdate = true;
    serviceMocks.updateTestCase.mockImplementation(async (projectId: string, id: string, payload: object) => {
      if (serviceMocks.failUpdate) throw new Error('Permission denied');
      return { data: { id, projectId, tcNumber: 1, title: `Case ${projectId}`, section: 'Release', sectionId: 's2', ...payload } };
    });
    const { container } = render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await waitFor(() => expect(rowCheckbox(container)).toBeDefined());
    fireEvent.click(rowCheckbox(container));
    await screen.findByRole('button', { name: 'Unselect All' });
    fireEvent.change(screen.getByLabelText('Set Testing Type'), { target: { value: 'API' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm update' }));

    await screen.findByText(/failed: Permission denied/i);
    expect(screen.getByRole('button', { name: 'Unselect All' })).toBeTruthy();
  });

  it('clears a selected folder before fetching a newly selected project and when leaving the page', async () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await screen.findByText('Folder scope: all');
    fireEvent.click(screen.getByRole('button', { name: 'Choose folder' }));
    await screen.findByText('Folder scope: f1');
    await waitFor(() => expect(serviceMocks.listTestCasesInFolder).toHaveBeenLastCalledWith('p1', { folderId: 'f1', includeSubfolders: false }));

    fireEvent.click(screen.getByRole('button', { name: 'Choose P2' }));
    await screen.findByText('Folder scope: all');
    await waitFor(() => expect(serviceMocks.listTestCasesInFolder).toHaveBeenLastCalledWith('p2', { includeSubfolders: false }));

    fireEvent.click(screen.getByRole('button', { name: 'Test Runs' }));
    await screen.findByText('Other page');
    fireEvent.click(screen.getByRole('button', { name: 'Test Cases' }));
    await screen.findByText('Folder scope: all');
  });

  it('drops an invalid deep-linked folder and fetches All test cases', async () => {
    render(<MemoryRouter initialEntries={['/workspace?projectId=p1&folderId=missing']}><App /><LocationProbe /></MemoryRouter>);
    await screen.findByText('Folder scope: all');
    await waitFor(() => expect(serviceMocks.listTestCasesInFolder).toHaveBeenLastCalledWith('p1', { includeSubfolders: false }));
    await screen.findByText('Location: /workspace?projectId=p1');
  });

  it('opens Test Cases when selecting a folder from Settings and records the deep-link scope', async () => {
    render(<MemoryRouter><App /><LocationProbe /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await screen.findByText('Folder scope: all');

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose folder' }));

    await screen.findByRole('heading', { name: 'Test Cases' });
    await screen.findByText('Folder scope: f1');
    await waitFor(() => expect(screen.getByText('Location: /?projectId=p1&view=test-cases&folderId=f1')).toBeTruthy());
    await waitFor(() => expect(serviceMocks.listTestCasesInFolder).toHaveBeenLastCalledWith('p1', { folderId: 'f1', includeSubfolders: false }));
  });

  it.each(['User Flows', 'Reports'])('opens Test Cases when selecting a folder from %s', async (sourceView) => {
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open P1' }));
    await screen.findByText('Folder scope: all');

    fireEvent.click(screen.getByRole('button', { name: sourceView }));
    fireEvent.click(await screen.findByRole('button', { name: 'Choose folder' }));

    await screen.findByRole('heading', { name: 'Test Cases' });
    await screen.findByText('Folder scope: f1');
    await waitFor(() => expect(serviceMocks.listTestCasesInFolder).toHaveBeenLastCalledWith('p1', { folderId: 'f1', includeSubfolders: false }));
  });

  it('preserves the selected User Flows project across workspace navigation, opens it from a project card, and clears an unavailable project', async () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open User Flows P1' });

    fireEvent.click(screen.getByRole('button', { name: 'Open User Flows P1' }));
    await screen.findByText('User Flow project: p1');

    fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
    await screen.findByText('Other page');
    fireEvent.click(screen.getByRole('button', { name: 'User Flows' }));
    await screen.findByText('User Flow project: p1');

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Open User Flows P2' }));
    await screen.findByText('User Flow project: p2');

    fireEvent.click(screen.getByRole('button', { name: 'Choose unavailable User Flow project' }));
    await screen.findByText('User Flow project: none');
  });

  it('does not clear the User Flows project after a later project refresh fails', async () => {
    serviceMocks.listProjects
      .mockResolvedValueOnce({ data: [
        { id: 'p1', name: 'Project one', key: 'ONE', status: 'Active' },
        { id: 'p2', name: 'Project two', key: 'TWO', status: 'Active' },
      ] })
      .mockRejectedValueOnce(new Error('Refresh failed'));
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Open User Flows P1' });
    fireEvent.click(screen.getByRole('button', { name: 'Open User Flows P1' }));
    await screen.findByText('User Flow project: p1');

    fireEvent.click(screen.getByRole('button', { name: 'Test Cases' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Import JSON' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Run import' }));
    await waitFor(() => expect(serviceMocks.listProjects).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: 'User Flows' }));
    await screen.findByText('User Flow project: p1');
  });
});
