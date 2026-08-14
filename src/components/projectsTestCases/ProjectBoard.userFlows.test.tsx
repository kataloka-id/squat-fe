/** @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectBoard } from './ProjectBoard.tsx';
import type { Project } from './types.ts';

const project: Project = {
  id: 'project-1',
  name: 'AdTune Template Editor',
  key: 'ADTU',
  description: 'Editor coverage',
  lead: 'QA',
  status: 'Active',
  dueDate: new Date(),
  updatedAt: new Date(),
  members: [],
  stats: { testCasesCount: 7, userFlowsCount: 3, passRate: 0 },
};

describe('ProjectBoard User Flows metric', () => {
  it('renders the API-backed count and opens User Flows for that project', () => {
    const onViewUserFlows = vi.fn();
    render(
      <ProjectBoard
        projects={[project]}
        onViewTestCases={vi.fn()}
        onViewUserFlows={onViewUserFlows}
        onViewReports={vi.fn()}
        onViewTestRuns={vi.fn()}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const metric = screen.getByRole('button', { name: /User Flows/ });
    expect(metric.textContent).toContain('3');
    const statsGrid = metric.parentElement;
    expect(statsGrid?.classList.contains('grid-cols-2')).toBe(true);
    expect(statsGrid?.classList.contains('lg:grid-cols-3')).toBe(false);
    expect(Array.from(statsGrid?.children ?? []).map((child) => child.textContent)).toEqual([
      expect.stringContaining('Test Cases'),
      expect.stringContaining('Pass Rate'),
      expect.stringContaining('User Flows'),
    ]);
    fireEvent.click(metric);
    expect(onViewUserFlows).toHaveBeenCalledWith('project-1');
  });
});
