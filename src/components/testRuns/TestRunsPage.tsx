/* eslint-disable no-unused-vars -- TypeScript callback props are misidentified by repository lint configuration. */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock3,
  ChevronDown,
  Eye,
  FileText,
  Pencil,
  Trash2,
  LoaderCircle,
  PauseCircle,
  Play,
  Plus,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react';
import { TestRunsService, type TestRunFilters } from '@/src/api/test-runs.service.ts';
import { FLOW_HEALTHS, FLOW_LABELS, FLOW_PRIORITIES, FLOW_STATUSES, UserFlowsService, type UserFlow } from '@/src/api/user-flows.service.ts';
import { ProjectsService } from '@/src/api/projects.service.ts';
import { onExecutionDataChanged } from '@/src/api/execution-refresh.ts';
import { MarkdownContent, MarkdownEditor } from '@/src/components/projectsTestCases/ui/Markdown.tsx';
import { ConfirmationModal } from '@/src/components/projectsTestCases/ui/ConfirmationModal.tsx';
import { Modal } from '@/src/components/projectsTestCases/ui/Modal.tsx';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import { Select } from '@/src/components/projectsTestCases/ui/Select.tsx';
import { Chip } from '@/src/components/projectsTestCases/ui/Chip.tsx';
import {
  ROW_ACTIONS_CELL_CLASS,
  RowActions,
} from '@/src/components/projectsTestCases/ui/RowActions.tsx';
import type { Project } from '@/src/components/projectsTestCases/types.ts';
import type {
  ProjectMemberRecord,
  ProjectTestCaseRecord,
  TestRunDetailRecord,
  TestRunExecutionRecord,
  TestRunOwnerRecord,
  TestRunRecord,
  TestRunResult,
} from '@/src/types/api.ts';
import { formatPercentage, percentageNumber } from '@/src/utils/percentage.ts';
import {
  deriveExecutionResult,
  formatTestRunDisplayId,
  progressFromExecutions,
  resultBreakdown,
  resultLabel,
} from './metrics.ts';
import { canTransitionExecutionResult, executionResultOptions, isTerminalExecutionResult } from './result-transition.ts';
import { InfoPopover } from '@/src/components/projectsTestCases/ui/InfoPopover.tsx';
import { useSessionUser } from '@/src/auth/SessionContext.tsx';
import { canManageTestRuns, testRunActions } from './test-run-actions.ts';

type Props = {
  projects: Project[];
  projectId: string;
  runId?: string;
  executionId?: string;
  onProjectChange: (id: string) => void;
  onRunChange: (id?: string) => void;
  onOpenUserFlow?: (projectId: string, userFlowId: string) => void;
  returnToReports?: boolean;
  onReturnToReports?: () => void;
};
const label = (user?: { username?: string | null; email?: string | null } | null) =>
  user?.username || user?.email || '—';
const StatusIcon = ({ value }: { value: string }) => {
  const props = { className: 'h-3 w-3', 'aria-hidden': true as const };
  if (value === 'Completed' || value === 'Passed') return <CheckCircle2 {...props} />;
  if (value === 'Failed') return <XCircle {...props} />;
  if (value === 'Blocked') return <PauseCircle {...props} />;
  if (value === 'In Progress') return <Play {...props} />;
  if (value === 'Draft' || value === 'Untested') return <Clock3 {...props} />;
  return <Circle {...props} />;
};
const StatusBadge = ({ value }: { value: string }) => (
  <Chip
    type="status"
    value={value}
    displayValue={resultLabel(value)}
    leadingIcon={<StatusIcon value={value} />}
  />
);

const statusHelp = (
  <div className="space-y-1.5 text-xs">
    <p className="font-semibold text-slate-900">Status ditentukan dari execution result</p>
    <p>
      <strong>Draft</strong>: belum ada result terminal.
    </p>
    <p>
      <strong>In Progress</strong>: sebagian case sudah dieksekusi.
    </p>
    <p>
      <strong>Blocked</strong>: semua case selesai dan ada result Blocked.
    </p>
    <p>
      <strong>Completed</strong>: semua case mencapai result terminal tanpa Blocked.
    </p>
  </div>
);
const typeHelp = (
  <div className="space-y-1.5 text-xs">
    <p className="font-semibold text-slate-900">Type dari automation source</p>
    <p>
      <strong>Manual</strong>: semua snapshot case Manual.
    </p>
    <p>
      <strong>Automated</strong>: semua snapshot case UI/API.
    </p>
    <p>
      <strong>Mixed</strong>: ada kombinasi Manual dan UI/API.
    </p>
  </div>
);

const ProjectSelect = ({
  projects,
  projectId,
  onProjectChange,
}: Pick<Props, 'projects' | 'projectId' | 'onProjectChange'>) => (
  <label className="flex min-w-52 flex-col gap-1 text-xs font-medium text-slate-600">
    <span>Project</span>
    <Select
      aria-label="Project"
      value={projectId}
      onChange={(value) => onProjectChange(String(value))}
      options={projects.map((project) => ({ value: project.id, label: project.name }))}
      placeholder="Pilih proyek"
      size="md"
    />
  </label>
);

export const TestRunsPage = ({
  projects,
  projectId,
  runId,
  executionId,
  onProjectChange,
  onRunChange,
  onOpenUserFlow,
  returnToReports,
  onReturnToReports,
}: Props) => {
  const sessionUser = useSessionUser();
  const [runs, setRuns] = useState<TestRunRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMemberRecord[]>([]);
  const currentUser: TestRunOwnerRecord | null = sessionUser
    ? {
        id: sessionUser.id,
        username: sessionUser.username?.trim() || null,
        email: sessionUser.email,
      }
    : null;
  const [filters, setFilters] = useState<TestRunFilters>({});
  const [creating, setCreating] = useState(false);
  const [editingRun, setEditingRun] = useState<TestRunRecord | null>(null);
  const [deletingRun, setDeletingRun] = useState<TestRunRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const canManage = canManageTestRuns(sessionUser?.roleSlug);
  const onRunChangeRef = useRef(onRunChange);
  useEffect(() => {
    onRunChangeRef.current = onRunChange;
  }, [onRunChange]);
  const load = useCallback(async () => {
    if (!projectId) {
      setRuns([]);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const response = await TestRunsService.list(projectId, filters);
      setRuns(response.data.items);
      setError(null);
    } catch (cause) {
      setError((cause as { message?: string }).message || 'Data tidak dapat dimuat saat ini.');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(
    () =>
      onExecutionDataChanged((changedProjectId) => {
        if (changedProjectId === projectId) void load();
      }),
    [projectId, load],
  );
  useEffect(() => {
    let active = true;
    if (!projectId) {
      setMembers([]);
      return () => {
        active = false;
      };
    }
    void ProjectsService.listMembers(projectId)
      .then((response) => active && setMembers(response.data))
      .catch(() => active && setMembers([]));
    return () => {
      active = false;
    };
  }, [projectId]);
  const deleteRun = async () => {
    if (!deletingRun) return;
    setDeleting(true);
    try {
      await TestRunsService.delete(projectId, deletingRun.id);
      setDeletingRun(null);
      await load();
    } catch (cause) {
      setError((cause as { message?: string }).message || 'Test Run tidak dapat dihapus.');
    } finally {
      setDeleting(false);
    }
  };
  useEffect(() => {
    setFilters({});
    onRunChangeRef.current();
  }, [projectId]);
  if (runId && projectId)
    return (
      <RunDetail
        projectId={projectId}
        runId={runId}
        executionId={executionId}
        members={members}
        currentUser={currentUser}
        canManage={canManage}
        onOpenUserFlow={onOpenUserFlow}
        onBack={() => (returnToReports ? onReturnToReports?.() : onRunChange())}
      />
    );
  const setFilter = (key: keyof TestRunFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  return (
    <div className="animate-in fade-in mx-auto w-full max-w-[1920px] space-y-5 duration-300">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Test Runs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola dan pantau eksekusi pengujian untuk proyek aktif.
          </p>
        </div>
        <Button
          icon={<Plus size={17} />}
          disabled={!projectId}
          title={!projectId ? 'Pilih proyek sebelum membuat Test Run.' : undefined}
          onClick={() => setCreating(true)}
        >
          Buat Test Run
        </Button>
      </header>
      <section className="rounded-xl border border-slate-200/60 bg-white/60 p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <ProjectSelect
            projects={projects}
            projectId={projectId}
            onProjectChange={onProjectChange}
          />
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
            <span>Search</span>
            <span className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                disabled={!projectId}
                value={filters.search || ''}
                onChange={(event) => setFilter('search', event.target.value)}
                placeholder="Cari Test Run…"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
              />
            </span>
          </label>
          {[
            ['Status', 'status', ['Draft', 'In Progress', 'Completed', 'Blocked']],
            ['Type', 'type', ['Manual', 'Automated', 'Mixed']],
          ].map(([name, key, options]) => (
            <label
              key={String(key)}
              className="flex flex-col gap-1 text-xs font-medium text-slate-600"
            >
              <span>{name}</span>
              <Select
                aria-label={String(name)}
                disabled={!projectId}
                value={String(filters[key as keyof TestRunFilters] || '')}
                onChange={(value) => setFilter(key as keyof TestRunFilters, String(value))}
                options={(options as string[]).map((option) => ({
                  value: option,
                  label: resultLabel(option),
                }))}
                placeholder="Semua"
                size="md"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            <span>Owner</span>
            <Select
              aria-label="Owner"
              disabled={!projectId}
              value={filters.ownerId || ''}
              onChange={(value) => setFilter('ownerId', String(value))}
              options={members.map((member) => ({
                value: member.userId || member.id || '',
                label: member.username || member.userEmail || member.email || 'User',
              }))}
              placeholder="Semua"
              size="md"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            <span>Time range</span>
            <input
              aria-label="Updated after"
              type="date"
              disabled={!projectId}
              value={filters.dateFrom || ''}
              onChange={(event) => setFilter('dateFrom', event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <button
            type="button"
            disabled={!projectId}
            onClick={() => setFilters({})}
            className="h-10 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            Reset filter
          </button>
        </div>
      </section>
      {!projectId ? (
        <Empty
          icon={<ClipboardList />}
          title="Belum ada proyek dipilih"
          text="Pilih proyek untuk melihat Test Runs."
        />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : loading ? (
        <Skeleton />
      ) : runs.length === 0 ? (
        <Empty
          icon={<ClipboardList />}
          title="Belum ada Test Run"
          text="Buat Test Run pertama untuk mulai mencatat hasil pengujian proyek ini."
          action={
            <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              Buat Test Run
            </Button>
          }
        />
      ) : (
        <RunsTable
          runs={runs}
          onOpen={onRunChange}
          canManage={canManage}
          onEdit={setEditingRun}
          onDelete={setDeletingRun}
        />
      )}
      {creating && (
        <CreateRun
          projectId={projectId}
          members={members}
          onClose={() => {
            setCreating(false);
          }}
          onCreated={(id) => {
            setCreating(false);
            onRunChange(id);
          }}
        />
      )}
      {editingRun && (
        <TestRunEditor
          projectId={projectId}
          run={editingRun}
          members={members}
          onClose={() => setEditingRun(null)}
          onSaved={() => {
            setEditingRun(null);
            void load();
          }}
        />
      )}
      <ConfirmationModal
        isOpen={Boolean(deletingRun)}
        title="Delete Test Run"
        message={`Delete ${deletingRun?.name ?? 'this Test Run'}? Execution history will be retained for audit, but the run will be hidden from normal views.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete Run'}
        variant="danger"
        onClose={() => !deleting && setDeletingRun(null)}
        onConfirm={() => void deleteRun()}
      />
    </div>
  );
};

const RunsTable = ({
  runs,
  onOpen,
  onEdit,
  onDelete,
  canManage,
}: {
  runs: TestRunRecord[];
  onOpen: (id: string) => void;
  onEdit: (run: TestRunRecord) => void;
  onDelete: (run: TestRunRecord) => void;
  canManage: boolean;
}) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
    <table className="w-full min-w-[920px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          {['Test Run', 'Status', 'Type', 'Progress', 'Result', 'Owner', 'Updated', 'Actions'].map(
            (head) => (
              <th
                key={head}
                className={`px-4 py-3 ${head === 'Actions' ? ROW_ACTIONS_CELL_CLASS : ''} font-semibold`}
              >
                {head === 'Actions' ? (
                  <span className="sr-only">Actions</span>
                ) : head === 'Status' ? (
                  <span className="inline-flex items-center gap-1">
                    Status <InfoPopover label="Penjelasan Status">{statusHelp}</InfoPopover>
                  </span>
                ) : head === 'Type' ? (
                  <span className="inline-flex items-center gap-1">
                    Type <InfoPopover label="Penjelasan Type">{typeHelp}</InfoPopover>
                  </span>
                ) : (
                  head
                )}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {runs.map((run) => {
          const progress = run.progress;
          return (
            <tr key={run.id} className="group hover:bg-slate-50">
              <td className={`px-4 py-3 ${ROW_ACTIONS_CELL_CLASS}`}>
                <button
                  onClick={() => onOpen(run.id)}
                  className="font-semibold text-slate-800 hover:text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {run.name}
                </button>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {run.displayId || formatTestRunDisplayId(run.runNumber)}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={run.status} />
              </td>
              <td className="px-4 py-3">{run.type || '—'}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {progress ? (
                  <div className="min-w-24">
                    <span className="text-xs font-medium text-slate-700">
                      {progress.executed} / {progress.total}
                    </span>
                    <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-brand-600"
                        style={{
                          width: `${percentageNumber(progress.percentage, { hasDenominator: progress.total > 0 }) ?? 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {formatPercentage(progress.percentage, {
                        hasDenominator: progress.total > 0,
                      })}
                    </span>
                  </div>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">
                {progress ? (
                  <InfoPopover
                    label={`Result breakdown: ${progress.executed} dari ${progress.total} executed`}
                    trigger={
                      <span
                        className="inline-flex items-center gap-2 text-xs"
                        aria-label={`Passed ${progress.passed}, Failed ${progress.failed}, Blocked ${progress.blocked}, Skipped ${progress.skipped}, Untested ${progress.untested}`}
                      >
                        <span className="inline-flex items-center gap-0.5 font-medium text-emerald-700">
                          <StatusIcon value="Passed" />
                          {progress.passed}
                          <span className="sr-only"> Passed</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-medium text-red-700">
                          <StatusIcon value="Failed" />
                          {progress.failed}
                          <span className="sr-only"> Failed</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-medium text-amber-700">
                          <StatusIcon value="Blocked" />
                          {progress.blocked}
                          <span className="sr-only"> Blocked</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-medium text-slate-500">
                          <StatusIcon value="Skipped" />
                          {progress.skipped}
                          <span className="sr-only"> Skipped</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 font-medium text-slate-500">
                          <StatusIcon value="Untested" />
                          {progress.untested}
                          <span className="sr-only"> Untested</span>
                        </span>
                      </span>
                    }
                  >
                    <div className="mt-2 w-full space-y-1.5 border-t border-slate-100 pt-2">
                      {resultBreakdown(progress).map(({ result, count, meaning }) => (
                        <div key={result} className="flex items-start gap-2 text-xs">
                          <StatusIcon value={result} />
                          <span className="min-w-16 font-semibold">{resultLabel(result)}</span>
                          <span className="font-bold">{count}</span>
                          <span className="text-slate-500">{meaning}</span>
                        </div>
                      ))}
                    </div>
                  </InfoPopover>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">{label(run.owner)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {new Date(run.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <RunActions
                  run={run}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canManage={canManage}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
const RunActions = ({
  run,
  onOpen,
  onEdit,
  onDelete,
  canManage,
}: {
  run: TestRunRecord;
  onOpen: (id: string) => void;
  onEdit: (run: TestRunRecord) => void;
  onDelete: (run: TestRunRecord) => void;
  canManage: boolean;
}) => {
  const actions = testRunActions(run, { canManage });
  return (
    <RowActions
      aria-label={`Actions for ${run.name}`}
      actions={[
        ...(actions.includes('view') ? [{ label: 'View', icon: <Eye className="h-4 w-4" />, onClick: () => onOpen(run.id) }] : []),
        ...(actions.includes('edit') ? [{ label: 'Edit', icon: <Pencil className="h-4 w-4" />, onClick: () => onEdit(run) }] : []),
        ...(actions.includes('delete') ? [{ label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => onDelete(run), tone: 'danger' as const }] : []),
      ]}
    />
  );
};
const Empty = ({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) => (
  <section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
    <span className="mb-3 text-slate-400">{icon}</span>
    <h2 className="font-semibold text-slate-900">{title}</h2>
    <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
    {action && <div className="mt-5">{action}</div>}
  </section>
);
const Skeleton = () => (
  <div aria-label="Memuat Test Runs" className="space-y-3 rounded-xl border bg-white p-5">
    {[1, 2, 3, 4].map((item) => (
      <div key={item} className="h-12 animate-pulse rounded bg-slate-100" />
    ))}
  </div>
);
const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <Empty
    icon={<AlertCircle />}
    title="Gagal memuat Test Runs"
    text="Data tidak dapat dimuat saat ini."
    action={<Button onClick={() => void onRetry()}>Coba lagi</Button>}
  />
);

const TestRunEditor = ({
  projectId,
  run,
  members,
  onClose,
  onSaved,
}: {
  projectId: string;
  run: TestRunRecord;
  members: ProjectMemberRecord[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [name, setName] = useState(run.name);
  const [description, setDescription] = useState(run.description || '');
  const [ownerId, setOwnerId] = useState(run.ownerId || run.owner?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await TestRunsService.update(projectId, run.id, {
        name: name.trim(),
        description,
        ownerId: ownerId || undefined,
      });
      onSaved();
    } catch (cause) {
      setError((cause as { message?: string }).message || 'Test Run tidak dapat disimpan.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="test-run-editor-title">
      <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-6 py-4">
          <h2 id="test-run-editor-title" className="text-lg font-bold text-slate-900">Edit Run</h2>
          <p className="mt-1 text-sm text-slate-500">Execution history dan hasil tetap immutable.</p>
        </header>
        <div className="space-y-4 px-6 py-5">
          <label className="block text-sm font-medium text-slate-700">Nama Test Run
            <input aria-label="Nama Test Run" value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Owner
            <Select aria-label="Owner Test Run" value={ownerId} onChange={(value) => setOwnerId(String(value))} options={members.map((member) => ({ value: member.userId || member.id || '', label: member.username || member.userEmail || member.email || 'User' }))} placeholder="Pilih owner" size="md" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Description
            <textarea aria-label="Description Test Run" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </footer>
      </section>
    </div>
  );
};

const FlowSelector = ({
  flows,
  query,
  health,
  priority,
  status,
  selected,
  onQuery,
  onHealth,
  onPriority,
  onStatus,
  onToggle,
}: {
  flows: UserFlow[];
  query: string;
  health: string;
  priority: string;
  status: string;
  selected: string[];
  onQuery: (value: string) => void;
  onHealth: (value: string) => void;
  onPriority: (value: string) => void;
  onStatus: (value: string) => void;
  onToggle: (id: string) => void;
}) => {
  const visible = flows.filter(
    (flow) =>
      `${flow.flowKey} ${flow.title}`.toLowerCase().includes(query.toLowerCase()) &&
      (!health || flow.health === health) &&
      (!priority || flow.priority === priority) &&
      (!status || flow.status === status),
  );
  const select = (
    label: string,
    value: string,
    setter: (value: string) => void,
    options: string[],
  ) => (
    <label className="flex min-w-28 flex-col gap-1 text-xs font-medium text-slate-600">
      <span>{label}</span>
      <Select
        aria-label={label}
        value={value}
        onChange={(next) => setter(String(next))}
        options={options.map((item) => ({ value: item, label: FLOW_LABELS[item as keyof typeof FLOW_LABELS] }))}
        placeholder="Semua"
      />
    </label>
  );
  return (
    <div>
      <label className="block text-sm font-medium">
        Pilih User Flows
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Cari User Flow…"
          className="mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {select('Health', health, onHealth, FLOW_HEALTHS)}
        {select('Priority', priority, onPriority, FLOW_PRIORITIES)}
        {select('Status', status, onStatus, FLOW_STATUSES)}
      </div>
      <div className="mt-3 max-h-[min(36rem,42vh)] overflow-y-auto rounded-lg border">
        {!flows.length ? (
          <p className="p-5 text-sm text-slate-500">
            <strong className="block text-slate-800">Belum ada User Flow</strong>Buat atau tautkan
            User Flow terlebih dahulu sebelum membuat Test Run berdasarkan User Flow.
          </p>
        ) : !visible.length ? (
          <p className="p-5 text-sm text-slate-500">Tidak ada User Flow yang sesuai filter.</p>
        ) : (
          visible.map((flow) => (
            <label
              key={flow.id}
              className="flex cursor-pointer gap-3 border-b p-3 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(flow.id)}
                onChange={() => onToggle(flow.id)}
              />
              <span className="min-w-0 break-words">
                <strong>
                  {flow.flowKey} · {flow.title}
                </strong>
                <small className="mt-1 block text-slate-500">
                  Health: {FLOW_LABELS[flow.health]} · Priority: {FLOW_LABELS[flow.priority]} · Status: {FLOW_LABELS[flow.status]}
                </small>
                <small className="mt-1 block text-slate-500">
                  {flow.linkedTestCaseCount} linked Test Cases · Coverage{' '}
                  {formatPercentage(flow.coverage, {
                    hasDenominator: flow.linkedTestCaseCount > 0,
                  })}
                </small>
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
};

export const CreateRun = ({
  projectId,
  members,
  onClose,
  onCreated,
}: {
  projectId: string;
  members: ProjectMemberRecord[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) => {
  useEffect(() => {
    const body = document.body;
    const scrollContainer = document.querySelector('main');
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previousContainerOverflow = scrollContainer instanceof HTMLElement ? scrollContainer.style.overflow : '';
    const previousContainerPaddingRight = scrollContainer instanceof HTMLElement ? scrollContainer.style.paddingRight : '';
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    if (scrollContainer instanceof HTMLElement) {
      const containerScrollbarWidth = scrollContainer.offsetWidth - scrollContainer.clientWidth;
      scrollContainer.style.overflow = 'hidden';
      if (containerScrollbarWidth > 0) scrollContainer.style.paddingRight = `${containerScrollbarWidth}px`;
    }
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      if (scrollContainer instanceof HTMLElement) {
        scrollContainer.style.overflow = previousContainerOverflow;
        scrollContainer.style.paddingRight = previousContainerPaddingRight;
      }
    };
  }, []);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [cases, setCases] = useState<ProjectTestCaseRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [caseSection, setCaseSection] = useState('');
  const [caseFolder, setCaseFolder] = useState('');
  const [caseTag, setCaseTag] = useState('');
  const [casePriority, setCasePriority] = useState('');
  const [caseAutomation, setCaseAutomation] = useState('');
  const [caseStatus, setCaseStatus] = useState('');
  const [allowDraft, setAllowDraft] = useState(false);
  const [mode, setMode] = useState<'cases' | 'flows'>('cases');
  const [flows, setFlows] = useState<UserFlow[]>([]);
  const [selectedFlowIds, setSelectedFlowIds] = useState<string[]>([]);
  const [flowQuery, setFlowQuery] = useState('');
  const [flowHealth, setFlowHealth] = useState('');
  const [flowPriority, setFlowPriority] = useState('');
  const [flowStatus, setFlowStatus] = useState('');
  const [resolution, setResolution] = useState<
    Awaited<ReturnType<typeof TestRunsService.resolveUserFlows>>['data'] | null
  >(null);
  const [flowLoading, setFlowLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void ProjectsService.listTestCases(projectId)
      .then((response) => setCases(response.data))
      .catch((cause) =>
        setError((cause as { message?: string }).message || 'Test case tidak dapat dimuat.'),
      );
  }, [projectId]);
  useEffect(() => {
    let active = true;
    void UserFlowsService.list(projectId)
      .then((response) => active && setFlows(response.data.flows))
      .catch(() => active && setFlows([]));
    return () => {
      active = false;
    };
  }, [projectId]);
  useEffect(() => {
    let active = true;
    if (mode !== 'flows' || !selectedFlowIds.length) {
      setResolution(null);
      return () => {
        active = false;
      };
    }
    setFlowLoading(true);
    void TestRunsService.resolveUserFlows(projectId, {
      userFlowIds: selectedFlowIds,
      allowDraftTestCases: allowDraft,
    })
      .then((response) => {
        if (active) {
          setResolution(response.data);
          setError(null);
        }
      })
      .catch(
        (cause) =>
          active &&
          setError(
            (cause as { message?: string }).message || 'User Flow tidak dapat diselesaikan.',
          ),
      )
      .finally(() => active && setFlowLoading(false));
    return () => {
      active = false;
    };
  }, [projectId, mode, selectedFlowIds, allowDraft]);
  const values = (field: 'section' | 'priority' | 'automationType' | 'status') =>
    [...new Set(cases.map((testCase) => testCase[field]).filter(Boolean))].sort();
  const folders = useMemo(
    () => [
      ...new Map(
        cases.map((testCase) => [
          testCase.folderId || '',
          testCase.folderPath?.map((folder) => folder.name).join(' / ') || 'Unfiled',
        ]),
      ).entries(),
    ],
    [cases],
  );
  const tags = useMemo(
    () => [...new Set(cases.flatMap((testCase) => testCase.tags || []))].sort(),
    [cases],
  );
  const visible = useMemo(
    () =>
      cases.filter((testCase) => {
        const folder = testCase.folderPath?.map((item) => item.name).join(' / ') || 'Unfiled';
        return (
          `${testCase.tcNumber || ''} ${testCase.title} ${testCase.section} ${(testCase.tags || []).join(' ')}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (!caseSection || testCase.section === caseSection) &&
          (!caseFolder || (testCase.folderId || '') === caseFolder) &&
          (!caseTag || testCase.tags.includes(caseTag)) &&
          (!casePriority || testCase.priority === casePriority) &&
          (!caseAutomation || testCase.automationType === caseAutomation) &&
          (!caseStatus || testCase.status === caseStatus) &&
          Boolean(folder)
        );
      }),
    [cases, query, caseSection, caseFolder, caseTag, casePriority, caseAutomation, caseStatus],
  );
  const selectable = (testCase: ProjectTestCaseRecord) =>
    testCase.status !== 'Deprecated' && (testCase.status !== 'Draft' || allowDraft);
  const selectVisible = () =>
    setSelected((current) => [
      ...new Set([...current, ...visible.filter(selectable).map((testCase) => testCase.id)]),
    ]);
  const submit = async () => {
    const testCaseIds = mode === 'flows' ? resolution?.uniqueEligibleTestCaseIds || [] : selected;
    if (!name.trim() || !testCaseIds.length) {
      setError('Nama Test Run dan minimal satu Test Case wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const response = await TestRunsService.create(projectId, {
        name: name.trim(),
        description: description || undefined,
        ownerId: ownerId || undefined,
        // The server resolves and validates User Flow links; do not flatten its
        // immutable provenance to client-selected Test Case IDs in this mode.
        ...(mode === 'flows' ? {} : { testCaseIds }),
        allowDraftTestCases: allowDraft,
        userFlowIds: mode === 'flows' ? selectedFlowIds : undefined,
      });
      onCreated(response.data.id);
    } catch (cause) {
      setError((cause as { message?: string }).message || 'Test Run gagal dibuat.');
    } finally {
      setSaving(false);
    }
  };
  const Filter = ({
    label: filterLabel,
    value,
    setValue,
    options,
  }: {
    label: string;
    value: string;
    setValue: (value: string) => void;
    options: Array<[string, string]>;
  }) => (
    <label className="flex min-w-28 flex-col gap-1 text-xs font-medium text-slate-600">
      <span>{filterLabel}</span>
      <Select
        aria-label={filterLabel}
        value={value}
        onChange={(next) => setValue(String(next))}
        options={options.map(([optionValue, optionLabel]) => ({
          value: optionValue,
          label: optionLabel,
        }))}
        placeholder="Semua"
      />
    </label>
  );
  const modal = (
    <Modal
      isOpen
      title="Buat Test Run"
      description="Pilih Test Case atau User Flow dari proyek aktif."
      labelledBy="create-test-run-title"
      onClose={onClose}
      maxWidth="max-w-none"
      contentClassName="flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-2xl sm:w-[80vw] sm:max-h-[85vh] sm:max-w-6xl"
    >
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-5">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(260px,.85fr)_minmax(0,1.35fr)]">
          <div className="space-y-4">
            <div
              className="inline-flex w-fit rounded-lg bg-slate-100 p-1"
              role="tablist"
              aria-label="Pilih berdasarkan"
            >
              <button
                role="tab"
                aria-selected={mode === 'cases'}
                onClick={() => setMode('cases')}
                className={`rounded-md px-3 py-2 text-sm sm:px-4 ${mode === 'cases' ? 'bg-white font-semibold text-brand-700 shadow-sm' : 'text-slate-600'}`}
              >
                Test Cases
              </button>
              <button
                role="tab"
                aria-selected={mode === 'flows'}
                onClick={() => setMode('flows')}
                className={`rounded-md px-3 py-2 text-sm sm:px-4 ${mode === 'flows' ? 'bg-white font-semibold text-brand-700 shadow-sm' : 'text-slate-600'}`}
              >
                User Flows
              </button>
            </div>
            <label className="block text-sm font-medium">
              Run name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="block text-sm font-medium">
              Owner
              <Select
                aria-label="Run owner"
                className="mt-1"
                value={ownerId}
                onChange={(value) => setOwnerId(String(value))}
                options={members.map((member) => ({
                  value: member.userId || member.id || '',
                  label: member.username || member.userEmail || member.email || 'User',
                }))}
                placeholder="Unassigned"
                size="md"
              />
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <input
                type="checkbox"
                checked={allowDraft}
                onChange={(event) => {
                  const permitted = event.target.checked;
                  setAllowDraft(permitted);
                  if (!permitted)
                    setSelected((current) =>
                      current.filter(
                        (id) => cases.find((testCase) => testCase.id === id)?.status !== 'Draft',
                      ),
                    );
                }}
              />
              <span>
                <strong>Izinkan Draft test cases</strong>
                <small className="mt-1 block">
                  Belum siap untuk eksekusi. Draft hanya dapat dipilih setelah Anda mengizinkannya.
                </small>
              </span>
            </label>
            <p className="text-sm font-medium">
              Selected: {mode === 'flows' ? selectedFlowIds.length : selected.length}
            </p>
            {mode === 'flows' && selectedFlowIds.length > 0 && (
              <section
                aria-live="polite"
                className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-950"
              >
                <strong>Ringkasan pilihan</strong>
                {flowLoading ? (
                  <p className="mt-1">Menyelesaikan Test Cases…</p>
                ) : resolution ? (
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <span>Selected User Flows: {resolution.selectedUserFlowCount}</span>
                    <span>Linked Test Cases: {resolution.linkedTestCases}</span>
                    <span>Unique Test Cases: {resolution.uniqueLinkedTestCases}</span>
                    <span>Excluded Deprecated: {resolution.excludedDeprecatedCount}</span>
                    <span>Draft requiring permission: {resolution.draftRequiringOptInCount}</span>
                  </div>
                ) : null}
              </section>
            )}
          </div>
          <div>
            {mode === 'flows' ? (
              <FlowSelector
                flows={flows}
                query={flowQuery}
                health={flowHealth}
                priority={flowPriority}
                status={flowStatus}
                selected={selectedFlowIds}
                onQuery={setFlowQuery}
                onHealth={setFlowHealth}
                onPriority={setFlowPriority}
                onStatus={setFlowStatus}
                onToggle={(id) =>
                  setSelectedFlowIds((current) =>
                    current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                  )
                }
              />
            ) : (
              <>
                <label className="block text-sm font-medium">
                  Selected test cases
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari test case…"
                    className="mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Filter
                    label="Section"
                    value={caseSection}
                    setValue={setCaseSection}
                    options={values('section').map((item) => [item, item])}
                  />
                  <Filter
                    label="Folder"
                    value={caseFolder}
                    setValue={setCaseFolder}
                    options={folders}
                  />
                  <Filter
                    label="Tag"
                    value={caseTag}
                    setValue={setCaseTag}
                    options={tags.map((item) => [item, item])}
                  />
                  <Filter
                    label="Priority"
                    value={casePriority}
                    setValue={setCasePriority}
                    options={values('priority').map((item) => [item, item])}
                  />
                  <Filter
                    label="Automation Type"
                    value={caseAutomation}
                    setValue={setCaseAutomation}
                    options={values('automationType').map((item) => [item, item])}
                  />
                  <Filter
                    label="Status"
                    value={caseStatus}
                    setValue={setCaseStatus}
                    options={values('status').map((item) => [item, item])}
                  />
                </div>
                <div className="mt-3 max-h-[min(36rem,42vh)] overflow-y-auto rounded-lg border">
                  {visible.map((testCase) => {
                    const disabled = !selectable(testCase);
                    const helper =
                      testCase.status === 'Deprecated'
                        ? 'Test case ini sudah deprecated dan tidak dapat ditambahkan ke Test Run baru.'
                        : testCase.status === 'Draft'
                          ? 'Belum siap untuk eksekusi. Aktifkan pilihan Draft untuk menambahkannya.'
                          : '';
                    return (
                      <label
                        key={testCase.id}
                        className={`flex gap-3 border-b p-3 text-sm ${disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500' : 'cursor-pointer hover:bg-slate-50'}`}
                      >
                        <input
                          disabled={disabled}
                          type="checkbox"
                          checked={selected.includes(testCase.id)}
                          onChange={() =>
                            setSelected((current) =>
                              current.includes(testCase.id)
                                ? current.filter((id) => id !== testCase.id)
                                : [...current, testCase.id],
                            )
                          }
                        />
                        <span className="min-w-0 break-words">
                          <strong>
                            {testCase.tcNumber ? `TC-${testCase.tcNumber}` : 'TC'} ·{' '}
                            {testCase.title}
                          </strong>
                          <small className="mt-1 block text-slate-500">
                            {testCase.section} · {testCase.priority} · {testCase.status}
                          </small>
                          {helper && <small className="mt-1 block text-amber-800">{helper}</small>}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={selectVisible}
                    className="text-sm text-brand-700 hover:underline"
                  >
                    Select current page
                  </button>
                  <button
                    onClick={() => setSelected([])}
                    className="text-sm text-brand-700 hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="shrink-0 px-5 pb-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <footer className="flex shrink-0 justify-end gap-2 border-t p-4">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={
              saving ||
              flowLoading ||
              (mode === 'flows' ? !resolution?.uniqueEligibleTestCases : !selected.length)
            }
            onClick={() => void submit()}
          >
            {saving ? 'Menyimpan…' : 'Buat Test Run'}
          </Button>
      </footer>
    </Modal>
  );
  return createPortal(modal, document.body);
};

export const RunDetail = ({
  projectId,
  runId,
  executionId,
  members = [],
  currentUser,
  canManage = true,
  onOpenUserFlow,
  onBack,
}: {
  projectId: string;
  runId: string;
  executionId?: string;
  members?: ProjectMemberRecord[];
  currentUser?: TestRunOwnerRecord | null;
  canManage?: boolean;
  onOpenUserFlow?: (projectId: string, userFlowId: string) => void;
  onBack: () => void;
}) => {
  const [run, setRun] = useState<TestRunDetailRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [executionSearch, setExecutionSearch] = useState('');
  const [executionResult, setExecutionResult] = useState('');
  const [executionPriority, setExecutionPriority] = useState('');
  const [executionAssignee, setExecutionAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const actionsPanelId = useId();
  const closeActions = () => {
    setActionsOpen(false);
  };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await TestRunsService.get(projectId, runId, { force: true });
      setRun(response.data);
      setSelectedId((current) => executionId || current || response.data.executions[0]?.id);
      setError(null);
    } catch (cause) {
      setError((cause as { message?: string }).message || 'Test Run tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [projectId, runId, executionId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return <Skeleton />;
  if (error || !run) return <ErrorState onRetry={load} />;
  const progress = run.progress || progressFromExecutions(run.executions);
  const executions = run.executions.filter(
    (execution) =>
      `${execution.snapshot.tcNumber || ''} ${execution.snapshot.title}`
        .toLowerCase()
        .includes(executionSearch.toLowerCase()) &&
      (!executionResult || execution.result === executionResult) &&
      (!executionPriority || execution.snapshot.priority === executionPriority) &&
      (!executionAssignee || execution.assignee?.id === executionAssignee),
  );
  const selected = run.executions.find((execution) => execution.id === selectedId) || executions[0];
  const sequenceIndex = run.executions.findIndex((execution) => execution.id === selected?.id);
  const isFirstExecution = sequenceIndex === 0;
  const isLastExecution = sequenceIndex === run.executions.length - 1;
  // Project members are the canonical eligible-user source for both the
  // assignee control and the left-panel filter. Never derive options only from
  // executions, because a new run may have no historical assignee values.
  const assignees = [
    ...new Map(
      members
        .map((member) => [
          member.userId || member.id || '',
          member.username || member.userEmail || member.email || 'User',
        ] as [string, string])
        .filter(([id]) => Boolean(id)),
    ).entries(),
  ];
  for (const user of [currentUser, run.owner]) {
    if (user?.id && label(user) !== '—' && !assignees.some(([id]) => id === user.id)) {
      assignees.push([user.id, label(user)]);
    }
  }
  const save = async (
    executionId: string,
    payload: { result?: TestRunResult | null; notes?: string; assigneeId?: string },
  ) => {
    const response = await TestRunsService.updateExecution(projectId, runId, executionId, payload);
    setRun((current) => {
      if (!current) return current;
      const executions = current.executions.map((execution) =>
        execution.id === executionId ? response.data : execution,
      );
      return { ...current, executions, progress: progressFromExecutions(executions) };
    });
    // The mutation response contains one execution only. Refetch the run so
    // status and all summary KPIs always come from the server's central helper.
    await load();
  };
  const saveStep = async (
    executionId: string,
    stepId: string,
    payload: { result: TestRunResult | null; notes?: string | null },
  ) => {
    const response = await TestRunsService.updateExecutionStep(
      projectId,
      runId,
      executionId,
      stepId,
      payload,
    );
    setRun((current) => {
      if (!current) return current;
      const executions = current.executions.map((item) =>
        item.id === executionId ? response.data : item,
      );
      return { ...current, executions, progress: progressFromExecutions(executions) };
    });
    await load();
  };
  const detailActions = testRunActions(run, { canManage });
  const deleteRun = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await TestRunsService.delete(projectId, run.id);
      onBack();
    } catch (cause) {
      setDeleteError((cause as { message?: string }).message || 'Test Run tidak dapat dihapus.');
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1920px] flex-col gap-3">
      <button
        onClick={onBack}
        className="flex w-fit items-center gap-1 text-sm font-medium text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <ChevronLeft size={16} /> Test Runs
      </button>
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{run.project?.name || 'Project'} / Test Runs</p>
          <h1 className="text-2xl font-bold">{run.name}</h1>
          <div className="mt-1 text-sm text-slate-500">
            <span className="flex flex-wrap items-center gap-1.5" aria-label="Test Run metadata">
              {run.displayId && <Chip type="generic" value={run.displayId} />}
              <Chip
                type="assignee"
                value={run.owner?.id || 'unassigned'}
                displayValue={label(run.owner)}
                leadingIcon={<UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
              />
              <StatusBadge value={run.status} />
              {run.type && <Chip type="testRunType" value={run.type} />}
            </span>
          </div>
          {run.userFlows?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="User Flows dalam Test Run">
              {run.userFlows.map((flow) => (
                <Chip
                  key={flow.id}
                  type="generic"
                  value={`${flow.snapshot.flowKey} · ${flow.snapshot.title}`}
                  className="border-violet-200 bg-violet-50 text-violet-800"
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          {canManage && <div className="relative">
            <Button
              variant="secondary"
              size="md"
              type="button"
              icon={<ChevronDown className="h-4 w-4" aria-hidden="true" />}
              aria-expanded={actionsOpen}
              aria-controls={actionsPanelId}
              onClick={() => setActionsOpen((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && actionsOpen) closeActions();
              }}
            >Aksi</Button>
            {actionsOpen && (
              <div
                id={actionsPanelId}
                aria-label="Aksi Test Run"
                className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeActions();
                }}
              >
                {detailActions.includes('edit') && (
                  <button
                    onClick={() => {
                      setActionsOpen(false);
                      setEditing(true);
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <Pencil className="h-4 w-4 text-slate-500" /> Edit Run
                  </button>
                )}
                {detailActions.includes('delete') && (
                  <button
                    onClick={() => {
                      setActionsOpen(false);
                      setDeleteError(null);
                      setDeleteConfirmOpen(true);
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Run
                  </button>
                )}
              </div>
            )}
          </div>}
        </div>
      </header>
      <section aria-label="Execution summary" className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <MetricTile
          label="Progress Eksekusi"
          value={formatPercentage(progress.percentage, { hasDenominator: progress.total > 0 })}
          detail={`${progress.executed} / ${progress.total} executed`}
          accent="bg-brand-600"
        />
        <MetricTile label="Passed" value={progress.passed} accent="bg-emerald-500" />
        <MetricTile label="Failed" value={progress.failed} accent="bg-red-500" />
        <MetricTile label="Blocked" value={progress.blocked} accent="bg-amber-500" />
        <MetricTile label="Skipped" value={progress.skipped} accent="bg-slate-400" />
        <MetricTile label="Untested" value={progress.untested} accent="bg-slate-300" />
      </section>
      {deleteError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{deleteError}</p>}
      {editing && (
        <TestRunEditor
          projectId={projectId}
          run={run}
          members={members}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void load();
          }}
        />
      )}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Delete Test Run"
        message={`Delete ${run.name}? Execution history will be retained for audit, but the run will be hidden from normal views.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete Run'}
        variant="danger"
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        onConfirm={() => void deleteRun()}
      />
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(290px,.78fr)_minmax(0,1.22fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <section
            aria-label="Deskripsi Test Run"
            className="shrink-0 border-b border-slate-200 border-l-4 border-l-brand-500 bg-slate-50/70 p-4"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Deskripsi Test Run</h2>
            </div>
            {run.description?.trim() ? (
              <MarkdownContent
                value={run.description}
                className="mt-3 text-sm leading-6 text-slate-700"
              />
            ) : (
              <p className="mt-2 text-sm text-slate-400">Belum ada deskripsi Test Run.</p>
            )}
          </section>
          <div className="shrink-0 space-y-2 border-b border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Test cases in run</h2>
            </div>
            <input
              aria-label="Cari test case dalam run"
              value={executionSearch}
              onChange={(event) => setExecutionSearch(event.target.value)}
              placeholder="Cari test case…"
              className="h-9 w-full rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="grid grid-cols-3 gap-1.5">
              <Select
                aria-label="Filter result"
                value={executionResult}
                onChange={(value) => setExecutionResult(String(value))}
                options={(['Passed', 'Failed', 'Blocked', 'Skipped', 'Untested'] as const).map(
                  (item) => ({ value: item, label: item }),
                )}
                placeholder="Result"
              />
              <Select
                aria-label="Filter priority"
                value={executionPriority}
                onChange={(value) => setExecutionPriority(String(value))}
                options={[
                  ...new Set(run.executions.map((item) => item.snapshot.priority).filter(Boolean)),
                ].map((item) => ({ value: item, label: item }))}
                placeholder="Priority"
              />
              <Select
                aria-label="Filter assignee"
                value={executionAssignee}
                onChange={(value) => setExecutionAssignee(String(value))}
                options={assignees.map(([id, name]) => ({ value: id, label: name }))}
                placeholder="Assignee"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setExecutionSearch('');
                setExecutionResult('');
                setExecutionPriority('');
                setExecutionAssignee('');
              }}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Reset filter
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
          {executions.map((execution) => (
            <button
              key={execution.id}
              onClick={() => setSelectedId(execution.id)}
              aria-current={execution.id === selected?.id ? 'true' : undefined}
              className={`flex w-full items-start gap-2.5 border-b border-slate-100 p-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 ${execution.id === selected?.id ? 'border-l-4 border-l-brand-600 bg-brand-50/70 pl-2' : 'border-l-4 border-l-transparent hover:bg-slate-50'}`}
            >
              <ResultIcon result={execution.result} />
              <span className="min-w-0">
                <span className="block text-xs text-slate-500">
                  TC-{execution.snapshot.tcNumber ?? '—'} · {execution.snapshot.priority || '—'}
                </span>
                <strong className="block truncate">{execution.snapshot.title}</strong>
                <span className="mt-1 block">
                  <StatusBadge value={execution.result} />
                </span>
              </span>
            </button>
          ))}
          {!executions.length && (
            <p className="p-4 text-sm text-slate-500">Tidak ada hasil yang cocok.</p>
          )}
          </div>
          <footer className="shrink-0 border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
            Showing {executions.length} of {run.executions.length} test cases
          </footer>
        </aside>
        <main className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {selected ? (
            <ExecutionDetail
              projectId={projectId}
              execution={selected}
              assignees={assignees.map(([id, name]) => ({ value: id, label: name }))}
              isFirstExecution={isFirstExecution}
              isLastExecution={isLastExecution}
              readOnly={run.status === 'Completed'}
              onSave={save}
              onStepSave={saveStep}
              onPrevious={() =>
                sequenceIndex > 0 && setSelectedId(run.executions[sequenceIndex - 1].id)
              }
              onNext={() =>
                sequenceIndex < run.executions.length - 1 &&
                setSelectedId(run.executions[sequenceIndex + 1].id)
              }
              onOpenUserFlow={onOpenUserFlow}
            />
          ) : (
            <p className="text-slate-500">Pilih Test Case untuk mulai eksekusi.</p>
          )}
        </main>
      </div>
    </div>
  );
};
const MetricTile = ({
  label: metricLabel,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string | number;
  detail?: string;
  accent: string;
}) => (
  <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
    <span className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
    <p className="text-[11px] font-medium text-slate-500">{metricLabel}</p>
    <p className="mt-0.5 text-xl font-bold text-slate-800">{value}</p>
    {detail && <p className="mt-1 text-[11px] text-slate-500">{detail}</p>}
  </article>
);
const ResultIcon = ({ result }: { result: TestRunResult }) =>
  result === 'Passed' ? (
    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Passed" />
  ) : result === 'Failed' ? (
    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-label="Failed" />
  ) : result === 'Blocked' ? (
    <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-label="Blocked" />
  ) : (
    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-label={resultLabel(result)} />
  );
export const ExecutionDetail = ({
  projectId,
  execution,
  assignees = [],
  onSave,
  onStepSave,
  isFirstExecution = false,
  isLastExecution = false,
  readOnly = false,
  onPrevious,
  onNext,
  onOpenUserFlow,
}: {
  projectId?: string;
  execution: TestRunExecutionRecord;
  assignees?: Array<{ value: string; label: string }>;
  onSave: (
    executionId: string,
    payload: { result?: TestRunResult | null; notes?: string; assigneeId?: string },
  ) => Promise<void>;
  onStepSave?: (
    executionId: string,
    stepId: string,
    payload: { result: TestRunResult | null; notes?: string | null },
  ) => Promise<void>;
  isFirstExecution?: boolean;
  isLastExecution?: boolean;
  readOnly?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpenUserFlow?: (projectId: string, userFlowId: string) => void;
}) => {
  const [result, setResult] = useState<TestRunResult>(execution.result);
  const [notes, setNotes] = useState(execution.notes || '');
  const [assigneeId, setAssigneeId] = useState(execution.assignee?.id || '');
  const [pendingGlobalResult, setPendingGlobalResult] = useState<TestRunResult | null>(null);
  const [globalApplyPending, setGlobalApplyPending] = useState(false);
  const [stepDrafts, setStepDrafts] = useState(() =>
    (execution.steps || []).map((step) => ({
      ...step,
      result: step.result || 'Untested',
      notes: step.notes || '',
    })),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveInFlight = useRef(false);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSaved = () => {
    setSaved(true);
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    savedTimeout.current = setTimeout(() => setSaved(false), 3000);
  };
  useEffect(() => () => {
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
  }, []);
  useEffect(() => {
    setSaved(false);
  }, [execution.id]);
  useEffect(() => {
    setResult(execution.result);
    setNotes(execution.notes || '');
    setAssigneeId(execution.assignee?.id || '');
    setGlobalApplyPending(false);
    setStepDrafts(
      (execution.steps || []).map((step) => ({
        ...step,
        result: step.result || 'Untested',
        notes: step.notes || '',
      })),
    );
  }, [execution]);
  const save = async (next = false) => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        result,
        notes,
        ...(assigneeId !== (execution.assignee?.id || '') ? { assigneeId: assigneeId || undefined } : {}),
      };
      const globalChanged = globalApplyPending || notes !== (execution.notes || '');
      const changedSteps = stepDrafts.filter((step) => {
        const original = execution.steps?.find((item) => item.id === step.id);
        return (
          original && (step.result !== original.result || step.notes !== (original.notes || ''))
        );
      });
      const hasChanges =
        globalChanged ||
        result !== execution.result ||
        assigneeId !== (execution.assignee?.id || '') ||
        changedSteps.length > 0;
      if (globalChanged || !changedSteps.length) await onSave(execution.id, payload);
      if (!globalChanged)
        for (const step of changedSteps) {
          if (onStepSave)
            await onStepSave(execution.id, step.id, {
              result: step.result,
              notes: step.notes,
            });
        }
      if (next === true) onNext();
      if (hasChanges) showSaved();
    } catch (cause) {
      const error = cause as { message?: string; executionSaved?: boolean };
      setSaveError(
        error.executionSaved
          ? error.message ||
              'Hasil eksekusi sudah tersimpan, tetapi data terbaru tidak dapat dimuat.'
          : `Gagal menyimpan eksekusi. ${error.message || 'Coba lagi.'}`,
      );
      setSaved(false);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };
  const saveAssignee = async (nextAssigneeId: string) => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await onSave(execution.id, { assigneeId: nextAssigneeId || undefined });
      showSaved();
    } catch (cause) {
      setAssigneeId(execution.assignee?.id || '');
      setSaveError(`Gagal menyimpan assignee. ${(cause as { message?: string }).message || 'Coba lagi.'}`);
    } finally {
      setSaving(false);
    }
  };
  const applyGlobalResult = (nextResult: TestRunResult) => {
    if (!canTransitionExecutionResult(result, nextResult)) return;
    setResult(nextResult);
    setStepDrafts((items) => items.map((item) => ({ ...item, result: nextResult })));
    setGlobalApplyPending(true);
    setPendingGlobalResult(null);
  };
  const updateStepResult = (stepId: string, nextResult: TestRunResult) => {
    const current = stepDrafts.find((item) => item.id === stepId)?.result || 'Untested';
    if (!canTransitionExecutionResult(current, nextResult)) return;
    const nextDrafts = stepDrafts.map((item) =>
      item.id === stepId ? { ...item, result: nextResult } : item,
    );
    setStepDrafts(nextDrafts);
    setResult(deriveExecutionResult(nextDrafts.map((item) => item.result)));
    setGlobalApplyPending(false);
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-5 pb-5">
      <header className="border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Test case metadata">
          <Chip type="generic" value={`TC-${execution.snapshot.tcNumber ?? '—'}`} />
          <Chip type="automation" value={execution.snapshot.automationType || '—'} />
          <Chip type="priority" value={execution.snapshot.priority || '—'} />
          {execution.userFlows?.map((flow) => (
            <Chip
              key={flow.id}
              type="generic"
              value={`${flow.snapshot.flowKey} · ${flow.snapshot.title}`}
              className="border-violet-200 bg-violet-50 text-violet-800"
              onClick={onOpenUserFlow && projectId && flow.sourceUserFlowId ? () => onOpenUserFlow(projectId, flow.sourceUserFlowId!) : undefined}
            />
          ))}
        </div>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{execution.snapshot.title}</h2>
          </div>
          {saving && (
            <span aria-label="Saving" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Saving…
            </span>
          )}
          {!saving && saved && (
            <span aria-label="Saved" className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Saved
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Last saved {new Date(execution.updatedAt).toLocaleString()}
        </p>
        <div className="mt-3">
          <label className="block text-sm font-medium text-slate-700">
            Assignee
            <Select
              aria-label="Assignee"
              className="mt-1"
              value={assigneeId}
              onChange={(value) => {
                const nextAssigneeId = String(value);
                setAssigneeId(nextAssigneeId);
                void saveAssignee(nextAssigneeId);
              }}
              options={assignees}
              placeholder="Pilih assignee"
              size="md"
              disabled={readOnly || saving || !assignees.length}
            />
          </label>
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preconditions</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
          {execution.snapshot.preconditions || '—'}
        </p>
        </div>
        <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected Result</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
          {execution.snapshot.expectedResult || '—'}
        </p>
        </div>
      </section>
      <section>
        <h3 className="font-semibold">Steps</h3>
        <ol className="mt-2 space-y-2">
          {(execution.snapshot.steps || []).map((step, index) => {
            const draft = stepDrafts.find((item) => item.position === index + 1);
            if (!draft)
              return (
                <li key={step.id || index} className="rounded-lg border p-3 text-sm">
                  <strong>
                    {index + 1}. {step.action}
                  </strong>
                  <p className="mt-1 text-slate-500">Expected: {step.expectedResult}</p>
                </li>
              );
            return (
              <li key={step.id || index} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/40 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Action</p>
                    <p className="font-semibold text-slate-900">{draft.action || '—'}</p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Expected Result</p>
                    <p className="text-slate-600">{draft.expectedResult || '—'}</p>
                  </div>
                </div>
                <label className="block text-sm font-semibold">
                  Result
                  <Select
                    aria-label={`Step ${index + 1} Result`}
                    className="mt-1 max-w-xs"
                    disabled={readOnly}
                    value={draft.result}
                    onChange={(value) => updateStepResult(draft.id, String(value) as TestRunResult)}
                    options={executionResultOptions(
                      draft.result,
                      stepDrafts.some((step) => isTerminalExecutionResult(step.result)),
                    ).map((option) => ({ ...option, label: resultLabel(option.value) }))}
                    size="md"
                  />
                </label>
                <div className="border-t border-slate-100 pt-3">
                  <MarkdownEditor
                    id={`execution-step-${draft.id}-notes`}
                    label={`Step ${index + 1} Notes`}
                    value={draft.notes || ''}
                    attachmentContext={
                      projectId ? { projectId, testCaseId: execution.sourceTestCaseId } : undefined
                    }
                    onChange={(value) => {
                      setGlobalApplyPending(false);
                      setStepDrafts((items) =>
                        items.map((item) =>
                          item.id === draft.id ? { ...item, notes: value } : item,
                        ),
                      );
                    }}
                    rows={3}
                    disabled={readOnly}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <section>
        <label className="block text-sm font-semibold">
          Result (Test Case)
          <Select
            aria-label="Result"
            className="mt-1 max-w-xs"
            disabled={readOnly}
            value={result}
            onChange={(value) => {
              const nextResult = String(value) as TestRunResult;
              if (nextResult !== result && stepDrafts.some((step) => step.result !== nextResult)) {
                setPendingGlobalResult(nextResult);
                return;
              }
              applyGlobalResult(nextResult);
            }}
            options={executionResultOptions(
              result,
              stepDrafts.some((step) => isTerminalExecutionResult(step.result)),
            ).map((option) => ({ ...option, label: resultLabel(option.value) }))}
            placeholder="Belum diuji"
            size="md"
          />
        </label>
      </section>
      <section className="border-t border-slate-100 pt-4">
          <MarkdownEditor
            id="execution-notes"
            label="Notes"
            value={notes}
            disabled={readOnly}
          onChange={setNotes}
          attachmentContext={
            projectId ? { projectId, testCaseId: execution.sourceTestCaseId } : undefined
          }
          rows={4}
        />
      </section>
      {saveError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {saveError}
        </p>
      )}
      <ConfirmationModal
        isOpen={pendingGlobalResult !== null}
        title="Update all step results?"
        message={`Global result ${pendingGlobalResult ? resultLabel(pendingGlobalResult) : ''} akan mengubah semua step. Lanjutkan?`}
        confirmLabel="Lanjutkan"
        cancelLabel="Batal"
        onConfirm={() => {
          if (pendingGlobalResult) applyGlobalResult(pendingGlobalResult);
        }}
        onClose={() => setPendingGlobalResult(null)}
      />
        </div>
      </div>
      <footer className="flex shrink-0 justify-between gap-2 border-t border-slate-200 bg-white pt-3">
        <Button
          variant="secondary"
          disabled={readOnly || saving || isFirstExecution}
          icon={<ChevronLeft size={16} />}
          onClick={onPrevious}
        >
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={readOnly || saving} onClick={() => void save()}>
            Save
          </Button>
          {!isLastExecution && (
            <Button
              icon={<ChevronRight size={16} />}
              disabled={readOnly || saving}
              onClick={() => void save(true)}
            >
              Save & Next
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};
