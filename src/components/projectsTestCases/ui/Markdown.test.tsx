// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownContent, MarkdownEditor } from './Markdown.tsx';
import { markdownToPlainText } from '@/src/utils/markdown.ts';
import { TestCaseForm } from '../TestCaseForm.tsx';
import { TestCaseDetail } from '../TestCaseDetail.tsx';
import { AutomationReadiness, AutomationType, Priority, Status, type Project, type TestCase } from '../types.ts';

describe('Markdown authoring', () => {
  const project: Project = { id: 'project-1', key: 'PROJ', name: 'Project', description: '', lead: '', status: 'Active', dueDate: new Date(), updatedAt: new Date(), stats: { testCasesCount: 0, passRate: 0 }, members: [] };

  it('keeps raw Markdown while rendering the supported safe subset', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor id="example" label="Example" onChange={onChange} value="" />);
    fireEvent.change(screen.getByLabelText('Example'), { target: { value: '**bold**' } });
    expect(onChange).toHaveBeenCalledWith('**bold**');

    render(<MarkdownContent value={'**bold** and *italic*\n\n- first\n- second\n\n1. ordered\n\n`code`\n\n```\nconst safe = true;\n```\n\n[docs](https://example.com)'} />);
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('italic').tagName).toBe('EM');
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getByText('const safe = true;').closest('pre')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('href')).toBe('https://example.com');
  });

  it('does not create executable HTML or unsafe links from user input', () => {
    const { container } = render(<MarkdownContent value={'<script>alert(1)</script>\n\n[bad](javascript:alert(1))'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('converts Markdown to a layout-safe plain-text excerpt', () => {
    expect(markdownToPlainText('**Deploy** [guide](https://example.com)\n- `now`')).toBe('Deploy guide now');
  });

  it('keeps Markdown associated with its step after drag reorder and submits raw values', () => {
    const initialData: TestCase = {
      id: 'case-1', projectId: project.id, title: '**Case**', section: 'General', priority: Priority.Medium, status: Status.Draft,
      automationType: AutomationType.Manual, preconditions: '*Signed in*', mainExpectedResult: '**Main outcome**', tags: [], updatedAt: new Date(), createdBy: 'tester',
      steps: [{ id: 'first', action: '**First action**', expectedResult: '`first`' }, { id: 'second', action: '*Second action*', expectedResult: '`second`' }],
    };
    const onSave = vi.fn();
    const { container } = render(<TestCaseForm initialData={initialData} isOpen onClose={() => {}} onSave={onSave} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    const steps = container.querySelectorAll('article[draggable="true"]');
    fireEvent.dragStart(steps[0]);
    fireEvent.dragOver(steps[1]);
    fireEvent.drop(steps[1]);
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: '**Case**',
      preconditions: '*Signed in*',
      mainExpectedResult: '**Main outcome**',
      steps: [
        expect.objectContaining({ id: 'second', action: '*Second action*', expectedResult: '`second`' }),
        expect.objectContaining({ id: 'first', action: '**First action**', expectedResult: '`first`' }),
      ],
    }));
  });

  it('reorders raw Markdown steps with the keyboard-accessible move control', () => {
    const initialData: TestCase = { id: 'case-1', projectId: project.id, title: '**Case**', section: 'General', priority: Priority.Medium, status: Status.Draft, automationType: AutomationType.Manual, tags: [], updatedAt: new Date(), createdBy: 'tester', steps: [{ id: 'first', action: '**First**', expectedResult: '`one`' }, { id: 'second', action: '*Second*', expectedResult: '`two`' }] };
    const onSave = vi.fn();
    const { container } = render(<TestCaseForm initialData={initialData} isOpen onClose={() => {}} onSave={onSave} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    expect((within(container).getByRole('button', { name: 'Move step 1 up' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(container).getByRole('button', { name: 'Move step 2 up' }));
    expect(within(container).getByText('Step moved to position 1.')).not.toBeNull();
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ steps: [
      expect.objectContaining({ id: 'second', action: '*Second*', expectedResult: '`two`' }),
      expect.objectContaining({ id: 'first', action: '**First**', expectedResult: '`one`' }),
    ] }));
  });

  it('retains the required title validation before submission', () => {
    const onSave = vi.fn();
    const { container } = render(<TestCaseForm isOpen onClose={() => {}} onSave={onSave} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    const title = within(container).getByLabelText('Title') as HTMLTextAreaElement;
    expect(title.required).toBe(true);
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('uses Testing Type and defaults Automation Readiness to Candidate before Status', () => {
    const { container } = render(<TestCaseForm isOpen onClose={() => {}} onSave={() => {}} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    const testingType = within(container).getByText('Testing Type');
    const readiness = within(container).getByText('Automation Readiness');
    const status = within(container).getByText('Status');
    expect(testingType.compareDocumentPosition(readiness) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(readiness.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((within(container).getByLabelText('Candidate') as HTMLInputElement).checked).toBe(true);
    expect(within(container).getByText('Indicate whether this test case is suitable and ready for automation.')).not.toBeNull();
    expect(within(container).queryByText('Automation type')).toBeNull();
  });

  it('opens a legacy case without readiness as Candidate and preserves its testing type and status', () => {
    const onSave = vi.fn();
    const initialData: TestCase = { id: 'legacy-readiness', projectId: project.id, title: 'Legacy', section: 'General', priority: Priority.Medium, status: Status.Review, automationType: AutomationType.API, tags: [], updatedAt: new Date(), createdBy: 'tester', steps: [] };
    const { container } = render(<TestCaseForm initialData={initialData} isOpen onClose={() => {}} onSave={onSave} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    expect((within(container).getByLabelText('Candidate') as HTMLInputElement).checked).toBe(true);
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ automationType: AutomationType.API, automationReadiness: AutomationReadiness.Candidate, status: Status.Review }));
  });

  it('submits an optional Description as raw Markdown after Title and before configuration', () => {
    const onSave = vi.fn();
    const { container } = render(<TestCaseForm isOpen onClose={() => {}} onSave={onSave} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    const title = within(container).getByRole('textbox', { name: 'Title' });
    const description = within(container).getByRole('textbox', { name: 'Description' });
    expect(title.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(description.getAttribute('placeholder')).toBe('Describe the purpose, context, and scope of this test case...');
    expect(within(container).getByText('Provide additional context about what this test case validates.')).not.toBeNull();

    fireEvent.change(title, { target: { value: 'Case' } });
    fireEvent.change(description, { target: { value: '**Purpose**\n\n- scope' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ description: '**Purpose**\n\n- scope' }));
  });

  it('keeps legacy cases without Description editable', () => {
    const onSave = vi.fn();
    const initialData: TestCase = { id: 'legacy-description', projectId: project.id, title: 'Legacy', section: 'General', priority: Priority.Medium, status: Status.Draft, automationType: AutomationType.Manual, tags: [], updatedAt: new Date(), createdBy: 'tester', steps: [] };
    const { container } = render(<TestCaseForm initialData={initialData} isOpen onClose={() => {}} onSave={onSave} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    expect((within(container).getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement).value).toBe('');
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('description');
  });

  it('previews Description safely without interpreting raw HTML', () => {
    const { container } = render(<TestCaseForm isOpen onClose={() => {}} onSave={() => {}} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    const description = within(container).getByRole('textbox', { name: 'Description' });
    fireEvent.change(description, { target: { value: '<script>window.pwned = true</script>\n\n**Safe context**' } });
    fireEvent.click(within(description.parentElement!).getByRole('button', { name: 'Preview' }));
    const preview = within(container).getByLabelText('Description preview');
    expect(preview.querySelector('script')).toBeNull();
    expect(preview.textContent).toContain('<script>window.pwned = true</script>');
    expect(within(preview).getByText('Safe context').tagName).toBe('STRONG');
  });

  it('renders Description in the detail drawer without executing raw HTML', () => {
    const testCase: TestCase = { id: 'detail-case', projectId: project.id, title: 'Detail', section: 'General', priority: Priority.Medium, status: Status.Draft, automationType: AutomationType.Manual, description: '<script>window.pwned = true</script>\n\n**Safe context**', tags: [], updatedAt: new Date(), createdBy: 'tester', steps: [] };
    const { container } = render(<TestCaseDetail onClose={() => {}} onEdit={() => {}} project={project} testCase={testCase} />);
    const description = within(container).getByRole('region', { name: 'Description' });
    expect(within(container).getByText('Testing Type')).not.toBeNull();
    expect(within(container).getByText('Automation Readiness')).not.toBeNull();
    expect(within(container).getByText('Candidate')).not.toBeNull();
    expect(description.querySelector('script')).toBeNull();
    expect(description.textContent).toContain('<script>window.pwned = true</script>');
    expect(within(description).getByText('Safe context').tagName).toBe('STRONG');
  });

  it('submits an optional raw main expected result separately from step expected results', () => {
    const onSave = vi.fn();
    const { container } = render(<TestCaseForm isOpen onClose={() => {}} onSave={onSave} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    fireEvent.change(within(container).getByRole('textbox', { name: 'Title' }), { target: { value: 'Case' } });
    fireEvent.change(within(container).getByRole('textbox', { name: 'Main Expected Result' }), { target: { value: '**Overall success**' } });
    fireEvent.change(within(container).getByRole('textbox', { name: 'Step 1 expected result' }), { target: { value: '`step success`' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      mainExpectedResult: '**Overall success**',
      steps: [expect.objectContaining({ expectedResult: '`step success`' })],
    }));
  });

  it('initializes legacy cases without a main expected result and preserves an empty optional value', () => {
    const onSave = vi.fn();
    const initialData: TestCase = { id: 'legacy', projectId: project.id, title: 'Legacy', section: 'General', priority: Priority.Medium, status: Status.Draft, automationType: AutomationType.Manual, tags: [], updatedAt: new Date(), createdBy: 'tester', steps: [] };
    const { container } = render(<TestCaseForm initialData={initialData} isOpen onClose={() => {}} onSave={onSave} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    const field = within(container).getByRole('textbox', { name: 'Main Expected Result' }) as HTMLTextAreaElement;
    expect(field.value).toBe('');
    expect(field.maxLength).toBe(10000);
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('mainExpectedResult');
  });

  it('previews a main expected result safely without rendering raw HTML', () => {
    const { container } = render(<TestCaseForm isOpen onClose={() => {}} onSave={() => {}} projects={[project]} sectionsByProject={{ [project.id]: ['General'] }} />);
    fireEvent.change(within(container).getByRole('textbox', { name: 'Main Expected Result' }), { target: { value: '<script>window.pwned = true</script>\n\n**Safe text**' } });
    fireEvent.click(within(container).getAllByRole('button', { name: 'Preview' }).at(-1)!);
    const preview = within(container).getByLabelText('Main Expected Result preview');
    expect(preview.querySelector('script')).toBeNull();
    expect(preview.textContent).toContain('<script>window.pwned = true</script>');
    expect(within(preview).getByText('Safe text').tagName).toBe('STRONG');
  });
});
