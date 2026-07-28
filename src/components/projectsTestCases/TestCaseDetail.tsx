import { Edit3, X } from 'lucide-react';
import { normalizeAutomationReadiness, type Project, type TestCase } from './types.ts';
import { formatTestCaseDisplayId } from '@/src/utils/testCaseDisplayId.ts';
import { markdownToPlainText } from '@/src/utils/markdown.ts';
import { MarkdownContent } from './ui/Markdown.tsx';
import { Badge } from './ui/Badge.tsx';
import { Button } from './ui/Button.tsx';

type TestCaseDetailProps = {
  testCase: TestCase | null;
  project?: Project;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onEdit: (testCase: TestCase) => void;
};

const MarkdownSection = ({ title, value, emptyText }: { title: string; value?: string; emptyText: string }) => (
  <section aria-label={title} className="border-b border-slate-100 py-5 last:border-0">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {value ? <MarkdownContent className="mt-2 text-sm text-slate-700" value={value} /> : <p className="mt-2 text-sm text-slate-400">{emptyText}</p>}
  </section>
);

/** Read-only test case detail that renders stored Markdown as safe React nodes. */
export const TestCaseDetail = ({ testCase, project, onClose, onEdit }: TestCaseDetailProps) => {
  if (!testCase) return null;

  return (
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
          <div className="flex flex-wrap gap-2 border-b border-slate-100 py-4">
            <Badge type="priority" value={testCase.priority} />
            <Badge type="status" value={testCase.status} />
            <span className="inline-flex items-center gap-1.5"><span className="text-xs font-medium text-slate-500">Testing Type</span><Badge type="automation" value={testCase.automationType} /></span>
            <span className="inline-flex items-center gap-1.5"><span className="text-xs font-medium text-slate-500">Automation Readiness</span><Badge type="automationReadiness" value={normalizeAutomationReadiness(testCase.automationReadiness)} /></span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">{testCase.section}</span>
          </div>
          <MarkdownSection emptyText="No description provided." title="Description" value={testCase.description} />
          <MarkdownSection emptyText="No preconditions provided." title="Preconditions" value={testCase.preconditions} />
          <section aria-label="Test steps" className="border-b border-slate-100 py-5">
            <h3 className="text-sm font-semibold text-slate-900">Test Steps</h3>
            {testCase.steps.length ? <ol className="mt-3 space-y-4">{testCase.steps.map((step, index) => <li className="rounded-lg border border-slate-200 p-4" key={step.id}><p className="text-xs font-semibold text-slate-500">Step {index + 1}</p><MarkdownContent className="mt-2 text-sm text-slate-700" value={step.action} /><p className="mt-3 text-xs font-semibold text-slate-500">Expected Result</p><MarkdownContent className="mt-2 text-sm text-slate-700" value={step.expectedResult} /></li>)}</ol> : <p className="mt-2 text-sm text-slate-400">No test steps provided.</p>}
          </section>
          <MarkdownSection emptyText="No main expected result provided." title="Main Expected Result" value={testCase.mainExpectedResult} />
        </div>

        <footer className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-7"><Button icon={<Edit3 size={16} />} onClick={() => onEdit(testCase)} type="button">Edit Test Case</Button></footer>
      </aside>
    </div>
  );
};
