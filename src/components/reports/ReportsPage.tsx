/* eslint-disable no-unused-vars -- TypeScript callback props are misidentified by repository lint configuration. */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, BarChart3, CheckCircle2, Circle, Eye, ShieldCheck, Target, XCircle } from 'lucide-react';
import { ReportsService, type ReportFilters } from '@/src/api/reports.service.ts';
import { ProjectsService } from '@/src/api/projects.service.ts';
import { TestRunsService } from '@/src/api/test-runs.service.ts';
import { UserFlowsService } from '@/src/api/user-flows.service.ts';
import { onExecutionDataChanged } from '@/src/api/execution-refresh.ts';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import { Select as CustomSelect } from '@/src/components/projectsTestCases/ui/Select.tsx';
import { InfoPopover } from '@/src/components/projectsTestCases/ui/InfoPopover.tsx';
import { Modal } from '@/src/components/projectsTestCases/ui/Modal.tsx';
import { MarkdownContent } from '@/src/components/projectsTestCases/ui/Markdown.tsx';
import type { Project } from '@/src/components/projectsTestCases/types.ts';
import type { ProjectReportRecord, TestRunExecutionRecord } from '@/src/types/api.ts';
import { resultLabel } from '@/src/components/testRuns/metrics.ts';
import { formatTestCaseDisplayId } from '@/src/utils/testCaseDisplayId.ts';
import { metricValue, percentageValue } from './metricFormat.ts';

type Props = {
  projects: Project[];
  projectId: string;
  filters: ReportFilters;
  onProjectChange: (id: string) => void;
  onFiltersChange: (filters: ReportFilters) => void;
};
const resultColours: Record<string, string> = {
  Passed: 'bg-emerald-500',
  Failed: 'bg-red-500',
  Blocked: 'bg-amber-500',
  Skipped: 'bg-slate-400',
  Untested: 'bg-slate-300',
};
const resultHex: Record<string, string> = {
  Passed: '#22c55e',
  Failed: '#ef4444',
  Blocked: '#f59e0b',
  Skipped: '#94a3b8',
  Untested: '#cbd5e1',
};
const ResultMarker = ({ result }: { result: string }) =>
  result === 'Passed' ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
  ) : result === 'Failed' ? (
    <XCircle className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
  ) : (
    <Circle className="h-3.5 w-3.5" style={{ color: resultHex[result] }} aria-hidden="true" />
  );
const card = (label: string, value: number | null, suffix = '') => (
  <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-[11px] font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-900">
      {value == null ? '—' : `${Number(value.toFixed(2))}${suffix}`}
    </p>
  </article>
);

export const ReportsPage = ({
  projects,
  projectId,
  filters,
  onProjectChange,
  onFiltersChange,
}: Props) => {
  const [report, setReport] = useState<ProjectReportRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'section' | 'folder' | 'userFlow' | 'priority' | 'automationType'>('section');
  const [scope, setScope] = useState<{
    sections: Array<{ id: string; name: string }>;
    folders: Array<{ id: string; name: string }>;
    assignees: Array<{ id: string; name: string }>;
    runs: Array<{ id: string; name: string }>;
    userFlows: Array<{ id: string; name: string }>;
  }>({ sections: [], folders: [], assignees: [], runs: [], userFlows: [] });
  const load = useCallback(async () => {
    if (!projectId) {
      setReport(null);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const response = await ReportsService.get(projectId, filters);
      setReport(response.data);
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
      setScope({ sections: [], folders: [], assignees: [], runs: [], userFlows: [] });
      return () => {
        active = false;
      };
    }
    void Promise.all([
      ProjectsService.listTestCases(projectId),
      ProjectsService.listTestCaseFolders(projectId),
      ProjectsService.listMembers(projectId),
      TestRunsService.list(projectId),
      UserFlowsService.list(projectId),
    ])
      .then(([testCases, folders, members, runs, userFlows]) => {
        if (!active) return;
        setScope({
          sections: [
            ...new Map(
              testCases.data.map((item) => [
                item.sectionId || item.section,
                { id: item.sectionId || item.section, name: item.section },
              ]),
            ).values(),
          ],
          folders: folders.data.folders.map((item) => ({ id: item.id, name: item.name })),
          assignees: members.data
            .map((item) => ({
              id: item.userId || item.id || '',
              name: item.username || item.userEmail || item.email || 'User',
            }))
            .filter((item) => item.id),
          runs: runs.data.items.map((item) => ({ id: item.id, name: item.name })),
          userFlows: userFlows.data.flows.map((item) => ({ id: item.id, name: `${item.flowKey} — ${item.title}` })),
        });
      })
      .catch(() => {
        if (active) setScope({ sections: [], folders: [], assignees: [], runs: [], userFlows: [] });
      });
    return () => {
      active = false;
    };
  }, [projectId]);
  const set = (key: keyof ReportFilters, value: string) =>
    onFiltersChange({ ...filters, [key]: value || undefined });
  const reset = () => onFiltersChange({});
  const Select = ({
    name,
    field,
    options,
  }: {
    name: string;
    field: keyof ReportFilters;
    options: Array<{ id: string; name: string }>;
  }) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      <span>{name}</span>
      <CustomSelect
        aria-label={name}
        disabled={!projectId}
        value={String(filters[field] || '')}
        onChange={(value) => set(field, String(value))}
        options={options.map((item) => ({ value: item.id, label: item.name }))}
        placeholder="Semua"
        size="md"
      />
    </label>
  );
  return (
    <div className="animate-in fade-in mx-auto w-full max-w-[1920px] space-y-5 duration-300">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pantau kualitas pengujian berdasarkan hasil Test Runs.
        </p>
      </header>
      <section className="rounded-xl border border-slate-200/60 bg-white/60 p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-52 flex-col gap-1 text-xs font-medium text-slate-600">
            <span>Project</span>
            <CustomSelect
              aria-label="Project"
              value={projectId}
              onChange={(value) => onProjectChange(String(value))}
              options={projects.map((project) => ({ value: project.id, label: project.name }))}
              placeholder="Pilih proyek"
              size="md"
            />
          </label>
          {[
            ['Date from', 'dateFrom'],
            ['Date to', 'dateTo'],
          ].map(([name, field]) => (
            <label key={field} className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              <span>{name}</span>
              <input
                type="date"
                disabled={!projectId}
                value={String(filters[field as keyof ReportFilters] || '')}
                onChange={(event) => set(field as keyof ReportFilters, event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          ))}
          <Select name="Test Run" field="runId" options={scope.runs} />
          <Select name="User Flow" field="userFlowId" options={scope.userFlows} />
          <Select name="Section" field="sectionId" options={scope.sections} />
          <Select name="Folder" field="folderId" options={scope.folders} />
          <Select name="Assignee" field="assigneeId" options={scope.assignees} />
          <Select
            name="Priority"
            field="priority"
            options={['Critical', 'High', 'Medium', 'Low'].map((item) => ({
              id: item,
              name: item,
            }))}
          />
          <Select
            name="Automation type"
            field="automationType"
            options={['UI', 'API', 'Manual'].map((item) => ({ id: item, name: item }))}
          />
          <Select
            name="Result"
            field="result"
            options={['Passed', 'Failed', 'Blocked', 'Skipped', 'Untested'].map((item) => ({
              id: item,
              name: resultLabel(item),
            }))}
          />
          <button
            onClick={reset}
            disabled={!projectId}
            className="h-10 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            Reset filter
          </button>
        </div>
      </section>
      {!projectId ? (
        <Empty
          title="Pilih proyek untuk melihat report."
          text="Report hanya menampilkan data dari proyek yang dapat Anda akses."
        />
      ) : loading ? (
        <Skeleton />
      ) : error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto text-red-600" />
          <h2 className="mt-2 font-semibold">Gagal memuat Reports</h2>
          <p className="mt-1 text-sm text-slate-600">Data tidak dapat dimuat saat ini.</p>
          <Button className="mt-4" onClick={() => void load()}>
            Coba lagi
          </Button>
        </section>
      ) : !report || !report.hasData ? (
        <Empty
          title={filters.userFlowId ? 'Belum ada hasil Test Run untuk User Flow pada filter yang dipilih.' : 'Belum ada data pengujian'}
          text={filters.userFlowId ? 'Ubah filter atau jalankan Test Run dari User Flow ini.' : 'Report akan tersedia setelah terdapat hasil eksekusi Test Run.'}
        />
      ) : (
        <ReportContent
          report={report}
          projectId={projectId}
          scopeLabel={[projects.find((project) => project.id === projectId)?.name || 'Project aktif', filters.dateFrom && `mulai ${filters.dateFrom}`, filters.dateTo && `sampai ${filters.dateTo}`, filters.runId && 'Test Run terpilih', filters.userFlowId && 'User Flow terpilih'].filter(Boolean).join(' · ')}
          tab={tab}
          setTab={setTab}
          onResultFilter={(result) => set('result', result)}
          onOpenUserFlow={(id) => onFiltersChange({ ...filters, userFlowId: id })}
        />
      )}
    </div>
  );
};

const Empty = ({ title, text }: { title: string; text: string }) => (
  <section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
    <BarChart3 className="mb-3 text-slate-400" />
    <h2 className="font-semibold text-slate-900">{title}</h2>
    <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
  </section>
);
const Skeleton = () => (
  <div aria-label="Memuat Reports" className="space-y-4">
    {' '}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-200" />
      ))}
    </div>
    <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
  </div>
);

const formatCount = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString();
const percentage = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? 'N/A' : `${Number(value.toFixed(2))}%`;
const ProgressMetric = ({ label, value, help }: { label: string; value: number | null | undefined; help: string }) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{label}</span><span className="font-semibold text-slate-900">{percentage(value)}</span></div>
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></div>
    <p className="mt-1 text-xs text-slate-500">{help}</p>
  </div>
);

type TrendPoint = ProjectReportRecord['trend'][number] & { passRate: number | null };

const PassRateTrend = ({ trend }: { trend: ProjectReportRecord['trend'] }) => {
  const points: TrendPoint[] = [...trend].sort((a, b) => {
    const aTime = Date.parse(a.date);
    const bTime = Date.parse(b.date);
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
    if (Number.isFinite(aTime)) return -1;
    if (Number.isFinite(bTime)) return 1;
    return 0;
  }).map((item) => {
    const denominator = item.passed + item.failed + item.blocked;
    return { ...item, passRate: denominator ? (item.passed / denominator) * 100 : null };
  });
  const validPoints = points.filter((point) => point.passRate != null);
  const chartWidth = Math.max(560, points.length * 76);
  const chartHeight = 260;
  const plot = { left: 52, right: chartWidth - 24, top: 20, bottom: 208 };
  const times = points.map((point) => Date.parse(point.date));
  const validTimes = times.filter(Number.isFinite);
  const start = validTimes.length ? Math.min(...validTimes) : 0;
  const end = validTimes.length ? Math.max(...validTimes) : 0;
  const timeRange = end - start;
  const position = (index: number, passRate: number | null) => {
    const time = times[index];
    const ratio = timeRange > 0 && Number.isFinite(time)
      ? (time - start) / timeRange
      : index / Math.max(1, points.length - 1);
    return {
      x: plot.left + ratio * (plot.right - plot.left),
      y: plot.bottom - ((passRate ?? 0) / 100) * (plot.bottom - plot.top),
    };
  };
  const segments: Array<Array<{ point: TrendPoint; index: number }>> = [];
  points.forEach((point, index) => {
    if (point.passRate == null) return;
    const segment = segments.at(-1);
    if (segment && segment.at(-1)?.index === index - 1) segment.push({ point, index });
    else segments.push([{ point, index }]);
  });
  const latest = validPoints.at(-1)?.passRate ?? null;
  const first = validPoints[0]?.passRate ?? null;
  const delta = latest != null && first != null ? latest - first : null;
  const labelStep = points.length > 8 ? Math.ceil(points.length / 6) : 1;
  const tooltip = (point: TrendPoint) => {
    const executed = point.passed + point.failed + point.blocked + point.skipped;
    const total = executed + point.untested;
    return `${point.date}: Pass Rate ${percentage(point.passRate)} · ${point.passed} passed · ${executed} executed / ${total} total`;
  };

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-600" aria-hidden="true" />
            <h2 className="font-semibold text-slate-900">Pass rate trend</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Passed ÷ (Passed + Failed + Blocked), berdasarkan periode eksekusi.</p>
        </div>
        <div className="grid min-w-[164px] grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/60">
          <div className="px-3 py-2"><p className="text-[10px] font-semibold uppercase leading-4 tracking-[.08em] text-slate-400">Latest</p><p className="mt-0.5 text-lg font-semibold leading-6 tabular-nums text-slate-900">{percentage(latest)}</p></div>
          <div className="px-3 py-2"><p className="text-[10px] font-semibold uppercase leading-4 tracking-[.08em] text-slate-400">Change</p><p className={`mt-0.5 text-lg font-semibold leading-6 tabular-nums ${delta != null && delta > 0 ? 'text-emerald-600' : delta != null && delta < 0 ? 'text-red-600' : 'text-slate-500'}`}>{delta == null ? 'N/A' : <>{delta > 0 ? '+' : ''}{Number(delta.toFixed(2))} <span className="text-xs font-medium">pp</span></>}</p></div>
        </div>
      </div>
      {validPoints.length ? <div className="overflow-x-auto px-3 pb-4 pt-5 sm:px-5"><div style={{ minWidth: `${chartWidth}px` }}><svg data-testid="pass-rate-trend-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[260px] w-full overflow-visible" role="img" aria-label="Pass rate trend from 0 to 100 percent">
        {[100, 75, 50, 25, 0].map((value) => {
          const y = plot.bottom - (value / 100) * (plot.bottom - plot.top);
          return <g key={value}><line x1={plot.left} x2={plot.right} y1={y} y2={y} stroke={value === 0 ? '#cbd5e1' : '#e2e8f0'} strokeDasharray={value === 0 ? undefined : '3 5'} /><text x={plot.left - 12} y={y + 4} textAnchor="end" fill="#64748b" fontSize="12">{value}%</text></g>;
        })}
        {segments.map((segment, segmentIndex) => {
          if (segment.length < 2) return null;
          const line = segment.map(({ point, index }) => { const { x, y } = position(index, point.passRate); return `${x},${y}`; }).join(' ');
          const firstPosition = position(segment[0].index, segment[0].point.passRate);
          const lastPosition = position(segment.at(-1)!.index, segment.at(-1)!.point.passRate);
          return <g key={`segment-${segmentIndex}`}><polygon points={`${line} ${lastPosition.x},${plot.bottom} ${firstPosition.x},${plot.bottom}`} fill="#2563eb" fillOpacity=".07" /><polyline points={line} fill="none" stroke="#2563eb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></g>;
        })}
        {points.map((point, index) => {
          if (point.passRate == null) return null;
          const { x, y } = position(index, point.passRate);
          return <g key={point.date}><circle cx={x} cy={y} r="7" fill="white" stroke="#2563eb" strokeWidth="3"><title>{tooltip(point)}</title></circle>{(index % labelStep === 0 || index === points.length - 1) && <text x={x} y={plot.bottom + 28} textAnchor="middle" fill="#64748b" fontSize="11">{point.date.slice(5)}</text>}</g>;
        })}
      </svg></div></div> : <p className="px-5 py-8 text-sm text-slate-500">Belum cukup data eksekusi untuk menampilkan trend.</p>}
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>Skala tetap 0–100%</span><span>Skipped dan untested tidak dihitung</span>{points.length > validPoints.length && <span>{points.length - validPoints.length} periode tanpa data pass rate tidak ditampilkan</span>}</div>
    </article>
  );
};

const ReportExecutionModal = ({
  item,
  execution,
  loading,
  error,
  onClose,
}: {
  item: ProjectReportRecord['attention'][number];
  execution: TestRunExecutionRecord | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) => (
  <Modal
    isOpen
    title={`${formatTestCaseDisplayId({ projectKey: item.projectKey, tcNumber: item.tcNumber })} · Detail hasil`}
    description={`${item.runName} · ${resultLabel(item.result)}`}
    onClose={onClose}
    maxWidth="max-w-3xl"
  >
    <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-4 sm:p-6">
      {loading ? <p className="text-sm text-slate-500">Memuat detail hasil eksekusi…</p> : error ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p> : execution ? <div className="space-y-6 text-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><p className="text-sm text-slate-500">Test Case</p><p className="mt-1 font-semibold text-slate-900">{formatTestCaseDisplayId(execution.snapshot)}</p></div>
          <div><p className="text-sm text-slate-500">Result</p><p className="mt-1 font-semibold text-slate-900">{resultLabel(execution.result)}</p></div>
          <div><p className="text-sm text-slate-500">Last updated</p><p className="mt-1 text-slate-700">{execution.updatedAt ? new Date(execution.updatedAt).toLocaleString() : '—'}</p></div>
        </div>
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Test Case</p><h3 className="mt-1 text-base font-semibold leading-6 text-slate-900">{execution.snapshot.title}</h3>{execution.snapshot.expectedResult && <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-800">Expected result:</span> {execution.snapshot.expectedResult}</p>}</div>
        {execution.notes && <div className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Execution notes</p><MarkdownContent className="mt-2 text-sm leading-6 text-slate-700" value={execution.notes} /></div>}
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step results</p><div className="mt-2 space-y-3">{execution.steps?.length ? execution.steps.map((step, index) => <div key={step.id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><span className="text-sm font-medium leading-6 text-slate-800">{index + 1}. {step.action}</span><span className="shrink-0 text-xs font-semibold text-slate-600">{resultLabel(step.result)}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">Expected: {step.expectedResult}</p>{step.notes && <div className="mt-2 text-sm leading-6 text-slate-700"><span className="font-medium">Note:</span><MarkdownContent className="mt-1 text-sm leading-6" value={step.notes} /></div>}</div>) : <p className="text-slate-500">Tidak ada detail langkah.</p>}</div></div>
      </div> : <p className="text-sm text-slate-500">Detail hasil tidak ditemukan.</p>}
    </div>
  </Modal>
);

export const ReportContent = ({
  report,
  projectId,
  scopeLabel,
  tab,
  setTab,
  onResultFilter,
  onOpenUserFlow,
}: {
  report: ProjectReportRecord;
  projectId: string;
  scopeLabel: string;
  tab: 'section' | 'folder' | 'userFlow' | 'priority' | 'automationType';
  setTab: (tab: 'section' | 'folder' | 'userFlow' | 'priority' | 'automationType') => void;
  onResultFilter: (result: string) => void;
  onOpenUserFlow: (id: string) => void;
}) => {
  const [selectedAttention, setSelectedAttention] = useState<ProjectReportRecord['attention'][number] | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<TestRunExecutionRecord | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const openAttention = async (item: ProjectReportRecord['attention'][number]) => {
    setSelectedAttention(item);
    setSelectedExecution(null);
    setExecutionError(null);
    setExecutionLoading(true);
    try {
      const response = await TestRunsService.listExecutions(projectId, item.runId);
      setSelectedExecution(response.data.find((execution) => execution.id === item.executionId) || null);
    } catch {
      setExecutionError('Detail hasil tidak dapat dimuat saat ini.');
    } finally {
      setExecutionLoading(false);
    }
  };
  const total = report.distribution.reduce((sum, item) => sum + item.count, 0);
  const failed = report.summary.failed || 0;
  const blocked = report.summary.blocked || 0;
  const flows = report.userFlowQuality || [];
  const flowsNeedingAttention = flows.filter((row) => (row.failed || 0) + (row.blocked || 0) > 0 || (row.progress != null && row.progress < 70)).length;
  const health = report.summary.executed == null || report.summary.executed === 0
    ? { label: 'Belum dimulai', tone: 'slate', detail: 'Belum ada hasil eksekusi pada scope ini.' }
    : failed + blocked === 0 && (report.summary.passRate || 0) >= 80
      ? { label: 'Sehat', tone: 'emerald', detail: 'Tidak ada failure atau blocker yang terdeteksi.' }
      : { label: 'Perlu perhatian', tone: 'amber', detail: `${failed + blocked} hasil non-passing perlu ditinjau.` };
  const breakdown = report.breakdowns[tab] || [];
  const sortedFlows = [...flows].sort((a, b) => ((b.failed || 0) + (b.blocked || 0)) - ((a.failed || 0) + (a.blocked || 0))).slice(0, 6);
  return (
    <>
      <section aria-labelledby="quality-overview" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div><h2 id="quality-overview" className="text-lg font-semibold text-slate-900">Quality overview</h2><p className="text-sm text-slate-500">{scopeLabel}</p></div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${health.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : health.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}><ShieldCheck className="h-3.5 w-3.5" />{health.label}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {card('Total test cases', total)}
          {card('Executed', report.summary.executed)}
          {card('Pass rate', report.summary.passRate, report.summary.passRate === null ? '' : '%')}
          {card('Coverage', report.summary.progress, report.summary.progress === null ? '' : '%')}
          {card('Failed', report.summary.failed)}
          {card('Blocked', report.summary.blocked)}
          {card('Flows at risk', flowsNeedingAttention)}
        </div>
        <div className="grid gap-4 xl:grid-cols-[.78fr_1.22fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">Overall health</h3><p className="mt-1 text-sm text-slate-500">Gabungan kualitas eksekusi dan coverage.</p></div><InfoPopover label="Explain Overall Health"><div className="space-y-2 text-xs leading-relaxed"><p className="font-semibold text-slate-900">Cara membaca Overall Health</p><p>Health dirangkum dari Pass Rate, Failed, Blocked, dan Coverage pada scope aktif.</p><ul className="space-y-1"><li><strong>Sehat:</strong> pass rate minimal 80% dan tidak ada failed atau blocked.</li><li><strong>Perlu perhatian:</strong> ada failed/blocked atau pass rate di bawah 80%.</li><li><strong>Belum dimulai:</strong> belum ada hasil eksekusi.</li></ul><p className="border-t border-slate-100 pt-2 text-slate-500">Coverage adalah Executed ÷ seluruh test case dalam scope.</p></div></InfoPopover></div>
            <div className="mt-5 flex items-center gap-5"><div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${health.tone === 'emerald' ? '#10b981' : health.tone === 'amber' ? '#f59e0b' : '#cbd5e1'} ${(report.summary.passRate || 0) * 3.6}deg, #e2e8f0 0)` }}><div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white text-center"><strong className="text-xl leading-none text-slate-900">{percentage(report.summary.passRate)}</strong><span className="mt-1 text-[10px] leading-none text-slate-500">pass rate</span></div></div><p className="text-sm leading-6 text-slate-600">{health.detail}<br /><span className="font-medium text-slate-800">{formatCount(report.summary.untested)} belum dites</span> dari {formatCount(total)} test case.</p></div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">Execution distribution</h3><p className="mt-1 text-sm text-slate-500">Klik status untuk memfilter report.</p></div><Target className="h-4 w-4 text-brand-600" /></div>
            <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-100" aria-label="Status distribution">
              {report.distribution.filter((item) => item.count > 0).map((item) => <button key={item.result} type="button" aria-label={`Filter ${resultLabel(item.result)}: ${item.count}`} title={`${resultLabel(item.result)}: ${item.count} (${total ? Math.round(item.count / total * 100) : 0}%)`} onClick={() => onResultFilter(item.result)} className={`${resultColours[item.result]} h-full transition-opacity hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-brand-500`} style={{ width: `${total ? item.count / total * 100 : 0}%` }} />)}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{report.distribution.map((item) => <button key={item.result} type="button" onClick={() => onResultFilter(item.result)} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"><span className="inline-flex items-center gap-2 text-slate-600"><ResultMarker result={item.result} />{resultLabel(item.result)}</span><span className="font-semibold text-slate-800">{formatCount(item.count)} <span className="font-normal text-slate-400">({total ? Math.round(item.count / total * 100) : 0}%)</span></span></button>)}</div>
          </article>
        </div>
      </section>
      <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500">Cara membaca report</summary>
        <div className="mt-3 space-y-1">
          <p><strong>Scope aktif:</strong> {scopeLabel}.</p>
          <p><strong>Executed:</strong> jumlah test yang sudah memiliki hasil akhir: Passed + Failed + Blocked + Skipped.</p>
          <p><strong>Execution Progress:</strong> Executed / seluruh test dalam scope.</p>
          <p><strong>Pass Rate:</strong> Passed / (Passed + Failed + Blocked).</p>
          <p><strong>Skipped:</strong> sudah diproses tetapi sengaja tidak dijalankan; tidak memengaruhi Pass Rate.</p>
          <p><strong>Untested:</strong> belum memiliki hasil eksekusi; tidak dihitung sebagai Executed.</p>
          <p><strong>Blocked:</strong> eksekusi tidak dapat diselesaikan karena blocker dan dihitung sebagai non-passing verdict.</p>
        </div>
      </details>
      <section className="grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
        <PassRateTrend trend={report.trend} />
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Coverage & execution</h2><p className="mt-1 text-sm text-slate-500">Seberapa luas scope sudah dijalankan dan kualitas hasilnya.</p><div className="mt-6 space-y-5"><ProgressMetric label="Coverage" value={report.summary.progress} help="Executed ÷ seluruh test case dalam scope." /><ProgressMetric label="Pass rate" value={report.summary.passRate} help="Passed ÷ (Passed + Failed + Blocked)." /><div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="font-semibold text-slate-900">{formatCount(report.summary.untested)} test case</span> masih belum dieksekusi.</div></div></article>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">User Flow health</h2><p className="mt-1 text-sm text-slate-500">Klik flow untuk melihat hasil report yang relevan.</p></div><ArrowUpRight className="h-4 w-4 text-brand-600" /></div><div className="mt-5 grid gap-3 md:grid-cols-2">{sortedFlows.map((row) => <button key={row.id || row.label} type="button" onClick={() => row.id && onOpenUserFlow(row.id)} aria-label={`Lihat hasil report untuk ${row.label}`} className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus:ring-2 focus:ring-brand-500"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium text-slate-800">{row.label}</span><span className="shrink-0 text-xs font-semibold text-slate-600">{percentage(row.passRate)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><span className={`${(row.failed || 0) + (row.blocked || 0) ? 'bg-red-500' : 'bg-emerald-500'} block h-full rounded-full`} style={{ width: `${Math.max(0, Math.min(100, row.progress ?? row.passRate ?? 0))}%` }} /></div><div className="mt-2 flex gap-3 text-xs text-slate-500"><span>{formatCount(row.executed)} executed</span><span className="text-red-600">{formatCount((row.failed || 0) + (row.blocked || 0))} issue</span></div></button>)}{!sortedFlows.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Belum ada data User Flow pada scope ini.</p>}</div></section>
      <section className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Breakdown</h2>
          <div role="tablist" aria-label="Report breakdown">
            <>
              {(
                [
                  ['section', 'Section'],
                  ['folder', 'Folder'],
                  ['userFlow', 'User Flow'],
                  ['priority', 'Priority'],
                  ['automationType', 'Automation Type'],
                ] as const
              ).map(([key, name]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${tab === key ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {name}
                </button>
              ))}
            </>
          </div>
        </div>
        <div className="table-scroll-container mt-4">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                {['Scope', 'Executed', 'Passed', 'Failed', 'Blocked', 'Skipped', 'Untested', 'Pass Rate', 'Progress'].map(
                  (heading) => (
                    <th key={heading} className="px-3 py-2">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.label} className="border-b">
                  <td className="px-3 py-3 font-medium">{row.label}</td>
                  <td className="px-3 py-3">{metricValue(row.executed)}</td>
                  <td className="px-3 py-3">{metricValue(row.passed)}</td>
                  <td className="px-3 py-3">{metricValue(row.failed)}</td>
                  <td className="px-3 py-3">{metricValue(row.blocked)}</td>
                  <td className="px-3 py-3">{metricValue(row.skipped)}</td>
                  <td className="px-3 py-3">{metricValue(row.untested)}</td>
                  <td className="px-3 py-3">{percentageValue(row.passRate)}</td>
                  <td className="px-3 py-3">{percentageValue(row.progress)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">User Flow Quality</h2>
        <p className="mt-1 text-sm text-slate-500">Kualitas berdasarkan hasil eksekusi Test Run pada scope aktif.</p>
        <div className="table-scroll-container mt-4"><table className="w-full min-w-[740px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr>{['User Flow', 'Executed', 'Passed', 'Failed', 'Blocked', 'Pass Rate', 'Progress'].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead><tbody>{(report.userFlowQuality || []).map((row) => <tr key={row.id || row.label} className="border-b"><td className="px-3 py-3 font-medium">{row.id ? <button onClick={() => onOpenUserFlow(row.id!)} aria-label={`Lihat hasil report untuk ${row.label}`} className="text-left text-brand-700 hover:underline">{row.label}</button> : row.label}</td><td className="px-3 py-3">{metricValue(row.executed)}</td><td className="px-3 py-3">{metricValue(row.passed)}</td><td className="px-3 py-3">{metricValue(row.failed)}</td><td className="px-3 py-3">{metricValue(row.blocked)}</td><td className="px-3 py-3">{percentageValue(row.passRate)}</td><td className="px-3 py-3">{percentageValue(row.progress)}</td></tr>)}</tbody></table>{!(report.userFlowQuality || []).length && <p className="p-4 text-sm text-slate-500">Belum ada hasil Test Run untuk User Flow pada filter yang dipilih.</p>}</div>
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Perlu Perhatian</h2>
        <p className="mt-1 text-sm text-slate-500">
          Failed dan blocked executions pada scope aktif. Klik item untuk melihat detail hasil tanpa meninggalkan Report.
        </p>
        <div className="mt-4 space-y-2">
          {report.attention.length ? (
            report.attention.map((item) => (
              <button
                key={item.id}
                onClick={() => void openAttention(item)}
                aria-label={`Lihat detail hasil ${item.title}`}
                className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <span>
                  <strong>
                    {formatTestCaseDisplayId({ projectKey: item.projectKey, tcNumber: item.tcNumber })} ·{' '}
                    {item.title}
                  </strong>
                  <small className="mt-1 block text-slate-500">
                    {item.runName} · {resultLabel(item.result)}
                  </small>
                </span>
                <Eye className="h-4 w-4 text-brand-600" aria-hidden="true" />
              </button>
            ))
          ) : (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              Tidak ada failed atau blocked execution pada scope ini.
            </p>
          )}
        </div>
      </section>
      {selectedAttention && <ReportExecutionModal item={selectedAttention} execution={selectedExecution} loading={executionLoading} error={executionError} onClose={() => setSelectedAttention(null)} />}
    </>
  );
};
