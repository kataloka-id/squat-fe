import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Trash2, 
  Briefcase,
  Search,
  LayoutList,
  LoaderCircle,
} from 'lucide-react';
import { normalizeAutomationReadiness, TestCase, SortField, SortOrder, Project, Priority, Status, AutomationType, AutomationReadiness } from '../projectsTestCases/types.ts';
import { Badge } from './ui/Badge';
import { formatTestCaseDisplayId } from '@/src/utils/testCaseDisplayId.ts';
import { markdownToPlainText } from '@/src/utils/markdown.ts';
import { Button } from './ui/Button';
import { Select } from './ui/Select';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

interface TestCaseListProps {
  testCases: TestCase[];
  projects: Project[];
  selectedIds: string[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onView?: (tc: TestCase) => void;
  onEdit: (tc: TestCase) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TestCase>) => void;
  pagination?: PaginationProps;
  loading?: boolean;
  hasProjectSelected?: boolean;
  canManage?: boolean;
}

// Inline dropdown for editing badge-backed enum values.
const InlineBadgeSelect = ({ 
  type, 
  value, 
  options, 
  onChange,
  label,
}: { 
  type: 'priority' | 'status' | 'automation' | 'automationReadiness', 
  value: string, 
  options: string[], 
  onChange: (val: string) => void | Promise<void>,
  label: string,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    setAlignRight(menuRef.current.getBoundingClientRect().right > window.innerWidth - 8);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        aria-label={`Change ${label}`}
        aria-expanded={isOpen}
        disabled={isSaving}
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md ring-offset-1 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-wait"
      >
        {isSaving ? <LoaderCircle aria-label={`Saving ${label}`} className="h-4 w-4 animate-spin text-slate-500" /> : <Badge type={type} value={value} className="cursor-pointer" />}
      </button>
      {isOpen && (
        <div ref={menuRef} role="listbox" aria-label={`${label} options`} className={`absolute top-full ${alignRight ? 'right-0' : 'left-0'} mt-1 z-50 w-max min-w-full max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden`}>
          <div className="py-1">
            {options.map((opt) => (
              <button
                type="button"
                role="option"
                aria-selected={value === opt}
                key={opt}
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  setIsOpen(false);
                  try {
                    await onChange(opt);
                  } catch {
                    // The update owner reports the error and leaves the previous table value intact.
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="flex w-full shrink-0 cursor-pointer items-center px-3 py-1.5 text-left whitespace-nowrap hover:bg-slate-50 disabled:cursor-wait"
              >
                <Badge type={type} value={opt} className="pointer-events-none" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="h-4 w-4 bg-slate-100 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-100 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-5 w-12 bg-slate-100 rounded"></div></td>
    <td className="px-6 py-4">
      <div className="h-4 w-3/4 bg-slate-100 rounded mb-2"></div>
      <div className="h-3 w-1/2 bg-slate-50 rounded"></div>
    </td>
    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded"></div></td>
    <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-100 rounded-md"></div></td>
    <td className="px-6 py-4"><div className="h-6 w-24 bg-slate-100 rounded-md"></div></td>
    <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-100 rounded-md"></div></td>
    <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-100 rounded-md"></div></td>
    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded"></div></td>
    <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-slate-100 rounded ml-auto"></div></td>
  </tr>
);

export const TestCaseList: React.FC<TestCaseListProps> = ({
  testCases,
  projects,
  selectedIds,
  sortField,
  sortOrder,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEdit,
  onDelete,
  onUpdate,
  pagination,
  loading = false,
  hasProjectSelected = false,
  canManage = true,
}) => {
  // Check if all items on the current page are selected
  const allSelected = testCases.length > 0 && testCases.every(tc => selectedIds.includes(tc.id));
  const someSelected = testCases.some(tc => selectedIds.includes(tc.id));
  const indeterminate = someSelected && !allSelected;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null; // Cleaner look: don't show inactive sort icons
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 text-brand-600" /> 
      : <ChevronDown className="w-3.5 h-3.5 text-brand-600" />;
  };

  const TableHead = ({ field, label, className = '', sortable = true }: { field: SortField, label: string, className?: string, sortable?: boolean }) => (
    <th 
      className={`px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${sortable ? 'cursor-pointer group hover:text-slate-700' : ''} transition-colors select-none align-top bg-slate-50 ${className}`}
      onClick={() => sortable && onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortable && <SortIcon field={field} />}
      </div>
    </th>
  );

  // Helper to find project details
  const getProject = (projectId: string) => projects.find(p => p.id === projectId);

  // State: No Project Selected
  if (!hasProjectSelected) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-soft h-[500px] flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 border border-brand-100 shadow-sm">
          <Briefcase className="w-10 h-10 text-brand-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Project</h3>
        <p className="text-slate-500 max-w-sm mb-8">
          Please select a project from the filter bar above to load and manage its test cases.
        </p>
        <div className="flex gap-2 text-sm text-slate-400 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
           <LayoutList className="w-4 h-4" />
           <span>Use the "Project" dropdown</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-soft flex flex-col h-full min-h-[500px] relative overflow-visible">
      <div className="overflow-x-auto overflow-y-visible flex-1">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
            <tr>
              {canManage && <th className="px-6 py-4 text-left w-12 align-top bg-slate-50">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer transition-all accent-brand-600 bg-white"
                  checked={allSelected}
                  ref={input => { if (input) input.indeterminate = indeterminate; }}
                  onChange={onToggleSelectAll}
                  disabled={loading || testCases.length === 0}
                />
              </th>}
              <TableHead field="id" label="TC Number" className="w-24" />
              <TableHead field="projectId" label="Project" className="w-24 hidden sm:table-cell" sortable={false} />
              <TableHead field="title" label="Title" />
              <TableHead field="section" label="Section" className="hidden md:table-cell" />
              <TableHead field="priority" label="Priority" />
              <TableHead field="status" label="Status" />
              <TableHead field="automationType" label="Testing Type" />
              <TableHead field="automationReadiness" label="Automation Readiness" />
              <TableHead field="updatedAt" label="Updated" className="hidden lg:table-cell" />
              {canManage && <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider align-top bg-slate-50"></th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {loading ? (
              // Loading Skeletons
              Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
            ) : testCases.length === 0 ? (
              // Empty State (No results after filter)
              <tr>
                <td colSpan={11} className="px-6 py-20 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                      <Search className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-lg font-medium text-slate-900">No test cases found</p>
                    <p className="text-sm mt-1 text-slate-500 max-w-xs mx-auto">
                      We couldn't find any test cases matching your current filters for this project.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              testCases.map((tc) => {
                const isSelected = selectedIds.includes(tc.id);
                const project = getProject(tc.projectId);
                const projectKey = project ? project.key : '???';
                const projectName = project ? project.name : 'Unknown Project';
                
                return (
                  <tr 
                    key={tc.id} 
                    className={`group transition-all duration-150 ease-in-out ${isSelected ? 'bg-brand-50/30' : 'hover:bg-slate-50'}`}
                  >
                    {canManage && <td className="px-6 py-4 whitespace-nowrap align-middle">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer transition-all accent-brand-600 bg-white"
                        checked={isSelected}
                        onChange={() => onToggleSelect(tc.id)}
                      />
                    </td>}
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                      <span 
                        className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-brand-100 hover:text-brand-700 transition-colors border border-slate-200"
                        onClick={() => onView?.(tc)}
                      >
                        {formatTestCaseDisplayId(tc, project?.key)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell align-middle">
                      <div className="flex items-center gap-1.5" title={projectName}>
                         <span className="font-mono text-[10px] font-bold text-white bg-slate-900 px-2 py-1 rounded shadow-sm tracking-tight cursor-default">
                            {projectKey}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <button className="line-clamp-1 text-left text-sm font-medium text-slate-900 transition-colors hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20" onClick={() => onView?.(tc)} type="button">{markdownToPlainText(tc.title)}</button>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1 md:hidden">{tc.section}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell align-middle">
                      {tc.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                      {canManage ? <InlineBadgeSelect type="priority" label="Priority" value={tc.priority} options={Object.values(Priority)} onChange={(val) => onUpdate(tc.id, { priority: val as Priority })} /> : <Badge type="priority" value={tc.priority} />}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                       {canManage ? <InlineBadgeSelect type="status" label="Status" value={tc.status} options={Object.values(Status)} onChange={(val) => onUpdate(tc.id, { status: val as Status })} /> : <Badge type="status" value={tc.status} />}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                       {canManage ? <InlineBadgeSelect type="automation" label="Testing Type" value={tc.automationType} options={Object.values(AutomationType)} onChange={(val) => onUpdate(tc.id, { automationType: val as AutomationType })} /> : <Badge type="automation" value={tc.automationType} />}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                       {canManage ? <InlineBadgeSelect type="automationReadiness" label="Automation Readiness" value={normalizeAutomationReadiness(tc.automationReadiness)} options={Object.values(AutomationReadiness)} onChange={(val) => onUpdate(tc.id, { automationReadiness: val as AutomationReadiness })} /> : <Badge type="automationReadiness" value={normalizeAutomationReadiness(tc.automationReadiness)} />}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono hidden lg:table-cell align-middle">
                      {new Date(tc.updatedAt).toLocaleDateString()}
                    </td>
                    {canManage && <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-middle">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEdit(tc)}
                          className="text-slate-400 hover:text-brand-600 p-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(tc.id)}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {(hasProjectSelected && !loading && pagination) && (
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap items-center gap-4">
            {/* Rows Per Page Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Rows:</span>
              <Select
                value={pagination.itemsPerPage}
                onChange={(val) => pagination.onItemsPerPageChange(Number(val))}
                options={[
                  { label: '20', value: 20 },
                  { label: 'All', value: -1 }
                ]}
                className="w-24 shrink-0"
              />
            </div>
            {/* Showing Count */}
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">
                {pagination.totalItems === 0 ? 0 : (pagination.itemsPerPage === -1 ? 1 : (pagination.currentPage - 1) * pagination.itemsPerPage + 1)}
              </span> to <span className="font-medium text-slate-900">
                {pagination.itemsPerPage === -1 ? pagination.totalItems : Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
              </span> of <span className="font-medium text-slate-900">
                {pagination.totalItems}
              </span> results
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              Previous
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              disabled={pagination.currentPage === pagination.totalPages || pagination.totalItems === 0}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
