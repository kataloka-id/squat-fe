/** @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar.tsx';
import { TestCaseFolderTree } from '../TestCaseFolderTree.tsx';

vi.mock('@/src/auth/SessionContext.tsx', () => ({
  useSessionUser: () => ({ username: 'QA User', roleSlug: 'qa', company: { name: 'Kataloka' } }),
}));

describe('Sidebar test case navigation', () => {
  it('opens Test Cases and exposes an expandable submenu', () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <Sidebar currentView="projects" onNavigate={onNavigate} testCaseNavigation={<div>All test cases / Unfiled / Folders</div>} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Test Cases' }));
    expect(onNavigate).toHaveBeenCalledWith('test-cases');
    expect(screen.getByText('All test cases / Unfiled / Folders')).not.toBeNull();

    const toggle = screen.getByRole('button', { name: 'Collapse Test Cases submenu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.parentElement?.parentElement?.querySelector('div.mt-3.pb-5')?.className).toContain('overflow-x-hidden');
    fireEvent.click(toggle);
    expect(screen.queryByText('All test cases / Unfiled / Folders')).toBeNull();
    expect(container.querySelector('[class*="h-1.5"][class*="w-1.5"][class*="bg-white"]')).toBeNull();
  });

  it('does not lose controlled folder expansion when the sidebar collapses', () => {
    const FolderNavigation = () => {
      const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
      return <Sidebar currentView="test-cases" onNavigate={() => {}} testCaseNavigation={<TestCaseFolderTree folders={[{ id: 'root', projectId: 'p1', name: 'Login' }, { id: 'child', projectId: 'p1', name: 'MFA', parentId: 'root' }]} active={{ includeSubfolders: false }} expandedFolderIds={expanded} onExpandedFolderIdsChange={setExpanded} onSelect={() => {}} onCreate={() => {}} onRename={() => {}} onDelete={() => {}} />} />;
    };
    const { container } = render(<MemoryRouter><FolderNavigation /></MemoryRouter>);
    fireEvent.click(container.querySelector('[aria-label="Expand Login"]')!);
    expect(container.textContent).toContain('MFA');
    fireEvent.click(container.querySelector('[aria-label="Collapse sidebar"]')!);
    fireEvent.click(container.querySelector('[aria-label="Expand sidebar"]')!);
    expect(container.textContent).toContain('MFA');
  });

  it('navigates every primary menu with one click and keeps the folder tree mounted', () => {
    const onNavigate = vi.fn();
    const { container, rerender } = render(
      <MemoryRouter>
        <Sidebar currentView="test-cases" onNavigate={onNavigate} testCaseNavigation={<div>Expanded folder tree</div>} />
      </MemoryRouter>,
    );

    const primaryMenus = ['Projects', 'Test Cases', 'User Flows', 'Test Runs', 'Reports', 'Team', 'Settings'];
    for (const label of primaryMenus) {
      fireEvent.click(within(container).getByRole('button', { name: label }));
      expect(onNavigate).toHaveBeenLastCalledWith(label === 'Test Runs' ? 'runs' : label.toLowerCase().replace(' ', '-'));
    }

    rerender(
      <MemoryRouter>
        <Sidebar currentView="user-flows" onNavigate={onNavigate} testCaseNavigation={<div>Expanded folder tree</div>} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Expanded folder tree')).not.toBeNull();
  });
});
