/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './ProjectsTestCasesPage.tsx';

const serviceMocks = vi.hoisted(() => ({
  listTestCasesInFolder: vi.fn((projectId: string) => Promise.resolve({ data: [{ id: `tc-${projectId}`, tcNumber: 1, title: `Case ${projectId}`, projectId, section: 'General', priority: 'Medium', status: 'Draft', automationType: 'Manual', automationReadiness: 'Candidate', steps: [], tags: [] }] })),
}));

vi.mock('@/src/auth/SessionContext.tsx', () => ({
  useSessionUser: () => ({ username: 'QA User', roleSlug: 'qa', company: { name: 'Kataloka' } }),
}));
vi.mock('@/src/components/projectsTestCases/ProjectBoard.tsx', () => ({
  ProjectBoard: ({ onViewTestCases }: { onViewTestCases: (id: string) => void }) => <><button onClick={() => onViewTestCases('p1')}>Open P1</button><button onClick={() => onViewTestCases('p2')}>Open P2</button></>,
}));
vi.mock('@/src/components/projectsTestCases/TestCaseStats.tsx', () => ({ TestCaseStats: () => null }));
vi.mock('@/src/components/projectsTestCases/TestCaseForm.tsx', () => ({ TestCaseForm: () => null }));
vi.mock('@/src/components/projectsTestCases/TestCaseDetail.tsx', () => ({ TestCaseDetail: () => null }));
vi.mock('@/src/components/projectsTestCases/TestCaseImportDialog.tsx', () => ({ TestCaseImportDialog: () => null }));
vi.mock('@/src/components/projectsTestCases/TestCaseFolderTree.tsx', () => ({
  TestCaseFolderTree: ({ active, onSelect }: { active: { folderId?: string }; onSelect: (scope: { folderId?: string; includeSubfolders: boolean }) => void }) => <><p>Folder scope: {active.folderId ?? 'all'}</p><button onClick={() => onSelect({ folderId: 'f1', includeSubfolders: false })}>Choose folder</button></>,
}));
vi.mock('@/src/components/projectsTestCases/UnderDevelopment.tsx', () => ({ UnderDevelopment: () => <p>Other page</p> }));
vi.mock('@/src/components/projectsTestCases/ui/ConfirmationModal.tsx', () => ({ ConfirmationModal: () => null }));
vi.mock('@/src/components/projectsTestCases/ui/Toast.tsx', () => ({ Toast: () => null }));
vi.mock('@/src/components/settings/SettingsPage.tsx', () => ({ SettingsPage: () => null }));
vi.mock('@/src/components/team/TeamPage.tsx', () => ({ TeamPage: () => null }));
vi.mock('@/src/components/projectsTestCases/ui/Button.tsx', () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock('@/src/components/projectsTestCases/ui/Select.tsx', () => ({ Select: () => null }));
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
    list: vi.fn().mockResolvedValue({ data: projects }),
    listSections: vi.fn().mockResolvedValue({ data: [] }),
    listTestCasesInFolder: serviceMocks.listTestCasesInFolder,
    listTestCases: vi.fn((projectId: string) => Promise.resolve({ data: [testCase(projectId)] })),
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
  });
  afterEach(cleanup);
  it('clears selection explicitly, after navigation, and after active-project changes', async () => {
    const { container } = render(<MemoryRouter><App /></MemoryRouter>);
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
});
