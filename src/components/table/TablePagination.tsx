import type { ReactNode } from 'react';

import { Button } from '../projectsTestCases/ui/Button';
import { Select } from '../projectsTestCases/ui/Select';

type TablePaginationProps = {
  'aria-label': string;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onPageChange: (page: number) => void;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onItemsPerPageChange: (itemsPerPage: number) => void;
  leadingContent?: ReactNode;
};

export const TablePagination = ({
  'aria-label': ariaLabel,
  currentPage,
  itemsPerPage,
  totalItems,
  totalPages,
  onPageChange,
  onItemsPerPageChange,
  leadingContent,
}: TablePaginationProps) => {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastItem = itemsPerPage === -1 ? totalItems : Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <nav aria-label={ariaLabel} className="flex shrink-0 flex-col items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Rows:</span>
          <Select aria-label="Rows per page" value={itemsPerPage} onChange={(value) => onItemsPerPageChange(Number(value))} options={[{ label: '20', value: 20 }, { label: 'All', value: -1 }]} className="w-24 shrink-0" />
        </div>
        {leadingContent}
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-900">{firstItem}</span> to{' '}
          <span className="font-medium text-slate-900">{lastItem}</span> of{' '}
          <span className="font-medium text-slate-900">{totalItems}</span> results
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Previous</Button>
        <span>{currentPage} / {totalPages}</span>
        <Button size="sm" variant="secondary" disabled={currentPage === totalPages || totalItems === 0} onClick={() => onPageChange(currentPage + 1)}>Next</Button>
      </div>
    </nav>
  );
};
