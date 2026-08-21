import React, { useEffect, useRef, useState } from 'react';
import { Download, FileJson, Upload, X } from 'lucide-react';
import type { TestCaseImportIssue, TestCaseImportPayload } from '@/src/types/api.ts';
import { AutomationReadiness, AutomationType, Priority, Project, Status } from './types.ts';
import { Button } from './ui/Button.tsx';
import { Select } from './ui/Select.tsx';

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_TEST_CASES = 100;
const LIMITS = { title: 255, section: 150, preconditions: 20000, mainExpectedResult: 10000, action: 10000, expectedResult: 10000, tag: 100 };
const KNOWN_ROOT_FIELDS = new Set(['version', 'projectKey', 'testCases']);
const KNOWN_CASE_FIELDS = new Set(['title', 'description', 'section', 'priority', 'testingType', 'automationType', 'automationReadiness', 'status', 'preconditions', 'mainExpectedResult', 'steps', 'tags']);
const KNOWN_STEP_FIELDS = new Set(['action', 'expectedResult']);

type Preview = { index: number; title: string; section: string; errors: TestCaseImportIssue[]; warnings: TestCaseImportIssue[] };
type Validation = { payload?: TestCaseImportPayload; errors: TestCaseImportIssue[]; warnings: TestCaseImportIssue[]; preview: Preview[] };

interface Props {
  isOpen: boolean;
  projects: Project[];
  sectionsByProject: Record<string, string[]>;
  preselectedProjectId?: string;
  onClose: () => void;
  onImport: CallableFunction;
}

const issue = (path: string, code: string, message: string): TestCaseImportIssue => ({ path, code, message });
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isImportIssue = (entry: unknown): entry is TestCaseImportIssue => isRecord(entry) && typeof entry.path === 'string' && typeof entry.code === 'string' && typeof entry.message === 'string';
const withServerIssues = (current: Validation | null, errors: TestCaseImportIssue[], warnings: TestCaseImportIssue[]): Validation => {
  const preview = (current?.preview ?? []).map((item) => ({ ...item, errors: errors.filter((entry) => entry.path.startsWith(`testCases[${item.index}]`)), warnings: warnings.filter((entry) => entry.path.startsWith(`testCases[${item.index}]`)) }));
  return { payload: undefined, errors, warnings, preview };
};

// The dialog test imports this pure validator; keeping it next to its UI ensures client checks remain aligned.
// eslint-disable-next-line react-refresh/only-export-components
export const validateTestCaseImport = (value: unknown, project: Project | undefined, sections: string[]): Validation => {
  const errors: TestCaseImportIssue[] = [];
  const warnings: TestCaseImportIssue[] = [];
  const preview: Preview[] = [];
  if (!isRecord(value)) return { errors: [issue('', 'INVALID_ROOT', 'Root JSON value must be an object')], warnings, preview };
  Object.keys(value).filter((key) => !KNOWN_ROOT_FIELDS.has(key)).forEach((key) => warnings.push(issue(key, 'UNKNOWN_FIELD', 'Unknown field and will be ignored')));
  if (value.version !== '1.0') errors.push(issue('version', 'UNSUPPORTED_VERSION', 'Version must be 1.0'));
  if (!project) errors.push(issue('projectId', 'REQUIRED', 'Select a target project before validating'));
  if (value.projectKey !== undefined && (typeof value.projectKey !== 'string' || value.projectKey.toUpperCase() !== project?.key.toUpperCase())) errors.push(issue('projectKey', 'PROJECT_KEY_MISMATCH', 'Project key must match the selected project'));
  if (!Array.isArray(value.testCases) || value.testCases.length === 0) errors.push(issue('testCases', 'REQUIRED', 'Test cases must be a non-empty array'));
  if (Array.isArray(value.testCases) && value.testCases.length > MAX_TEST_CASES) errors.push(issue('testCases', 'LIMIT_EXCEEDED', `A maximum of ${MAX_TEST_CASES} test cases can be imported at once`));
  const sanitized: TestCaseImportPayload['testCases'] = [];
  if (Array.isArray(value.testCases)) value.testCases.forEach((candidate, index) => {
    const path = `testCases[${index}]`;
    const itemErrors: TestCaseImportIssue[] = [];
    const itemWarnings: TestCaseImportIssue[] = [];
    const addError = (field: string, code: string, message: string) => itemErrors.push(issue(`${path}.${field}`, code, message));
    if (!isRecord(candidate)) {
      addError('', 'INVALID_TYPE', 'Test case must be an object');
      errors.push(...itemErrors); preview.push({ index, title: 'Untitled', section: '—', errors: itemErrors, warnings: itemWarnings }); return;
    }
    Object.keys(candidate).filter((key) => !KNOWN_CASE_FIELDS.has(key)).forEach((key) => itemWarnings.push(issue(`${path}.${key}`, 'UNKNOWN_FIELD', 'Unknown field and will be ignored')));
    const string = (field: string, required = false, limit?: number) => {
      const fieldValue = candidate[field];
      if (required && (typeof fieldValue !== 'string' || !fieldValue.trim())) addError(field, 'REQUIRED', `${field.replace(/([A-Z])/g, ' $1')} is required`);
      else if (fieldValue !== undefined && typeof fieldValue !== 'string') addError(field, 'INVALID_TYPE', `${field} must be a string`);
      else if (typeof fieldValue === 'string' && limit !== undefined && fieldValue.length > limit) addError(field, 'MAX_LENGTH', `${field} must not exceed ${limit} characters`);
      return typeof fieldValue === 'string' ? fieldValue : undefined;
    };
    const title = string('title', true, LIMITS.title) ?? '';
    const section = string('section', true, LIMITS.section) ?? '';
    const priority = string('priority', true) ?? '';
    const status = string('status', true) ?? '';
    const suppliedAutomationType = string('automationType');
    const suppliedTestingType = string('testingType');
    if (suppliedAutomationType && suppliedTestingType && suppliedAutomationType !== suppliedTestingType) addError('automationType', 'CONFLICT', 'automationType and testingType must match when both are supplied');
    const automationType = suppliedAutomationType ?? suppliedTestingType ?? '';
    const automationReadiness = string('automationReadiness') ?? AutomationReadiness.Candidate;
    string('description'); string('preconditions', false, LIMITS.preconditions); string('mainExpectedResult', false, LIMITS.mainExpectedResult);
    if (!automationType) addError('automationType', 'REQUIRED', 'Automation type is required');
    if (!Object.values(Priority).includes(priority as Priority)) addError('priority', 'INVALID_ENUM', 'Priority is not supported');
    if (!Object.values(Status).includes(status as Status)) addError('status', 'INVALID_ENUM', 'Status is not supported');
    if (!Object.values(AutomationType).includes(automationType as AutomationType)) addError('automationType', 'INVALID_ENUM', 'Automation type is not supported');
    if (!Object.values(AutomationReadiness).includes(automationReadiness as AutomationReadiness)) addError('automationReadiness', 'INVALID_ENUM', 'Automation readiness is not supported');
    if (section && !sections.includes(section)) addError('section', 'INVALID_SECTION', 'Section is not available for the selected project');
    if (!Array.isArray(candidate.steps) || candidate.steps.length === 0) addError('steps', 'REQUIRED', 'At least one test step is required');
    const steps: Array<{ action: string; expectedResult: string }> = [];
    if (Array.isArray(candidate.steps)) candidate.steps.forEach((step, stepIndex) => {
      const stepPath = `${path}.steps[${stepIndex}]`;
      if (!isRecord(step)) { itemErrors.push(issue(stepPath, 'INVALID_TYPE', 'Step must be an object')); return; }
      Object.keys(step).filter((key) => !KNOWN_STEP_FIELDS.has(key)).forEach((key) => itemWarnings.push(issue(`${stepPath}.${key}`, 'UNKNOWN_FIELD', 'Unknown field and will be ignored')));
      if (typeof step.action !== 'string' || !step.action.trim()) itemErrors.push(issue(`${stepPath}.action`, 'REQUIRED', 'Action is required'));
      else if (step.action.length > LIMITS.action) itemErrors.push(issue(`${stepPath}.action`, 'MAX_LENGTH', `Action must not exceed ${LIMITS.action} characters`));
      if (typeof step.expectedResult !== 'string' || !step.expectedResult.trim()) itemErrors.push(issue(`${stepPath}.expectedResult`, 'REQUIRED', 'Expected result is required'));
      else if (step.expectedResult.length > LIMITS.expectedResult) itemErrors.push(issue(`${stepPath}.expectedResult`, 'MAX_LENGTH', `Expected result must not exceed ${LIMITS.expectedResult} characters`));
      steps.push({ action: typeof step.action === 'string' ? step.action : '', expectedResult: typeof step.expectedResult === 'string' ? step.expectedResult : '' });
    });
    let tags: string[] | undefined;
    if (candidate.tags !== undefined) {
      if (!Array.isArray(candidate.tags) || candidate.tags.some((tag) => typeof tag !== 'string')) addError('tags', 'INVALID_TYPE', 'Tags must be an array of strings');
      else {
        candidate.tags.forEach((tag, tagIndex) => { if (tag.length > LIMITS.tag) itemErrors.push(issue(`${path}.tags[${tagIndex}]`, 'MAX_LENGTH', `Tag must not exceed ${LIMITS.tag} characters`)); });
        tags = candidate.tags;
      }
    }
    errors.push(...itemErrors); warnings.push(...itemWarnings);
    preview.push({ index, title: title || 'Untitled', section: section || '—', errors: itemErrors, warnings: itemWarnings });
    sanitized.push({ title, section, priority, status, automationType, automationReadiness, description: typeof candidate.description === 'string' ? candidate.description : undefined, preconditions: typeof candidate.preconditions === 'string' ? candidate.preconditions : undefined, mainExpectedResult: typeof candidate.mainExpectedResult === 'string' ? candidate.mainExpectedResult : undefined, steps, tags });
  });
  return { payload: errors.length ? undefined : { version: '1.0', projectKey: typeof value.projectKey === 'string' ? value.projectKey : undefined, testCases: sanitized }, errors, warnings, preview };
};

export const TestCaseImportDialog: React.FC<Props> = ({ isOpen, projects, sectionsByProject, preselectedProjectId, onClose, onImport }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [projectId, setProjectId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  useEffect(() => { if (isOpen) { setProjectId(''); setFile(null); setValidation(null); setFileError(null); setSuccess(null); } }, [isOpen, preselectedProjectId, projects]);
  const selectedProject = projects.find((project) => project.id === projectId);
  const setSelectedFile = (next: File | undefined) => { setValidation(null); setSuccess(null); if (!next) return; if (!next.name.toLowerCase().endsWith('.json')) { setFile(null); setFileError('Only .json files are accepted.'); return; } if (next.size === 0) { setFile(null); setFileError('The JSON file is empty.'); return; } if (next.size > MAX_FILE_SIZE) { setFile(null); setFileError('The JSON file must be 1 MiB or smaller.'); return; } setFile(next); setFileError(null); };
  const validate = async () => { if (!projectId) { setFileError('Select a target project before validating.'); return; } if (!file) { setFileError('Choose a JSON file to validate.'); return; } try { setFileError(null); const parsed: unknown = JSON.parse(await file.text()); setValidation(validateTestCaseImport(parsed, selectedProject, sectionsByProject[projectId] ?? [])); } catch { setValidation({ errors: [issue('', 'MALFORMED_JSON', 'File contains malformed JSON')], warnings: [], preview: [] }); } };
  const templateSection = projectId ? (sectionsByProject[projectId] ?? [])[0] : undefined;
  const downloadTemplate = () => { if (!templateSection) return; const template = { version: '1.0', testCases: [{ title: 'Example test case', description: 'Raw **Markdown** is preserved.', section: templateSection, priority: 'Not Defined', automationType: 'Manual', automationReadiness: 'Candidate', status: 'Draft', preconditions: 'Open the application.', mainExpectedResult: 'The outcome is visible.', steps: [{ action: 'Open the page.', expectedResult: 'The page is displayed.' }], tags: [] }] }; const url = URL.createObjectURL(new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'test-cases-import-template.json'; anchor.click(); URL.revokeObjectURL(url); };
  const submit = async () => {
    if (!validation?.payload || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await onImport(projectId, validation.payload);
      setSuccess(`${result.importedCount} test case${result.importedCount === 1 ? '' : 's'} imported successfully.`);
    } catch (error: unknown) {
      const payload = error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response ? error.response.data : error;
      const serverErrors = payload && typeof payload === 'object' && 'errors' in payload && Array.isArray(payload.errors) ? payload.errors.filter(isImportIssue) : [];
      const serverWarnings = payload && typeof payload === 'object' && 'warnings' in payload && Array.isArray(payload.warnings) ? payload.warnings.filter(isImportIssue) : [];
      if (serverErrors.length || serverWarnings.length) setValidation((current) => withServerIssues(current, serverErrors, serverWarnings));
      setFileError(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Import failed.');
    } finally { submittingRef.current = false; setLoading(false); }
  };
  const canImport = !!validation?.payload && validation.errors.length === 0 && !loading;
  if (!isOpen) return null;
  return <><div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} /><div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation"><section aria-labelledby="import-test-cases-title" aria-modal="true" className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog"><header className="flex items-start justify-between border-b border-slate-200 p-5"><div><h2 className="text-xl font-bold" id="import-test-cases-title">Import Test Cases from JSON</h2><p className="mt-1 text-sm text-slate-500">Validate the file before all test cases are imported together.</p></div><button aria-label="Close import dialog" className="p-2 text-slate-500" onClick={onClose} type="button"><X /></button></header><div className="space-y-5 p-5"><label className="block text-sm font-semibold">Target project<Select aria-label="Target project" className="mt-1.5" value={projectId} onChange={(value) => { setProjectId(String(value)); setValidation(null); setSuccess(null); }} options={projects.map((project) => ({ value: project.id, label: `${project.key} — ${project.name}` }))} placeholder="Select project" size="md" /></label><input ref={inputRef} accept=".json,application/json" className="sr-only" id="test-case-json-file" onChange={(event) => setSelectedFile(event.target.files?.[0])} type="file" /><div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setSelectedFile(event.dataTransfer.files[0]); }}><FileJson className="mx-auto text-brand-600" /><p className="mt-2 text-sm">Drop a .json file here or <button className="font-semibold text-brand-600 underline" onClick={() => inputRef.current?.click()} type="button">browse files</button></p>{file && <p className="mt-2 text-sm text-slate-600">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}</div>{fileError && <p role="alert" className="text-sm text-red-700">{fileError}</p>}<button className="text-sm font-medium text-brand-600 underline disabled:cursor-not-allowed disabled:opacity-50" disabled={!templateSection} onClick={downloadTemplate} type="button"><Download className="mr-1 inline h-4 w-4" />Download JSON Template</button>{validation && <div className="space-y-3 rounded-lg bg-slate-50 p-4"><p className="font-semibold">Validation preview: {validation.preview.length} total · {validation.preview.filter((item) => !item.errors.length).length} valid · {validation.preview.filter((item) => item.errors.length).length} invalid · {validation.warnings.length} warnings · {selectedProject?.key ?? 'No project'}</p>{[...validation.errors, ...validation.warnings].map((entry, index) => <p className={validation.errors.includes(entry) ? 'text-sm text-red-700' : 'text-sm text-amber-700'} key={`${entry.path}-${index}`}>{entry.path || 'file'}: {entry.message}</p>)}{validation.preview.map((item) => <div className="rounded border border-slate-200 bg-white p-3 text-sm" key={item.index}><strong>{item.index + 1}. {item.title}</strong> · {item.section} · <span className={item.errors.length ? 'text-red-700' : 'text-emerald-700'}>{item.errors.length ? 'Invalid' : 'Valid'}</span>{[...item.errors, ...item.warnings].map((entry, index) => <p className="mt-1" key={`${entry.path}-${index}`}>{entry.path}: {entry.message}</p>)}</div>)}</div>}{success && <p role="status" className="text-sm text-emerald-700">{success}</p>}</div><footer className="flex justify-end gap-3 border-t border-slate-200 p-5"><Button onClick={onClose} type="button" variant="secondary">Cancel</Button><Button disabled={!file || !projectId || loading} icon={<Upload size={16} />} onClick={() => void validate()} type="button" variant="secondary">Validate</Button><Button disabled={!canImport} onClick={() => void submit()} type="button">{loading ? 'Importing…' : 'Import'}</Button></footer></section></div></>;
};
