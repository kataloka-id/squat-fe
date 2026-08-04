/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestCaseList } from './TestCaseList.tsx';
import { AutomationReadiness, AutomationType, Priority, Status, type TestCase } from './types.ts';

const testCase: TestCase = {
  id: 'tc-1', tcNumber: 1, projectId: 'project-1', projectKey: 'PRJ',
  title: 'A deliberately long test case title that must remain in the flexible title column',
  section: 'Regression', priority: Priority.Medium, status: Status.Draft,
  automationType: AutomationType.Manual, automationReadiness: AutomationReadiness.NotAutomatable,
  isReusable: false, steps: [], tags: [], updatedAt: new Date(), createdBy: 'user',
};

const shortTitleTestCase: TestCase = { ...testCase, id: 'tc-2', title: 'Short title' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TestCaseList column layout', () => {
  it('keeps supporting columns at safe widths while leaving Title flexible', () => {
    const { container } = render(
      <TestCaseList
        testCases={[testCase, shortTitleTestCase]}
        projects={[{ id: 'project-1', key: 'PRJ', name: 'Project' } as any]}
        selectedIds={[]}
        sortField="id"
        sortOrder="asc"
        onSort={() => {}}
        onToggleSelect={() => {}}
        onToggleSelectAll={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onUpdate={() => {}}
        hasProjectSelected
      />,
    );

    const table = container.querySelector('table');
    expect(table?.className).toContain('table-fixed');
    expect(table?.className).toContain('min-w-[86rem]');

    const columns = Array.from(container.querySelectorAll('col'));
    expect(columns).toHaveLength(11);
    expect(columns[3].className).toBe(''); // Title has no fixed width and receives remaining space.
    expect(columns[1].className).toContain('w-32'); // TC Number includes its sort indicator.
    expect(columns[5].className).toContain('w-28'); // Priority includes its sort indicator.
    expect(columns[4].className).toContain('w-40'); // Section keeps enough room for a readable value without crowding Priority.
    expect(columns[7].className).toContain('w-36'); // Testing Type includes its sort indicator.
    expect(columns[8].className).toContain('w-52'); // Automation Readiness can show its badge, menu trigger, and sort indicator.
    expect(columns[9].className).toContain('w-[6.75rem]'); // Dates remain untruncated.
    expect(columns[2].className).toContain('hidden');
    expect(columns[2].className).toContain('sm:table-column');
    expect(columns[4].className).toContain('hidden');
    expect(columns[4].className).toContain('md:table-column');
    expect(columns[9].className).toContain('hidden');
    expect(columns[9].className).toContain('lg:table-column');
    expect(screen.getByRole('columnheader', { name: 'Automation Readiness' }).className).toContain('whitespace-nowrap');
    expect(screen.getByText(testCase.title)).not.toBeNull();
    expect(screen.getByText(shortTitleTestCase.title)).not.toBeNull();
    expect(screen.getAllByRole('button', { name: 'Change Automation Readiness' })).toHaveLength(2);

    // At the 86rem table minimum, fixed columns consume 74.75rem, leaving
    // 11.25rem for Title—more than Section's 10rem allocation.
    const tableMinimumRem = 86;
    const fixedColumnsRem = 74.75;
    const sectionColumnRem = 10;
    expect(tableMinimumRem - fixedColumnsRem).toBeGreaterThan(sectionColumnRem);
  });

  it('truncates a long Section inside its column and exposes its full value on hover', () => {
    const longSection = '/template-manager';
    const { container } = render(
      <TestCaseList
        testCases={[{ ...testCase, section: longSection }]}
        projects={[]}
        selectedIds={[]}
        sortField="id"
        sortOrder="asc"
        onSort={() => {}}
        onToggleSelect={() => {}}
        onToggleSelectAll={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onUpdate={() => {}}
        hasProjectSelected
      />,
    );

    const section = container.querySelector(`span[title="${longSection}"]`);
    expect(section?.className).toContain('block');
    expect(section?.className).toContain('truncate');
    expect(section?.parentElement?.className).toContain('min-w-0');
    expect(section?.parentElement?.className).toContain('md:table-cell');
  });

  it.each([
    ['id', 'TC Number'],
    ['priority', 'Priority'],
    ['automationType', 'Testing Type'],
    ['automationReadiness', 'Automation Readiness'],
  ] as const)('keeps the %s sort indicator visible and reserved for both directions', (sortField, label) => {
    const props = {
      testCases: [testCase], projects: [], selectedIds: [], sortField, sortOrder: 'asc' as const,
      onSort: () => {}, onToggleSelect: () => {}, onToggleSelectAll: () => {}, onEdit: () => {}, onDelete: () => {}, onUpdate: () => {}, hasProjectSelected: true,
    };
    const { rerender } = render(<TestCaseList {...props} />);

    const header = screen.getByRole('columnheader', { name: new RegExp(label) });
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    const ascendingIcon = screen.getByLabelText('Sorted ascending');
    expect(ascendingIcon.getAttribute('class')).toContain('shrink-0');
    expect(ascendingIcon.getAttribute('class')).toContain('w-3.5');

    rerender(<TestCaseList {...props} sortOrder="desc" />);
    expect(screen.getByRole('columnheader', { name: new RegExp(label) }).getAttribute('aria-sort')).toBe('descending');
    const descendingIcon = screen.getByLabelText('Sorted descending');
    expect(descendingIcon.getAttribute('class')).toContain('shrink-0');
    expect(descendingIcon.getAttribute('class')).toContain('w-3.5');
  });

  it.each([
    ['id', 'TC Number'],
    ['priority', 'Priority'],
    ['automationType', 'Testing Type'],
    ['automationReadiness', 'Automation Readiness'],
  ] as const)('sorts %s from its full keyboard-operable header control', async (sortField, label) => {
    const onSort = vi.fn();
    const user = userEvent.setup();
    render(
      <TestCaseList
        testCases={[testCase]}
        projects={[]}
        selectedIds={[]}
        sortField="id"
        sortOrder="asc"
        onSort={onSort}
        onToggleSelect={() => {}}
        onToggleSelectAll={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onUpdate={() => {}}
        hasProjectSelected
      />,
    );

    const control = within(screen.getByRole('columnheader', { name: new RegExp(`^${label}`) })).getByRole('button');
    expect(control.className).toContain('w-full');
    expect(control.className).toContain('focus-visible:ring-2');

    await user.click(control);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onSort).toHaveBeenCalledTimes(3);
    expect(onSort).toHaveBeenNthCalledWith(1, sortField);
    expect(onSort).toHaveBeenNthCalledWith(2, sortField);
    expect(onSort).toHaveBeenNthCalledWith(3, sortField);
  });

  it('renders an inline badge menu outside the scroll container and keeps it in a narrow viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 680, height: 30, left: 930, right: 1010, top: 650, width: 80,
      x: 930, y: 650, toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function getOffsetWidth() {
      return this.getAttribute('role') === 'listbox' ? 240 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function getOffsetHeight() {
      return this.getAttribute('role') === 'listbox' ? 120 : 0;
    });

    const { container } = render(
      <TestCaseList testCases={[testCase]} projects={[]} selectedIds={[]} sortField="id" sortOrder="asc" onSort={() => {}} onToggleSelect={() => {}} onToggleSelectAll={() => {}} onEdit={() => {}} onDelete={() => {}} onUpdate={() => {}} hasProjectSelected />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Change Automation Readiness' }));

    const menu = screen.getByRole('listbox', { name: 'Automation Readiness options' });
    expect(menu.parentElement).toBe(document.body);
    expect(container.querySelector('.overflow-x-auto')?.contains(menu)).toBe(false);
    expect(menu.className).toContain('fixed');
    expect(menu.style.left).toBe('752px');
    expect(menu.style.top).toBe('526px');
    expect(menu.style.visibility).toBe('visible');
  });

  it('clamps an oversized menu when neither side of its trigger has enough room', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 320 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 180, height: 30, left: 280, right: 320, top: 150, width: 40,
      x: 280, y: 150, toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function getOffsetWidth() {
      return this.getAttribute('role') === 'listbox' ? 240 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function getOffsetHeight() {
      return this.getAttribute('role') === 'listbox' ? 480 : 0;
    });

    render(
      <TestCaseList testCases={[testCase]} projects={[]} selectedIds={[]} sortField="id" sortOrder="asc" onSort={() => {}} onToggleSelect={() => {}} onToggleSelectAll={() => {}} onEdit={() => {}} onDelete={() => {}} onUpdate={() => {}} hasProjectSelected />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change Automation Readiness' }));

    const menu = screen.getByRole('listbox', { name: 'Automation Readiness options' });
    expect(menu.style.left).toBe('72px');
    expect(menu.style.top).toBe('8px');
    expect(menu.className).toContain('max-h-[calc(100vh-1rem)]');
    expect(menu.className).toContain('overflow-y-auto');
  });
});
