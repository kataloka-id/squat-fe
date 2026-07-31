/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TestCaseDetail } from './TestCaseDetail.tsx';
import { AutomationType, Priority, Status, type Project, type TestCase } from './types.ts';

const project: Project = { id: 'project-1', key: 'ADTU', name: 'Project', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [] };

const makeCase = (overrides: Partial<TestCase> = {}): TestCase => ({
  id: 'parent', projectId: project.id, projectKey: project.key, tcNumber: 10, title: 'Parent', section: 'General', priority: Priority.Medium,
  status: Status.Ready, automationType: AutomationType.Manual, tags: [], updatedAt: new Date(), createdBy: 'user', steps: [], ...overrides,
});

const renderDetail = (testCase: TestCase) => render(<TestCaseDetail onClose={() => {}} onEdit={() => {}} project={project} testCase={testCase} />);

afterEach(cleanup);

describe('TestCaseDetail linked reusable preconditions', () => {
  it('shows the generic empty state only when neither text nor linked preconditions exist', () => {
    renderDetail(makeCase());
    expect(within(screen.getByRole('region', { name: 'Preconditions' })).getByText('No preconditions provided.')).toBeTruthy();
  });

  it('continues to render text-only Markdown preconditions without an empty linked container', () => {
    renderDetail(makeCase({ preconditions: '**Signed in**' }));
    const preconditions = screen.getByRole('region', { name: 'Preconditions' });
    expect(within(preconditions).getByText('Signed in').tagName).toBe('STRONG');
    expect(within(preconditions).queryByText('Linked Reusable Test Cases')).toBeNull();
  });

  it('shows linked-only preconditions instead of the generic empty state', () => {
    renderDetail(makeCase({ linkedPreconditions: [{ testCaseId: 'source-1', sortOrder: 1, projectKey: 'ADTU', tcNumber: 1, title: 'Test Cases A', status: Status.Draft, section: 'Auth', automationType: AutomationType.Manual }] }));
    const preconditions = screen.getByRole('region', { name: 'Preconditions' });
    expect(within(preconditions).queryByText('No preconditions provided.')).toBeNull();
    expect(within(preconditions).getByText('Linked Reusable Test Cases')).toBeTruthy();
    expect(within(preconditions).getByText(/ADTU-1/)).toBeTruthy();
    expect(within(preconditions).getByText('Draft · Auth · Manual')).toBeTruthy();
  });

  it('renders Markdown and linked preconditions together', () => {
    renderDetail(makeCase({ preconditions: '**Signed in**', linkedPreconditions: [{ testCaseId: 'source-1', sortOrder: 1, projectKey: 'ADTU', tcNumber: 1, title: 'Login', status: Status.Ready }] }));
    const preconditions = screen.getByRole('region', { name: 'Preconditions' });
    expect(within(preconditions).getByText('Signed in')).toBeTruthy();
    expect(within(preconditions).getByRole('link', { name: /Login/ })).toBeTruthy();
  });

  it('uses persisted sort order rather than response order', () => {
    renderDetail(makeCase({ linkedPreconditions: [
      { testCaseId: 'source-2', sortOrder: 2, projectKey: 'ADTU', tcNumber: 2, title: 'Second', status: Status.Ready },
      { testCaseId: 'source-1', sortOrder: 1, projectKey: 'ADTU', tcNumber: 1, title: 'First', status: Status.Ready },
    ] }));
    const entries = within(screen.getByRole('region', { name: 'Preconditions' })).getAllByRole('listitem');
    expect(entries.map((entry) => entry.textContent)).toEqual([expect.stringContaining('First'), expect.stringContaining('Second')]);
  });

  it('keeps deprecated links visible with a warning and opens sources in a new tab', () => {
    renderDetail(makeCase({ linkedPreconditions: [{ testCaseId: 'source-1', sortOrder: 1, projectKey: 'ADTU', tcNumber: 1, title: 'Deprecated source', status: Status.Deprecated, isDeprecated: true }] }));
    expect(screen.getByText('This linked test case is deprecated.')).toBeTruthy();
    const open = screen.getByRole('link', { name: 'Open ADTU-1 in a new tab' });
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('href')).toBe('/workspace?projectId=project-1&testCaseId=source-1');
  });

  it('renders an unavailable state without a source link when legacy relation metadata is missing', () => {
    renderDetail(makeCase({ linkedPreconditions: [{ testCaseId: 'missing-source', sortOrder: 1 }] }));
    const preconditions = screen.getByRole('region', { name: 'Preconditions' });
    expect(within(preconditions).getByText('Linked test case unavailable')).toBeTruthy();
    expect(within(preconditions).queryByRole('link')).toBeNull();
  });
});
