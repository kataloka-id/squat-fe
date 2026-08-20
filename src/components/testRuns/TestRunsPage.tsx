/* eslint-disable no-unused-vars -- TypeScript callback props are misidentified by repository lint configuration. */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock3,
  ChevronDown,
  Eye,
  MoreHorizontal,
  PauseCircle,
  Play,
  Plus,
  Search,
  XCircle,
} from 'lucide-react';
import { TestRunsService, type TestRunFilters } from '@/src/api/test-runs.service.ts';
import { UserFlowsService, type UserFlow } from '@/src/api/user-flows.service.ts';
import { ProjectsService } from '@/src/api/projects.service.ts';
import { onExecutionDataChanged } from '@/src/api/execution-refresh.ts';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import type { Project } from '@/src/components/projectsTestCases/types.ts';
import type {
  ProjectMemberRecord,
  ProjectTestCaseRecord,
  TestRunDetailRecord,
  TestRunExecutionRecord,
  TestRunRecord,
  TestRunResult,
} from '@/src/types/api.ts';
import { progressFromExecutions, resultLabel } from './metrics.ts';

type Props = {
  projects: Project[];
  projectId: string;
  runId?: string;
  executionId?: string;
  onProjectChange: (id: string) => void;
  onRunChange: (id?: string) => void;
  returnToReports?: boolean;
  onReturnToReports?: () => void;
};
const label = (user?: { username?: string | null; email?: string | null } | null) =>
  user?.username || user?.email || '—';
const statusClass = (value: string) =>
  (
    ({
      Draft: 'bg-slate-100 text-slate-700',
      'In Progress': 'bg-blue-50 text-blue-700',
      Completed: 'bg-emerald-50 text-emerald-700',
      Blocked: 'bg-red-50 text-red-700',
      Passed: 'bg-emerald-50 text-emerald-700',
      Failed: 'bg-red-50 text-red-700',
      Skipped: 'bg-slate-100 text-slate-700',
      Untested: 'bg-amber-50 text-amber-700',
    }) as Record<string, string>
  )[value] || 'bg-slate-100 text-slate-700';
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
  <span
    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${statusClass(value)}`}
  >
    <StatusIcon value={value} />
    {resultLabel(value)}
  </span>
);

const ProjectSelect = ({
  projects,
  projectId,
  onProjectChange,
}: Pick<Props, 'projects' | 'projectId' | 'onProjectChange'>) => (
  <label className="flex min-w-52 flex-col gap-1 text-xs font-medium text-slate-600">
    <span>Project</span>
    <select
      value={projectId}
      onChange={(event) => onProjectChange(event.target.value)}
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      <option value="">Pilih proyek</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  </label>
);

export const TestRunsPage = ({
  projects,
  projectId,
  runId,
  executionId,
  onProjectChange,
  onRunChange,
  returnToReports,
  onReturnToReports,
}: Props) => {
  const [runs, setRuns] = useState<TestRunRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMemberRecord[]>([]);
  const [filters, setFilters] = useState<TestRunFilters>({});
  const [creating, setCreating] = useState(false);
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
  useEffect(() => onExecutionDataChanged((changedProjectId) => {
    if (changedProjectId === projectId) void load();
  }), [projectId, load]);
  useEffect(() => {
    let active = true;
    if (!projectId) {
      setMembers([]);
      return () => {
        active = false;
      };
    }
    void ProjectsService.listMembers(projectId)
      .then((response) => {
        if (active) setMembers(response.data);
      })
      .catch(() => {
        if (active) setMembers([]);
      });
    return () => {
      active = false;
    };
  }, [projectId]);
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
        onBack={() => returnToReports ? onReturnToReports?.() : onRunChange()}
      />
    );
  const setFilter = (key: keyof TestRunFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  return (
    <div className="animate-in fade-in mx-auto w-full max-w-[1920px] space-y-5 duration-300">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
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
            ['Type', 'type', ['Manual', 'Automated']],
          ].map(([name, key, options]) => (
            <label
              key={String(key)}
              className="flex flex-col gap-1 text-xs font-medium text-slate-600"
            >
              <span>{name}</span>
              <select
                disabled={!projectId}
                value={String(filters[key as keyof TestRunFilters] || '')}
                onChange={(event) => setFilter(key as keyof TestRunFilters, event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Semua</option>
                {(options as string[]).map((option) => (
                  <option key={option}>{resultLabel(option)}</option>
                ))}
              </select>
            </label>
          ))}
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            <span>Owner</span>
            <select
              aria-label="Owner"
              disabled={!projectId}
              value={filters.ownerId || ''}
              onChange={(event) => setFilter('ownerId', event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Semua</option>
              {members.map((member) => (
                <option key={member.userId || member.id} value={member.userId || member.id || ''}>
                  {member.username || member.userEmail || member.email || 'User'}
                </option>
              ))}
            </select>
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
        <RunsTable runs={runs} onOpen={onRunChange} />
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
    </div>
  );
};

const RunsTable = ({ runs, onOpen }: { runs: TestRunRecord[]; onOpen: (id: string) => void }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
    <table className="w-full min-w-[920px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          {['Test Run', 'Status', 'Type', 'Progress', 'Result', 'Owner', 'Updated', 'Actions'].map(
            (head) => (
              <th key={head} className="px-4 py-3 font-semibold">
                {head}
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
              <td className="px-4 py-3">
                <button
                  onClick={() => onOpen(run.id)}
                  className="font-semibold text-slate-800 hover:text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {run.name}
                </button>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  #TR-{run.id.slice(-6)}
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
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">{progress.percentage}%</span>
                  </div>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">
                {progress ? (
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
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">{label(run.owner)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {new Date(run.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <RunActions run={run} onOpen={onOpen} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
const RunActions = ({ run, onOpen }: { run: TestRunRecord; onOpen: (id: string) => void }) => {
  const [open, setOpen] = useState(false);
  const isComplete = run.status === 'Completed';
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Aksi untuk ${run.name}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) close();
        }}
        className="grid h-11 w-11 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={panelId}
          aria-label={`Aksi ${run.name}`}
          className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
          }}
        >
          <button
            onClick={() => onOpen(run.id)}
            className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <Eye className="h-4 w-4 text-slate-500" /> View details
          </button>
          {!isComplete && (
            <button
              onClick={() => onOpen(run.id)}
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <Play className="h-4 w-4 text-brand-600" />{' '}
              {run.status === 'Draft' ? 'Start run' : 'Continue run'}
            </button>
          )}
        </div>
      )}
    </div>
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

const FlowSelector = ({ flows, query, health, priority, status, selected, onQuery, onHealth, onPriority, onStatus, onToggle }: { flows: UserFlow[]; query: string; health: string; priority: string; status: string; selected: string[]; onQuery: (value: string) => void; onHealth: (value: string) => void; onPriority: (value: string) => void; onStatus: (value: string) => void; onToggle: (id: string) => void }) => {
  const visible = flows.filter((flow) => (`${flow.flowKey} ${flow.title}`).toLowerCase().includes(query.toLowerCase()) && (!health || flow.health === health) && (!priority || flow.priority === priority) && (!status || flow.status === status));
  const select = (label: string, value: string, setter: (value: string) => void, options: string[]) => <label className="flex min-w-28 flex-col gap-1 text-xs font-medium text-slate-600"><span>{label}</span><select value={value} onChange={(event) => setter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"><option value="">Semua</option>{options.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select></label>;
  return <div>
    <label className="block text-sm font-medium">Pilih User Flows<input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Cari User Flow…" className="mt-1 w-full rounded-lg border p-2 focus:outline-none focus:ring-2 focus:ring-brand-500" /></label>
    <div className="mt-3 flex flex-wrap gap-2">{select('Health', health, onHealth, ['healthy', 'at_risk', 'broken', 'unknown'])}{select('Priority', priority, onPriority, ['critical', 'high', 'medium', 'low'])}{select('Status', status, onStatus, ['draft', 'active', 'deprecated'])}</div>
    <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border">
      {!flows.length ? <p className="p-5 text-sm text-slate-500"><strong className="block text-slate-800">Belum ada User Flow</strong>Buat atau tautkan User Flow terlebih dahulu sebelum membuat Test Run berdasarkan User Flow.</p> : !visible.length ? <p className="p-5 text-sm text-slate-500">Tidak ada User Flow yang sesuai filter.</p> : visible.map((flow) => <label key={flow.id} className="flex cursor-pointer gap-3 border-b p-3 text-sm hover:bg-slate-50"><input type="checkbox" checked={selected.includes(flow.id)} onChange={() => onToggle(flow.id)} /><span><strong>{flow.flowKey} · {flow.title}</strong><small className="mt-1 block text-slate-500">Health: {flow.health} · Priority: {flow.priority} · Status: {flow.status}</small><small className="mt-1 block text-slate-500">{flow.linkedTestCaseCount} linked Test Cases{typeof flow.coverage === 'number' ? ` · Coverage ${flow.coverage}%` : ''}</small></span></label>)}
    </div>
  </div>;
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
  const [resolution, setResolution] = useState<Awaited<ReturnType<typeof TestRunsService.resolveUserFlows>>['data'] | null>(null);
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
    void UserFlowsService.list(projectId).then((response) => active && setFlows(response.data.flows)).catch(() => active && setFlows([]));
    return () => { active = false; };
  }, [projectId]);
  useEffect(() => {
    let active = true;
    if (mode !== 'flows' || !selectedFlowIds.length) { setResolution(null); return () => { active = false; }; }
    setFlowLoading(true);
    void TestRunsService.resolveUserFlows(projectId, { userFlowIds: selectedFlowIds, allowDraftTestCases: allowDraft })
      .then((response) => { if (active) { setResolution(response.data); setError(null); } })
      .catch((cause) => active && setError((cause as { message?: string }).message || 'User Flow tidak dapat diselesaikan.'))
      .finally(() => active && setFlowLoading(false));
    return () => { active = false; };
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
      <select
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">Semua</option>
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buat Test Run"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
    >
      <section className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold">Buat Test Run</h2>
            <p className="text-sm text-slate-500">Pilih Test Case atau User Flow dari proyek aktif.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            ×
          </button>
        </header>
        <div className="grid gap-5 overflow-y-auto p-5 lg:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Pilih berdasarkan">
              <button role="tab" aria-selected={mode === 'cases'} onClick={() => setMode('cases')} className={`rounded-md px-3 py-2 text-sm ${mode === 'cases' ? 'bg-white font-semibold text-brand-700 shadow-sm' : 'text-slate-600'}`}>Test Cases</button>
              <button role="tab" aria-selected={mode === 'flows'} onClick={() => setMode('flows')} className={`rounded-md px-3 py-2 text-sm ${mode === 'flows' ? 'bg-white font-semibold text-brand-700 shadow-sm' : 'text-slate-600'}`}>User Flows</button>
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
              <select
                aria-label="Run owner"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId || member.id} value={member.userId || member.id || ''}>
                    {member.username || member.userEmail || member.email || 'User'}
                  </option>
                ))}
              </select>
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
            <p className="text-sm font-medium">Selected: {mode === 'flows' ? selectedFlowIds.length : selected.length}</p>
            {mode === 'flows' && selectedFlowIds.length > 0 && (
              <section aria-live="polite" className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-950">
                <strong>Ringkasan pilihan</strong>
                {flowLoading ? <p className="mt-1">Menyelesaikan Test Cases…</p> : resolution ? <div className="mt-1 grid grid-cols-2 gap-1"><span>Selected User Flows: {resolution.selectedUserFlowCount}</span><span>Linked Test Cases: {resolution.linkedTestCases}</span><span>Unique Test Cases: {resolution.uniqueLinkedTestCases}</span><span>Excluded Deprecated: {resolution.excludedDeprecatedCount}</span><span>Draft requiring permission: {resolution.draftRequiringOptInCount}</span></div> : null}
              </section>
            )}
          </div>
          <div>
            {mode === 'flows' ? <FlowSelector flows={flows} query={flowQuery} health={flowHealth} priority={flowPriority} status={flowStatus} selected={selectedFlowIds} onQuery={setFlowQuery} onHealth={setFlowHealth} onPriority={setFlowPriority} onStatus={setFlowStatus} onToggle={(id) => setSelectedFlowIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} /> : <>
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
            <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border">
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
                    <span>
                      <strong>
                        {testCase.tcNumber ? `TC-${testCase.tcNumber}` : 'TC'} · {testCase.title}
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
              <button onClick={selectVisible} className="text-sm text-brand-700 hover:underline">
                Select current page
              </button>
              <button
                onClick={() => setSelected([])}
                className="text-sm text-brand-700 hover:underline"
              >
                Clear selection
              </button>
            </div>
            </>}
          </div>
        </div>
        {error && (
          <p role="alert" className="px-5 text-sm text-red-700">
            {error}
          </p>
        )}
        <footer className="flex justify-end gap-2 border-t p-4">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button disabled={saving || flowLoading || (mode === 'flows' ? !(resolution?.uniqueEligibleTestCases) : !selected.length)} onClick={() => void submit()}>
            {saving ? 'Menyimpan…' : 'Buat Test Run'}
          </Button>
        </footer>
      </section>
    </div>
  );
};

export const RunDetail = ({
  projectId,
  runId,
  executionId,
  onBack,
}: {
  projectId: string;
  runId: string;
  executionId?: string;
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
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsPanelId = useId();
  const actionsTriggerRef = useRef<HTMLButtonElement>(null);
  const closeActions = () => {
    setActionsOpen(false);
    requestAnimationFrame(() => actionsTriggerRef.current?.focus());
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
  const selected = executions.find((execution) => execution.id === selectedId) || executions[0];
  const index = executions.findIndex((execution) => execution.id === selected?.id);
  const assignees = [
    ...new Map(
      run.executions
        .filter((execution) => execution.assignee?.id)
        .map((execution) => [execution.assignee!.id, label(execution.assignee)]),
    ).entries(),
  ];
  const save = async (
    executionId: string,
    payload: { result?: TestRunResult | null; notes?: string },
  ) => {
    const response = await TestRunsService.updateExecution(projectId, runId, executionId, payload);
    setRun((current) => {
      if (!current) return current;
      const executions = current.executions.map((execution) =>
        execution.id === executionId ? response.data : execution,
      );
      return { ...current, executions, progress: current.progress || progressFromExecutions(executions) };
    });
    // The mutation response contains one execution only. Refetch the run so
    // status and all summary KPIs always come from the server's central helper.
    await load();
  };
  const completeRun = async () => {
    setCompleting(true);
    setCompletionError(null);
    try {
      await TestRunsService.updateStatus(projectId, runId, 'Completed');
      await load();
    } catch (cause) {
      setCompletionError(
        (cause as { message?: string }).message || 'Test Run tidak dapat diselesaikan saat ini.',
      );
    } finally {
      setCompleting(false);
    }
  };
  const canComplete = run.status !== 'Completed';
  return (
    <div className="mx-auto flex h-full w-full max-w-[1920px] flex-col space-y-4">
      <button
        onClick={onBack}
        className="flex w-fit items-center gap-1 text-sm font-medium text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <ChevronLeft size={16} /> Test Runs
      </button>
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{run.project?.name || 'Project'} / Test Runs</p>
          <h1 className="text-2xl font-bold">{run.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Owner: {label(run.owner)} · <StatusBadge value={run.status} />
          </p>
          {run.userFlows?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="User Flows dalam Test Run">
              {run.userFlows.map((flow) => (
                <span key={flow.id} className="inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800">
                  {flow.snapshot.flowKey} · {flow.snapshot.title}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <div className="relative">
            <button
              ref={actionsTriggerRef}
              type="button"
              aria-expanded={actionsOpen}
              aria-controls={actionsPanelId}
              onClick={() => setActionsOpen((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && actionsOpen) closeActions();
              }}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Aksi <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
            {actionsOpen && (
              <div
                id={actionsPanelId}
                aria-label="Aksi Test Run"
                className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeActions();
                }}
              >
                <button
                  onClick={closeActions}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <Eye className="h-4 w-4 text-slate-500" /> Detail run
                </button>
                {canComplete && (
                  <button
                    onClick={() => {
                      setActionsOpen(false);
                      void completeRun();
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <Check className="h-4 w-4 text-emerald-600" /> Selesaikan run
                  </button>
                )}
              </div>
            )}
          </div>
          {canComplete && (
            <Button disabled={completing} onClick={() => void completeRun()}>
              {completing ? 'Menyelesaikan…' : 'Selesaikan Run'}
            </Button>
          )}
        </div>
      </header>
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <MetricTile
          label="Progress Eksekusi"
          value={`${progress.percentage}%`}
          detail={`${progress.executed} / ${progress.total} executed`}
          accent="bg-brand-600"
        />
        <MetricTile label="Passed" value={progress.passed} accent="bg-emerald-500" />
        <MetricTile label="Failed" value={progress.failed} accent="bg-red-500" />
        <MetricTile label="Blocked" value={progress.blocked} accent="bg-amber-500" />
        <MetricTile label="Skipped" value={progress.skipped} accent="bg-slate-400" />
        <MetricTile label="Untested" value={progress.untested} accent="bg-slate-300" />
      </section>
      {completionError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {completionError}
        </p>
      )}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
        <aside className="overflow-y-auto rounded-xl border bg-white">
          <div className="space-y-2 border-b p-3">
            <h2 className="font-semibold">Test cases in run</h2>
            <input
              aria-label="Cari test case dalam run"
              value={executionSearch}
              onChange={(event) => setExecutionSearch(event.target.value)}
              placeholder="Cari test case…"
              className="h-9 w-full rounded-lg border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                aria-label="Filter result"
                value={executionResult}
                onChange={(event) => setExecutionResult(event.target.value)}
                className="h-8 rounded border px-1 text-xs"
              >
                <option value="">Result</option>
                {(['Passed', 'Failed', 'Blocked', 'Skipped', 'Untested'] as const).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                aria-label="Filter priority"
                value={executionPriority}
                onChange={(event) => setExecutionPriority(event.target.value)}
                className="h-8 rounded border px-1 text-xs"
              >
                <option value="">Priority</option>
                {[
                  ...new Set(run.executions.map((item) => item.snapshot.priority).filter(Boolean)),
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                aria-label="Filter assignee"
                value={executionAssignee}
                onChange={(event) => setExecutionAssignee(event.target.value)}
                className="h-8 rounded border px-1 text-xs"
              >
                <option value="">Assignee</option>
                {assignees.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
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
          {executions.map((execution) => (
            <button
              key={execution.id}
              onClick={() => setSelectedId(execution.id)}
              aria-current={execution.id === selected?.id ? 'true' : undefined}
              className={`flex w-full items-start gap-3 border-b p-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 ${execution.id === selected?.id ? 'border-l-4 border-l-brand-600 bg-brand-50' : 'hover:bg-slate-50'}`}
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
                {execution.userFlows?.length ? (
                  <span className="mt-1 block truncate text-[11px] text-violet-700">
                    Dari {execution.userFlows.map((flow) => flow.snapshot.flowKey).join(', ')}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
          {!executions.length && (
            <p className="p-4 text-sm text-slate-500">Tidak ada hasil yang cocok.</p>
          )}
        </aside>
        <main className="overflow-y-auto rounded-xl border bg-white p-5">
          {selected ? (
            <ExecutionDetail
              execution={selected}
              onSave={save}
              onPrevious={() => index > 0 && setSelectedId(executions[index - 1].id)}
              onNext={() =>
                index < executions.length - 1 && setSelectedId(executions[index + 1].id)
              }
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
  <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <span className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
    <p className="text-[11px] font-medium text-slate-500">{metricLabel}</p>
    <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
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
  execution,
  onSave,
  onPrevious,
  onNext,
}: {
  execution: TestRunExecutionRecord;
  onSave: (executionId: string, payload: { result?: TestRunResult | null; notes?: string }) => Promise<void>;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const [result, setResult] = useState<TestRunResult>(execution.result);
  const [notes, setNotes] = useState(execution.notes || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveInFlight = useRef(false);
  useEffect(() => {
    setResult(execution.result);
    setNotes(execution.notes || '');
  }, [execution]);
  const save = async (next = false) => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      // `null` explicitly resets a previously terminal execution to Untested.
      const payload = result === 'Untested' ? { result: null, notes } : { result, notes };
      await onSave(execution.id, payload);
      if (next) onNext();
    } catch (cause) {
      const error = cause as { message?: string; executionSaved?: boolean };
      setSaveError(error.executionSaved
        ? error.message || 'Hasil eksekusi sudah tersimpan, tetapi data terbaru tidak dapat dimuat.'
        : `Gagal menyimpan eksekusi. ${error.message || 'Coba lagi.'}`);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-slate-500">
          TC-{execution.snapshot.tcNumber ?? '—'} · {execution.snapshot.automationType || '—'} ·{' '}
          {execution.snapshot.priority || '—'}
        </p>
        <h2 className="text-xl font-bold">{execution.snapshot.title}</h2>
        <p className="mt-2 text-sm text-slate-500">
          Assignee: {label(execution.assignee)} · Last saved:{' '}
          {new Date(execution.updatedAt).toLocaleString()}
        </p>
        {execution.userFlows?.length ? (
          <div className="mt-3" aria-label="Asal User Flow">
            <p className="text-xs font-medium text-slate-500">User Flow asal</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {execution.userFlows.map((flow) => (
                <span key={flow.id} className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800">
                  {flow.snapshot.flowKey} · {flow.snapshot.title}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </header>
      <section>
        <h3 className="font-semibold">Preconditions</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
          {execution.snapshot.preconditions || '—'}
        </p>
      </section>
      <section>
        <h3 className="font-semibold">Expected Result</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
          {execution.snapshot.expectedResult || '—'}
        </p>
      </section>
      <section>
        <h3 className="font-semibold">Steps</h3>
        <ol className="mt-2 space-y-2">
          {(execution.snapshot.steps || []).map((step, index) => (
            <li key={step.id || index} className="rounded-lg border p-3 text-sm">
              <strong>
                {index + 1}. {step.action}
              </strong>
              <p className="mt-1 text-slate-500">Expected: {step.expectedResult}</p>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <label className="block text-sm font-semibold">
          Result
          <select
            value={result}
            onChange={(event) => setResult(event.target.value as TestRunResult)}
            className="mt-1 block h-10 rounded-lg border px-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="Untested">Belum diuji</option>
            {(['Passed', 'Failed', 'Blocked', 'Skipped'] as TestRunResult[]).map((option) => (
              <option key={option}>{resultLabel(option)}</option>
            ))}
          </select>
        </label>
      </section>
      <section>
        <label className="block text-sm font-semibold">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 block min-h-24 w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Evidence attachment belum tersedia untuk Test Run pada MVP ini.
        </p>
      </section>
      {saveError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {saveError}
        </p>
      )}
      <footer className="flex justify-between gap-2">
        <Button variant="secondary" disabled={saving} icon={<ChevronLeft size={16} />} onClick={onPrevious}>
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={saving} onClick={() => void save()}>
            Save
          </Button>
          <Button
            icon={<ChevronRight size={16} />}
            disabled={saving}
            onClick={() => void save(true)}
          >
            Save & Next
          </Button>
        </div>
      </footer>
    </div>
  );
};
