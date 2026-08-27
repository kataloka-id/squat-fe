/* eslint-disable no-unused-vars, react-refresh/only-export-components -- callback types and selection helper are intentionally colocated with the tree. */
import { useEffect, useMemo, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown, Folder, FolderOpen } from 'lucide-react';
import type { ProjectTestCaseRecord, TestCaseFolderRecord } from '@/src/types/api.ts';
import { formatTestCaseDisplayId } from '@/src/utils/testCaseDisplayId.ts';

type Props = {
  cases: ProjectTestCaseRecord[];
  visibleCases: ProjectTestCaseRecord[];
  folders: TestCaseFolderRecord[];
  selected: string[];
  selectable: (testCase: ProjectTestCaseRecord) => boolean;
  onToggleCase: (id: string) => void;
  onToggleFolder: (folderId: string, caseIds: string[]) => void;
};

const ROOT = '__root__';

const caseBelongsToFolder = (testCase: ProjectTestCaseRecord, folderIds: Set<string>) =>
  Boolean(
    testCase.folderPath?.some((folder) => folderIds.has(folder.id)) ||
      (testCase.folderId && folderIds.has(testCase.folderId)),
  );

const IndeterminateCheckbox = ({
  checked,
  indeterminate,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { indeterminate?: boolean }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return <input {...props} ref={ref} checked={checked} type="checkbox" />;
};

export const TestRunCaseTree = ({
  cases,
  visibleCases,
  folders,
  selected,
  selectable,
  onToggleCase,
  onToggleFolder,
}: Props) => {
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const children = useMemo(
    () =>
      folders.reduce<Record<string, TestCaseFolderRecord[]>>((result, folder) => {
        (result[folder.parentId || ROOT] ??= []).push(folder);
        return result;
      }, {}),
    [folders],
  );
  const subtreeIds = useMemo(() => {
    const result = new Map<string, Set<string>>();
    const collect = (id: string): Set<string> => {
      const found = result.get(id);
      if (found) return found;
      const ids = new Set([id]);
      (children[id] || []).forEach((child) => collect(child.id).forEach((childId) => ids.add(childId)));
      result.set(id, ids);
      return ids;
    };
    folders.forEach((folder) => collect(folder.id));
    return result;
  }, [children, folders]);
  const casesByFolder = useMemo(() => {
    const result = new Map<string, ProjectTestCaseRecord[]>();
    folders.forEach((folder) => {
      const ids = subtreeIds.get(folder.id) || new Set([folder.id]);
      result.set(folder.id, cases.filter((testCase) => caseBelongsToFolder(testCase, ids)));
    });
    return result;
  }, [cases, folders, subtreeIds]);
  const renderCase = (testCase: ProjectTestCaseRecord): ReactNode => {
    const checked = selectedIds.has(testCase.id);
    const disabled = !selectable(testCase);
    return (
      <label
        key={testCase.id}
        className={`flex gap-3 border-b p-3 text-sm last:border-b-0 ${disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : 'cursor-pointer hover:bg-slate-50'}`}
      >
        <input
          type="checkbox"
          disabled={disabled}
          checked={checked}
          onChange={() => onToggleCase(testCase.id)}
        />
        <span className="min-w-0 break-words">
          <strong>{formatTestCaseDisplayId(testCase)} · {testCase.title}</strong>
          <small className="mt-1 block text-slate-500">
            {testCase.folderPath?.map((folder) => folder.name).join(' / ') || 'Uncategorized'} · {testCase.section} · {testCase.priority} · {testCase.status}
          </small>
        </span>
      </label>
    );
  };
  const renderFolder = (folder: TestCaseFolderRecord, depth: number): ReactNode => {
    const nested = children[folder.id] || [];
    const folderCases = casesByFolder.get(folder.id) || [];
    const selectedCount = folderCases.filter((testCase) => selectedIds.has(testCase.id)).length;
    const selectableCases = folderCases.filter(selectable);
    const allSelected = folderCases.length > 0 && selectedCount === folderCases.length;
    const partial = selectedCount > 0 && !allSelected;
    return (
      <details key={folder.id} open className="border-b last:border-b-0" style={{ marginLeft: `${Math.min(depth, 4) * 14}px` }}>
        <summary className="flex cursor-pointer list-none items-center gap-2 p-2 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">{nested.length ? <ChevronDown size={14} /> : <span className="inline-block w-3.5" />}</span>
          <IndeterminateCheckbox
            aria-label={`Select folder ${folder.name}`}
            checked={allSelected}
            indeterminate={partial}
            disabled={!selectableCases.length}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onToggleFolder(folder.id, folderCases.map((testCase) => testCase.id))}
          />
          {nested.length ? <FolderOpen size={16} className="shrink-0 text-brand-600" /> : <Folder size={16} className="shrink-0 text-brand-600" />}
          <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{folder.name}</span>
          <span className="shrink-0 text-xs text-slate-500">{selectedCount} / {folderCases.length} selected</span>
        </summary>
        <div className="pb-1">
          {visibleCases.filter((testCase) => testCase.folderId === folder.id).map(renderCase)}
          {nested.map((child) => renderFolder(child, depth + 1))}
        </div>
      </details>
    );
  };
  const knownFolderIds = new Set(folders.map((folder) => folder.id));
  const uncategorized = visibleCases.filter((testCase) => !testCase.folderId || !knownFolderIds.has(testCase.folderId));
  const rootFolders = children[ROOT] || [];
  return (
    <div className="overflow-hidden rounded-lg border" role="tree" aria-label="Test case folders and test cases">
      {rootFolders.map((folder) => renderFolder(folder, 0))}
      {uncategorized.map(renderCase)}
      {!rootFolders.length && !uncategorized.length && <p className="p-4 text-sm text-slate-500">No test cases match your search or filters.</p>}
    </div>
  );
};

export const getFolderSelectionIds = (cases: ProjectTestCaseRecord[], folders: TestCaseFolderRecord[], folderId: string) => {
  const descendants = new Set<string>([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    folders.forEach((folder) => {
      if (folder.parentId && descendants.has(folder.parentId) && !descendants.has(folder.id)) {
        descendants.add(folder.id);
        changed = true;
      }
    });
  }
  return cases.filter((testCase) => caseBelongsToFolder(testCase, descendants)).map((testCase) => testCase.id);
};
