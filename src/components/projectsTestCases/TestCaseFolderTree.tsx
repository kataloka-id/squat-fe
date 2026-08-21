import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import type { TestCaseFolderRecord } from '@/src/types/api.ts';
import { RowActions } from './ui/RowActions.tsx';

export type FolderScope = { folderId?: string; unfiled?: boolean; includeSubfolders: boolean };

interface Props {
  folders: TestCaseFolderRecord[];
  active: FolderScope;
  disabled?: boolean;
  expandedFolderIds?: Set<string>;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onExpandedFolderIdsChange?: (expandedFolderIds: Set<string>) => void;
  loading?: boolean;
  error?: string | null;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onSelect: (scope: FolderScope) => void;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onCreate: (parentId?: string | null) => void;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onRename: (folder: TestCaseFolderRecord) => void;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onDelete: (folder: TestCaseFolderRecord) => void;
}

export const TestCaseFolderTree: React.FC<Props> = ({
  folders,
  active,
  disabled,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  expandedFolderIds,
  onExpandedFolderIdsChange,
  loading = false,
  error,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState<Set<string>>(() => new Set(folders.map((folder) => folder.id)));
  const open = expandedFolderIds ?? uncontrolledOpen;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  const setOpen = useCallback((update: (current: Set<string>) => Set<string>) => {
    const next = update(open);
    if (next === open) return;
    if (expandedFolderIds) onExpandedFolderIdsChange?.(next);
    else setUncontrolledOpen(next);
  }, [expandedFolderIds, onExpandedFolderIdsChange, open]);
  const children = useMemo(
    () =>
      folders.reduce<Record<string, TestCaseFolderRecord[]>>((map, folder) => {
        const key = folder.parentId ?? '__root__';
        (map[key] ??= []).push(folder);
        return map;
      }, {}),
    [folders],
  );
  const parentById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder.parentId])), [folders]);

  // A selected descendant must remain visible even after navigating away and back.
  useEffect(() => {
    if (!active.folderId) return;
    setOpen((current) => {
      const next = new Set(current);
      let changed = false;
      let parentId = parentById.get(active.folderId);
      while (parentId) {
        if (!next.has(parentId)) {
          next.add(parentId);
          changed = true;
        }
        parentId = parentById.get(parentId);
      }
      return changed ? next : current;
    });
  }, [active.folderId, parentById, setOpen]);

  const toggle = (folderId: string) => {
    setOpen((value) => {
      const next = new Set(value);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  };

  const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    if (!current || !event.currentTarget.contains(current)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]'));
    const index = items.indexOf(current);
    if (index < 0) return;
    const folderId = current.dataset.folderId;
    const nested = folderId ? children[folderId] ?? [] : [];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const target = event.key === 'ArrowDown' ? items[index + 1] : event.key === 'ArrowUp' ? items[index - 1] : event.key === 'Home' ? items[0] : items.at(-1);
      target?.focus();
    } else if (event.key === 'ArrowRight' && folderId && nested.length) {
      event.preventDefault();
      if (!open.has(folderId)) toggle(folderId); else items[index + 1]?.focus();
    } else if (event.key === 'ArrowLeft' && folderId) {
      event.preventDefault();
      if (open.has(folderId) && nested.length) toggle(folderId);
      else current.closest('[role="group"]')?.parentElement?.querySelector<HTMLElement>(':scope > [role="treeitem"]')?.focus();
    } else if (event.target === current && folderId && event.key === 'Enter') {
      event.preventDefault();
      onSelect({ folderId, includeSubfolders: false });
    } else if (event.target === current && folderId && event.key === ' ') {
      event.preventDefault();
      if (nested.length) toggle(folderId);
    }
  };
  const node = (folder: TestCaseFolderRecord, depth: number): React.ReactNode => {
    const nested = children[folder.id] ?? [];
    const expanded = open.has(folder.id);
    const selected = active.folderId === folder.id;
    return (
      <React.Fragment key={folder.id}>
        <div
          role="treeitem"
          aria-level={depth + 1}
          aria-selected={selected}
          aria-expanded={nested.length ? expanded : undefined}
          data-folder-id={folder.id}
          tabIndex={selected || (!active.folderId && depth === 0 && folder === children.__root__?.[0]) ? 0 : -1}
          className={`group relative flex min-w-0 items-center rounded-md pr-1 text-sm transition-[padding] duration-200 ease-out focus-within:ring-2 focus-within:ring-brand-500 focus-within:pr-[116px] focus:pr-[116px] hover:pr-[116px] ${selected ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          style={{ paddingLeft: `${8 + Math.min(depth, 4) * 16}px` }}
        >
          <button
            type="button"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${folder.name}`}
            onClick={(event) => {
              // Keep expansion independent from folder selection and any row-level handlers.
              event.stopPropagation();
              toggle(folder.id);
            }}
            className="shrink-0 p-1 text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {nested.length ? (
              expanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )
            ) : (
              <span className="inline-block w-3.5" />
            )}
          </button>
          <button
            type="button"
            aria-label={folder.name}
            onClick={() => onSelect({ folderId: folder.id, includeSubfolders: false })}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
            title={folder.name}
          >
            {expanded ? <FolderOpen size={15} className="shrink-0" /> : <Folder size={15} className="shrink-0" />}
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 truncate" title={folder.name}>{folder.name}</span>
              <span className="shrink-0 text-xs text-slate-400" aria-label={`${folder.totalTestCaseCount ?? 0} test cases`}>
                {folder.totalTestCaseCount ?? ''}
              </span>
            </span>
          </button>
          {!disabled && (
            <RowActions aria-label={`Folder actions for ${folder.name}`} actions={[
              { label: 'New subfolder', icon: <FolderPlus className="h-4 w-4" />, onClick: () => onCreate(folder.id) },
              { label: 'Rename', icon: <Pencil className="h-4 w-4" />, onClick: () => onRename(folder) },
              { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => onDelete(folder), tone: 'danger' },
            ]} overlay />
          )}
        </div>
        {expanded && nested.length > 0 && <div role="group" className="relative before:absolute before:bottom-1 before:left-4 before:top-0 before:border-l before:border-slate-700/80">{nested.map((child) => node(child, depth + 1))}</div>}
      </React.Fragment>
    );
  };
  return (
    <section aria-label="Test case folders" className="min-w-0 pb-4 px-1 text-slate-300">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Folders</h2>
        {!disabled && (
          <button
            type="button"
            aria-label="Create root folder"
            onClick={() => onCreate(null)}
            className="rounded p-1 text-brand-300 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Plus size={17} />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onSelect({ includeSubfolders: false })}
        className={`w-full rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${!active.folderId && !active.unfiled ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
      >
        All test cases
      </button>
      <button
        type="button"
        onClick={() => onSelect({ unfiled: true, includeSubfolders: false })}
        className={`w-full rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${active.unfiled ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
      >
        Unfiled
      </button>
      <div role="tree" aria-label="Folders" className="mt-2 border-t border-slate-700 pt-2" onKeyDown={handleTreeKeyDown}>
        {loading ? <p role="status" className="px-2 py-2 text-xs text-slate-400">Loading folders…</p> : error ? <p role="alert" className="px-2 py-2 text-xs text-red-300">{error}</p> : children.__root__?.map((folder) => node(folder, 0))}
      </div>
    </section>
  );
};
