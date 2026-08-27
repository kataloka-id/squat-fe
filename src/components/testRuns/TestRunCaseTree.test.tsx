/** @vitest-environment jsdom */
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectTestCaseRecord } from '@/src/types/api.ts';
import { TestRunCaseTree, flattenTestCaseFolders, getFolderSelectionIds } from './TestRunCaseTree.tsx';

const makeCase = (id: string, folderId?: string, folderPath?: Array<{ id: string; name: string }>) => ({
  id,
  title: `Case ${id}`,
  folderId,
  folderPath,
  section: 'Regression',
  priority: 'High',
  status: 'Active',
  automationType: 'Manual',
  tags: [],
  steps: [],
} satisfies ProjectTestCaseRecord);

const folders = [
  { id: 'checkout', projectId: 'p1', name: 'Checkout' },
  { id: 'payments', projectId: 'p1', name: 'Payments', parentId: 'checkout' },
];

describe('TestRunCaseTree', () => {
  afterEach(cleanup);
  const cases = [
    makeCase('one', 'checkout', [{ id: 'checkout', name: 'Checkout' }]),
    makeCase('two', 'payments', [{ id: 'checkout', name: 'Checkout' }, { id: 'payments', name: 'Payments' }]),
    makeCase('three'),
  ];

  it('selects every case in a nested folder subtree, regardless of filtered visibility', () => {
    expect(getFolderSelectionIds(cases, folders, 'checkout')).toEqual(['one', 'two']);
    const selected: string[] = [];
    render(
      <TestRunCaseTree
        cases={cases}
        visibleCases={[cases[1]]}
        folders={folders}
        selected={selected}
        selectable={() => true}
        onToggleCase={() => {}}
        onToggleFolder={(_folderId, ids) => selected.push(...ids)}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select folder Checkout' }));
    expect(selected).toEqual(['one', 'two']);
    expect(screen.getByText('0 / 2 selected')).toBeTruthy();
  });

  it('reflects partial selection with an indeterminate parent checkbox and keeps uncategorized cases', () => {
    const Harness = () => {
      const [selected, setSelected] = useState(['one']);
      return (
        <TestRunCaseTree
          cases={cases}
          visibleCases={cases}
          folders={folders}
          selected={selected}
          selectable={() => true}
          onToggleCase={(id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
          onToggleFolder={(_folderId, ids) => setSelected(ids)}
        />
      );
    };
    render(<Harness />);
    expect((screen.getByRole('checkbox', { name: 'Select folder Checkout' }) as HTMLInputElement).indeterminate).toBe(true);
    expect(screen.getAllByText(/Uncategorized/).length).toBeGreaterThan(0);
    expect(screen.getByText('1 / 2 selected')).toBeTruthy();
  });

  it('renders empty folders without changing the selection scope', () => {
    render(
      <TestRunCaseTree
        cases={cases}
        visibleCases={[]}
        folders={[...folders, { id: 'empty', projectId: 'p1', name: 'Empty' }]}
        selected={[]}
        selectable={() => true}
        onToggleCase={() => {}}
        onToggleFolder={() => {}}
      />,
    );
    expect(screen.getByText('Empty')).toBeTruthy();
    expect(screen.getByText('0 / 0 selected')).toBeTruthy();
  });

  it('normalizes nested API folders and uses folderId instead of a stale folderPath', () => {
    const nestedFolders = [{
      id: 'checkout', projectId: 'p1', name: 'Checkout', children: [
        { id: 'payments', projectId: 'p1', name: 'Payments', children: [
          { id: 'cards', projectId: 'p1', name: 'Cards' },
        ] },
      ],
    }];
    expect(flattenTestCaseFolders(nestedFolders)).toEqual([
      expect.objectContaining({ id: 'checkout' }),
      expect.objectContaining({ id: 'payments', parentId: 'checkout' }),
      expect.objectContaining({ id: 'cards', parentId: 'payments' }),
    ]);
    const canonicalCase = makeCase('canonical', 'cards', [
      { id: 'wrong', name: 'Stale path' },
    ]);
    expect(getFolderSelectionIds([canonicalCase], nestedFolders, 'checkout')).toEqual(['canonical']);
    expect(getFolderSelectionIds([canonicalCase], nestedFolders, 'payments')).toEqual(['canonical']);
    render(
      <TestRunCaseTree
        cases={[canonicalCase]}
        visibleCases={[canonicalCase]}
        folders={nestedFolders}
        selected={[]}
        selectable={() => true}
        onToggleCase={() => {}}
        onToggleFolder={() => {}}
      />,
    );
    expect(screen.getByText(/Checkout \/ Payments \/ Cards/)).toBeTruthy();
    expect(screen.queryByText(/Stale path/)).toBeNull();
  });
});
