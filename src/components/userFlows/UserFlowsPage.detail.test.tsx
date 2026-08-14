// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlowDependencyManager, FlowForm, UserFlowDetail } from './UserFlowsPage.tsx';

const serviceMocks = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  updateStep: vi.fn().mockResolvedValue({}),
  linkTestCases: vi.fn().mockResolvedValue({}),
  addDependency: vi.fn().mockResolvedValue({}),
  removeDependency: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/src/api/user-flows.service.ts', async () => {
  const actual = await vi.importActual<typeof import('@/src/api/user-flows.service.ts')>(
    '@/src/api/user-flows.service.ts',
  );
  return {
    ...actual,
    UserFlowsService: {
      ...actual.UserFlowsService,
      create: serviceMocks.create,
      update: serviceMocks.update,
      updateStep: serviceMocks.updateStep,
      linkTestCases: serviceMocks.linkTestCases,
      addDependency: serviceMocks.addDependency,
      removeDependency: serviceMocks.removeDependency,
    },
  };
});

const flow = {
  id: 'flow-1',
  flowKey: 'UF-1',
  title: 'Checkout',
  goal: 'Complete checkout',
  entryPoint: 'Cart',
  successCriteria: 'Order created',
  priority: 'high' as const,
  health: 'healthy' as const,
  status: 'active' as const,
  linkedTestCaseCount: 0,
  automatedTestCaseCount: 0,
  coverage: 0,
  steps: [
    {
      id: 'step-1',
      stepOrder: 1,
      title: 'Open cart',
      action: 'Open',
      expectedResult: 'Cart displayed',
    },
  ],
  linkedTestCases: [],
};
const cases = [
  {
    id: 'tc-1',
    projectKey: 'SHOP',
    tcNumber: 1,
    title: 'Card checkout',
    section: 'Checkout',
    priority: 'High',
    status: 'Ready',
    automationType: 'UI',
    steps: [],
    tags: [],
  },
  {
    id: 'tc-2',
    projectKey: 'SHOP',
    tcNumber: 2,
    title: 'Cash checkout',
    section: 'Checkout',
    priority: 'High',
    status: 'Ready',
    automationType: 'UI',
    steps: [],
    tags: [],
  },
];

describe('UserFlowDetail', () => {
  afterEach(() => cleanup());
  it('shows distinct journey metadata', () => {
    render(
      <UserFlowDetail
        projectId="p1"
        flow={flow}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Complete checkout')).toBeTruthy();
    expect(screen.getByText('Cart')).toBeTruthy();
    expect(screen.getByText('Order created')).toBeTruthy();
  });
  it('uses compact back controls and only shows previous flow navigation when available', () => {
    const { rerender } = render(
      <UserFlowDetail
        projectId="p1"
        flow={flow}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'User Flows' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Previous Flow' })).toBeNull();

    rerender(
      <UserFlowDetail
        projectId="p1"
        flow={flow}
        availableTestCases={cases}
        onClose={vi.fn()}
        onBack={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Previous Flow' })).toBeTruthy();
  });
  it('links multiple project test cases from the searchable picker', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn();
    render(
      <UserFlowDetail
        projectId="p1"
        flow={flow}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={refresh}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Test Cases/ }));
    await user.click(screen.getByRole('button', { name: 'Link Test Cases' }));
    expect(screen.getByRole('dialog', { name: 'Link Test Cases' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Link Selected (0)' }).hasAttribute('disabled')).toBe(
      true,
    );
    await user.type(screen.getByPlaceholderText('Search test cases...'), 'checkout');
    await user.click(screen.getByRole('checkbox', { name: /SHOP-1/ }));
    await user.click(screen.getByRole('checkbox', { name: /SHOP-2/ }));
    expect(screen.getByText('Selected: 2')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Link Selected (2)' }));
    expect(serviceMocks.linkTestCases).toHaveBeenCalledWith('p1', 'flow-1', ['tc-1', 'tc-2']);
    expect(refresh).toHaveBeenCalled();
  });
  it('renders the test case picker in the document portal with a full-viewport backdrop', async () => {
    const user = userEvent.setup();
    render(
      <UserFlowDetail
        projectId="p1"
        flow={flow}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Test Cases/ }));
    await user.click(screen.getByRole('button', { name: 'Link Test Cases' }));

    const dialog = screen.getByRole('dialog', { name: 'Link Test Cases' });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain('fixed');
    expect(dialog.className).toContain('inset-0');
  });
  it('excludes current flow, creates and removes dependencies', async () => {
    const user = userEvent.setup();
    const refresh = vi.fn();
    const error = vi.fn();
    const dependency = { ...flow, id: 'flow-2', flowKey: 'UF-2', title: 'Pay' };
    render(
      <FlowDependencyManager
        projectId="p1"
        flow={{ ...flow, dependencies: [dependency] }}
        flows={[flow, dependency, { ...flow, id: 'flow-3', flowKey: 'UF-3', title: 'Confirm' }]}
        onRefresh={refresh}
        onError={error}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Add Dependency' }));
    expect(screen.queryByRole('option', { name: /UF-1/ })).toBeNull();
    await user.selectOptions(screen.getByLabelText('Target flow'), 'flow-3');
    await user.click(
      within(screen.getByRole('dialog', { name: 'Add Dependency' })).getByRole('button', {
        name: 'Add Dependency',
      }),
    );
    expect(serviceMocks.addDependency).toHaveBeenCalledWith('p1', 'flow-1', 'flow-3', 'next');
    expect(refresh).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(serviceMocks.removeDependency).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(serviceMocks.removeDependency).not.toHaveBeenCalled();
    expect(screen.queryByText('Remove dependency?')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Remove dependency' }));
    expect(serviceMocks.removeDependency).toHaveBeenCalledWith('p1', 'flow-1', 'flow-2');
  });
  it('opens Dependencies safely when the API dependency omits optional flow data', async () => {
    const user = userEvent.setup();
    const dependency = { id: 'flow-2', flowKey: 'UF-2', title: 'Pay' };
    render(
      <UserFlowDetail
        projectId="p1"
        flow={{ ...flow, dependencies: [dependency] }}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Dependencies (1)' }));

    expect(screen.getByRole('heading', { name: 'Outgoing Dependencies' })).toBeTruthy();
    expect(screen.getAllByText('UF-1 — Checkout').length).toBeGreaterThan(0);
    expect(screen.getByRole('listitem').textContent).toContain('UF-2 — Pay');
    expect(screen.getByText('Unknown')).toBeTruthy();
  });
  it('separates incoming relations, exposes their type and warns for a broken downstream flow', async () => {
    const user = userEvent.setup();
    const view = vi.fn();
    const outgoing = {
      ...flow,
      id: 'flow-2',
      flowKey: 'UF-2',
      title: 'Export',
      health: 'broken' as const,
      relationshipType: 'optional' as const,
    };
    const incoming = {
      sourceFlowId: 'flow-3',
      flowKey: 'UF-3',
      title: 'Create',
      health: 'healthy' as const,
      relationshipType: 'requires' as const,
    };
    render(
      <FlowDependencyManager
        projectId="p1"
        flow={{ ...flow, dependencies: [outgoing], incomingDependencies: [incoming] }}
        flows={[flow, outgoing]}
        onRefresh={vi.fn()}
        onError={vi.fn()}
        onViewFlow={view}
      />,
    );
    expect(screen.getByText('Incoming Dependencies')).toBeTruthy();
    expect(screen.getByText('Downstream flow is currently broken.')).toBeTruthy();
    expect(screen.getAllByText('Optional').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'UF-3 — Create' }));
    expect(view).toHaveBeenCalledWith('flow-3');
  });
  it('keeps Dependencies renderable when a dependency reference is invalid or stale', async () => {
    const user = userEvent.setup();
    const malformedFlow = {
      ...flow,
      dependencies: [null, { id: 'stale-flow' }, { flowKey: null, title: null }],
    } as unknown as typeof flow;
    render(
      <UserFlowDetail
        projectId="p1"
        flow={malformedFlow}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Dependencies (2)' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByRole('listitem')[1].textContent).toContain(
      'Unknown flow — Unavailable flow',
    );
    expect(screen.getAllByText('Unknown')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Remove' })[1].hasAttribute('disabled')).toBe(
      true,
    );
  });
  it('shows the empty state for undefined, null, or non-array dependency data', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <UserFlowDetail
        projectId="p1"
        flow={{ ...flow, dependencies: undefined }}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Dependencies (0)' }));
    expect(screen.getByText('No dependencies yet')).toBeTruthy();

    for (const dependencies of [null, { stale: true }]) {
      rerender(
        <UserFlowDetail
          projectId="p1"
          flow={{ ...flow, dependencies } as unknown as typeof flow}
          availableTestCases={cases}
          onClose={vi.fn()}
          onRefresh={vi.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: 'Dependencies (0)' })).toBeTruthy();
      expect(screen.getByText('No dependencies yet')).toBeTruthy();
    }
  });
  it('guides QA through dependency relationships and previews their direction before saving', async () => {
    const user = userEvent.setup();
    const target = { ...flow, id: 'flow-2', flowKey: 'UF-2', title: 'Export Creative' };
    render(
      <FlowDependencyManager
        projectId="p1"
        flow={{ ...flow, title: 'Save Template', dependencies: [] }}
        flows={[flow, target]}
        onRefresh={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(screen.getByText('How dependencies work')).toBeTruthy();
    expect(
      screen.getByText(
        'Connect this flow to another journey to make the relationship visible in the dependency graph.',
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Learn more' }));
    const guide = screen.getByRole('dialog', { name: 'How dependencies work' });
    expect(within(guide).getByText(/Flow berikutnya setelah current flow/)).toBeTruthy();
    expect(
      within(guide).getByText(/Current flow membutuhkan flow lain terlebih dahulu/),
    ).toBeTruthy();
    expect(within(guide).getByText('Save Creative requires Login')).toBeTruthy();
    await user.click(within(guide).getByRole('button', { name: 'Close' }));

    await user.click(screen.getAllByRole('button', { name: 'Add Dependency' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Add Dependency' });
    expect(
      within(dialog).getByText('Use when this flow normally continues to another flow.'),
    ).toBeTruthy();
    await user.selectOptions(within(dialog).getByLabelText('Target flow'), 'flow-2');
    expect(within(dialog).getByText('Save Template → Export Creative')).toBeTruthy();
    await user.selectOptions(within(dialog).getByLabelText('Relationship'), 'requires');
    expect(
      within(dialog).getByText('Use when this flow depends on another flow being completed first.'),
    ).toBeTruthy();
    expect(within(dialog).getByText('Save Template requires Export Creative')).toBeTruthy();
  });
  it('closes dependency dialogs with Escape and restores focus to their triggering CTA', async () => {
    const user = userEvent.setup();
    const target = { ...flow, id: 'flow-2', flowKey: 'UF-2', title: 'Export Creative' };
    render(
      <FlowDependencyManager
        projectId="p1"
        flow={{ ...flow, dependencies: [] }}
        flows={[flow, target]}
        onRefresh={vi.fn()}
        onError={vi.fn()}
      />,
    );

    const guideTrigger = screen.getByRole('button', { name: 'Learn more' });
    await user.click(guideTrigger);
    expect(screen.getByRole('dialog', { name: 'How dependencies work' })).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'How dependencies work' })).toBeNull(),
    );
    await waitFor(() => expect(document.activeElement).toBe(guideTrigger));

    const addTrigger = screen.getAllByRole('button', { name: 'Add Dependency' })[0];
    await user.click(addTrigger);
    expect(screen.getByRole('dialog', { name: 'Add Dependency' })).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add Dependency' })).toBeNull(),
    );
    await waitFor(() => expect(document.activeElement).toBe(addTrigger));
  });
  it('keeps Tab and Shift+Tab inside dependency dialogs', async () => {
    const user = userEvent.setup();
    render(
      <FlowDependencyManager
        projectId="p1"
        flow={{ ...flow, dependencies: [] }}
        flows={[flow]}
        onRefresh={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Learn more' }));
    const guide = screen.getByRole('dialog', { name: 'How dependencies work' });
    const close = within(guide).getByRole('button', { name: 'Close dependency guide' });
    const finalClose = within(guide).getByRole('button', { name: 'Close' });
    finalClose.focus();
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(finalClose);
  });
  it('creates with unknown health and exposes required QA fields', async () => {
    const user = userEvent.setup();
    render(<FlowForm projectId="p1" initial="new" areas={[]} onDone={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Priority')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Goal')).toBeTruthy();
    expect(screen.queryByText('Health')).toBeNull();
    await user.type(screen.getByRole('textbox', { name: /Title/ }), 'New flow');
    await user.click(screen.getByRole('button', { name: 'Create User Flow' }));
    expect(serviceMocks.create).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ health: 'unknown', priority: 'medium', status: 'draft' }),
    );
  });
  it('edits existing QA metadata with lowercase enum payload', async () => {
    const user = userEvent.setup();
    render(
      <FlowForm projectId="p1" initial={flow} areas={[]} onDone={vi.fn()} onError={vi.fn()} />,
    );
    expect(screen.getByDisplayValue('Complete checkout')).toBeTruthy();
    await user.clear(screen.getByDisplayValue('Complete checkout'));
    await user.type(
      screen.getByPlaceholderText('Describe what the user is trying to achieve.'),
      'Updated goal',
    );
    await user.selectOptions(screen.getByLabelText(/Priority/), 'low');
    await user.selectOptions(screen.getByLabelText(/Status/), 'deprecated');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(serviceMocks.update).toHaveBeenCalledWith(
      'p1',
      'flow-1',
      expect.objectContaining({ goal: 'Updated goal', priority: 'low', status: 'deprecated' }),
    );
  });
  it('shows actionable overview cards, visual coverage, and current tab counts', () => {
    render(
      <UserFlowDetail
        projectId="p1"
        flow={{
          ...flow,
          linkedTestCaseCount: 1,
          automatedTestCaseCount: 0,
          coverage: 0,
          dependencies: [{ ...flow, id: 'flow-2' }],
        }}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Edit Flow' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'More flow actions' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.getByText('Flow Definition')).toBeTruthy();
    expect(screen.getByText('Flow Metadata')).toBeTruthy();
    expect(screen.getByText('Coverage')).toBeTruthy();
    expect(
      screen
        .getByRole('progressbar', { name: 'Automation coverage: 0%' })
        .getAttribute('aria-valuenow'),
    ).toBe('0');
    expect(screen.queryByRole('button', { name: 'Steps (1)' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Test Cases (1)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dependencies (1)' })).toBeTruthy();
  });
  it('keeps a single link CTA and does not offer linked cases as picker candidates', async () => {
    const user = userEvent.setup();
    render(
      <UserFlowDetail
        projectId="p1"
        flow={{ ...flow, linkedTestCases: [cases[0]], dependencies: [] }}
        flows={[flow, { ...flow, id: 'flow-2', flowKey: 'UF-2' }]}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Test Cases (0)' }));
    expect(screen.getAllByRole('button', { name: 'Link Test Cases' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Link Test Cases' }));
    expect(screen.queryByRole('checkbox', { name: /SHOP-1/ })).toBeNull();
    expect(screen.getByRole('checkbox', { name: /SHOP-2/ })).toBeTruthy();
  });
  it('opens linked test cases in the existing detail drawer and preserves the Test Cases tab', async () => {
    const user = userEvent.setup();
    const linkedCases = [
      { ...cases[0], title: 'Zulu checkout', priority: 'Low', automationReadiness: 'Candidate' },
      { ...cases[1], title: 'Alpha checkout', priority: 'Critical', automationReadiness: 'Ready' },
    ];
    render(
      <UserFlowDetail
        projectId="p1"
        flow={{ ...flow, linkedTestCases: linkedCases }}
        availableTestCases={linkedCases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Test Cases (0)' }));

    expect(screen.getByRole('button', { name: 'SHOP-1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zulu checkout' })).toBeTruthy();
    expect(screen.getByText('Critical').parentElement?.className).toContain('border-red-200');
    expect(screen.getByText('Ready').parentElement?.className).toContain('border-blue-200');

    await user.click(screen.getByRole('button', { name: 'SHOP-1' }));
    const drawer = screen.getByRole('dialog', { name: 'Zulu checkout' });
    const backdrop = drawer.parentElement;
    expect(backdrop?.parentElement).toBe(document.body);
    expect(backdrop?.className).toContain('fixed');
    expect(backdrop?.className).toContain('inset-0');
    expect(screen.queryByRole('link', { name: 'SHOP-1' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Close test case detail' }));
    expect(screen.queryByRole('dialog', { name: 'Zulu checkout' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Test Cases' })).toBeTruthy();
    const titleTrigger = screen.getByRole('button', { name: 'Zulu checkout' });
    await user.click(titleTrigger);
    expect(screen.getByRole('dialog', { name: 'Zulu checkout' })).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Zulu checkout' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(titleTrigger));

    const titleOrder = () =>
      screen.getAllByRole('button', { name: /checkout/ }).map((button) => button.textContent);
    const sortAndExpect = async (label: string, ascending: string[], descending: string[]) => {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
      expect(
        screen
          .getByRole('columnheader', { name: new RegExp(`^${label}`) })
          .getAttribute('aria-sort'),
      ).toBe('ascending');
      expect(titleOrder()).toEqual(ascending);
      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
      expect(
        screen
          .getByRole('columnheader', { name: new RegExp(`^${label}`) })
          .getAttribute('aria-sort'),
      ).toBe('descending');
      expect(titleOrder()).toEqual(descending);
    };

    await sortAndExpect(
      'TC Number',
      ['Zulu checkout', 'Alpha checkout'],
      ['Alpha checkout', 'Zulu checkout'],
    );
    await sortAndExpect(
      'Priority',
      ['Alpha checkout', 'Zulu checkout'],
      ['Zulu checkout', 'Alpha checkout'],
    );
    await sortAndExpect(
      'Automation Readiness',
      ['Zulu checkout', 'Alpha checkout'],
      ['Alpha checkout', 'Zulu checkout'],
    );
    await user.click(screen.getByRole('button', { name: 'Title' }));
    expect(screen.getByRole('columnheader', { name: /Title/ }).getAttribute('aria-sort')).toBe(
      'ascending',
    );
    expect(titleOrder()).toEqual(['Alpha checkout', 'Zulu checkout']);
    await user.click(screen.getByRole('button', { name: /Title/ }));
    expect(screen.getByRole('columnheader', { name: /Title/ }).getAttribute('aria-sort')).toBe(
      'descending',
    );
    expect(titleOrder()).toEqual(['Zulu checkout', 'Alpha checkout']);
  });
  it('uses the complete project test case record for in-context detail when link data is sparse', async () => {
    const user = userEvent.setup();
    const sparseLinkedCase = {
      ...cases[0],
      section: '',
      steps: [],
      tags: [],
      description: undefined,
      preconditions: undefined,
      mainExpectedResult: undefined,
    };
    const completeProjectCase = {
      ...cases[0],
      title: 'Complete checkout detail',
      section: 'Payments',
      description: 'Full test case description',
      preconditions: 'Signed in',
      mainExpectedResult: 'Order is created',
      steps: [{ id: 'step-1', action: 'Enter card details', expectedResult: 'Card is accepted' }],
    };
    render(
      <UserFlowDetail
        projectId="p1"
        flow={{ ...flow, linkedTestCases: [sparseLinkedCase] }}
        availableTestCases={[completeProjectCase]}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Test Cases (0)' }));
    await user.click(screen.getByRole('button', { name: 'Card checkout' }));

    expect(screen.getByRole('dialog', { name: 'Complete checkout detail' })).toBeTruthy();
    expect(screen.getByText('Full test case description')).toBeTruthy();
    expect(screen.getByText('Enter card details')).toBeTruthy();
    expect(screen.getByText('Payments')).toBeTruthy();
  });
  it('combines picker filters without dropping selections outside the filtered list', async () => {
    const user = userEvent.setup();
    const filteredCases = [
      ...cases,
      {
        id: 'tc-3',
        projectKey: 'SHOP',
        tcNumber: 3,
        title: 'Manual refund',
        section: 'Refunds',
        priority: 'Low',
        status: 'Draft',
        automationType: 'Manual',
        automationReadiness: 'Candidate',
        steps: [],
        tags: [],
      },
    ];
    render(
      <UserFlowDetail
        projectId="p1"
        flow={flow}
        availableTestCases={filteredCases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Test Cases/ }));
    await user.click(screen.getByRole('button', { name: 'Link Test Cases' }));
    for (const filter of [
      'Section',
      'Priority',
      'Status',
      'Testing Type',
      'Automation Readiness',
    ]) {
      expect(screen.getByRole('button', { name: filter })).toBeTruthy();
    }
    await user.click(screen.getByRole('checkbox', { name: /SHOP-1/ }));
    await user.click(screen.getByRole('button', { name: 'Priority' }));
    await user.click(screen.getAllByText('Low')[0]);
    expect(screen.queryByRole('checkbox', { name: /SHOP-1/ })).toBeNull();
    expect(screen.getByRole('checkbox', { name: /SHOP-3/ })).toBeTruthy();
    expect(screen.getByText('Selected: 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Link Selected (1)' }).hasAttribute('disabled')).toBe(
      false,
    );
  });
  it('closes the test case picker on Escape and restores focus to its trigger', async () => {
    const user = userEvent.setup();
    render(
      <UserFlowDetail
        projectId="p1"
        flow={flow}
        availableTestCases={cases}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Test Cases/ }));
    const trigger = screen.getByRole('button', { name: 'Link Test Cases' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Link Test Cases' })).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Link Test Cases' })).toBeNull(),
    );
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
