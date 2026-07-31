/** @vitest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TestCaseList } from './TestCaseList.tsx';

const PaginationHarness = () => {
  const [currentPage, setCurrentPage] = useState(2);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  return <><output data-testid="page-state">{`${currentPage}/${itemsPerPage}`}</output><TestCaseList testCases={[]} projects={[]} selectedIds={[]} sortField="id" sortOrder="asc" onSort={() => {}} onToggleSelect={() => {}} onToggleSelectAll={() => {}} onEdit={() => {}} onDelete={() => {}} onUpdate={() => {}} hasProjectSelected pagination={{ currentPage, totalPages: 3, totalItems: 42, itemsPerPage, onPageChange: setCurrentPage, onItemsPerPageChange: (value) => { setItemsPerPage(value); setCurrentPage(1); } }} /></>;
};

describe('TestCaseList rows-per-page selector', () => {
  it('opens the portal menu and resets the current page when selection changes', async () => {
    const user = userEvent.setup();
    render(<PaginationHarness />);
    await user.click(screen.getByRole('button', { name: '20' }));
    expect(screen.getByRole('listbox')).not.toBeNull();
    await user.click(screen.getByRole('option', { name: 'All' }));
    expect(screen.getByTestId('page-state').textContent).toBe('1/-1');
  });

  it('reflects unchecked, indeterminate, and checked selection for the active page', () => {
    const testCases = [
      { id: 'tc-1', tcNumber: 1, title: 'First', projectId: 'project-1', section: 'General', priority: 'Medium', status: 'Draft', automationType: 'Manual', automationReadiness: 'Candidate', updatedAt: new Date(), createdBy: 'QA', steps: [], tags: [] },
      { id: 'tc-2', tcNumber: 2, title: 'Second', projectId: 'project-1', section: 'General', priority: 'Medium', status: 'Draft', automationType: 'Manual', automationReadiness: 'Candidate', updatedAt: new Date(), createdBy: 'QA', steps: [], tags: [] },
    ] as any[];
    const SelectionHarness = () => {
      const [selectedIds, setSelectedIds] = useState<string[]>([]);
      return <TestCaseList testCases={testCases} projects={[{ id: 'project-1', name: 'Project', key: 'PROJ' } as any]} selectedIds={selectedIds} sortField="id" sortOrder="asc" onSort={() => {}} onToggleSelect={(id) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])} onToggleSelectAll={() => setSelectedIds((ids) => ids.length === testCases.length ? [] : testCases.map((testCase) => testCase.id))} onEdit={() => {}} onDelete={() => {}} onUpdate={() => {}} hasProjectSelected />;
    };

    const { container } = render(<SelectionHarness />);
    const checkboxes = () => Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(checkboxes()[0].checked).toBe(false);
    expect(checkboxes()[0].indeterminate).toBe(false);
    fireEvent.click(checkboxes()[1]);
    expect(checkboxes()[0].indeterminate).toBe(true);
    fireEvent.click(checkboxes()[0]);
    expect(checkboxes()[0].checked).toBe(true);
    expect(checkboxes()[0].indeterminate).toBe(false);
    fireEvent.click(checkboxes()[0]);
    expect(checkboxes()[0].checked).toBe(false);
  });
});
