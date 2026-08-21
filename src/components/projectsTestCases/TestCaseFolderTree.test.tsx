/** @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TestCaseFolderTree } from './TestCaseFolderTree.tsx';

describe('TestCaseFolderTree', () => {
  const folders = [
    { id: 'root', projectId: 'p1', name: 'Login', testCaseCount: 1 },
    { id: 'child', projectId: 'p1', name: 'MFA', parentId: 'root', testCaseCount: 2 },
  ];

  it('selects a folder and provides accessible management actions', () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <TestCaseFolderTree
        folders={folders}
        active={{ includeSubfolders: true }}
        onSelect={onSelect}
        onCreate={onCreate}
        onRename={onRename}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(container.querySelector('[aria-label="Login"]')!);
    expect(onSelect).toHaveBeenCalledWith({ folderId: 'root', includeSubfolders: false });
    const actions = within(container.querySelector('[aria-label="Folder actions for Login"]')!);
    fireEvent.click(actions.getByRole('button', { name: 'New subfolder' }));
    expect(onCreate).toHaveBeenCalledWith('root');
    fireEvent.click(actions.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(folders[0]);
  });

  it('exposes keyboard-accessible direct folder actions', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <TestCaseFolderTree
        folders={folders}
        active={{ includeSubfolders: true }}
        onSelect={vi.fn()}
        onCreate={onCreate}
        onRename={onRename}
        onDelete={onDelete}
      />,
    );

    await user.click(within(container.querySelector('[aria-label="Folder actions for Login"]')!).getByRole('button', { name: 'Rename' }));
    expect(onRename).toHaveBeenCalledWith(folders[0]);
  });

  it('prioritizes the label while idle and reserves action space on hover or focus', () => {
    const longName = 'A very long folder name that should remain readable through its tooltip';
    const { container } = render(
      <TestCaseFolderTree
        folders={[{ id: 'long', projectId: 'p1', name: longName, totalTestCaseCount: 12 }]}
        active={{ includeSubfolders: false }}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const folderTree = container.querySelector('section[aria-label="Test case folders"]')!;
    const folderName = container.querySelector(`span[title="${longName}"]`)!;
    const count = container.querySelector('[aria-label="12 test cases"]')!;
    const actionTrigger = container.querySelector(`[aria-label="Folder actions for ${longName}"]`)!;
    expect(folderTree.className).toContain('min-w-0');
    expect(folderTree.className).toContain('pb-4');
    expect(folderName.className).toContain('truncate');
    expect(folderName.getAttribute('title')).toBe(longName);
    expect(count).not.toBeNull();
    expect(folderName.parentElement?.className).toContain('items-center');
    expect(folderName.parentElement?.className).toContain('gap-1.5');
    const row = container.querySelector('[role="treeitem"]')!;
    expect(row.className).toContain('focus:pr-[116px]');
    expect(row.className).toContain('hover:pr-[116px]');
    expect(row.className).toContain('transition-[padding]');
    expect(actionTrigger.className).toContain('absolute');
    expect(actionTrigger.className).toContain('right-1');
  });

  it('reveals actions from keyboard focus without changing the selected row styling', () => {
    const { container } = render(
      <TestCaseFolderTree
        folders={folders}
        active={{ folderId: 'root', includeSubfolders: false }}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const row = container.querySelector<HTMLElement>('[role="treeitem"][data-folder-id="root"]')!;
    row.focus();
    expect(row.className).toContain('bg-brand-600');
    expect(row.className).toContain('focus:pr-[116px]');
    expect(row.className).toContain('focus-within:pr-[116px]');
    expect(container.querySelector('[aria-label="Folder actions for Login"] > span')?.className).toContain('group-focus:opacity-100');
  });

  it('applies the same action layout to nested folders', () => {
    const { container } = render(
      <TestCaseFolderTree
        folders={folders}
        active={{ folderId: 'child', includeSubfolders: false }}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const child = container.querySelector<HTMLElement>('[role="treeitem"][data-folder-id="child"]')!;
    expect(child.className).toContain('hover:pr-[116px]');
    expect(container.querySelector('[aria-label="Folder actions for MFA"]')?.className).toContain('absolute');
  });

  it('auto-expands an active folder parent and supports tree arrow navigation', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TestCaseFolderTree
        folders={folders}
        active={{ folderId: 'child', includeSubfolders: false }}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const parent = container.querySelector<HTMLElement>('[role="treeitem"][data-folder-id="root"]')!;
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    parent.focus();
    await user.keyboard('{ArrowDown}');
    expect(container.querySelector('[role="treeitem"][data-folder-id="child"]')).toBe(document.activeElement);
  });

  it('selects and expands a focused tree item with Enter and Space, including after focusing an inner control', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(<TestCaseFolderTree folders={folders} active={{ includeSubfolders: false }} onSelect={onSelect} onCreate={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
    const parent = container.querySelector<HTMLElement>('[role="treeitem"][data-folder-id="root"]')!;
    parent.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith({ folderId: 'root', includeSubfolders: false });
    await user.keyboard(' ');
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    const expand = screen.getByRole('button', { name: 'Expand Login' });
    expand.focus();
    await user.keyboard('{ArrowRight}');
    expect(parent.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps folder mutations available independently of role while loading and errors disable them safely', () => {
    const { container, rerender } = render(<TestCaseFolderTree folders={folders} active={{ includeSubfolders: false }} onSelect={vi.fn()} onCreate={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(container.querySelector('[aria-label="Create root folder"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Folder actions for Login"]')).not.toBeNull();
    rerender(<TestCaseFolderTree folders={folders} active={{ includeSubfolders: false }} disabled onSelect={vi.fn()} onCreate={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} loading />);
    expect(container.querySelector('[aria-label="Create root folder"]')).toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Loading folders');
    rerender(<TestCaseFolderTree folders={folders} active={{ includeSubfolders: false }} disabled onSelect={vi.fn()} onCreate={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} error="Folders unavailable" />);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Folders unavailable');
  });
});
