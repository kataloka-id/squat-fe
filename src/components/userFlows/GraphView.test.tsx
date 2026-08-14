// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const { fitViewSpy } = vi.hoisted(() => ({ fitViewSpy: vi.fn() }));
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return { ...actual, useReactFlow: () => ({ fitView: fitViewSpy }) };
});

import { calculateGraphLayout, calculateGraphStageGroups, createGraphIndexes, GraphView, graphHoverHighlight, graphViewReadOnlyProps, isGraphEdgeVisible, isSecondaryGraphRelationship, mapGraphEdges, mapGraphNodes, resolveGraphEdgeVisuals } from './UserFlowsPage.tsx';

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  private element: Element | null = null;
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) { this.callback = callback; ResizeObserverStub.instances.push(this); }
  observe(element: Element) { this.element = element; }
  unobserve() {}
  disconnect() {}
  static trigger() { ResizeObserverStub.instances.filter((observer) => observer.element?.classList.contains('h-full')).forEach((observer) => observer.callback([], {} as ResizeObserver)); }
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);
afterEach(cleanup);

const flow = { id: 'f1', flowKey: 'UF-1', title: 'Start', priority: 'medium' as const, health: 'unknown' as const, status: 'draft' as const, linkedTestCaseCount: 0, automatedTestCaseCount: 0, coverage: 0 };

it('maps existing flow data into React Flow nodes with topology positions', () => {
  const next = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const graph = { nodes: [flow, next], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }] };
  const nodes = mapGraphNodes(graph, calculateGraphLayout(graph.nodes, graph.edges));
  expect(nodes.map((node) => node.id)).toEqual(['f1', 'f2']);
  expect(nodes[0]?.type).toBe('flow');
  expect(nodes[0]?.position.y).toBeLessThan(nodes[1]?.position.y || 0);
});

it('indexes node connections once while preserving original handle IDs', () => {
  const next = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const graph = {
    nodes: [flow, next],
    edges: [
      { sourceFlowId: 'missing', targetFlowId: 'f1' },
      { sourceFlowId: 'f1', targetFlowId: 'f2' },
    ],
  };
  const indexes = createGraphIndexes(graph);
  expect(indexes.nodeIds).toEqual(new Set(['f1', 'f2']));
  expect(indexes.outgoing.get('f1')).toHaveLength(1);
  expect(indexes.incoming.get('f2')).toHaveLength(1);
  expect(mapGraphNodes(graph, calculateGraphLayout(graph.nodes, graph.edges), undefined, indexes)[0]?.data.sourceHandles).toEqual([{ id: 'source-1', left: '50%' }]);
  expect(mapGraphEdges(graph, indexes)[0]).toMatchObject({ id: 'f1-f2-1', sourceHandle: 'source-1', targetHandle: 'target-1' });
});

it('uses React Flow in explicitly read-only mode', () => {
  expect(graphViewReadOnlyProps).toMatchObject({
    nodesDraggable: false,
    nodesConnectable: false,
    edgesReconnectable: false,
    elementsSelectable: false,
    nodesFocusable: false,
    edgesFocusable: false,
  });
});

it.each([
  ['next', '#64748b', undefined, 4],
  ['requires', '#4f46e5', '7 3', 3],
  ['optional', '#059669', '5 4', 2],
  ['alternative', '#0284c7', '2 4', 2],
  ['blocks', '#dc2626', '8 3', 3],
] as const)('maps %s relationship to structured routing, visual priority, and a closed arrow that scales with the line weight', (relationshipType, stroke, dash, width) => {
  const next = { ...flow, id: 'f2' };
  const edge = mapGraphEdges({ nodes: [flow, next], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2', relationshipType }] })[0];
  expect(edge).toMatchObject({ type: 'smoothstep', ariaLabel: `${relationshipType[0].toUpperCase()}${relationshipType.slice(1)} relationship`, pathOptions: { borderRadius: 12, offset: 24 } });
  expect(edge?.style).toMatchObject({ stroke, strokeDasharray: dash, strokeWidth: width });
  expect(edge?.markerEnd).toMatchObject({
    color: stroke,
    width: 12.5,
    height: 12.5,
    markerUnits: 'strokeWidth',
  });
  expect(edge).toMatchObject({ sourceHandle: 'source-0', targetHandle: 'target-0' });
});

it('keeps the layered layout deterministic and groups functional areas with subtle containers', () => {
  const navigation = { ...flow, id: 'f2', flowKey: 'UF-2', area: 'Navigation' };
  const creation = { ...flow, id: 'f3', flowKey: 'UF-3', area: 'Creation' };
  const graph = { nodes: [{ ...flow, area: 'Authentication' }, navigation, creation], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }, { sourceFlowId: 'f2', targetFlowId: 'f3' }] };
  const first = calculateGraphLayout(graph.nodes, graph.edges);
  const reordered = calculateGraphLayout([...graph.nodes].reverse(), graph.edges);
  expect(first.positions.get('f1')?.y).toBeLessThan(first.positions.get('f2')?.y || 0);
  expect(first.positions.get('f2')?.y).toBeLessThan(first.positions.get('f3')?.y || 0);
  expect(reordered.positions.get('f2')).toMatchObject(first.positions.get('f2') || {});
  expect(calculateGraphStageGroups(graph.nodes, first).map((group) => group.label)).toEqual(['Authentication', 'Creation', 'Navigation']);
});

it('keeps branch and cycle layouts stable regardless of node or edge input order', () => {
  const left = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const right = { ...flow, id: 'f3', flowKey: 'UF-3' };
  const join = { ...flow, id: 'f4', flowKey: 'UF-4' };
  const cyclic = { ...flow, id: 'f5', flowKey: 'UF-5' };
  const nodes = [flow, left, right, join, cyclic];
  const edges = [{ sourceFlowId: 'f1', targetFlowId: 'f2' }, { sourceFlowId: 'f1', targetFlowId: 'f3' }, { sourceFlowId: 'f2', targetFlowId: 'f4' }, { sourceFlowId: 'f3', targetFlowId: 'f4' }, { sourceFlowId: 'f4', targetFlowId: 'f5' }, { sourceFlowId: 'f5', targetFlowId: 'f4' }];
  const first = calculateGraphLayout(nodes, edges);
  const reordered = calculateGraphLayout([...nodes].reverse(), [...edges].reverse());
  expect([...first.positions.entries()]).toEqual([...reordered.positions.entries()]);
  expect(first.positions.get('f2')?.y).toBe(first.positions.get('f3')?.y);
  expect(first.positions.get('f4')?.y).toBeGreaterThan(first.positions.get('f2')?.y || 0);
});

it('creates collision-safe deterministic stage IDs for visually similar area names', () => {
  const groups = calculateGraphStageGroups([
    { ...flow, id: 'f-a', area: 'A&B' },
    { ...flow, id: 'f-b', area: 'A B' },
    { ...flow, id: 'f-c', area: 'Auth' },
    { ...flow, id: 'f-d', area: 'auth' },
  ], calculateGraphLayout([
    { ...flow, id: 'f-a', area: 'A&B' }, { ...flow, id: 'f-b', area: 'A B' }, { ...flow, id: 'f-c', area: 'Auth' }, { ...flow, id: 'f-d', area: 'auth' },
  ], []));
  expect(new Set(groups.map((group) => group.id)).size).toBe(4);
  expect(groups.map((group) => group.label)).toEqual(['A B', 'A&B', 'auth', 'Auth']);
});

it('progressively discloses optional and alternative paths while preserving them in the edge map', () => {
  const next = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const optional = { ...flow, id: 'f3', flowKey: 'UF-3' };
  const graph = { nodes: [flow, next, optional], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2', relationshipType: 'next' as const }, { sourceFlowId: 'f1', targetFlowId: 'f3', relationshipType: 'optional' as const }] };
  expect(mapGraphEdges(graph)).toHaveLength(2);
  expect(isSecondaryGraphRelationship('optional')).toBe(true);
  expect(isSecondaryGraphRelationship('alternative')).toBe(true);
  expect(isSecondaryGraphRelationship('requires')).toBe(false);
  const optionalEdge = mapGraphEdges(graph)[1]!;
  expect(isGraphEdgeVisible('optional', optionalEdge)).toBe(false);
  expect(isGraphEdgeVisible('optional', optionalEdge, 'f1')).toBe(true);
  expect(isGraphEdgeVisible('optional', optionalEdge, undefined, true)).toBe(true);
});

it('reveals initially hidden secondary relationships when a graph node is selected', () => {
  const onOpen = vi.fn();
  const optional = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const view = render(<GraphView graph={{ nodes: [flow, optional], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2', relationshipType: 'optional' }] }} loading={false} error={null} onOpen={onOpen} />);
  const graphRoot = view.getByTestId('react-flow-graph');
  expect(graphRoot.getAttribute('data-visible-secondary-count')).toBe('0');
  fireEvent.click(view.container.querySelector('[data-id="f1"] > div')!);
  expect(onOpen).toHaveBeenCalledWith(flow);
  expect(graphRoot.getAttribute('data-visible-secondary-count')).toBe('1');
});

it('bundles shared incoming routes at one native target boundary while retaining each relationship', () => {
  const left = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const right = { ...flow, id: 'f3', flowKey: 'UF-3' };
  const join = { ...flow, id: 'f4', flowKey: 'UF-4' };
  const graph = { nodes: [flow, left, right, join], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }, { sourceFlowId: 'f1', targetFlowId: 'f3' }, { sourceFlowId: 'f2', targetFlowId: 'f4' }, { sourceFlowId: 'f3', targetFlowId: 'f4' }] };
  const edges = mapGraphEdges(graph);
  expect(edges).toHaveLength(4);
  expect(edges.filter((edge) => edge.target === 'f4').map((edge) => edge.targetHandle)).toEqual(['target-bundle-f4', 'target-bundle-f4']);
  const incoming = edges.filter((edge) => edge.target === 'f4');
  expect(incoming).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'bundle', data: { bundled: true, bundleLeader: true }, markerEnd: expect.any(Object) }),
    expect.objectContaining({ type: 'bundle', data: { bundled: true, bundleLeader: false }, markerEnd: expect.any(Object) }),
  ]));
});

it('promotes a visible primary shared-target edge to bundle leader when an earlier optional edge is hidden', () => {
  const optionalSource = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const primarySource = { ...flow, id: 'f3', flowKey: 'UF-3' };
  const join = { ...flow, id: 'f4', flowKey: 'UF-4' };
  const graph = { nodes: [optionalSource, primarySource, join], edges: [
    { sourceFlowId: 'f2', targetFlowId: 'f4', relationshipType: 'optional' as const },
    { sourceFlowId: 'f3', targetFlowId: 'f4', relationshipType: 'next' as const },
  ] };
  const visibleEdges = resolveGraphEdgeVisuals(mapGraphEdges(graph), createGraphIndexes(graph), null);
  const primary = visibleEdges.find((edge) => edge.source === 'f3')!;
  const optional = visibleEdges.find((edge) => edge.source === 'f2')!;
  expect(optional.hidden).toBe(true);
  expect(primary).toMatchObject({ hidden: false, type: 'bundle', data: { bundleLeader: true }, markerEnd: expect.objectContaining({ type: 'arrowclosed' }) });
});

it('renders the React Flow viewport, controls, and an empty-dependency hint', () => {
  render(<GraphView graph={{ nodes: [flow], edges: [] }} loading={false} error={null} onOpen={vi.fn()} />);
  const graphRoot = screen.getByTestId('react-flow-graph');
  expect(graphRoot.querySelector('.react-flow')).toBeTruthy();
  expect(graphRoot.className).toContain('w-full');
  expect(graphRoot.className).toContain('aspect-[4/3]');
  expect(graphRoot.className).toContain('min-h-[520px]');
  expect(graphRoot.className).toContain('max-h-[900px]');
  expect(screen.getByText(/do not have dependencies yet/i)).toBeTruthy();
  expect(screen.getByRole('application')).toBeTruthy();
});

it('uses full-weight relationship styles in the connection legend', () => {
  render(<GraphView graph={{ nodes: [flow], edges: [] }} loading={false} error={null} onOpen={vi.fn()} />);
  const lines = screen.getByLabelText('Connection legend').querySelectorAll('line');
  expect(lines).toHaveLength(5);
  expect(lines[2]?.getAttribute('stroke-dasharray')).toBe('5 4');
  expect(lines[3]?.getAttribute('stroke-dasharray')).toBe('2 4');
  expect(lines[4]?.getAttribute('stroke-width')).toBe('3');
});

it('keeps a node highlight across internal graph transitions and clears it after leaving the canvas', async () => {
  const next = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const unrelated = { ...flow, id: 'f3', flowKey: 'UF-3' };
  const { container } = render(<GraphView graph={{ nodes: [flow, next, unrelated], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }] }} loading={false} error={null} onOpen={vi.fn()} />);
  fireEvent.mouseEnter(container.querySelector('[data-id="f1"]')!);
  expect(container.querySelector('[data-id="f2"]')?.className).not.toContain('opacity-40');
  expect(container.querySelector('[data-id="f3"]')?.className).toContain('opacity-40');
  expect(container.querySelector('[data-id="f1"]')?.getAttribute('style')).toContain('rgb(124 58 237');
  fireEvent.mouseOut(container.querySelector('[data-id="f1"]')!, { relatedTarget: container.querySelector('.h-full')! });
  expect(container.querySelector('[data-id="f3"]')?.className).toContain('opacity-40');
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(container.querySelector('[data-id="f3"]')?.className).toContain('opacity-40');
  fireEvent.mouseOut(container.querySelector('.h-full')!, { relatedTarget: document.body });
  expect(container.querySelector('[data-id="f3"]')?.className).not.toContain('opacity-40');
});

it('does not refit the viewport while hover only changes graph visuals', async () => {
  fitViewSpy.mockClear();
  const next = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const view = render(<GraphView graph={{ nodes: [flow, next], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }] }} loading={false} error={null} onOpen={vi.fn()} />);
  await vi.waitFor(() => expect(fitViewSpy).toHaveBeenCalled());
  fitViewSpy.mockClear();
  fireEvent.mouseEnter(view.container.querySelector('[data-id="f1"]')!);
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(fitViewSpy).not.toHaveBeenCalled();
});


it('highlights source and target nodes when an edge is hovered', () => {
  const next = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const unrelated = { ...flow, id: 'f3', flowKey: 'UF-3' };
  const edges = mapGraphEdges({ nodes: [flow, next, unrelated], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }] });
  const highlight = graphHoverHighlight(edges, undefined, edges[0]?.id);
  expect(highlight.nodeIds).toEqual(new Set(['f1', 'f2']));
  expect(highlight.edgeIds).toEqual(new Set([edges[0]?.id]));
});

it('opens the selected flow exactly once when its React Flow node is clicked', () => {
  const onOpen = vi.fn();
  const view = render(<GraphView graph={{ nodes: [flow], edges: [] }} loading={false} error={null} onOpen={onOpen} />);
  fireEvent.click(view.container.querySelector('[data-id="f1"] > div')!);
  expect(onOpen).toHaveBeenCalledWith(flow);
  expect(onOpen).toHaveBeenCalledTimes(1);
});

it('opens the hovered flow exactly once when its node is clicked', () => {
  const onOpen = vi.fn();
  const view = render(<GraphView graph={{ nodes: [flow], edges: [] }} loading={false} error={null} onOpen={onOpen} />);
  const nodeContent = view.container.querySelector('[data-id="f1"] > div')!;
  fireEvent.mouseEnter(nodeContent);
  fireEvent.click(nodeContent);
  expect(onOpen).toHaveBeenCalledWith(flow);
  expect(onOpen).toHaveBeenCalledTimes(1);
});

it('keeps one keyboard focus target per node and activates it with Enter or Space', () => {
  const onOpen = vi.fn();
  const { container } = render(<GraphView graph={{ nodes: [flow], edges: [] }} loading={false} error={null} onOpen={onOpen} />);
  const node = container.querySelector('[data-id="f1"]')!;
  const nodeButton = node.querySelector('[role="button"]')!;
  expect(node.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  expect(nodeButton.getAttribute('tabindex')).toBe('0');
  fireEvent.keyDown(nodeButton, { key: 'Enter' });
  fireEvent.keyDown(nodeButton, { key: ' ' });
  expect(onOpen).toHaveBeenCalledTimes(2);
  expect(onOpen).toHaveBeenNthCalledWith(1, flow);
  expect(onOpen).toHaveBeenNthCalledWith(2, flow);
});

it('keeps graph nodes clickable without enabling their drag cursor or drag state', () => {
  const { container } = render(<GraphView graph={{ nodes: [flow], edges: [] }} loading={false} error={null} onOpen={vi.fn()} />);
  const node = container.querySelector('[data-id="f1"]');
  const nodeContent = node?.querySelector('[role="button"]');
  expect(node?.className).toContain('cursor-pointer');
  expect(node?.className).toContain('dependency-graph-node');
  expect((node as HTMLElement | null)?.style.cursor).toBe('pointer');
  expect(nodeContent?.className).toContain('cursor-pointer');
  expect((nodeContent as HTMLElement | null)?.style.cursor).toBe('pointer');
  expect(container.querySelector('.dependency-graph-canvas')).toBeTruthy();
  expect(node?.className).not.toContain('draggable');
  expect(node?.className).not.toContain('dragging');
});

it('anchors transparent merge handles at the native node boundary', () => {
  const next = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const { container } = render(<GraphView graph={{ nodes: [flow, next], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }] }} loading={false} error={null} onOpen={vi.fn()} />);
  const sourceHandle = container.querySelector('[data-handleid="source-0"]') as HTMLElement | null;
  const targetHandle = container.querySelector('[data-handleid="target-0"]') as HTMLElement | null;
  expect(sourceHandle?.className).toContain('react-flow__handle-bottom');
  expect(targetHandle?.className).toContain('react-flow__handle-top');
  expect(sourceHandle?.style.bottom).toBe('');
  expect(targetHandle?.style.top).toBe('');
  expect(sourceHandle?.style.pointerEvents).toBe('none');
  expect(targetHandle?.style.pointerEvents).toBe('none');
  expect(sourceHandle?.className).toContain('!bg-transparent');
  expect(targetHandle?.className).toContain('!bg-transparent');
});

it('does not expose drag, connect, or reconnect interactions in the rendered graph', () => {
  const next = { ...flow, id: 'f2', flowKey: 'UF-2' };
  const { container } = render(<GraphView graph={{ nodes: [flow, next], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }] }} loading={false} error={null} onOpen={vi.fn()} />);
  const sourceHandle = container.querySelector('[data-handleid="source-0"]') as HTMLElement;
  const targetHandle = container.querySelector('[data-handleid="target-0"]') as HTMLElement;
  const node = container.querySelector('[data-id="f1"]') as HTMLElement;
  fireEvent.pointerDown(sourceHandle, { clientX: 10, clientY: 10, button: 0 });
  fireEvent.pointerMove(targetHandle, { clientX: 30, clientY: 30, buttons: 1 });
  fireEvent.pointerUp(targetHandle, { clientX: 30, clientY: 30, button: 0 });
  fireEvent.pointerDown(node, { clientX: 10, clientY: 10, button: 0 });
  fireEvent.pointerMove(node, { clientX: 60, clientY: 60, buttons: 1 });
  expect(node.className).not.toContain('draggable');
  expect(container.querySelector('.react-flow__connectionline')).toBeNull();
  expect(container.querySelector('.react-flow__edgeupdater')).toBeNull();
  expect(sourceHandle.style.pointerEvents).toBe('none');
  expect(targetHandle.style.pointerEvents).toBe('none');
});

it('renders a merge with bundled incoming React Flow edges and initializes fit view', () => {
  const left = { ...flow, id: 'f2' }; const right = { ...flow, id: 'f3' }; const join = { ...flow, id: 'f4' };
  const { container } = render(<GraphView graph={{ nodes: [flow, left, right, join], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }, { sourceFlowId: 'f1', targetFlowId: 'f3' }, { sourceFlowId: 'f2', targetFlowId: 'f4' }, { sourceFlowId: 'f3', targetFlowId: 'f4', relationshipType: 'blocks' }] }} loading={false} error={null} onOpen={vi.fn()} />);
  expect(mapGraphEdges({ nodes: [flow, left, right, join], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }, { sourceFlowId: 'f1', targetFlowId: 'f3' }, { sourceFlowId: 'f2', targetFlowId: 'f4' }, { sourceFlowId: 'f3', targetFlowId: 'f4', relationshipType: 'blocks' }] })).toHaveLength(4);
  const mergeHandles = [...container.querySelectorAll('.react-flow__handle-top')].filter((handle) => handle.getAttribute('data-handleid') === 'target-bundle-f4');
  expect(mergeHandles).toHaveLength(1);
  expect(container.querySelector('.react-flow__viewport')?.getAttribute('style')).toContain('transform');
});

it('preserves the viewport when refreshed data does not change topology or layout', async () => {
  fitViewSpy.mockClear();
  const onOpen = vi.fn();
  const originalGraph = { nodes: [flow], edges: [] };
  const view = render(<GraphView graph={originalGraph} loading={false} error={null} onOpen={onOpen} />);
  await vi.waitFor(() => expect(fitViewSpy).toHaveBeenCalled());
  const canvas = view.container.querySelector('.react-flow');
  const viewport = view.container.querySelector('.react-flow__viewport') as HTMLElement;
  // jsdom does not calculate canvas geometry needed for real pan gestures. Set a
  // non-default transform as the observable result of a user pan/zoom, then
  // ensure React's data refresh leaves that existing React Flow viewport intact.
  viewport.style.transform = 'translate(137px, 83px) scale(1.35)';
  const viewportTransform = viewport.style.transform;
  fitViewSpy.mockClear();
  view.rerender(<GraphView graph={{ nodes: [{ ...flow, health: 'healthy' }], edges: [] }} loading={false} error={null} onOpen={onOpen} />);
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(view.container.querySelector('.react-flow')).toBe(canvas);
  expect((view.container.querySelector('.react-flow__viewport') as HTMLElement).style.transform).toBe(viewportTransform);
  expect(fitViewSpy).not.toHaveBeenCalled();
});

it('refits the viewport when refreshed data changes topology or layout', async () => {
  fitViewSpy.mockClear();
  const view = render(<GraphView graph={{ nodes: [flow], edges: [] }} loading={false} error={null} onOpen={vi.fn()} />);
  await vi.waitFor(() => expect(fitViewSpy).toHaveBeenCalled());
  const callsBeforeRefresh = fitViewSpy.mock.calls.length;
  const next = { ...flow, id: 'f2', flowKey: 'UF-2' };
  view.rerender(<GraphView graph={{ nodes: [flow, next], edges: [{ sourceFlowId: 'f1', targetFlowId: 'f2' }] }} loading={false} error={null} onOpen={vi.fn()} />);
  await vi.waitFor(() => expect(fitViewSpy.mock.calls.length).toBeGreaterThan(callsBeforeRefresh));
  expect(fitViewSpy).toHaveBeenLastCalledWith({ padding: 0.2, duration: 0 });
});

it('refits the graph when its responsive viewport resizes', async () => {
  fitViewSpy.mockClear();
  render(<GraphView graph={{ nodes: [flow], edges: [] }} loading={false} error={null} onOpen={vi.fn()} />);
  await vi.waitFor(() => expect(fitViewSpy).toHaveBeenCalled());
  fitViewSpy.mockClear();
  ResizeObserverStub.trigger();
  await vi.waitFor(() => expect(fitViewSpy).toHaveBeenCalledWith({ padding: 0.2, duration: 0 }));
});
