/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestCaseForm } from './TestCaseForm.tsx';
import { type Project } from './types.ts';

const project: Project = {
  id: 'p1',
  name: 'One',
  key: 'ONE',
  description: '',
  lead: '',
  status: 'Active',
  dueDate: new Date(),
  updatedAt: new Date(),
  stats: { testCasesCount: 0, passRate: 0 },
  members: [],
};

afterEach(cleanup);

describe('TestCaseForm layout', () => {
  it('uses the Test Steps background for empty right-column grid space', () => {
    render(
      <TestCaseForm
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        projects={[project]}
        sectionsByProject={{ p1: ['General'] }}
      />,
    );

    const stepsPanel = screen.getByRole('heading', { name: 'Test steps' }).closest('section');
    expect(stepsPanel).not.toBeNull();
    expect(stepsPanel?.classList.contains('bg-slate-50/60')).toBe(true);
    expect(stepsPanel?.parentElement?.classList.contains('bg-slate-50/60')).toBe(true);
  });

  it('keeps all left-column content inside the divider owner', () => {
    render(
      <TestCaseForm
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        projects={[project]}
        sectionsByProject={{ p1: ['General'] }}
      />,
    );

    const mainExpectedResult = screen.getByRole('heading', { name: 'Main Expected Result' }).closest('section');
    expect(mainExpectedResult?.classList.contains('lg:border-r')).toBe(true);
    expect(mainExpectedResult?.classList.contains('lg:border-slate-200')).toBe(true);
  });
});
