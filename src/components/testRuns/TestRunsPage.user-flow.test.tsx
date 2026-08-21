// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { CreateRun } from './TestRunsPage.tsx';

const serviceMocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/src/api/user-flows.service.ts', async () => {
  const actual = await vi.importActual<typeof import('@/src/api/user-flows.service.ts')>('@/src/api/user-flows.service.ts');
  return { ...actual, UserFlowsService: { ...actual.UserFlowsService, list: serviceMocks.list } };
});
vi.mock('@/src/api/projects.service.ts', () => ({
  ProjectsService: { listTestCases: vi.fn().mockResolvedValue({ data: [] }) },
}));

describe('CreateRun User Flow selection', () => {
  beforeEach(() => {
    serviceMocks.list.mockResolvedValue({ data: { flows: [] } });
  });
  afterEach(() => cleanup());

  it('shows the User Flow empty state in User Flow selection mode', async () => {
    serviceMocks.list.mockResolvedValueOnce({ data: { flows: [] } });
    render(<CreateRun projectId="project-1" members={[]} onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('tab', { name: 'User Flows' });
    fireEvent.click(screen.getByRole('tab', { name: 'User Flows' }));
    expect(await screen.findByText('Belum ada User Flow')).toBeTruthy();
  });

  it('renders shared human-readable flow labels while retaining slug values for filtering', async () => {
    serviceMocks.list.mockResolvedValueOnce({
      data: {
        flows: [{
          id: 'flow-1', flowKey: 'UF-1', title: 'Checkout', description: '', area: 'Store',
          priority: 'not_defined', health: 'unknown', status: 'deprecated',
          linkedTestCaseCount: 0, automatedTestCaseCount: 0, coverage: 0,
        }],
      },
    });
    render(<CreateRun projectId="project-1" members={[]} onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'User Flows' }));

    expect(await screen.findByText('Health: Unknown · Priority: Not Defined · Status: Deprecated')).toBeTruthy();
    expect(screen.queryByText(/unknown|not_defined|deprecated/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Health' }));
    expect(await screen.findByRole('option', { name: 'Unknown' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'unknown' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Unknown' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Health' }).textContent).toContain('Unknown'));
  });

  it('portals the modal to the body and locks scroll without discarding scrollbar compensation', () => {
    const onClose = vi.fn();
    const { unmount } = render(<CreateRun projectId="project-1" members={[]} onClose={onClose} onCreated={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Buat Test Run' });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain('inset-0');
    expect(dialog.className).toContain('min-h-dvh');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.paddingRight).toBe(`${window.innerWidth - document.documentElement.clientWidth}px`);
    unmount();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.paddingRight).toBe('');
  });

  it('uses intrinsic tab sizing and a responsive two-column modal with independently scrollable selection lists', async () => {
    render(<CreateRun projectId="project-1" members={[]} onClose={vi.fn()} onCreated={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Buat Test Run' });
    const panel = dialog.firstElementChild as HTMLElement;
    const tabList = screen.getByRole('tablist', { name: 'Pilih berdasarkan' });
    const tabs = screen.getAllByRole('tab');

    expect(panel.className).toContain('sm:w-[80vw]');
    expect(panel.className).toContain('sm:max-h-[85vh]');
    expect(panel.className).toContain('sm:max-w-6xl');
    expect(tabList.className).toContain('inline-flex');
    expect(tabList.className).toContain('w-fit');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    fireEvent.click(tabs[1]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');

    const selectionList = await screen.findByText('Belum ada User Flow');
    const scrollableList = selectionList.closest('.overflow-y-auto');
    expect(scrollableList?.className).toContain('overflow-y-auto');
    expect(scrollableList?.className).toContain('max-h-[min(36rem,42vh)]');
    expect(dialog.querySelector('footer')?.className).toContain('shrink-0');
  });
});
