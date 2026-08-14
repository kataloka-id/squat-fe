import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Edit3, ExternalLink, X } from 'lucide-react';
import { normalizeAutomationReadiness, Status, type LinkedPrecondition, type Project, type TestCase } from './types.ts';
import { formatTestCaseDisplayId } from '@/src/utils/testCaseDisplayId.ts';
import { markdownToPlainText } from '@/src/utils/markdown.ts';
import { MarkdownContent } from './ui/Markdown.tsx';
import { Badge } from './ui/Badge.tsx';
import { Button } from './ui/Button.tsx';
import { Attachments } from './Attachments.tsx';

type TestCaseDetailProps = {
  testCase: TestCase | null;
  project?: Project;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onEdit?: (testCase: TestCase) => void;
  /** Lets read-only embedded views omit attachment requests and controls. */
  showAttachments?: boolean;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onNotify?: (message: string, type: 'success' | 'error') => void;
};

const MarkdownSection = ({ title, value, emptyText }: { title: string; value?: string; emptyText: string }) => (
  <section aria-label={title} className="border-b border-slate-100 py-5 last:border-0">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {value ? <MarkdownContent className="mt-2 text-sm text-slate-700" value={value} /> : <p className="mt-2 text-sm text-slate-400">{emptyText}</p>}
  </section>
);

const isAvailableLinkedPrecondition = (link: LinkedPrecondition) => Boolean(link.title);

const LinkedPreconditions = ({ links, projectId }: { links: LinkedPrecondition[]; projectId: string }) => (
  <div className="mt-4">
    <h4 className="text-sm font-semibold text-slate-800">Linked Reusable Test Cases</h4>
    <ol className="mt-3 space-y-2">
      {links.map((link, index) => {
        const isAvailable = isAvailableLinkedPrecondition(link);
        const displayId = formatTestCaseDisplayId(link);
        const isDeprecated = link.isDeprecated || link.status === Status.Deprecated;
        const sourceHref = `/workspace?projectId=${encodeURIComponent(projectId)}&testCaseId=${encodeURIComponent(link.testCaseId)}`;

        return (
          <li className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3" key={link.id ?? link.testCaseId}>
            <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{index + 1}</span>
            <div className="min-w-0 flex-1">
              {isAvailable ? (
                <a className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500/20" href={sourceHref} rel="noreferrer" target="_blank">
                  <span className="font-mono text-xs text-slate-500">{displayId}</span> — {markdownToPlainText(link.title!)}
                </a>
              ) : (
                <p className="text-sm font-semibold text-slate-600">Linked test case unavailable</p>
              )}
              {isAvailable && <p className="mt-1 text-xs text-slate-500">{link.status ?? 'Status unavailable'}{link.section ? ` · ${link.section}` : ''}{link.automationType ? ` · ${link.automationType}` : ''}</p>}
              {isDeprecated && <p className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle size={13} /> This linked test case is deprecated.</p>}
            </div>
            {isAvailable && <a aria-label={`Open ${displayId} in a new tab`} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20" href={sourceHref} rel="noreferrer" target="_blank"><ExternalLink size={15} /></a>}
          </li>
        );
      })}
    </ol>
  </div>
);

/** Read-only test case detail that renders stored Markdown as safe React nodes. */
export const TestCaseDetail = ({ testCase, project, onClose, onEdit, onNotify = () => {}, showAttachments = true }: TestCaseDetailProps) => {
  useEffect(() => {
    if (!testCase) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, testCase]);
  if (!testCase) return null;
  const linkedPreconditions = [...(testCase.linkedPreconditions ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const hasLinkedPreconditions = linkedPreconditions.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose} role="presentation">
      <aside aria-labelledby="test-case-detail-title" aria-modal="true" className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium text-slate-400">{formatTestCaseDisplayId(testCase, project?.key)}</p>
            <h2 className="mt-1 break-words text-lg font-bold text-slate-900 sm:text-xl" id="test-case-detail-title">{markdownToPlainText(testCase.title)}</h2>
          </div>
          <button aria-label="Close test case detail" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20" onClick={onClose} type="button"><X size={20} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2 sm:px-7">
          <div aria-label="Test case metadata" className="flex min-w-0 flex-wrap items-start gap-2 border-b border-slate-100 py-4">
            <Badge label="Priority" type="priority" value={testCase.priority} />
            <Badge label="Status" type="status" value={testCase.status} />
            <Badge label="Testing Type" type="automation" value={testCase.automationType} />
            <Badge label="Automation Readiness" type="automationReadiness" value={normalizeAutomationReadiness(testCase.automationReadiness)} />
            <Badge label="Section" type="section" value={testCase.section} />
          </div>
          <MarkdownSection emptyText="No description provided." title="Description" value={testCase.description} />
          <section aria-label="Preconditions" className="border-b border-slate-100 py-5">
            <h3 className="text-sm font-semibold text-slate-900">Preconditions</h3>
            {testCase.preconditions
              ? <MarkdownContent className="mt-2 text-sm text-slate-700" value={testCase.preconditions} />
              : !hasLinkedPreconditions && <p className="mt-2 text-sm text-slate-400">No preconditions provided.</p>}
            {hasLinkedPreconditions && <LinkedPreconditions links={linkedPreconditions} projectId={testCase.projectId} />}
          </section>
          <section aria-label="Test steps" className="border-b border-slate-100 py-5">
            <h3 className="text-sm font-semibold text-slate-900">Test Steps</h3>
            {testCase.steps.length ? <ol className="mt-3 space-y-4">{testCase.steps.map((step, index) => <li className="rounded-lg border border-slate-200 p-4" key={step.id}><p className="text-xs font-semibold text-slate-500">Step {index + 1}</p><MarkdownContent className="mt-2 text-sm text-slate-700" value={step.action} /><p className="mt-3 text-xs font-semibold text-slate-500">Expected Result</p><MarkdownContent className="mt-2 text-sm text-slate-700" value={step.expectedResult} /></li>)}</ol> : <p className="mt-2 text-sm text-slate-400">No test steps provided.</p>}
          </section>
          <MarkdownSection emptyText="No main expected result provided." title="Main Expected Result" value={testCase.mainExpectedResult} />
          {showAttachments && <Attachments canDelete={false} onNotify={onNotify} projectId={testCase.projectId} testCaseId={testCase.id} />}
        </div>

        {onEdit && <footer className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-7"><Button icon={<Edit3 size={16} />} onClick={() => onEdit(testCase)} type="button">Edit Test Case</Button></footer>}
      </aside>
    </div>
    , document.body
  );
};
