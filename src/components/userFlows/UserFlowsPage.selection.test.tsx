/** @vitest-environment jsdom */
/* eslint-disable no-unused-vars -- repository rule misidentifies TypeScript-only callback types. */
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserFlowsPage } from './UserFlowsPage.tsx';
import { selectCustomOptionSync } from '@/src/test/selectTestUtils.ts';

const serviceMocks = vi.hoisted(() => ({ list: vi.fn(), graph: vi.fn(), get: vi.fn(), update: vi.fn(), FLOW_PRIORITIES: ['not_defined', 'critical', 'high', 'medium', 'low'], FLOW_STATUSES: ['draft', 'active', 'deprecated'] }));
const projectMocks = vi.hoisted(() => ({ listTestCases: vi.fn() }));
vi.mock('@/src/api/user-flows.service.ts', () => ({ UserFlowsService: serviceMocks, FLOW_PRIORITIES: serviceMocks.FLOW_PRIORITIES, FLOW_STATUSES: serviceMocks.FLOW_STATUSES }));
vi.mock('@/src/api/projects.service.ts', () => ({ ProjectsService: projectMocks }));

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
};

const collection = (title: string) => ({
  data: {
    flows: [{ id: title, flowKey: 'UF-1', title, priority: 'medium', health: 'unknown', status: 'draft', linkedTestCaseCount: 0, automatedTestCaseCount: 0, coverage: 0 }],
    summary: { total: 1, healthy: 0, atRisk: 0, broken: 0, coverage: 0 },
  },
});
const graph = () => ({ data: { nodes: [], edges: [] } });

describe('UserFlowsPage project selection', () => {
  it('ignores a late response from a previously selected project', async () => {
    const firstList = deferred<ReturnType<typeof collection>>();
    const firstGraph = deferred<ReturnType<typeof graph>>();
    const secondList = deferred<ReturnType<typeof collection>>();
    const secondGraph = deferred<ReturnType<typeof graph>>();
    serviceMocks.list.mockImplementation((projectId: string) => projectId === 'p1' ? firstList.promise : secondList.promise);
    serviceMocks.graph.mockImplementation((projectId: string) => projectId === 'p1' ? firstGraph.promise : secondGraph.promise);

    const Harness = () => {
      const [projectId, setProjectId] = useState('p1');
      return <UserFlowsPage projects={[{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }] as any} projectId={projectId} onProjectChange={setProjectId} />;
    };
    render(<Harness />);
    await waitFor(() => expect(serviceMocks.list).toHaveBeenCalledWith('p1'));

    selectCustomOptionSync('Project', 'p2');
    await waitFor(() => expect(serviceMocks.list).toHaveBeenCalledWith('p2'));
    secondList.resolve(collection('Current project flow'));
    secondGraph.resolve(graph());
    await screen.findByText('Current project flow');

    firstList.resolve(collection('Stale project flow'));
    firstGraph.resolve(graph());
    await waitFor(() => expect(screen.queryByText('Stale project flow')).toBeNull());
    expect(screen.getByText('Current project flow')).toBeTruthy();
  });

  it('keeps the active detail open and refreshes it after saving an edit', async () => {
    const user = userEvent.setup();
    const initialFlow = {
      ...collection('Checkout').data.flows[0],
      id: 'flow-1',
      updatedAt: '2026-08-12T00:00:00.000Z',
      steps: [],
      linkedTestCases: [],
    };
    const updatedFlow = { ...initialFlow, title: 'Updated checkout' };
    serviceMocks.list.mockResolvedValue(collection('Checkout'));
    serviceMocks.graph.mockResolvedValue(graph());
    serviceMocks.get
      .mockResolvedValueOnce({ data: initialFlow })
      .mockResolvedValueOnce({ data: updatedFlow });
    serviceMocks.update.mockResolvedValue({});
    projectMocks.listTestCases.mockResolvedValue({ data: [] });

    render(<UserFlowsPage projects={[{ id: 'p1', name: 'One' }] as any} projectId="p1" onProjectChange={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: /Checkout/ }));
    await screen.findByRole('heading', { name: 'Checkout' });
    await user.click(screen.getByRole('button', { name: 'Edit Flow' }));
    await user.clear(screen.getByRole('textbox', { name: /Title/ }));
    await user.type(screen.getByRole('textbox', { name: /Title/ }), 'Updated checkout');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await screen.findByRole('heading', { name: 'Updated checkout' });
    expect(screen.queryByRole('button', { name: /Steps/ })).toBeNull();
    expect(serviceMocks.get).toHaveBeenLastCalledWith('p1', 'flow-1');
  });
});
