/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserFlowsPage } from './UserFlowsPage.tsx';

const serviceMocks = vi.hoisted(() => ({ list: vi.fn(), graph: vi.fn() }));
vi.mock('@/src/api/user-flows.service.ts', () => ({ UserFlowsService: serviceMocks }));

const flows = Array.from({ length: 25 }, (_, index) => ({
  id: `flow-${index + 1}`,
  flowKey: `UF-${index + 1}`,
  title: `Flow ${index + 1}`,
  area: 'Checkout',
  priority: 'medium',
  health: 'healthy',
  status: 'active',
  linkedTestCaseCount: index + 1,
  automatedTestCaseCount: index,
  coverage: 50,
}));

describe('UserFlowsPage pagination and compact columns', () => {
  afterEach(cleanup);

  beforeEach(() => {
    serviceMocks.list.mockResolvedValue({
      data: { flows, summary: { total: 25, healthy: 25, atRisk: 0, broken: 0, coverage: 50 } },
    });
    serviceMocks.graph.mockResolvedValue({ data: { nodes: [], edges: [] } });
  });

  it('uses the Test Cases rows-per-page pattern and resets pagination when it changes', async () => {
    const user = userEvent.setup();
    render(<UserFlowsPage projects={[{ id: 'project-1', name: 'Project' }] as any} projectId="project-1" onProjectChange={() => {}} />);

    await screen.findByText('Flow 20');
    expect(screen.queryByText('Flow 21')).toBeNull();
    expect(screen.getByText('Showing', { exact: false }).textContent).toContain('Showing 1 to 20 of 25 results');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Flow 21');
    expect(screen.getByText('Showing', { exact: false }).textContent).toContain('Showing 21 to 25 of 25 results');

    await user.click(screen.getByRole('button', { name: '20' }));
    await user.click(screen.getByRole('option', { name: 'All' }));
    await screen.findByText('Flow 25');
    expect(screen.getByText('Showing', { exact: false }).textContent).toContain('Showing 1 to 25 of 25 results');
    expect(screen.getByText('1 / 1')).toBeTruthy();
  });

  it('centers compact headers and cells while retaining left-aligned flow metadata', async () => {
    const { container } = render(<UserFlowsPage projects={[{ id: 'project-1', name: 'Project' }] as any} projectId="project-1" onProjectChange={() => {}} />);
    await screen.findByText('Flow 1');

    const table = container.querySelector('table') as HTMLTableElement;
    for (const name of ['Priority', 'Health', 'Coverage', 'Test Cases', 'Automated', 'Status', 'Actions']) {
      expect(within(table).getByRole('columnheader', { name }).className).toContain('text-center');
    }
    for (const name of ['Flow', 'Area', 'Last Tested', 'Last Updated']) {
      expect(within(table).getByRole('columnheader', { name }).className).not.toContain('text-center');
    }

    const firstRow = container.querySelector('tbody tr');
    const cells = within(firstRow as HTMLElement).getAllByRole('cell');
    for (const index of [2, 3, 4, 5, 6, 9, 10]) expect(cells[index].className).toContain('text-center');
    expect(cells[0].className).not.toContain('text-center');
    expect(cells[1].className).not.toContain('text-center');
    expect(cells[7].className).not.toContain('text-center');
    expect(cells[8].className).not.toContain('text-center');
  });

  it('keeps the table and pagination in one bordered card', async () => {
    const { container } = render(<UserFlowsPage projects={[{ id: 'project-1', name: 'Project' }] as any} projectId="project-1" onProjectChange={() => {}} />);
    await screen.findByText('Flow 1');

    const table = container.querySelector('table') as HTMLTableElement;
    const card = table.parentElement?.parentElement;
    const pagination = screen.getByRole('navigation', { name: 'User flow pagination' });
    expect(card?.className).toContain('rounded-xl');
    expect(card?.className).toContain('border');
    expect(card?.className).not.toContain('overflow-hidden');
    expect(card?.contains(pagination)).toBe(true);
    expect(pagination.className).toContain('border-t');
    expect(pagination.className).not.toContain('border-x');
    expect(pagination.className).not.toContain('border-b');
  });

  it('keeps the current User Flows page mounted behind the create dialog', async () => {
    const user = userEvent.setup();
    render(<UserFlowsPage projects={[{ id: 'project-1', name: 'Project' }] as any} projectId="project-1" onProjectChange={() => {}} />);

    await screen.findByText('Flow 1');
    await user.click(screen.getByRole('button', { name: 'New User Flow' }));

    expect(screen.getByRole('dialog', { name: 'Create User Flow' })).toBeTruthy();
    expect(screen.getByText('Flow 1')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Create User Flow' })).toBeNull();
    expect(screen.getByText('Flow 1')).toBeTruthy();
  });
});
