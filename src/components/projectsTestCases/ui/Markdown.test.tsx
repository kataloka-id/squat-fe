// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AttachmentsService } from '@/src/api/attachments.service.ts';
import {
  insertMarkdownAtSelection,
  MarkdownContent,
  MarkdownEditor,
  normalizeGithubImageHtml,
} from './Markdown.tsx';
import { markdownToPlainText } from '@/src/utils/markdown.ts';
import { TestCaseForm } from '../TestCaseForm.tsx';
import { TestCaseDetail } from '../TestCaseDetail.tsx';
import {
  AutomationReadiness,
  AutomationType,
  Priority,
  Status,
  type Project,
  type TestCase,
} from '../types.ts';

describe('Markdown authoring', () => {
  const project: Project = {
    id: 'project-1',
    key: 'PROJ',
    name: 'Project',
    description: '',
    lead: '',
    status: 'Active',
    dueDate: new Date(),
    updatedAt: new Date(),
    stats: { testCasesCount: 0, passRate: 0 },
    members: [],
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('inserts pasted Markdown at the selection without changing its line structure', () => {
    expect(
      insertMarkdownAtSelection('before selected after', 7, 15, '## Heading\n\n- item'),
    ).toEqual({
      value: 'before ## Heading\n\n- item after',
      cursor: 25,
    });
  });

  it('normalizes safe GitHub image HTML but leaves unsafe HTML inert', () => {
    expect(
      normalizeGithubImageHtml(
        'Before <img width="527" alt="image" src="https://github.com/user-attachments/assets/a" /> after',
      ),
    ).toBe('Before ![image](https://github.com/user-attachments/assets/a) after');
    expect(normalizeGithubImageHtml('<img src="javascript:alert(1)" />')).toBe(
      '<img src="javascript:alert(1)" />',
    );
  });

  it('pastes converted GitHub image Markdown at the active cursor', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor id="paste" label="Paste" onChange={onChange} value="before after" />);
    const editor = screen.getByLabelText('Paste') as HTMLTextAreaElement;
    editor.setSelectionRange(7, 7);
    fireEvent.paste(editor, {
      clipboardData: {
        items: [],
        getData: () => '<img alt="image" src="https://github.com/user-attachments/assets/a" />',
      },
    });
    expect(onChange).toHaveBeenCalledWith(
      'before ![image](https://github.com/user-attachments/assets/a)after',
    );
  });

  it('uploads a clipboard image through the existing attachment flow and inserts a stable reference', async () => {
    vi.spyOn(AttachmentsService, 'getConfig').mockResolvedValue({
      data: { maxFileSizeBytes: 1024 },
      success: true,
      code: 'OK',
      message: 'OK',
    });
    const attachmentId = '46fca483-f28b-43da-9476-5c7e9d0cfc08';
    const create = vi.spyOn(AttachmentsService, 'createUploadUrl').mockResolvedValue({
      success: true,
      code: 'OK',
      message: 'OK',
      data: {
        attachment: {
          id: attachmentId,
          projectId: 'project-1',
          testCaseId: null,
          originalFileName: 'shot.png',
          mimeType: 'image/png',
          fileSize: 3,
          status: 'PENDING',
          createdAt: '',
        },
        uploadUrl: 'https://signed.example/upload',
        method: 'PUT',
        requiredHeaders: { 'Content-Type': 'image/png' },
        expiresIn: 300,
      },
    });
    vi.spyOn(AttachmentsService, 'complete').mockResolvedValue({
      success: true,
      code: 'OK',
      message: 'OK',
      data: {} as never,
    });
    const put = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', put);
    const onChange = vi.fn();
    render(
      <MarkdownEditor
        attachmentContext={{ projectId: 'project-1' }}
        id="upload"
        label="Upload"
        onChange={onChange}
        value="before after"
      />,
    );
    await waitFor(() => expect(AttachmentsService.getConfig).toHaveBeenCalled());
    const editor = screen.getByLabelText('Upload') as HTMLTextAreaElement;
    editor.setSelectionRange(7, 7);
    const file = new File(['png'], 'shot.png', { type: 'image/png' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'project-1', fileName: 'shot.png' }),
      ),
    );
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        `before ![shot.png](attachment://${attachmentId})after`,
      ),
    );
    expect(put).toHaveBeenCalledWith(
      'https://signed.example/upload',
      expect.objectContaining({ credentials: 'omit', headers: { 'Content-Type': 'image/png' } }),
    );
  });

  it('resolves internal image references through the authorized URL endpoint', async () => {
    const attachmentId = '46fca483-f28b-43da-9476-5c7e9d0cfc08';
    vi.spyOn(AttachmentsService, 'getViewUrl').mockResolvedValue({
      success: true,
      code: 'OK',
      message: 'OK',
      data: { url: 'https://signed.example/view', expiresIn: 600 },
    });
    render(<MarkdownContent value={`![Screenshot](attachment://${attachmentId})`} />);
    expect(screen.getByRole('status').textContent).toContain('Loading image preview');
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Screenshot' }).getAttribute('src')).toBe(
        'https://signed.example/view',
      ),
    );
    expect(AttachmentsService.getViewUrl).toHaveBeenCalledWith(attachmentId);
  });

  it('uses the same validation for unsupported clipboard and picker images', async () => {
    vi.spyOn(AttachmentsService, 'getConfig').mockResolvedValue({
      data: { maxFileSizeBytes: 3 },
      success: true,
      code: 'OK',
      message: 'OK',
    });
    const onChange = vi.fn();
    render(
      <MarkdownEditor
        attachmentContext={{ projectId: 'project-1' }}
        id="validate"
        label="Validate"
        onChange={onChange}
        value=""
      />,
    );
    await waitFor(() => expect(AttachmentsService.getConfig).toHaveBeenCalled());
    const editor = screen.getByLabelText('Validate');
    const svg = new File(['svg'], 'unsafe.svg', { type: 'image/svg+xml' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/svg+xml', getAsFile: () => svg }],
        getData: () => '',
      },
    });
    expect(screen.getByRole('alert').textContent).toContain('Choose a PNG');
    fireEvent.change(screen.getByLabelText('Select image for Validate'), {
      target: { files: [new File(['1234'], 'large.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('or smaller'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses the direct upload flow for a dropped image and leaves Markdown unchanged after failure', async () => {
    vi.spyOn(AttachmentsService, 'getConfig').mockResolvedValue({
      data: { maxFileSizeBytes: 1024 },
      success: true,
      code: 'OK',
      message: 'OK',
    });
    vi.spyOn(AttachmentsService, 'createUploadUrl').mockRejectedValue(
      new Error('Upload URL unavailable'),
    );
    const onChange = vi.fn();
    render(
      <MarkdownEditor
        attachmentContext={{ projectId: 'project-1' }}
        id="drop"
        label="Drop"
        onChange={onChange}
        value="keep"
      />,
    );
    await waitFor(() => expect(AttachmentsService.getConfig).toHaveBeenCalled());
    fireEvent.drop(screen.getByLabelText('Drop'), {
      dataTransfer: {
        files: [new File(['png'], 'drop.png', { type: 'image/png' })],
        types: ['Files'],
      },
    });
    await waitFor(() => expect(screen.getByText('Upload URL unavailable')).not.toBeNull());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps text entered while an image upload is pending before inserting its reference', async () => {
    const attachmentId = '46fca483-f28b-43da-9476-5c7e9d0cfc08';
    vi.spyOn(AttachmentsService, 'getConfig').mockResolvedValue({
      data: { maxFileSizeBytes: 1024 },
      success: true,
      code: 'OK',
      message: 'OK',
    });
    vi.spyOn(AttachmentsService, 'createUploadUrl').mockResolvedValue({
      success: true,
      code: 'OK',
      message: 'OK',
      data: {
        attachment: {
          id: attachmentId,
          projectId: 'project-1',
          testCaseId: 'case-1',
          originalFileName: 'shot.png',
          mimeType: 'image/png',
          fileSize: 3,
          status: 'PENDING',
          createdAt: '',
        },
        uploadUrl: 'https://signed.example/upload',
        method: 'PUT',
        requiredHeaders: { 'Content-Type': 'image/png' },
        expiresIn: 300,
      },
    });
    let finishUpload: (() => void) | undefined;
    vi.spyOn(AttachmentsService, 'complete').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishUpload = () =>
            resolve({ success: true, code: 'OK', message: 'OK', data: {} as never });
        }),
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const ControlledEditor = () => {
      const [value, setValue] = useState('before ');
      return (
        <MarkdownEditor
          attachmentContext={{ projectId: 'project-1', testCaseId: 'case-1' }}
          id="concurrent"
          label="Concurrent"
          onChange={setValue}
          value={value}
        />
      );
    };
    render(<ControlledEditor />);
    await waitFor(() => expect(AttachmentsService.getConfig).toHaveBeenCalled());
    const editor = screen.getByLabelText('Concurrent') as HTMLTextAreaElement;
    editor.setSelectionRange(7, 7);
    const file = new File(['png'], 'shot.png', { type: 'image/png' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });
    await waitFor(() => expect(finishUpload).toBeTypeOf('function'));
    fireEvent.change(editor, { target: { value: 'before later' } });
    finishUpload?.();
    await waitFor(() =>
      expect((screen.getByLabelText('Concurrent') as HTMLTextAreaElement).value).toBe(
        `before later![shot.png](attachment://${attachmentId})`,
      ),
    );
  });

  it('gives every Test Case Markdown field the shared image editor while keeping Title plain text', () => {
    const initialData: TestCase = {
      id: 'case-1',
      projectId: project.id,
      title: 'Existing',
      section: 'General',
      priority: Priority.Medium,
      status: Status.Draft,
      automationType: AutomationType.Manual,
      tags: [],
      updatedAt: new Date(),
      createdBy: 'tester',
      steps: [{ id: 'step-1', action: '', expectedResult: '' }],
    };
    const { container } = render(
      <TestCaseForm
        initialData={initialData}
        isOpen
        onClose={() => {}}
        onSave={() => {}}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    for (const label of [
      'Description',
      'Preconditions',
      'Step 1 action',
      'Step 1 expected result',
      'Main Expected Result',
    ]) {
      expect(within(container).getByRole('textbox', { name: label }).tagName).toBe('TEXTAREA');
    }
    expect(within(container).getAllByRole('button', { name: 'Add image' })).toHaveLength(5);
    expect(within(container).getByLabelText('Title').tagName).toBe('INPUT');
  });

  it('keeps raw Markdown while rendering the supported safe subset', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor id="example" label="Example" onChange={onChange} value="" />);
    fireEvent.change(screen.getByLabelText('Example'), { target: { value: '**bold**' } });
    expect(onChange).toHaveBeenCalledWith('**bold**');

    render(
      <MarkdownContent
        value={
          '**bold** and *italic*\n\n- first\n- second\n\n1. ordered\n\n`code`\n\n```\nconst safe = true;\n```\n\n[docs](https://example.com)'
        }
      />,
    );
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('italic').tagName).toBe('EM');
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(screen.getByText('const safe = true;').closest('pre')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('href')).toBe(
      'https://example.com',
    );
  });

  it('switches independently between accessible Write and Preview tabs', () => {
    render(
      <>
        <MarkdownEditor id="first" label="First" onChange={() => {}} value="**First**" />
        <MarkdownEditor id="second" label="Second" onChange={() => {}} value="Second" />
      </>,
    );
    const firstTabs = screen.getByRole('tablist', { name: 'First editor mode' });
    const secondTabs = screen.getByRole('tablist', { name: 'Second editor mode' });
    fireEvent.click(within(firstTabs).getByRole('tab', { name: 'Preview' }));
    expect(
      within(firstTabs).getByRole('tab', { name: 'Preview' }).getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.getByLabelText('First preview').textContent).toContain('First');
    expect(
      within(secondTabs).getByRole('tab', { name: 'Write' }).getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.getByLabelText('Second')).not.toBeNull();
  });

  it('applies formatting around the active selection and keeps the editor focused', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <MarkdownEditor id="selection" label="Selection" onChange={onChange} value="alpha beta" />,
    );
    const editor = within(container).getByLabelText('Selection') as HTMLTextAreaElement;
    const markdownEditor = editor.closest('.rounded-lg') as HTMLElement;
    editor.focus();
    editor.setSelectionRange(6, 10);
    fireEvent.mouseDown(within(markdownEditor).getByRole('button', { name: 'Bold' }));
    fireEvent.click(within(markdownEditor).getByRole('button', { name: 'Bold' }));
    expect(onChange).toHaveBeenLastCalledWith('alpha **beta**');
    await waitFor(() => expect(document.activeElement).toBe(editor));

    editor.setSelectionRange(0, 12);
    fireEvent.click(within(markdownEditor).getByRole('button', { name: 'Quote' }));
    expect(onChange).toHaveBeenLastCalledWith('> alpha beta');
  });

  it('prefixes each selected line for list formatting and renders quotes', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <MarkdownEditor id="list" label="List" onChange={onChange} value={'one\ntwo'} />,
    );
    const editor = within(container).getByLabelText('List') as HTMLTextAreaElement;
    editor.setSelectionRange(0, 7);
    fireEvent.click(
      within(editor.closest('.rounded-lg') as HTMLElement).getByRole('button', {
        name: 'Bulleted list',
      }),
    );
    expect(onChange).toHaveBeenLastCalledWith('- one\n- two');
    rerender(<MarkdownContent value="> Important context" />);
    expect(screen.getByText('Important context').closest('blockquote')).not.toBeNull();
  });

  it('does not create executable HTML or unsafe links from user input', () => {
    const { container } = render(
      <MarkdownContent value={'<script>alert(1)</script>\n\n[bad](javascript:alert(1))'} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('converts Markdown to a layout-safe plain-text excerpt', () => {
    expect(markdownToPlainText('**Deploy** [guide](https://example.com)\n- `now`')).toBe(
      'Deploy guide now',
    );
  });

  it('keeps Markdown associated with its step after drag reorder and submits raw values', () => {
    const initialData: TestCase = {
      id: 'case-1',
      projectId: project.id,
      title: '**Case**',
      section: 'General',
      priority: Priority.Medium,
      status: Status.Draft,
      automationType: AutomationType.Manual,
      preconditions: '*Signed in*',
      mainExpectedResult: '**Main outcome**',
      tags: [],
      updatedAt: new Date(),
      createdBy: 'tester',
      steps: [
        { id: 'first', action: '**First action**', expectedResult: '`first`' },
        { id: 'second', action: '*Second action*', expectedResult: '`second`' },
      ],
    };
    const onSave = vi.fn();
    const { container } = render(
      <TestCaseForm
        initialData={initialData}
        isOpen
        onClose={() => {}}
        onSave={onSave}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    const steps = container.querySelectorAll('article[draggable="true"]');
    fireEvent.dragStart(steps[0]);
    fireEvent.dragOver(steps[1]);
    fireEvent.drop(steps[1]);
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '**Case**',
        preconditions: '*Signed in*',
        mainExpectedResult: '**Main outcome**',
        steps: [
          expect.objectContaining({
            id: 'second',
            action: '*Second action*',
            expectedResult: '`second`',
          }),
          expect.objectContaining({
            id: 'first',
            action: '**First action**',
            expectedResult: '`first`',
          }),
        ],
      }),
      'close',
    );
  });

  it('reorders raw Markdown steps with the keyboard-accessible move control', () => {
    const initialData: TestCase = {
      id: 'case-1',
      projectId: project.id,
      title: '**Case**',
      section: 'General',
      priority: Priority.Medium,
      status: Status.Draft,
      automationType: AutomationType.Manual,
      tags: [],
      updatedAt: new Date(),
      createdBy: 'tester',
      steps: [
        { id: 'first', action: '**First**', expectedResult: '`one`' },
        { id: 'second', action: '*Second*', expectedResult: '`two`' },
      ],
    };
    const onSave = vi.fn();
    const { container } = render(
      <TestCaseForm
        initialData={initialData}
        isOpen
        onClose={() => {}}
        onSave={onSave}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    expect(
      (within(container).getByRole('button', { name: 'Move step 1 up' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(within(container).getByRole('button', { name: 'Move step 2 up' }));
    expect(within(container).getByText('Step moved to position 1.')).not.toBeNull();
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [
          expect.objectContaining({ id: 'second', action: '*Second*', expectedResult: '`two`' }),
          expect.objectContaining({ id: 'first', action: '**First**', expectedResult: '`one`' }),
        ],
      }),
      'close',
    );
  });

  it('retains the required title validation before submission', () => {
    const onSave = vi.fn();
    const { container } = render(
      <TestCaseForm
        isOpen
        onClose={() => {}}
        onSave={onSave}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    const title = within(container).getByLabelText('Title') as HTMLInputElement;
    expect(title.required).toBe(true);
    expect(title.tagName).toBe('INPUT');
    expect(within(title.parentElement!).queryByRole('tablist')).toBeNull();
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('uses Testing Type and defaults Automation Readiness to Candidate before Status', () => {
    const { container } = render(
      <TestCaseForm
        isOpen
        onClose={() => {}}
        onSave={() => {}}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    const testingType = within(container).getByText('Testing Type');
    const readiness = within(container).getByText('Automation Readiness');
    const status = within(container).getByText('Status');
    expect(
      testingType.compareDocumentPosition(readiness) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      readiness.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect((within(container).getByLabelText('Candidate') as HTMLInputElement).checked).toBe(true);
    expect(
      within(container).getByText(
        'Indicate whether this test case is suitable and ready for automation.',
      ),
    ).not.toBeNull();
    expect(within(container).queryByText('Automation type')).toBeNull();
  });

  it('uses a wider desktop form layout and weighted non-wrapping readiness choices', () => {
    const { container } = render(
      <TestCaseForm
        isOpen
        onClose={() => {}}
        onSave={() => {}}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    expect(within(container).getByRole('dialog').className).toContain('max-w-[90rem]');

    const readinessFieldset = within(container)
      .getByText('Automation Readiness')
      .closest('fieldset')!;
    const readinessOptions = readinessFieldset.querySelector('div');
    expect(readinessOptions?.className).toContain(
      'lg:grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(0,1fr))]',
    );

    for (const readiness of Object.values(AutomationReadiness)) {
      expect(
        within(readinessFieldset).getByLabelText(readiness).parentElement?.className,
      ).toContain('min-h-11');
      expect(
        within(readinessFieldset).getByLabelText(readiness).parentElement?.className,
      ).toContain('whitespace-nowrap');
    }
  });

  it('opens a legacy case without readiness as Candidate and preserves its testing type and status', () => {
    const onSave = vi.fn();
    const initialData: TestCase = {
      id: 'legacy-readiness',
      projectId: project.id,
      title: 'Legacy',
      section: 'General',
      priority: Priority.Medium,
      status: Status.Review,
      automationType: AutomationType.API,
      tags: [],
      updatedAt: new Date(),
      createdBy: 'tester',
      steps: [],
    };
    const { container } = render(
      <TestCaseForm
        initialData={initialData}
        isOpen
        onClose={() => {}}
        onSave={onSave}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    expect((within(container).getByLabelText('Candidate') as HTMLInputElement).checked).toBe(true);
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        automationType: AutomationType.API,
        automationReadiness: AutomationReadiness.Candidate,
        status: Status.Review,
      }),
      'close',
    );
  });

  it('submits an optional Description as raw Markdown after Title and before configuration', () => {
    const onSave = vi.fn();
    const { container } = render(
      <TestCaseForm
        isOpen
        onClose={() => {}}
        onSave={onSave}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    const title = within(container).getByRole('textbox', { name: 'Title' });
    const description = within(container).getByRole('textbox', { name: 'Description' });
    expect(
      title.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(description.getAttribute('placeholder')).toBe(
      'Describe the purpose, context, and scope of this test case...',
    );
    expect(
      within(container).getByText(
        'Provide additional context about what this test case validates.',
      ),
    ).not.toBeNull();

    fireEvent.change(title, { target: { value: 'Case' } });
    fireEvent.change(description, { target: { value: '**Purpose**\n\n- scope' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: '**Purpose**\n\n- scope' }),
      'close',
    );
  });

  it('keeps legacy cases without Description editable', () => {
    const onSave = vi.fn();
    const initialData: TestCase = {
      id: 'legacy-description',
      projectId: project.id,
      title: 'Legacy',
      section: 'General',
      priority: Priority.Medium,
      status: Status.Draft,
      automationType: AutomationType.Manual,
      tags: [],
      updatedAt: new Date(),
      createdBy: 'tester',
      steps: [],
    };
    const { container } = render(
      <TestCaseForm
        initialData={initialData}
        isOpen
        onClose={() => {}}
        onSave={onSave}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    expect(
      (within(container).getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement)
        .value,
    ).toBe('');
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('description');
  });

  it('previews Description safely without interpreting raw HTML', () => {
    const { container } = render(
      <TestCaseForm
        isOpen
        onClose={() => {}}
        onSave={() => {}}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    const description = within(container).getByRole('textbox', { name: 'Description' });
    fireEvent.change(description, {
      target: { value: '<script>window.pwned = true</script>\n\n**Safe context**' },
    });
    fireEvent.click(
      within(container)
        .getByRole('tablist', { name: 'Description editor mode' })
        .querySelector('[role="tab"][aria-selected="false"]')!,
    );
    const preview = within(container).getByLabelText('Description preview');
    expect(preview.querySelector('script')).toBeNull();
    expect(preview.textContent).toContain('<script>window.pwned = true</script>');
    expect(within(preview).getByText('Safe context').tagName).toBe('STRONG');
  });

  it('renders Description in the detail drawer without executing raw HTML', () => {
    const testCase: TestCase = {
      id: 'detail-case',
      projectId: project.id,
      title: 'Detail',
      section: 'General',
      priority: Priority.Medium,
      status: Status.Draft,
      automationType: AutomationType.Manual,
      description: '<script>window.pwned = true</script>\n\n**Safe context**',
      tags: [],
      updatedAt: new Date(),
      createdBy: 'tester',
      steps: [],
    };
    const { container } = render(
      <TestCaseDetail onClose={() => {}} onEdit={() => {}} project={project} testCase={testCase} />,
    );
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
    const { container } = render(
      <TestCaseForm
        isOpen
        onClose={() => {}}
        onSave={onSave}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    fireEvent.change(within(container).getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Case' },
    });
    fireEvent.change(within(container).getByRole('textbox', { name: 'Main Expected Result' }), {
      target: { value: '**Overall success**' },
    });
    fireEvent.change(within(container).getByRole('textbox', { name: 'Step 1 expected result' }), {
      target: { value: '`step success`' },
    });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        mainExpectedResult: '**Overall success**',
        steps: [expect.objectContaining({ expectedResult: '`step success`' })],
      }),
      'close',
    );
  });

  it('initializes legacy cases without a main expected result and preserves an empty optional value', () => {
    const onSave = vi.fn();
    const initialData: TestCase = {
      id: 'legacy',
      projectId: project.id,
      title: 'Legacy',
      section: 'General',
      priority: Priority.Medium,
      status: Status.Draft,
      automationType: AutomationType.Manual,
      tags: [],
      updatedAt: new Date(),
      createdBy: 'tester',
      steps: [],
    };
    const { container } = render(
      <TestCaseForm
        initialData={initialData}
        isOpen
        onClose={() => {}}
        onSave={onSave}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    const field = within(container).getByRole('textbox', {
      name: 'Main Expected Result',
    }) as HTMLTextAreaElement;
    expect(field.value).toBe('');
    expect(field.maxLength).toBe(10000);
    fireEvent.submit(container.querySelector('form')!);
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('mainExpectedResult');
  });

  it('previews a main expected result safely without rendering raw HTML', () => {
    const { container } = render(
      <TestCaseForm
        isOpen
        onClose={() => {}}
        onSave={() => {}}
        projects={[project]}
        sectionsByProject={{ [project.id]: ['General'] }}
      />,
    );
    fireEvent.change(within(container).getByRole('textbox', { name: 'Main Expected Result' }), {
      target: { value: '<script>window.pwned = true</script>\n\n**Safe text**' },
    });
    fireEvent.click(
      within(container)
        .getByRole('tablist', { name: 'Main Expected Result editor mode' })
        .querySelector('[role="tab"][aria-selected="false"]')!,
    );
    const preview = within(container).getByLabelText('Main Expected Result preview');
    expect(preview.querySelector('script')).toBeNull();
    expect(preview.textContent).toContain('<script>window.pwned = true</script>');
    expect(within(preview).getByText('Safe text').tagName).toBe('STRONG');
  });
});
