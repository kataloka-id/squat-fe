/* eslint-disable no-unused-vars -- TypeScript callback props are misidentified by repository lint configuration. */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BarChart3, CheckCircle2, Circle, ExternalLink, XCircle } from 'lucide-react';
import { ReportsService, type ReportFilters } from '@/src/api/reports.service.ts';
import { ProjectsService } from '@/src/api/projects.service.ts';
import { TestRunsService } from '@/src/api/test-runs.service.ts';
import { UserFlowsService } from '@/src/api/user-flows.service.ts';
import { onExecutionDataChanged } from '@/src/api/execution-refresh.ts';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import { Select as CustomSelect } from '@/src/components/projectsTestCases/ui/Select.tsx';
import type { Project } from '@/src/components/projectsTestCases/types.ts';
import type { ProjectReportRecord } from '@/src/types/api.ts';
import { resultLabel } from '@/src/components/testRuns/metrics.ts';
import { metricValue, percentageValue } from './metricFormat.ts';

type Props = {
  projects: Project[];
  projectId: string;
  filters: ReportFilters;
  onProjectChange: (id: string) => void;
  onFiltersChange: (filters: ReportFilters) => void;
  onOpenExecution: (runId: string, executionId: string) => void;
  onOpenTestRun: (runId: string) => void;
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
  onOpenExecution,
  onOpenTestRun,
}: Props) => {
  const [report, setReport] = useState<ProjectReportRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'section' | 'folder' | 'userFlow' | 'priority' | 'automationType'>('section');
  const [scope, setScope] = useState<{
    sections: Array<{ id: string; name: string }>;
    folders: Array<{ id: string; name: string }>;
    tags: string[];
    assignees: Array<{ id: string; name: string }>;
    runs: Array<{ id: string; name: string }>;
    userFlows: Array<{ id: string; name: string }>;
  }>({ sections: [], folders: [], tags: [], assignees: [], runs: [], userFlows: [] });
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
      setScope({ sections: [], folders: [], tags: [], assignees: [], runs: [], userFlows: [] });
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
          tags: [...new Set(testCases.data.flatMap((item) => item.tags || []))].sort(),
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
        if (active) setScope({ sections: [], folders: [], tags: [], assignees: [], runs: [], userFlows: [] });
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
          <Select
            name="Tag"
            field="tag"
            options={scope.tags.map((item) => ({ id: item, name: item }))}
          />
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
          scopeLabel={[projects.find((project) => project.id === projectId)?.name || 'Project aktif', filters.dateFrom && `mulai ${filters.dateFrom}`, filters.dateTo && `sampai ${filters.dateTo}`, filters.runId && 'Test Run terpilih', filters.userFlowId && 'User Flow terpilih'].filter(Boolean).join(' · ')}
          tab={tab}
          setTab={setTab}
          onOpenExecution={onOpenExecution}
          onOpenUserFlow={(id, testRunIds) => testRunIds[0] ? onOpenTestRun(testRunIds[0]) : onFiltersChange({ ...filters, userFlowId: id })}
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
const ReportContent = ({
  report,
  scopeLabel,
  tab,
  setTab,
  onOpenExecution,
  onOpenUserFlow,
}: {
  report: ProjectReportRecord;
  scopeLabel: string;
  tab: 'section' | 'folder' | 'userFlow' | 'priority' | 'automationType';
  setTab: (tab: 'section' | 'folder' | 'userFlow' | 'priority' | 'automationType') => void;
  onOpenExecution: (runId: string, executionId: string) => void;
  onOpenUserFlow: (id: string, testRunIds: string[]) => void;
}) => {
  const total = report.distribution.reduce((sum, item) => sum + item.count, 0);
  const breakdown = report.breakdowns[tab] || [];
  const donutStops = report.distribution
    .reduce(
      (state, item) => {
        const end = state.position + (total ? (item.count / total) * 100 : 0);
        state.stops.push(`${resultHex[item.result]} ${state.position}% ${end}%`);
        state.position = end;
        return state;
      },
      { position: 0, stops: [] as string[] },
    )
    .stops.join(', ');
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {card('Executed', report.summary.executed)}
        {card('Pass Rate', report.summary.passRate, report.summary.passRate === null ? '' : '%')}
        {card('Failed', report.summary.failed)}
        {card('Blocked', report.summary.blocked)}
        {card('Skipped', report.summary.skipped)}
        {card('Untested', report.summary.untested)}
        {card(
          'Execution Progress',
          report.summary.progress,
          report.summary.progress === null ? '' : '%',
        )}
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
      <section className="grid gap-4 xl:grid-cols-[.86fr_1.14fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Result Distribution</h2>
          <p className="mt-1 text-sm text-slate-500">Ringkasan hasil eksekusi pada scope aktif.</p>
          <div
            className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start"
            role="img"
            aria-label={report.distribution
              .map((item) => `${resultLabel(item.result)} ${item.count}`)
              .join(', ')}
          >
            <div
              className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(${donutStops || '#e2e8f0 0 100%'})` }}
            >
              <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
                <strong className="text-2xl text-slate-800">{total}</strong>
                <span className="text-[10px] text-slate-500">total hasil</span>
              </div>
            </div>
            <div className="grid w-full gap-2 pt-1">
              {report.distribution.map((item) => (
                <div
                  key={item.result}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs"
                >
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <ResultMarker result={item.result} />
                    {resultLabel(item.result)}
                  </span>
                  <span className="font-medium text-slate-800">
                    {item.count}{' '}
                    <span className="font-normal text-slate-400">
                      ({total ? Math.round((item.count / total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Result Trend</h2>
          <p className="mt-1 text-sm text-slate-500">Distribusi hasil menurut tanggal eksekusi.</p>
          <div className="mt-5 overflow-x-auto">
            <div
              className="relative flex h-52 min-w-[36rem] items-end gap-3 border-b border-slate-200 bg-[linear-gradient(to_bottom,transparent_24%,#e2e8f0_25%,transparent_26%,transparent_49%,#e2e8f0_50%,transparent_51%,transparent_74%,#e2e8f0_75%,transparent_76%)] px-4 pt-4"
              role="img"
              aria-label={report.trend
                .map(
                  (item) =>
                    `${item.date}: ${item.passed} passed, ${item.failed} failed, ${item.blocked} blocked, ${item.skipped} skipped, ${item.untested} untested`,
                )
                .join('; ')}
            >
              {report.trend.map((item) => {
                const sum = item.passed + item.failed + item.blocked + item.skipped + item.untested;
                return (
                  <div key={item.date} className="flex min-w-12 flex-1 flex-col items-center gap-2">
                    <div className="flex h-36 w-full max-w-10 flex-col justify-end overflow-hidden rounded-t-sm bg-slate-100 shadow-sm">
                      {(['Passed', 'Failed', 'Blocked', 'Skipped', 'Untested'] as const).map(
                        (result) => (
                          <span
                            key={result}
                            title={`${resultLabel(result)}: ${item[result.toLowerCase() as 'passed'] || 0}`}
                            className={resultColours[result]}
                            style={{
                              height: `${sum ? ((item[result.toLowerCase() as 'passed'] || 0) / sum) * 100 : 0}%`,
                            }}
                          />
                        ),
                      )}
                    </div>
                    <span className="text-center text-[10px] text-slate-500">
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="sr-only">
            {report.trend
              .map(
                (item) =>
                  `${item.date}: Passed ${item.passed}, Failed ${item.failed}, Blocked ${item.blocked}, Skipped ${item.skipped}, Untested ${item.untested}.`,
              )
              .join(' ')}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-600">
            {(['Passed', 'Failed', 'Blocked', 'Skipped', 'Untested'] as const).map((result) => (
              <span key={result} className="inline-flex items-center gap-1.5">
                <i className={`h-2 w-2 rounded-sm ${resultColours[result]}`} />
                {resultLabel(result)}
              </span>
            ))}
          </div>
        </article>
      </section>
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
        <div className="mt-4 overflow-x-auto">
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
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[740px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr>{['User Flow', 'Executed', 'Passed', 'Failed', 'Blocked', 'Pass Rate', 'Progress'].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead><tbody>{(report.userFlowQuality || []).map((row) => <tr key={row.id || row.label} className="border-b"><td className="px-3 py-3 font-medium">{row.id ? <button onClick={() => onOpenUserFlow(row.id!, row.testRunIds || [])} className="text-left text-brand-700 hover:underline">{row.label}</button> : row.label}</td><td className="px-3 py-3">{metricValue(row.executed)}</td><td className="px-3 py-3">{metricValue(row.passed)}</td><td className="px-3 py-3">{metricValue(row.failed)}</td><td className="px-3 py-3">{metricValue(row.blocked)}</td><td className="px-3 py-3">{percentageValue(row.passRate)}</td><td className="px-3 py-3">{percentageValue(row.progress)}</td></tr>)}</tbody></table>{!(report.userFlowQuality || []).length && <p className="p-4 text-sm text-slate-500">Belum ada hasil Test Run untuk User Flow pada filter yang dipilih.</p>}</div>
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Perlu Perhatian</h2>
        <p className="mt-1 text-sm text-slate-500">
          Failed dan blocked executions pada scope aktif.
        </p>
        <div className="mt-4 space-y-2">
          {report.attention.length ? (
            report.attention.map((item) => (
              <button
                key={item.id}
                onClick={() => onOpenExecution(item.runId, item.executionId)}
                className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <span>
                  <strong>
                    {item.tcNumber ? `TC-${item.tcNumber} · ` : ''}
                    {item.title}
                  </strong>
                  <small className="mt-1 block text-slate-500">
                    {item.runName} · {resultLabel(item.result)}
                  </small>
                </span>
                <ExternalLink className="h-4 w-4 text-brand-600" />
              </button>
            ))
          ) : (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              Tidak ada failed atau blocked execution pada scope ini.
            </p>
          )}
        </div>
      </section>
    </>
  );
};
