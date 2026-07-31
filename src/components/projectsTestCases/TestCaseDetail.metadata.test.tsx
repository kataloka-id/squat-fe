/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TestCaseDetail } from './TestCaseDetail.tsx';
import { AutomationReadiness, AutomationType, Priority, Status, type Project, type TestCase } from './types.ts';

const project: Project = { id: 'project-1', key: 'ADTU', name: 'Project', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [] };

const testCase: TestCase = {
  id: 'detail-case', projectId: project.id, projectKey: project.key, tcNumber: 1, title: 'Detail', section: 'Profile - Authentication',
  priority: Priority.High, status: Status.Ready, automationType: AutomationType.UI, automationReadiness: AutomationReadiness.NotAutomatable,
  tags: [], updatedAt: new Date(), createdBy: 'tester', steps: [],
};

afterEach(cleanup);

describe('TestCaseDetail metadata', () => {
  it('renders every metadata field as a consistently sized, wrapping chip', () => {
    render(<TestCaseDetail onClose={() => {}} onEdit={() => {}} project={project} testCase={testCase} />);

    const metadata = screen.getByLabelText('Test case metadata');
    expect(metadata.className).toContain('flex-wrap');
    expect(metadata.className).toContain('gap-2');

    const chips = Array.from(metadata.children) as HTMLElement[];
    expect(chips).toHaveLength(5);
    for (const chip of chips) {
      expect(chip.className).toContain('min-h-7');
      expect(chip.className).toContain('max-w-full');
      expect(chip.className).toContain('rounded-md');
    }

    expect(within(metadata).getByText('Priority')).toBeTruthy();
    expect(within(metadata).getByText('High')).toBeTruthy();
    expect(within(metadata).getByText('Status')).toBeTruthy();
    expect(within(metadata).getByText('Ready')).toBeTruthy();
    expect(within(metadata).getByText('Testing Type')).toBeTruthy();
    expect(within(metadata).getByText('UI')).toBeTruthy();
    expect(within(metadata).getByText('Automation Readiness')).toBeTruthy();
    expect(within(metadata).getByText('Not Automatable')).toBeTruthy();
    expect(within(metadata).getByText('Section')).toBeTruthy();
    expect(within(metadata).getByText('Profile - Authentication')).toBeTruthy();
  });
});
