/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestCaseImportDialog, validateTestCaseImport } from './TestCaseImportDialog.tsx';
import { Project } from './types.ts';
import { selectCustomOption } from '@/src/test/selectTestUtils.ts';

const project: Project = { id: 'p1', name: 'Atlas', key: 'ATTE', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [] };
const valid = { version: '1.0', projectKey: 'ATTE', ignoredRoot: true, testCases: [{ title: 'Case', section: 'Uncategorized', priority: 'High', testingType: 'UI', automationReadiness: 'Candidate', status: 'Ready', description: '**raw**', steps: [{ action: 'Do this', expectedResult: 'It works', legacy: 'ignored' }], legacyReference: 'old' }] };

afterEach(cleanup);

describe('test case JSON import validation', () => {
  it('maps testingType, preserves Markdown, and warns about unknown fields', () => {
    const result = validateTestCaseImport(valid, project, ['Uncategorized']);
    expect(result.errors).toEqual([]);
    expect(result.payload?.testCases[0]).toMatchObject({ automationType: 'UI', description: '**raw**' });
    expect(result.warnings.map((warning) => warning.path)).toEqual(expect.arrayContaining(['ignoredRoot', 'testCases[0].legacyReference', 'testCases[0].steps[0].legacy']));
  });

  it('reports paths for project mismatches, enums, and missing step values', () => {
    const result = validateTestCaseImport({ ...valid, projectKey: 'NOPE', testCases: [{ ...valid.testCases[0], priority: 'Urgent', steps: [{ action: '', expectedResult: '' }] }] }, project, ['Uncategorized']);
    expect(result.errors.map((error) => error.path)).toEqual(expect.arrayContaining(['projectKey', 'testCases[0].priority', 'testCases[0].steps[0].action', 'testCases[0].steps[0].expectedResult']));
  });

  it('uses backend limits, defaults optional readiness, and rejects conflicting testing types', () => {
    const result = validateTestCaseImport({ ...valid, projectKey: 'atte', testCases: [{ ...valid.testCases[0], title: 'x'.repeat(256), automationType: 'API', testingType: 'UI', automationReadiness: undefined, preconditions: 'x'.repeat(20001), mainExpectedResult: 'x'.repeat(10001), tags: ['x'.repeat(101)], steps: [{ action: 'x'.repeat(10001), expectedResult: 'x'.repeat(10001) }] }] }, project, ['Uncategorized']);
    expect(result.errors.map((error) => error.path)).toEqual(expect.arrayContaining(['testCases[0].title', 'testCases[0].automationType', 'testCases[0].preconditions', 'testCases[0].mainExpectedResult', 'testCases[0].tags[0]', 'testCases[0].steps[0].action', 'testCases[0].steps[0].expectedResult']));
    const defaulted = validateTestCaseImport({ ...valid, projectKey: 'atte', testCases: [{ ...valid.testCases[0], automationReadiness: undefined }] }, project, ['Uncategorized']);
    expect(defaulted.errors).toEqual([]);
    expect(defaulted.payload?.testCases[0].automationReadiness).toBe('Candidate');
  });
});

describe('TestCaseImportDialog', () => {
  it('rejects a non-JSON file selected through the picker', async () => {
    const { container } = render(<TestCaseImportDialog isOpen projects={[project]} sectionsByProject={{ p1: ['Uncategorized'] }} onClose={() => {}} onImport={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['plain'], 'cases.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('alert').textContent).toContain('Only .json files');
  });

  it('validates a JSON file dropped on the upload area and enables import', async () => {
    const user = userEvent.setup();
    const { container } = render(<TestCaseImportDialog isOpen projects={[project]} sectionsByProject={{ p1: ['Uncategorized'] }} onClose={() => {}} onImport={vi.fn().mockResolvedValue({ importedCount: 1 })} />);
    const dropZone = container.querySelector('.border-dashed') as HTMLDivElement;
    const file = new File([JSON.stringify(valid)], 'cases.json', { type: 'application/json' });
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect((screen.getByRole('button', { name: 'Download JSON Template' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Validate' }) as HTMLButtonElement).disabled).toBe(true);
    await selectCustomOption(user, 'Target project', 'p1');
    expect((screen.getByRole('button', { name: 'Download JSON Template' }) as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Validate' }));
    expect(await screen.findByText(/Validation preview: 1 total/)).not.toBeNull();
    expect((screen.getByRole('button', { name: 'Import' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('maps normalized server validation errors to the affected preview item', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn().mockRejectedValue({ message: 'Validation failed', errors: [{ path: 'testCases[0].steps[0].expectedResult', code: 'REQUIRED', message: 'Expected result is required' }], warnings: [{ path: 'testCases[0].legacyReference', code: 'UNKNOWN_FIELD', message: 'Unknown field and will be ignored' }] });
    const { container } = render(<TestCaseImportDialog isOpen projects={[project]} sectionsByProject={{ p1: ['Uncategorized'] }} onClose={() => {}} onImport={onImport} />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File([JSON.stringify(valid)], 'cases.json', { type: 'application/octet-stream' })] } });
    await selectCustomOption(user, 'Target project', 'p1');
    await user.click(screen.getByRole('button', { name: 'Validate' }));
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect((await screen.findAllByText('testCases[0].steps[0].expectedResult: Expected result is required')).length).toBe(2);
    expect(screen.getByText(/1\. Case/).parentElement?.textContent).toContain('Invalid');
  });
});
