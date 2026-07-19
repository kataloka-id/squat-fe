/** @vitest-environment jsdom */
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
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
});
