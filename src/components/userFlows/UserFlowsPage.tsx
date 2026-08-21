/* eslint-disable no-unused-vars -- repository rule misidentifies TypeScript-only callback props. */
import {
  useCallback,
  useEffect,
  memo,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { Chip } from '@/src/components/projectsTestCases/ui/Chip.tsx';
import { Badge as TestCaseBadge } from '@/src/components/projectsTestCases/ui/Badge.tsx';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import { ConfirmationModal } from '@/src/components/projectsTestCases/ui/ConfirmationModal.tsx';
import { TestCaseDetail } from '@/src/components/projectsTestCases/TestCaseDetail.tsx';
import { Select } from '@/src/components/projectsTestCases/ui/Select.tsx';
import { MultiSelect } from '@/src/components/projectsTestCases/ui/MultiSelect.tsx';
import { InlineBadgeSelect } from '@/src/components/projectsTestCases/ui/InlineBadgeSelect.tsx';
import { Toast, type ToastType } from '@/src/components/projectsTestCases/ui/Toast.tsx';
import {
  UserFlowsService,
  FLOW_HEALTHS,
  userFlowLabel,
  FLOW_PRIORITIES,
  FLOW_STATUSES,
  type DependencyRelationshipType,
  type FlowHealth,
  type UserFlow,
  type UserFlowDependency,
} from '@/src/api/user-flows.service.ts';
import { ProjectsService } from '@/src/api/projects.service.ts';
import { useSectionCatalog } from '@/src/state/section-catalog.ts';
import { useUserFlowAreaCatalog } from '@/src/state/user-flow-area-catalog.ts';
import type { UserFlowArea } from '@/src/api/user-flow-areas.service.ts';
import { onExecutionDataChanged } from '@/src/api/execution-refresh.ts';
import {
  AutomationReadiness,
  AutomationType,
  Priority,
  Status,
  normalizeAutomationReadiness,
  normalizePriority,
  type Project,
  type TestCase,
} from '@/src/components/projectsTestCases/types.ts';
import type { ProjectTestCaseRecord } from '@/src/types/api.ts';
import { formatPercentage, percentageNumber } from '@/src/utils/percentage.ts';
import { ROW_ACTIONS_CELL_CLASS } from '@/src/components/projectsTestCases/ui/RowActions.tsx';
import { FlowActions } from './FlowActions.tsx';
import { formatUserFlowDate } from './utils.ts';
import { TablePagination } from '@/src/components/table/TablePagination.tsx';

const title = (value: unknown) => userFlowLabel(typeof value === 'string' ? value : undefined);
const flowChipType = (value: unknown) => value === 'healthy' || value === 'at_risk' || value === 'broken' || value === 'unknown' ? 'health' as const : value === 'critical' || value === 'high' || value === 'medium' || value === 'low' || value === 'not_defined' ? 'priority' as const : 'status' as const;
const Badge = ({ value }: { value: unknown }) => {
  const normalized = typeof value === 'string' && value ? value : 'unknown';
  return <Chip type={flowChipType(normalized)} value={normalized} displayValue={title(normalized)} />;
};
const isDependency = (value: unknown): value is UserFlowDependency =>
  Boolean(value) && typeof value === 'object';
const dependenciesOf = (value: unknown): UserFlowDependency[] =>
  Array.isArray(value) ? value.filter(isDependency) : [];
const textOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value : fallback;
const dependencyHealth = (value: unknown): FlowHealth =>
  value === 'healthy' || value === 'at_risk' || value === 'broken' || value === 'unknown'
    ? value
    : 'unknown';
const flowLabel = (value: Pick<UserFlowDependency, 'flowKey' | 'title'>): string =>
  `${textOr(value.flowKey, 'Unknown flow')} — ${textOr(value.title, 'Unavailable flow')}`;
const relationshipType = (value: unknown): DependencyRelationshipType =>
  value === 'next' ||
  value === 'requires' ||
  value === 'optional' ||
  value === 'alternative' ||
  value === 'blocks'
    ? value
    : 'requires';
const relationshipLabel = (value: unknown) => title(relationshipType(value));
const relatedFlowId = (dependency: UserFlowDependency, direction: 'outgoing' | 'incoming') => {
  const preferred = direction === 'outgoing' ? dependency.targetFlowId : dependency.sourceFlowId;
  return typeof preferred === 'string'
    ? preferred
    : typeof dependency.id === 'string'
      ? dependency.id
      : undefined;
};
const RELATIONSHIP_OPTIONS: Array<{ value: DependencyRelationshipType; label: string }> = [
  { value: 'next', label: 'Next' },
  { value: 'requires', label: 'Requires' },
  { value: 'optional', label: 'Optional' },
  { value: 'alternative', label: 'Alternative' },
  { value: 'blocks', label: 'Blocks' },
];
const RELATIONSHIP_GUIDANCE: Record<
  DependencyRelationshipType,
  { description: string; guide: string }
> = {
  next: {
    description: 'Use when this flow normally continues to another flow.',
    guide: 'Flow berikutnya setelah current flow.',
  },
  requires: {
    description: 'Use when this flow depends on another flow being completed first.',
    guide: 'Current flow membutuhkan flow lain terlebih dahulu.',
  },
  optional: {
    description: 'Use when the next flow is not required.',
    guide: 'Flow lanjutan yang tidak wajib.',
  },
  alternative: {
    description: 'Use when this is another path from the current flow.',
    guide: 'Jalur alternatif dari current flow.',
  },
  blocks: {
    description: 'Use when the next flow cannot continue until this flow is complete.',
    guide: 'Flow berikutnya tidak dapat dilanjutkan sebelum current flow selesai.',
  },
};
const relationshipPreview = (
  source: string,
  target: string,
  relationship: DependencyRelationshipType,
) => {
  switch (relationship) {
    case 'requires':
      return `${source} requires ${target}`;
    case 'optional':
      return `${source} → ${target} (optional)`;
    case 'alternative':
      return `${source} → ${target} (alternative path)`;
    case 'blocks':
      return `${target} is blocked until ${source} is complete`;
    default:
      return `${source} → ${target}`;
  }
};
const graphEdgeStyle = (value: unknown) => {
  switch (relationshipType(value)) {
    case 'requires':
      return {
        color: '#4f46e5',
        dash: '7 3',
        width: 3,
        colorClass: 'stroke-brand-600',
        arrowClass: 'fill-brand-600',
      };
    case 'optional':
      return {
        color: '#059669',
        dash: '5 4',
        width: 2,
        colorClass: 'stroke-emerald-600',
        arrowClass: 'fill-emerald-600',
      };
    case 'alternative':
      return { color: '#0284c7', dash: '2 4', width: 2, colorClass: 'stroke-sky-600', arrowClass: 'fill-sky-600' };
    case 'blocks':
      return { color: '#dc2626', dash: '8 3', width: 3, colorClass: 'stroke-red-600', arrowClass: 'fill-red-600' };
    default:
      return {
        color: '#64748b',
        dash: undefined,
        width: 4,
        colorClass: 'stroke-slate-500',
        arrowClass: 'fill-slate-500',
      };
  }
};
const trapModalFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
  if (event.key !== 'Tab') return;
  const focusable = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1)!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};
// eslint-disable-next-line react-refresh/only-export-components -- extracted for focused filtering tests.
export const filterUserFlows = (
  flows: UserFlow[],
  filters: { query: string; area: string; priority: string; health: string; status: string },
) =>
  flows.filter(
    (flow) =>
      `${flow.flowKey} ${flow.title} ${flow.description || ''}`
        .toLowerCase()
        .includes(filters.query.toLowerCase()) &&
      (!filters.area || flow.areaId === filters.area || flow.area === filters.area) &&
      (!filters.priority || flow.priority === filters.priority) &&
      (!filters.health || flow.health === filters.health) &&
      (!filters.status || flow.status === filters.status),
  );

export const FlowDependencyManager = ({
  projectId,
  flow,
  flows,
  onRefresh,
  onError,
  onViewFlow,
}: {
  projectId: string;
  flow: UserFlow;
  flows: UserFlow[];
  onRefresh: () => void;
  onError: (message: string) => void;
  onViewFlow?: (flowId: string) => void;
}) => {
  const [targetId, setTargetId] = useState('');
  const [relationship, setRelationship] = useState<DependencyRelationshipType>('next');
  const [adding, setAdding] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [guideTrigger, setGuideTrigger] = useState<HTMLElement | null>(null);
  const [addTrigger, setAddTrigger] = useState<HTMLElement | null>(null);
  const dependencies = dependenciesOf(flow.dependencies);
  const incoming = dependenciesOf(flow.incomingDependencies);
  const dependencyIds = new Set(
    dependencies
      .map((dependency) => relatedFlowId(dependency, 'outgoing'))
      .filter((id): id is string => Boolean(id)),
  );
  const targets = (Array.isArray(flows) ? flows : []).filter(
    (item) => typeof item?.id === 'string' && item.id !== flow.id && !dependencyIds.has(item.id),
  );
  const selectedTarget = targets.find((item) => item.id === targetId);
  const currentFlowName = textOr(flow.title, textOr(flow.flowKey, 'Current flow'));
  const targetFlowName = selectedTarget
    ? textOr(selectedTarget.title, textOr(selectedTarget.flowKey, 'Target flow'))
    : 'Select a target flow';
  const relationPreview = relationshipPreview(currentFlowName, targetFlowName, relationship);
  const closeGuide = () => {
    setShowGuide(false);
    requestAnimationFrame(() => guideTrigger?.focus());
  };
  const closeAdd = () => {
    setAdding(false);
    setTargetId('');
    requestAnimationFrame(() => addTrigger?.focus());
  };
  useEffect(() => {
    if (!showGuide) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGuide();
    };
    window.addEventListener('keydown', closeOnEscape);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('[aria-label="Close dependency guide"]')?.focus(),
    );
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showGuide, guideTrigger]);
  useEffect(() => {
    if (!adding) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAdd();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [adding, addTrigger]);
  const add = async () => {
    if (!targetId || targetId === flow.id || dependencyIds.has(targetId)) {
      onError('Choose a different flow that is not already a dependency.');
      return;
    }
    try {
      await UserFlowsService.addDependency(projectId, flow.id, targetId, relationship);
      setTargetId('');
      setRelationship('next');
      setAdding(false);
      onRefresh();
    } catch (error) {
      onError((error as { message?: string }).message || 'Unable to add dependency.');
    }
  };
  const remove = async () => {
    if (!removingId) return;
    try {
      await UserFlowsService.removeDependency(projectId, flow.id, removingId);
      setRemovingId(null);
      onRefresh();
    } catch (error) {
      onError((error as { message?: string }).message || 'Unable to remove dependency.');
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Dependencies</h2>
        <p className="mt-1 text-sm font-medium text-slate-700">How dependencies work</p>
        <p className="mt-1 text-sm text-slate-500">
          Use dependencies to describe how one user flow connects to another. Choose the
          relationship that best represents the journey.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-3 mt-2"
          onClick={(event) => {
            setGuideTrigger(event.currentTarget);
            setShowGuide(true);
          }}
        >
          Learn more
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Dependency summary">
        {[
          ['Outgoing', dependencies.length],
          ['Incoming', incoming.length],
          [
            'Optional',
            dependencies.filter((item) => relationshipType(item.relationshipType) === 'optional')
              .length,
          ],
          [
            'Blocking',
            dependencies.filter((item) => relationshipType(item.relationshipType) === 'blocks')
              .length,
          ],
        ].map(([label, count]) => (
          <div
            key={String(label)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="font-semibold text-slate-800">{count}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase text-slate-500">Current flow</p>
        <p className="mt-1 font-medium">{flowLabel(flow)}</p>
        <Button
          className="mt-4"
          icon={<Plus size={16} />}
          onClick={(event) => {
            setAddTrigger(event.currentTarget);
            setAdding(true);
          }}
        >
          Add Dependency
        </Button>
      </div>
      <div>
        <h3 className="font-medium">Outgoing Dependencies</h3>
        {dependencies.length ? (
          <ul className="mt-2 space-y-2">
            {dependencies.map((item, index) => {
              const dependencyId = relatedFlowId(item, 'outgoing') || null;
              return (
                <li
                  key={dependencyId || `invalid-dependency-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{flowLabel(flow)}</p>
                    <p className="my-1 text-sm text-slate-500">
                      ↓ {relationshipLabel(item.relationshipType)}
                    </p>
                    <button
                      type="button"
                      disabled={!dependencyId}
                      onClick={() => dependencyId && onViewFlow?.(dependencyId)}
                      className="font-medium text-brand-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-500"
                    >
                      {flowLabel(item)}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge value={dependencyHealth(item.health)} />
                      <Badge value={relationshipType(item.relationshipType)} />
                      {dependencyHealth(item.health) === 'broken' && (
                        <span className="text-xs text-red-700">
                          Downstream flow is currently broken.
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!dependencyId}
                      onClick={() => dependencyId && onViewFlow?.(dependencyId)}
                    >
                      View Flow
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={!dependencyId}
                      onClick={() => dependencyId && setRemovingId(dependencyId)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <p className="font-medium text-slate-800">No dependencies yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Connect this flow to another journey to make the relationship visible in the
              dependency graph.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                icon={<Plus size={16} />}
                onClick={(event) => {
                  setAddTrigger(event.currentTarget);
                  setAdding(true);
                }}
              >
                Add Dependency
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={(event) => {
                  setGuideTrigger(event.currentTarget);
                  setShowGuide(true);
                }}
              >
                Learn how dependencies work
              </Button>
            </div>
          </div>
        )}
      </div>
      <div>
        <h3 className="font-medium">Incoming Dependencies</h3>
        {incoming.length ? (
          <ul className="mt-2 space-y-2">
            {incoming.map((item, index) => {
              const sourceId = relatedFlowId(item, 'incoming');
              return (
                <li
                  key={sourceId || `invalid-incoming-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      disabled={!sourceId}
                      onClick={() => sourceId && onViewFlow?.(sourceId)}
                      className="font-medium text-brand-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-500"
                    >
                      {flowLabel(item)}
                    </button>
                    <p className="my-1 text-sm text-slate-500">
                      ↓ {relationshipLabel(item.relationshipType)}
                    </p>
                    <p className="font-medium">{flowLabel(flow)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge value={dependencyHealth(item.health)} />
                      <Badge value={relationshipType(item.relationshipType)} />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!sourceId}
                    onClick={() => sourceId && onViewFlow?.(sourceId)}
                  >
                    View Flow
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No incoming dependencies.
          </p>
        )}
      </div>
      {showGuide &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dependency-guide-title"
            onKeyDown={trapModalFocus}
          >
            <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="dependency-guide-title" className="text-lg font-bold">
                    How dependencies work
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Arrows start at the current flow and point to the related flow.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Close dependency guide"
                  onClick={closeGuide}
                >
                  <X size={16} />
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <article
                    key={option.value}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="mt-1 text-slate-500">
                      {RELATIONSHIP_GUIDANCE[option.value].guide}
                    </p>
                    <p className="mt-3 rounded bg-white px-2 py-1.5 font-medium text-brand-700">
                      {relationshipPreview('Current flow', 'Related flow', option.value)}
                    </p>
                  </article>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium">Examples</p>
                <p className="mt-1">Create Creative → Save Creative</p>
                <p>Save Creative requires Login</p>
                <p>Export Creative (optional)</p>
              </div>
              <div className="mt-5 flex justify-end">
                <Button type="button" variant="secondary" onClick={closeGuide}>
                  Close
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {adding &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-dependency-title"
            onKeyDown={trapModalFocus}
          >
            <form
              className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
              onSubmit={(event) => {
                event.preventDefault();
                void add();
              }}
            >
              <h2 id="add-dependency-title" className="text-lg font-bold">
                Add Dependency
              </h2>
              <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Current Flow</p>
                  <p className="font-medium">{currentFlowName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Relationship</p>
                  <p className="font-medium">{relationshipLabel(relationship)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Target Flow</p>
                  <p className="font-medium">{targetFlowName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Preview</p>
                  <p className="font-medium">{relationPreview}</p>
                </div>
              </div>
              <label className="mt-4 block text-sm font-medium">
                Relationship
                <Select aria-label="Relationship" className="mt-1" value={relationship} onChange={(value) => setRelationship(String(value) as DependencyRelationshipType)} options={RELATIONSHIP_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} size="md" />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {RELATIONSHIP_GUIDANCE[relationship].description}
                </span>
              </label>
              <label className="mt-4 block text-sm font-medium">
                Target flow
                <Select aria-label="Target flow" className="mt-1" value={targetId} onChange={(value) => setTargetId(String(value))} options={targets.map((item) => ({ value: item.id, label: flowLabel(item) }))} placeholder="Select user flow…" size="md" />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Existing dependencies are unavailable. Only flows in this project can be selected.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeAdd}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!targetId}>
                  Add Dependency
                </Button>
              </div>
            </form>
          </div>,
          document.body,
        )}
      <ConfirmationModal
        isOpen={Boolean(removingId)}
        title="Remove dependency?"
        message="This will remove the relationship between these user flows. The user flows themselves will not be deleted."
        confirmLabel="Remove dependency"
        variant="danger"
        onClose={() => setRemovingId(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
};

export const UserFlowDetail = ({
  projectId,
  flow,
  flows = [],
  availableTestCases,
  onClose,
  onEdit,
  onRefresh,
  onError,
  onViewFlow,
  onOpenTestRun,
  backLabel,
  onBack,
  canManage = true,
}: {
  projectId: string;
  flow: UserFlow;
  flows?: UserFlow[];
  availableTestCases: ProjectTestCaseRecord[];
  onClose: () => void;
  onEdit?: () => void;
  onRefresh: () => void;
  onError?: (message: string) => void;
  onViewFlow?: (flowId: string) => void;
  onOpenTestRun?: (runId: string) => void;
  backLabel?: string;
  onBack?: () => void;
  canManage?: boolean;
}) => {
  const sectionCatalog = useSectionCatalog(projectId);
  const [tab, setTab] = useState<'overview' | 'cases' | 'dependencies'>('overview');
  const [selected, setSelected] = useState<string[]>([]);
  const [linkCasesTrigger, setLinkCasesTrigger] = useState<HTMLButtonElement | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [caseQuery, setCaseQuery] = useState('');
  const [caseFilters, setCaseFilters] = useState({
    section: [] as string[],
    priority: [] as string[],
    status: [] as string[],
    automationType: [] as string[],
    automationReadiness: [] as string[],
  });
  const [linkedSort, setLinkedSort] = useState<{
    field: 'tcNumber' | 'title' | 'section' | 'priority' | 'automationReadiness';
    order: 'asc' | 'desc';
  } | null>(null);
  const [viewingTestCaseId, setViewingTestCaseId] = useState<string | null>(null);
  const [testCaseDetailTrigger, setTestCaseDetailTrigger] = useState<HTMLButtonElement | null>(
    null,
  );
  const linked = useMemo(() => flow.linkedTestCases || [], [flow.linkedTestCases]);
  const sectionNames = useMemo(
    () => new Map(sectionCatalog.sections.map((section) => [section.id, section.name])),
    [sectionCatalog.sections],
  );
  const getSectionName = useCallback(
    (testCase: ProjectTestCaseRecord) =>
      (testCase.sectionId && sectionNames.get(testCase.sectionId)) || testCase.section || 'Uncategorized',
    [sectionNames],
  );
  const viewingTestCase = useMemo<TestCase | null>(() => {
    const linkedTestCase = linked.find((item) => item.id === viewingTestCaseId);
    if (!linkedTestCase) return null;
    const fullTestCase = availableTestCases.find((item) => item.id === viewingTestCaseId);
    const testCase = fullTestCase ? { ...linkedTestCase, ...fullTestCase } : linkedTestCase;
    return {
      ...testCase,
      projectId: testCase.projectId ?? projectId,
      section: testCase.section ?? 'Uncategorized',
      priority: normalizePriority(testCase.priority),
      status: Object.values(Status).includes(testCase.status as Status)
        ? (testCase.status as Status)
        : Status.Draft,
      automationType: Object.values(AutomationType).includes(
        testCase.automationType as AutomationType,
      )
        ? (testCase.automationType as AutomationType)
        : AutomationType.Manual,
      automationReadiness: normalizeAutomationReadiness(testCase.automationReadiness),
      linkedPreconditions: (testCase.linkedPreconditions ?? []).map((link) => ({
        ...link,
        status: Object.values(Status).includes(link.status as Status)
          ? (link.status as Status)
          : Status.Draft,
        automationType: Object.values(AutomationType).includes(
          link.automationType as AutomationType,
        )
          ? (link.automationType as AutomationType)
          : AutomationType.Manual,
      })),
      steps: testCase.steps ?? [],
      tags: testCase.tags ?? [],
      updatedAt: testCase.updatedAt ? new Date(testCase.updatedAt) : new Date(),
      createdBy: testCase.createdBy ?? '—',
      description: testCase.description ?? undefined,
      preconditions: testCase.preconditions ?? undefined,
      mainExpectedResult: testCase.mainExpectedResult ?? undefined,
    };
  }, [availableTestCases, linked, projectId, viewingTestCaseId]);
  const closeTestCaseDetail = () => {
    setViewingTestCaseId(null);
    requestAnimationFrame(() => testCaseDetailTrigger?.focus());
  };
  const sortedLinked = useMemo(() => {
    if (!linkedSort) return linked;
    const direction = linkedSort.order === 'asc' ? 1 : -1;
    return [...linked].sort((left, right) => {
      if (linkedSort.field === 'tcNumber')
        return ((left.tcNumber ?? 0) - (right.tcNumber ?? 0)) * direction;
      const leftValue =
        linkedSort.field === 'automationReadiness'
          ? normalizeAutomationReadiness(left.automationReadiness)
          : linkedSort.field === 'section'
            ? getSectionName(left)
            : left[linkedSort.field];
      const rightValue =
        linkedSort.field === 'automationReadiness'
          ? normalizeAutomationReadiness(right.automationReadiness)
          : linkedSort.field === 'section'
            ? getSectionName(right)
            : right[linkedSort.field];
      return leftValue.localeCompare(rightValue) * direction;
    });
  }, [getSectionName, linked, linkedSort]);
  const sortLinked = (field: 'tcNumber' | 'title' | 'section' | 'priority' | 'automationReadiness') => {
    setLinkedSort((current) =>
      current?.field === field
        ? { field, order: current.order === 'asc' ? 'desc' : 'asc' }
        : { field, order: 'asc' },
    );
  };
  const candidates = useMemo(
    () =>
      availableTestCases.filter(
        (testCase) =>
          (!testCase.projectId || testCase.projectId === projectId) &&
          !linked.some((linkedCase) => linkedCase.id === testCase.id),
      ),
    [availableTestCases, linked, projectId],
  );
  const sectionOptions = useMemo(
    () =>
      Array.from(new Set(candidates.map((testCase) => testCase.section).filter(Boolean)))
        .sort()
        .map((section) => ({ label: section, value: section })),
    [candidates],
  );
  const filteredCandidates = candidates.filter((testCase) => {
    const searchable =
      `${testCase.projectKey || ''} ${testCase.tcNumber || ''} ${testCase.title} ${testCase.section || ''}`.toLowerCase();
    return (
      searchable.includes(caseQuery.toLowerCase()) &&
      (!caseFilters.section.length || caseFilters.section.includes(testCase.section)) &&
      (!caseFilters.priority.length || caseFilters.priority.includes(testCase.priority)) &&
      (!caseFilters.status.length || caseFilters.status.includes(testCase.status)) &&
      (!caseFilters.automationType.length ||
        caseFilters.automationType.includes(testCase.automationType)) &&
      (!caseFilters.automationReadiness.length ||
        caseFilters.automationReadiness.includes(
          normalizeAutomationReadiness(testCase.automationReadiness),
        ))
    );
  });
  const validSelected = useMemo(() => {
    const candidateIds = new Set(candidates.map((testCase) => testCase.id));
    return selected.filter((id) => candidateIds.has(id));
  }, [candidates, selected]);
  const selectedVisibleCount = filteredCandidates.filter((testCase) =>
    validSelected.includes(testCase.id),
  ).length;
  const allVisibleSelected =
    filteredCandidates.length > 0 && selectedVisibleCount === filteredCandidates.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;
  const refresh = () => onRefresh();
  const closeLinkModal = () => {
    setIsLinkModalOpen(false);
    setSelected([]);
    setCaseQuery('');
    setCaseFilters({
      section: [],
      priority: [],
      status: [],
      automationType: [],
      automationReadiness: [],
    });
    requestAnimationFrame(() => linkCasesTrigger?.focus());
  };
  useEffect(() => {
    if (!isLinkModalOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLinkModalOpen(false);
        setSelected([]);
        setCaseQuery('');
        setCaseFilters({
          section: [],
          priority: [],
          status: [],
          automationType: [],
          automationReadiness: [],
        });
        requestAnimationFrame(() => linkCasesTrigger?.focus());
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isLinkModalOpen, linkCasesTrigger]);
  const linkSelectedCases = async () => {
    if (!validSelected.length) return;
    try {
      await UserFlowsService.linkTestCases(projectId, flow.id, validSelected);
      closeLinkModal();
      refresh();
    } catch (error) {
      onError?.((error as { message?: string }).message || 'Unable to link test cases.');
    }
  };
  const toggleTestCase = (id: string) =>
    setSelected((current) => {
      const candidateIds = new Set(candidates.map((testCase) => testCase.id));
      const currentValid = Array.from(new Set(current.filter((selectedId) => candidateIds.has(selectedId))));
      return currentValid.includes(id)
        ? currentValid.filter((selectedId) => selectedId !== id)
        : [...currentValid, id];
    });
  const toggleVisibleTestCases = () => {
    setSelected((current) => {
      const candidateIds = new Set(candidates.map((testCase) => testCase.id));
      const currentValid = current.filter((id) => candidateIds.has(id));
      if (allVisibleSelected) {
        const visibleIds = new Set(filteredCandidates.map((testCase) => testCase.id));
        return currentValid.filter((id) => !visibleIds.has(id));
      }
      return Array.from(new Set([...currentValid, ...filteredCandidates.map((testCase) => testCase.id)]));
    });
  };
  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" icon={<ArrowLeft size={15} />} onClick={onClose}>
          User Flows
        </Button>
        {onBack && (
          <Button size="sm" variant="ghost" icon={<ArrowLeft size={15} />} onClick={onBack}>
            {backLabel || 'Previous Flow'}
          </Button>
        )}
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">{flow.flowKey}</p>
          <h1 className="max-w-4xl text-2xl font-bold leading-tight [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]">
            {flow.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge value={flow.priority} />
            <Badge value={flow.health} />
            <Badge value={flow.status} />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={onEdit}>Edit Flow</Button>
        </div>
      </header>
      <nav aria-label="User flow detail tabs" className="flex overflow-x-auto border-b">
        {(
          [
            ['overview', 'Overview'],
            ['cases', `Test Cases (${flow.linkedTestCaseCount})`],
            [
              'dependencies',
              `Dependencies (${dependenciesOf(flow.dependencies).length + dependenciesOf(flow.incomingDependencies).length})`,
            ],
          ] as const
        ).map(([key, name]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm ${tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'}`}
          >
            {name}
          </button>
        ))}
      </nav>
      <section className={tab === 'overview' ? '' : 'rounded-xl border bg-white p-5'}>
        {tab === 'overview' && (
          <div className="grid gap-4 xl:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Flow Definition</h2>
              </div>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <h3 className="font-medium text-slate-500">Description</h3>
                  <p className="text-slate-600">{flow.description || '—'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-slate-500">Goal</h3>
                  <p className="text-slate-600">{flow.goal || '—'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-slate-500">Entry Point</h3>
                  <p className="text-slate-600">{flow.entryPoint || '—'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-slate-500">Success Criteria</h3>
                  <p className="text-slate-600">{flow.successCriteria || '—'}</p>
                </div>
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Flow Metadata</h2>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Area</dt>
                  <dd>{flow.area || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Priority</dt>
                  <dd>
                    <Badge value={flow.priority} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Health</dt>
                  <dd>
                    <Badge value={flow.health} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <Badge value={flow.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Tested</dt>
                  <dd>
                    {flow.lastTestedAt ? formatUserFlowDate(flow.lastTestedAt) : 'Never tested'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Updated</dt>
                  <dd>{formatUserFlowDate(flow.updatedAt)}</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-medium text-slate-500">Latest Test Run</h3>
                {flow.latestRun ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <strong className="block text-slate-800">{flow.latestRun.name}</strong>
                      <span className="text-slate-500">
                        {flow.latestRun.status} · {flow.latestRun.progress ? `${flow.latestRun.progress.executed} / ${flow.latestRun.progress.total} executed` : 'Belum ada progress'}
                      </span>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => onOpenTestRun?.(flow.latestRun!.id)} disabled={!onOpenTestRun}>
                      Lihat Run
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Belum ada Test Run dari User Flow ini.</p>
                )}
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Coverage</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Automation Coverage</dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {formatPercentage(flow.coverage, { hasDenominator: flow.linkedTestCaseCount > 0 })}
                  </dd>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                    aria-label={`Automation coverage: ${formatPercentage(flow.coverage, { hasDenominator: flow.linkedTestCaseCount > 0 })}`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentageNumber(flow.coverage, { hasDenominator: flow.linkedTestCaseCount > 0 }) ?? undefined}
                  >
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${percentageNumber(flow.coverage, { hasDenominator: flow.linkedTestCaseCount > 0 }) ?? 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <dt className="text-slate-500">Linked Test Cases</dt>
                  <dd className="mt-1 font-medium">{flow.linkedTestCaseCount}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Automated</dt>
                  <dd className="mt-1 font-medium">{flow.automatedTestCaseCount}</dd>
                </div>
              </dl>
              <p className="mt-5 text-sm text-slate-500">
                {flow.automatedTestCaseCount} automated of {flow.linkedTestCaseCount} linked test
                case{flow.linkedTestCaseCount === 1 ? '' : 's'}
              </p>
            </article>
          </div>
        )}
        {tab === 'cases' && (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Test Cases</h2>
              {canManage && (
                <Button
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={(event) => {
                    setLinkCasesTrigger(event.currentTarget);
                    setIsLinkModalOpen(true);
                  }}
                >
                  Link Test Cases
                </Button>
              )}
            </div>
            {linked.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="font-medium text-slate-800">No linked test cases</p>
                <p className="mt-1 text-sm text-slate-500">
                  Connect this flow to existing test coverage.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[960px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[6.5rem]" />
                    <col />
                    <col className="w-40" />
                    <col className="w-32" />
                    <col className="w-48" />
                    <col className="w-[6.5rem]" />
                  </colgroup>
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      {(
                        [
                          ['tcNumber', 'TC Number'],
                          ['title', 'Title'],
                          ['section', 'Section'],
                          ['priority', 'Priority'],
                          ['automationReadiness', 'Automation Readiness'],
                        ] as const
                      ).map(([field, label]) => {
                        const active = linkedSort?.field === field;
                        return (
                          <th
                            key={field}
                            className="px-4 py-3 text-left font-semibold"
                            aria-sort={
                              active
                                ? linkedSort.order === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                                : undefined
                            }
                          >
                            <button
                              type="button"
                              onClick={() => sortLinked(field)}
                              className="flex w-full items-center gap-1.5 text-left hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                            >
                              <span className={field === 'title' ? 'min-w-0' : 'whitespace-nowrap'}>
                                {label}
                              </span>
                              {active &&
                                (linkedSort.order === 'asc' ? (
                                  <ChevronUp
                                    aria-label="Sorted ascending"
                                    className="h-3.5 w-3.5 shrink-0 text-brand-600"
                                  />
                                ) : (
                                  <ChevronDown
                                    aria-label="Sorted descending"
                                    className="h-3.5 w-3.5 shrink-0 text-brand-600"
                                  />
                                ))}
                            </button>
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sortedLinked.map((testCase) => (
                      <tr key={testCase.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          <button
                            className="font-mono text-xs text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            onClick={(event) => {
                              setTestCaseDetailTrigger(event.currentTarget);
                              setViewingTestCaseId(testCase.id);
                            }}
                            type="button"
                          >
                            {testCase.projectKey ? `${testCase.projectKey}-` : ''}
                            {testCase.tcNumber ?? '—'}
                          </button>
                        </td>
                        <td className="min-w-0 px-4 py-3">
                          <button
                            className="overflow-hidden text-left font-medium leading-5 text-slate-900 transition-colors [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box] hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            onClick={(event) => {
                              setTestCaseDetailTrigger(event.currentTarget);
                              setViewingTestCaseId(testCase.id);
                            }}
                            title={testCase.title}
                            type="button"
                          >
                            {testCase.title}
                          </button>
                        </td>
                        <td className="min-w-0 px-4 py-3">
                          <Chip type="section" value={getSectionName(testCase)} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <TestCaseBadge type="priority" value={testCase.priority} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <TestCaseBadge
                            type="automationReadiness"
                            value={normalizeAutomationReadiness(testCase.automationReadiness)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              void UserFlowsService.unlinkTestCase(
                                projectId,
                                flow.id,
                                testCase.id,
                              ).then(refresh)
                            }
                          >
                            Unlink
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {tab === 'dependencies' && (
          <FlowDependencyManager
            projectId={projectId}
            flow={flow}
            flows={flows}
            onRefresh={refresh}
            onError={(message) => onError?.(message)}
            onViewFlow={onViewFlow}
          />
        )}
      </section>
      {isLinkModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-test-cases-title"
          >
            <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-2xl">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-4 sm:p-6">
                <div>
                  <h2 id="link-test-cases-title" className="text-lg font-bold text-slate-900">
                    Link Test Cases
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose existing test coverage for this user flow.
                  </p>
                </div>
                <button
                  aria-label="Close link test cases"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  onClick={closeLinkModal}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
                <label className="sr-only" htmlFor="user-flow-test-case-search">
                  Search test cases
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    id="user-flow-test-case-search"
                    autoFocus
                    className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm"
                    placeholder="Search test cases..."
                    value={caseQuery}
                    onChange={(event) => setCaseQuery(event.target.value)}
                  />
                </div>
                <div className="relative z-20 mt-3 flex flex-wrap gap-2">
                  <MultiSelect
                    label="Section"
                    options={sectionOptions}
                    selectedValues={caseFilters.section}
                    onChange={(section) => setCaseFilters((current) => ({ ...current, section }))}
                    icon={<Filter className="h-3.5 w-3.5" />}
                  />
                  <MultiSelect
                    label="Priority"
                    options={Object.values(Priority).map((value) => ({ label: value, value }))}
                    selectedValues={caseFilters.priority}
                    onChange={(priority) => setCaseFilters((current) => ({ ...current, priority }))}
                    icon={<Filter className="h-3.5 w-3.5" />}
                  />
                  <MultiSelect
                    label="Status"
                    options={Object.values(Status).map((value) => ({ label: value, value }))}
                    selectedValues={caseFilters.status}
                    onChange={(status) => setCaseFilters((current) => ({ ...current, status }))}
                    icon={<Filter className="h-3.5 w-3.5" />}
                  />
                  <MultiSelect
                    label="Testing Type"
                    options={Object.values(AutomationType).map((value) => ({
                      label: value,
                      value,
                    }))}
                    selectedValues={caseFilters.automationType}
                    onChange={(automationType) =>
                      setCaseFilters((current) => ({ ...current, automationType }))
                    }
                    icon={<Filter className="h-3.5 w-3.5" />}
                  />
                  <MultiSelect
                    label="Automation Readiness"
                    options={Object.values(AutomationReadiness).map((value) => ({
                      label: value,
                      value,
                    }))}
                    selectedValues={caseFilters.automationReadiness}
                    onChange={(automationReadiness) =>
                      setCaseFilters((current) => ({ ...current, automationReadiness }))
                    }
                    icon={<Filter className="h-3.5 w-3.5" />}
                  />
                </div>
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200">
                  <>
                    <label className="sticky top-0 z-10 flex cursor-pointer items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input
                          aria-label="Select all visible test cases"
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          type="checkbox"
                          checked={allVisibleSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someVisibleSelected;
                          }}
                          onChange={toggleVisibleTestCases}
                          disabled={!filteredCandidates.length}
                        />
                        Select All
                    </label>
                    {filteredCandidates.length ? (
                      filteredCandidates.map((testCase) => (
                        <label
                          key={testCase.id}
                          className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                        >
                          <input
                            aria-label={`${testCase.projectKey ? `${testCase.projectKey}-` : ''}${testCase.tcNumber ?? '—'}`}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            type="checkbox"
                            checked={validSelected.includes(testCase.id)}
                            onChange={() => toggleTestCase(testCase.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-slate-700">
                              {testCase.projectKey ? `${testCase.projectKey}-` : ''}
                              {testCase.tcNumber ?? '—'}
                            </span>
                            <span
                              className="mt-0.5 block text-sm text-slate-900 [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]"
                              title={testCase.title}
                            >
                              {testCase.title}
                            </span>
                            <span className="mt-1 block truncate text-xs text-slate-500">
                              {testCase.section || 'Uncategorized'}
                            </span>
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              <Badge value={testCase.priority} />
                              <Badge value={testCase.status} />
                              <Badge value={testCase.automationType} />
                              <Badge
                                value={normalizeAutomationReadiness(testCase.automationReadiness)}
                              />
                            </span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="p-6 text-center text-sm text-slate-500">
                      {candidates.length
                        ? 'No test cases match your search or filters.'
                        : 'All available test cases are already linked.'}
                      </p>
                    )}
                  </>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
                <p className="text-sm font-medium text-slate-600">Selected: {validSelected.length}</p>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={closeLinkModal}>
                    Cancel
                  </Button>
                  <Button disabled={!validSelected.length} onClick={() => void linkSelectedCases()}>
                    Link Selected ({validSelected.length})
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      <TestCaseDetail
        onClose={closeTestCaseDetail}
        showAttachments={false}
        testCase={viewingTestCase}
      />
    </div>
  );
};

const GRAPH_NODE_WIDTH = 180;
const GRAPH_NODE_MIN_HEIGHT = 84;
const GRAPH_HORIZONTAL_GAP = 56;
const GRAPH_VERTICAL_GAP = 72;
const GRAPH_PADDING = 72;
const GRAPH_MIN_WIDTH = 760;
const GRAPH_MIN_HEIGHT = 400;
const GRAPH_NODE_HEIGHT_TITLE_BASELINE = 36;
const GRAPH_NODE_TITLE_LINE_HEIGHT = 16;
const GRAPH_NODE_TITLE_MAX_WIDTH = 148;
const GRAPH_NODE_BOTTOM_PADDING = 16;

type GraphEdge = {
  sourceFlowId: string;
  targetFlowId: string;
  relationshipType?: DependencyRelationshipType | null;
};
type GraphPosition = { x: number; y: number; height: number; level: number };
type GraphHandle = { id: string; left: string };
type GraphStageGroup = { id: string; label: string; x: number; y: number; width: number; height: number };
type IndexedGraphEdge = GraphEdge & { id: string; index: number };
type GraphIndexes = {
  nodeIds: Set<string>;
  edges: IndexedGraphEdge[];
  edgeById: Map<string, IndexedGraphEdge>;
  byRelationship: Map<DependencyRelationshipType, IndexedGraphEdge[]>;
  incoming: Map<string, IndexedGraphEdge[]>;
  outgoing: Map<string, IndexedGraphEdge[]>;
};

const graphEdgeId = (edge: GraphEdge, index: number) =>
  `${edge.sourceFlowId}-${edge.targetFlowId}-${index}`;

const appendGraphIndex = <T,>(index: Map<string, T[]>, key: string, value: T) => {
  const values = index.get(key);
  if (values) values.push(value);
  else index.set(key, [value]);
};

// Keep structural lookups linear in graph size. The same indexes drive handle
// placement, edge mapping, and hover relationships without rescanning edges
// once for every node.
// eslint-disable-next-line react-refresh/only-export-components -- exported for focused graph mapping tests.
export const createGraphIndexes = (
  graph: { nodes: UserFlow[]; edges: GraphEdge[] },
): GraphIndexes => {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const incoming = new Map<string, IndexedGraphEdge[]>();
  const outgoing = new Map<string, IndexedGraphEdge[]>();
  const edgeById = new Map<string, IndexedGraphEdge>();
  const byRelationship = new Map<DependencyRelationshipType, IndexedGraphEdge[]>();
  const edges = graph.edges.flatMap((edge, index) => {
    if (!nodeIds.has(edge.sourceFlowId) || !nodeIds.has(edge.targetFlowId)) return [];
    const indexedEdge = { ...edge, id: graphEdgeId(edge, index), index };
    edgeById.set(indexedEdge.id, indexedEdge);
    appendGraphIndex(byRelationship, relationshipType(edge.relationshipType), indexedEdge);
    appendGraphIndex(incoming, edge.targetFlowId, indexedEdge);
    appendGraphIndex(outgoing, edge.sourceFlowId, indexedEdge);
    return [indexedEdge];
  });
  return { nodeIds, edges, edgeById, byRelationship, incoming, outgoing };
};

// SVG text does not apply CSS wrapping. Estimate at the 13px title font using
// deliberately conservative glyph widths, then split even unbroken values so
// every emitted line stays inside the card's padded content area.
const graphTitleWidth = (value: string) =>
  [...value].reduce((width, character) => {
    if (character === ' ') return width + 4;
    if ('WM'.includes(character)) return width + 13;
    if (/[A-Z]/.test(character)) return width + 10;
    if ('mw'.includes(character)) return width + 11;
    return width + 8;
  }, 0);

const graphTitleLines = (value: string, maxWidth = GRAPH_NODE_TITLE_MAX_WIDTH) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines: string[] = [];
  let line = '';
  const addWord = (word: string) => {
    if (!line) {
      line = word;
    } else if (graphTitleWidth(`${line} ${word}`) <= maxWidth) {
      line = `${line} ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  };

  words.forEach((word) => {
    if (graphTitleWidth(word) <= maxWidth) {
      addWord(word);
      return;
    }
    if (line) {
      lines.push(line);
      line = '';
    }
    [...word].forEach((character) => {
      if (graphTitleWidth(`${line}${character}`) > maxWidth) {
        lines.push(line);
        line = character;
      } else line += character;
    });
  });
  if (line || !lines.length) lines.push(line);
  return lines;
};

const graphNodeHeight = (node: UserFlow) =>
  Math.max(
    GRAPH_NODE_MIN_HEIGHT,
    GRAPH_NODE_HEIGHT_TITLE_BASELINE +
      graphTitleLines(node.title).length * GRAPH_NODE_TITLE_LINE_HEIGHT + GRAPH_NODE_BOTTOM_PADDING,
  );

const graphNodeOrder = (left: UserFlow, right: UserFlow) =>
  left.flowKey.localeCompare(right.flowKey, undefined, { numeric: true }) || left.id.localeCompare(right.id);

// Optional and alternative paths are retained in the graph model, but are
// progressively disclosed so the normal path is readable at first glance.
// eslint-disable-next-line react-refresh/only-export-components -- focused graph visibility tests use this policy.
export const isSecondaryGraphRelationship = (value: unknown) =>
  relationshipType(value) === 'optional' || relationshipType(value) === 'alternative';

// eslint-disable-next-line react-refresh/only-export-components -- focused graph visibility tests use this policy.
export const isGraphEdgeVisible = (
  relationship: unknown,
  edge: Pick<Edge, 'source' | 'target'>,
  activeNodeId?: string,
  secondaryExpanded = false,
) => !isSecondaryGraphRelationship(relationship) || secondaryExpanded || edge.source === activeNodeId || edge.target === activeNodeId;

// The graph is intentionally laid out from topology rather than from API order.
// This keeps a chain vertical and makes each branching level expand evenly from center.
// eslint-disable-next-line react-refresh/only-export-components -- exported for focused topology tests.
export const calculateGraphLayout = (nodes: UserFlow[], edges: GraphEdge[]) => {
  const orderedNodes = [...nodes].sort(graphNodeOrder);
  const nodeById = new Map(orderedNodes.map((node) => [node.id, node]));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  const incomingCount = new Map(nodes.map((node) => [node.id, 0]));

  orderedNodes.forEach((node) => { children.set(node.id, []); parents.set(node.id, []); });
  edges.forEach((edge) => {
    if (!nodeIds.has(edge.sourceFlowId) || !nodeIds.has(edge.targetFlowId)) return;
    children.get(edge.sourceFlowId)?.push(edge.targetFlowId);
    parents.get(edge.targetFlowId)?.push(edge.sourceFlowId);
    incomingCount.set(edge.targetFlowId, (incomingCount.get(edge.targetFlowId) || 0) + 1);
  });
  children.forEach((targets) => targets.sort((left, right) => {
    const leftNode = nodeById.get(left)!;
    const rightNode = nodeById.get(right)!;
    return graphNodeOrder(leftNode, rightNode);
  }));

  const depth = new Map<string, number>();
  const queue = orderedNodes.filter((node) => incomingCount.get(node.id) === 0).map((node) => node.id);
  queue.forEach((id) => depth.set(id, 0));
  const processed = new Set<string>();

  // Kahn's traversal gives every node its longest dependency depth. Starting any
  // remaining cycle at a new level prevents malformed cyclic data from overlapping.
  while (queue.length || processed.size < nodes.length) {
    const sourceId = queue.shift();
    if (!sourceId) {
      const cycleStart = orderedNodes.find((node) => !processed.has(node.id));
      if (!cycleStart) break;
      depth.set(cycleStart.id, Math.max(-1, ...depth.values()) + 1);
      queue.push(cycleStart.id);
      continue;
    }
    if (processed.has(sourceId)) continue;
    processed.add(sourceId);
    const sourceDepth = depth.get(sourceId) || 0;
    children.get(sourceId)?.forEach((targetId) => {
      depth.set(targetId, Math.max(depth.get(targetId) || 0, sourceDepth + 1));
      incomingCount.set(targetId, (incomingCount.get(targetId) || 1) - 1);
      if (incomingCount.get(targetId) === 0) queue.push(targetId);
    });
  }

  const levels = new Map<number, UserFlow[]>();
  orderedNodes.forEach((node) => {
    const nodeDepth = depth.get(node.id) || 0;
    levels.set(nodeDepth, [...(levels.get(nodeDepth) || []), node]);
  });
  const orderedLevels = [...levels.entries()].sort(([left], [right]) => left - right);
  // Stable ordering by flow key is the baseline. A barycentric pass then keeps
  // siblings below their parents where possible, reducing crossings without
  // relying on non-deterministic force layout.
  const orderById = new Map<string, number>();
  orderedLevels.forEach(([, level], levelIndex) => {
    level.sort((left, right) => {
      const parentOrder = (node: UserFlow) => {
        const parentPositions = (parents.get(node.id) || [])
          .map((sourceId) => orderById.get(sourceId))
          .filter((order): order is number => order !== undefined);
        return parentPositions.length ? parentPositions.reduce((total, order) => total + order, 0) / parentPositions.length : Number.POSITIVE_INFINITY;
      };
      const leftParentOrder = levelIndex ? parentOrder(left) : Number.POSITIVE_INFINITY;
      const rightParentOrder = levelIndex ? parentOrder(right) : Number.POSITIVE_INFINITY;
      return leftParentOrder - rightParentOrder || graphNodeOrder(left, right);
    });
    level.forEach((node, index) => orderById.set(node.id, index));
  });
  const widestLevel = Math.max(1, ...orderedLevels.map(([, level]) => level.length));
  const contentWidth = widestLevel * GRAPH_NODE_WIDTH + (widestLevel - 1) * GRAPH_HORIZONTAL_GAP;
  const levelHeights = orderedLevels.map(([, level]) => Math.max(...level.map(graphNodeHeight)));
  const contentHeight =
    levelHeights.reduce((total, levelHeight) => total + levelHeight, 0) +
    Math.max(0, orderedLevels.length - 1) * GRAPH_VERTICAL_GAP;
  const width = Math.max(GRAPH_MIN_WIDTH, contentWidth + GRAPH_PADDING * 2);
  const height = Math.max(GRAPH_MIN_HEIGHT, contentHeight + GRAPH_PADDING * 2);
  const verticalOffset = (height - contentHeight) / 2;
  const positions = new Map<string, GraphPosition>();

  let levelY = verticalOffset;
  orderedLevels.forEach(([, level], levelIndex) => {
    const levelWidth = level.length * GRAPH_NODE_WIDTH + (level.length - 1) * GRAPH_HORIZONTAL_GAP;
    const levelOffset = (width - levelWidth) / 2;
    level.forEach((node, index) => {
      positions.set(node.id, {
        x: levelOffset + index * (GRAPH_NODE_WIDTH + GRAPH_HORIZONTAL_GAP),
        y: levelY,
        height: graphNodeHeight(node),
        level: levelIndex,
      });
    });
    levelY += levelHeights[levelIndex] + GRAPH_VERTICAL_GAP;
  });

  return {
    width,
    height,
    positions,
    // Refit only when the rendered topology or calculated layout changes. Status
    // and other card data can refresh without disrupting the user's viewport.
    signature: `${[...positions.entries()].map(([id, position]) => `${id}:${position.x}:${position.y}:${position.height}`).join(',')}|${edges.filter((edge) => nodeIds.has(edge.sourceFlowId) && nodeIds.has(edge.targetFlowId)).map((edge) => `${edge.sourceFlowId}:${edge.targetFlowId}`).join(',')}`,
  };
};

// eslint-disable-next-line react-refresh/only-export-components -- focused grouping tests use the calculated containers.
export const calculateGraphStageGroups = (
  nodes: UserFlow[],
  layout: ReturnType<typeof calculateGraphLayout>,
): GraphStageGroup[] => {
  const groups = new Map<string, UserFlow[]>();
  nodes.forEach((node) => {
    const label = node.area?.trim() || `Level ${(layout.positions.get(node.id)?.level || 0) + 1}`;
    appendGraphIndex(groups, label, node);
  });
  const groupId = (label: string) => `stage-${[...label].map((character) => character.codePointAt(0)?.toString(36)).join('-')}`;
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([label, members]) => {
    const positions = members.map((node) => layout.positions.get(node.id)).filter((position): position is GraphPosition => Boolean(position));
    const left = Math.min(...positions.map((position) => position.x));
    const top = Math.min(...positions.map((position) => position.y));
    const right = Math.max(...positions.map((position) => position.x + GRAPH_NODE_WIDTH));
    const bottom = Math.max(...positions.map((position) => position.y + position.height));
    return { id: groupId(label), label, x: left - 24, y: top - 34, width: right - left + 48, height: bottom - top + 58 };
  });
};

export const GraphView = ({
  graph,
  loading,
  error,
  onOpen,
}: {
  graph: { nodes: UserFlow[]; edges: GraphEdge[] };
  loading: boolean;
  error: string | null;
  onOpen: (flow: UserFlow) => void;
}) => {
  const layout = useMemo(
    () => calculateGraphLayout(graph.nodes, graph.edges),
    [graph.nodes, graph.edges],
  );

  if (loading)
    return <div className="rounded-xl border bg-white p-10 text-center">Loading graph…</div>;
  if (error)
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  if (!graph.nodes.length)
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-slate-500">
        No user flows to visualize yet.
      </div>
    );
  return (
    <GraphFlowCanvas
      graph={graph}
      layout={layout}
      onOpen={onOpen}
    />
  );
};

type FlowGraphNodeData = {
  flow: UserFlow;
  onOpen?: (flow: UserFlow) => void;
  onSelect?: (flow: UserFlow) => void;
  targetHandles: GraphHandle[];
  sourceHandles: GraphHandle[];
};

const graphHandlePositions = (ids: string[]) =>
  ids.map((id, index) => ({
    id,
    left: `${((index + 1) / (ids.length + 1)) * 100}%`,
  }));

const graphTargetHandleId = (edge: IndexedGraphEdge, graphIndexes: GraphIndexes) =>
  (graphIndexes.incoming.get(edge.targetFlowId)?.length || 0) > 1
    ? `target-bundle-${edge.targetFlowId}`
    : `target-${edge.index}`;

// eslint-disable-next-line react-refresh/only-export-components -- exported for focused graph mapping tests.
export const mapGraphNodes = (
  graph: { nodes: UserFlow[]; edges: GraphEdge[] },
  layout: ReturnType<typeof calculateGraphLayout>,
  onOpen?: (flow: UserFlow) => void,
  graphIndexes = createGraphIndexes(graph),
  onSelect?: (flow: UserFlow) => void,
): Node<FlowGraphNodeData>[] =>
  graph.nodes.flatMap((flow) => {
    const position = layout.positions.get(flow.id);
    const incoming = graphIndexes.incoming.get(flow.id) || [];
    const targetHandles = graphHandlePositions(
      incoming.length > 1 ? [`target-bundle-${flow.id}`] : incoming.map((edge) => `target-${edge.index}`),
    );
    const sourceHandles = graphHandlePositions(
      (graphIndexes.outgoing.get(flow.id) || []).map((edge) => `source-${edge.index}`),
    );
    return position
      ? [{ id: flow.id, type: 'flow', position: { x: position.x, y: position.y }, data: { flow, onOpen, onSelect, targetHandles, sourceHandles } }]
      : [];
  });

// eslint-disable-next-line react-refresh/only-export-components -- exported for focused graph mapping tests.
export const mapGraphEdges = (
  graph: { nodes: UserFlow[]; edges: GraphEdge[] },
  graphIndexes = createGraphIndexes(graph),
): Edge[] =>
  graphIndexes.edges.map((edge) => {
      const style = graphEdgeStyle(edge.relationshipType);
      const type = relationshipType(edge.relationshipType);
      const bundledEdges = graphIndexes.incoming.get(edge.targetFlowId) || [];
      const bundled = bundledEdges.length > 1;
      const bundleLeader = bundled && bundledEdges[0]?.id === edge.id;
      return {
        id: edge.id,
        source: edge.sourceFlowId,
        target: edge.targetFlowId,
        sourceHandle: `source-${edge.index}`,
        targetHandle: graphTargetHandleId(edge, graphIndexes),
        // Bottom-to-top handles and SmoothStep produce consistent vertical →
        // horizontal → vertical routes. Merge targets use one custom visual
        // trunk: every source retains its own inspectable edge identity.
        type: bundled ? 'bundle' : 'smoothstep',
        animated: false,
        ariaLabel: `${relationshipLabel(type)} relationship`,
        style: { stroke: style.color, strokeWidth: style.width, strokeDasharray: style.dash },
        pathOptions: { borderRadius: 12, offset: 24 },
        data: { bundled, bundleLeader },
        // React Flow attaches this marker to the native SmoothStep path, so its tip
        // remains at the target handle coordinate. A compact base marker with
        // strokeWidth units keeps arrowheads proportionate to every line weight.
        markerEnd: { type: MarkerType.ArrowClosed, color: style.color, width: 12.5, height: 12.5, markerUnits: 'strokeWidth' },
      };
  });

type BundledEdgeData = { bundled: boolean; bundleLeader: boolean };

// The leader owns the shared vertical trunk and arrow. Other relationships draw
// only their orthogonal source arms into that junction. They remain real React
// Flow edges (with IDs, aria labels, hover and selection behavior), while the
// visual merge no longer redraws the same long route for every source.
const BundledGraphEdge = ({ sourceX, sourceY, targetX, targetY, markerEnd, style, data }: EdgeProps<Edge<BundledEdgeData>>) => {
  const junctionY = targetY - 34;
  const sourceArm = `M ${sourceX},${sourceY} L ${sourceX},${junctionY} L ${targetX},${junctionY}`;
  const path = data?.bundleLeader ? `${sourceArm} L ${targetX},${targetY}` : sourceArm;
  return <BaseEdge path={path} markerEnd={data?.bundleLeader ? markerEnd : undefined} style={style} />;
};

const FlowGraphNode = memo(({ data }: NodeProps<Node<FlowGraphNodeData>>) => {
  const { flow } = data;
  const healthDot =
    flow.health === 'healthy'
      ? 'bg-emerald-500'
      : flow.health === 'at_risk'
        ? 'bg-amber-500'
        : flow.health === 'broken'
          ? 'bg-red-500'
          : 'bg-slate-400';
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${flow.flowKey} ${flow.title}, ${title(flow.health)}`}
      onClick={(event) => {
        // Handle activation on the stable node content itself. Hover updates replace
        // graph visual props, so relying on React Flow's delegated node click can
        // lose the click that follows the first pointer enter.
        event.stopPropagation();
        data.onSelect?.(flow);
        data.onOpen?.(flow);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          data.onSelect?.(flow);
          data.onOpen?.(flow);
        }
      }}
      // Keep the native link-style cursor on the actual hit target. This must
      // not depend on the React Flow pane's grab cursor or stylesheet order.
      style={{ cursor: 'pointer' }}
      className={`cursor-pointer min-w-[180px] max-w-[180px] rounded-[var(--graph-node-radius)] border px-4 py-3 text-center shadow-sm transition-[border-color,box-shadow] duration-200 ease-out ${
        flow.health === 'healthy'
          ? 'border-emerald-400 bg-emerald-50'
          : flow.health === 'at_risk'
            ? 'border-amber-400 bg-amber-50'
            : flow.health === 'broken'
              ? 'border-red-400 bg-red-50'
              : 'border-slate-300 bg-slate-50'
      }`}
    >
      {data.targetHandles.map((handle) => (
        // Preserve distinct merge handles while leaving their vertical anchor at
        // React Flow's native node boundary. The edge path and its marker share
        // this measured handle coordinate.
        <Handle key={handle.id} id={handle.id} type="target" position={Position.Top} style={{ left: handle.left, pointerEvents: 'none' }} className="!border-0 !bg-transparent" />
      ))}
      <p className="text-[10px] text-slate-500">{flow.flowKey}</p>
      <p className="mt-1 break-words text-[13px] font-medium leading-4 text-slate-900">{flow.title}</p>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
        <span className={`h-2 w-2 rounded-full ${healthDot}`} />
        {title(flow.health)}
      </p>
      {data.sourceHandles.map((handle) => (
        <Handle key={handle.id} id={handle.id} type="source" position={Position.Bottom} style={{ left: handle.left, pointerEvents: 'none' }} className="!border-0 !bg-transparent" />
      ))}
    </div>
  );
});

const graphNodeTypes = { flow: FlowGraphNode };

const GraphStageGroupNode = memo(({ data }: NodeProps<Node<GraphStageGroup>>) => (
  <div
    aria-hidden="true"
    className="h-full w-full rounded-2xl border border-slate-200/70 bg-slate-50/55 px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
    style={{ pointerEvents: 'none' }}
  >
    {data.label}
  </div>
));

const graphStageNodeTypes = { stage: GraphStageGroupNode };

// The dependency graph is an inspection surface: its cards own activation,
// while React Flow only owns viewport navigation and rendering.
// eslint-disable-next-line react-refresh/only-export-components -- exported for focused read-only configuration tests.
export const graphViewReadOnlyProps = {
  nodesDraggable: false,
  nodesConnectable: false,
  edgesReconnectable: false,
  elementsSelectable: false,
  nodesFocusable: false,
  edgesFocusable: false,
  connectOnClick: false,
  selectNodesOnDrag: false,
  autoPanOnNodeFocus: false,
} as const;

type GraphHighlight = { nodeIds: Set<string>; edgeIds: Set<string>; primaryNodeId?: string };

// eslint-disable-next-line react-refresh/only-export-components -- exported for focused hover interaction tests.
export const graphHoverHighlight = (edges: Edge[], nodeId?: string, edgeId?: string): GraphHighlight => {
  const highlightedEdges = nodeId
    ? edges.filter((edge) => edge.source === nodeId || edge.target === nodeId)
    : edges.filter((edge) => edge.id === edgeId);
  return {
    nodeIds: new Set(nodeId ? [nodeId, ...highlightedEdges.flatMap((edge) => [edge.source, edge.target])] : highlightedEdges.flatMap((edge) => [edge.source, edge.target])),
    edgeIds: new Set(highlightedEdges.map((edge) => edge.id)),
    primaryNodeId: nodeId,
  };
};

const createGraphHighlightIndexes = (edges: Edge[]) => {
  const incoming = new Map<string, Edge[]>();
  const outgoing = new Map<string, Edge[]>();
  const byId = new Map<string, Edge>();
  edges.forEach((edge) => {
    byId.set(edge.id, edge);
    appendGraphIndex(incoming, edge.target, edge);
    appendGraphIndex(outgoing, edge.source, edge);
  });
  const nodeHighlights = new Map<string, GraphHighlight>();
  [...new Set([...incoming.keys(), ...outgoing.keys()])].forEach((nodeId) => {
    const relatedEdges = [...(incoming.get(nodeId) || []), ...(outgoing.get(nodeId) || [])];
    nodeHighlights.set(nodeId, {
      nodeIds: new Set([nodeId, ...relatedEdges.flatMap((edge) => [edge.source, edge.target])]),
      edgeIds: new Set(relatedEdges.map((edge) => edge.id)),
      primaryNodeId: nodeId,
    });
  });
  const edgeHighlights = new Map<string, GraphHighlight>();
  byId.forEach((edge) => {
    edgeHighlights.set(edge.id, {
      nodeIds: new Set([edge.source, edge.target]),
      edgeIds: new Set([edge.id]),
    });
  });
  return { nodeHighlights, edgeHighlights };
};

const graphRelationshipPriority = (value: unknown) => {
  switch (relationshipType(value)) {
    case 'next': return 0;
    case 'requires': return 1;
    case 'blocks': return 2;
    case 'optional': return 3;
    default: return 4;
  }
};

// eslint-disable-next-line react-refresh/only-export-components -- the visual leader policy is covered by focused graph tests.
export const resolveGraphEdgeVisuals = (
  baseEdges: Edge[],
  graphIndexes: GraphIndexes,
  hovered: GraphHighlight | null,
  selectedNodeId?: string,
  secondaryExpanded = false,
): Edge[] => {
  const resolved = baseEdges.map((edge) => {
    const isHighlighted = hovered?.edgeIds.has(edge.id);
    const visible = isGraphEdgeVisible(
      graphIndexes.edgeById.get(edge.id)?.relationshipType,
      edge,
      selectedNodeId || hovered?.primaryNodeId,
      secondaryExpanded,
    );
    return {
      ...edge,
      hidden: !visible,
      style: {
        ...edge.style,
        opacity: !visible ? 0 : hovered && !isHighlighted ? 0.3 : 1,
        strokeWidth: isHighlighted
          ? Math.max(Number(edge.style?.strokeWidth || 0) + 1, 3)
          : edge.style?.strokeWidth,
        transition: 'opacity 200ms ease, stroke 200ms ease, stroke-width 200ms ease',
      },
      zIndex: isHighlighted ? 1 : 0,
    };
  });
  const leaderByTarget = new Map<string, string>();
  resolved.filter((edge) => !edge.hidden && edge.type === 'bundle').forEach((edge) => {
    const currentLeaderId = leaderByTarget.get(edge.target);
    const currentLeader = currentLeaderId ? graphIndexes.edgeById.get(currentLeaderId) : undefined;
    const candidate = graphIndexes.edgeById.get(edge.id);
    if (!currentLeader || (candidate && graphRelationshipPriority(candidate.relationshipType) < graphRelationshipPriority(currentLeader.relationshipType))) leaderByTarget.set(edge.target, edge.id);
  });
  return resolved.map((edge) => edge.type === 'bundle'
    ? { ...edge, data: { ...(edge.data as BundledEdgeData), bundleLeader: leaderByTarget.get(edge.target) === edge.id } }
    : edge);
};

const GraphFlowCanvas = ({
  graph,
  layout,
  onOpen,
}: {
  graph: { nodes: UserFlow[]; edges: GraphEdge[] };
  layout: ReturnType<typeof calculateGraphLayout>;
  onOpen: (flow: UserFlow) => void;
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const [guideTrigger, setGuideTrigger] = useState<HTMLElement | null>(null);
  const closeGuide = () => {
    setShowGuide(false);
    requestAnimationFrame(() => guideTrigger?.focus());
  };
  useEffect(() => {
    if (!showGuide) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && closeGuide();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showGuide, guideTrigger]);
  const [hovered, setHovered] = useState<GraphHighlight | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const selectNode = useCallback((flow: UserFlow) => setSelectedNodeId(flow.id), []);
  const [secondaryExpanded, setSecondaryExpanded] = useState(false);
  // Keep the current highlight while moving between nodes, edges, and the canvas.
  // React Flow emits leave events for each element during those internal transitions.
  const clearCanvasHover = useCallback(() => setHovered(null), []);
  const graphIndexes = useMemo(() => createGraphIndexes(graph), [graph]);
  const baseNodes = useMemo(
    () => mapGraphNodes(graph, layout, onOpen, graphIndexes, selectNode),
    [graph, graphIndexes, layout, onOpen, selectNode],
  );
  const baseEdges = useMemo(() => mapGraphEdges(graph, graphIndexes), [graph, graphIndexes]);
  const stageNodes = useMemo<Node<GraphStageGroup>[]>(
    () => calculateGraphStageGroups(graph.nodes, layout).map((group) => ({
      id: group.id,
      type: 'stage',
      position: { x: group.x, y: group.y },
      data: group,
      style: { width: group.width, height: group.height, zIndex: 0, pointerEvents: 'none' },
      draggable: false,
      selectable: false,
      focusable: false,
    })),
    [graph.nodes, layout],
  );
  const highlightIndexes = useMemo(() => createGraphHighlightIndexes(baseEdges), [baseEdges]);
  const activeNodeId = selectedNodeId || hovered?.primaryNodeId;
  const nodes = useMemo(
    () =>
      baseNodes.map((node) => ({
        ...node,
        className:
          hovered && !hovered.nodeIds.has(node.id)
            ? 'dependency-graph-node cursor-pointer opacity-40 transition-[opacity,box-shadow] duration-200 ease-out'
            : 'dependency-graph-node cursor-pointer transition-[opacity,box-shadow] duration-200 ease-out',
        // React Flow's base stylesheet applies `cursor: default` to its node
        // wrapper. Set an inline cursor here so it wins even when the wrapper
        // is not marked selectable during a hover repaint.
        style: {
          cursor: 'pointer',
          zIndex: 1,
          ...(activeNodeId === node.id
            ? { boxShadow: '0 0 0 3px rgb(124 58 237 / 0.9)' }
            : hovered?.nodeIds.has(node.id)
              ? { boxShadow: '0 0 0 2px rgb(167 139 250 / 0.8)' }
              : {}),
        },
      })),
    [activeNodeId, baseNodes, hovered],
  );
  const edges = useMemo(
    () => resolveGraphEdgeVisuals(baseEdges, graphIndexes, hovered, selectedNodeId, secondaryExpanded),
    [baseEdges, graphIndexes, hovered, secondaryExpanded, selectedNodeId],
  );
  const setNodeHover = useCallback((nodeId: string) => {
    const nextHighlight = highlightIndexes.nodeHighlights.get(nodeId) || null;
    setHovered((currentHighlight) => currentHighlight === nextHighlight ? currentHighlight : nextHighlight);
  }, [highlightIndexes]);
  const setEdgeHover = useCallback((edge: Edge) => {
    const nextHighlight = highlightIndexes.edgeHighlights.get(edge.id) || null;
    setHovered((currentHighlight) => currentHighlight === nextHighlight ? currentHighlight : nextHighlight);
  }, [highlightIndexes]);
  const relationshipLegend = RELATIONSHIP_OPTIONS.map((relationship) => ({
    ...relationship,
    style: graphEdgeStyle(relationship.value),
  }));
  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div><h2 className="font-semibold">Dependency Graph</h2><p className="text-sm text-slate-500">Arrows point from the source flow to its related flow. Optional and alternative paths appear on selection or when expanded.</p></div>
        <div className="flex gap-2"><Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => setSecondaryExpanded((current) => !current)} aria-pressed={secondaryExpanded}>{secondaryExpanded ? 'Hide secondary paths' : 'Show secondary paths'}</Button><Button size="sm" variant="secondary" className="h-8 px-3" onClick={(event) => { setGuideTrigger(event.currentTarget); setShowGuide(true); }}>How to read this graph</Button></div>
      </div>
      <p className="mt-3 text-xs text-slate-500"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />Healthy <span className="ml-3 mr-2 inline-block h-2 w-2 rounded-full bg-amber-500" />At risk <span className="ml-3 mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />Broken <span className="ml-3 mr-2 inline-block h-2 w-2 rounded-full bg-slate-400" />Unknown</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Connection legend"><span className="text-xs font-medium text-slate-700">Connections</span>{relationshipLegend.map(({ label, value, style }) => <span key={value} className="inline-flex items-center gap-1.5 text-xs text-slate-600"><svg aria-hidden="true" className="h-3 w-9 shrink-0 overflow-visible"><line x1="1" x2="35" y1="6" y2="6" stroke={style.color} strokeWidth={style.width} strokeDasharray={style.dash} strokeLinecap="round" /></svg>{label}</span>)}</div>
      {graph.edges.length === 0 && <p className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-600">These flows do not have dependencies yet. Open a flow and add its next flow in the Dependencies tab.</p>}
      <div className="mt-5 aspect-[4/3] min-h-[520px] max-h-[900px] w-full overflow-hidden rounded-lg border" data-testid="react-flow-graph" data-visible-secondary-count={edges.filter((edge) => !edge.hidden && isSecondaryGraphRelationship(graphIndexes.edgeById.get(edge.id)?.relationshipType)).length}>
        <ReactFlowProvider><FlowViewport nodes={[...stageNodes, ...nodes]} edges={edges} graphSignature={layout.signature} onOpen={onOpen} onNodeHover={setNodeHover} onEdgeHover={setEdgeHover} onCanvasMouseLeave={clearCanvasHover} /></ReactFlowProvider>
      </div>
      {showGuide && <GraphGuide closeGuide={closeGuide} />}
    </section>
  );
};

const FlowViewport = ({ nodes, edges, graphSignature, onOpen, onNodeHover, onEdgeHover, onCanvasMouseLeave }: { nodes: Node[]; edges: Edge[]; graphSignature: string; onOpen: (flow: UserFlow) => void; onNodeHover: (id: string) => void; onEdgeHover: (edge: Edge) => void; onCanvasMouseLeave: () => void }) => {
  const { fitView } = useReactFlow();
  const viewportRef = useRef<HTMLDivElement>(null);
  const refit = useCallback(() => requestAnimationFrame(() => fitView({ padding: 0.2, duration: 0 })), [fitView]);
  const handleCanvasMouseOut = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) onCanvasMouseLeave();
  }, [onCanvasMouseLeave]);
  useEffect(() => { refit(); }, [refit, graphSignature]);
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(refit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [refit]);
  return <div ref={viewportRef} className="h-full" onMouseOut={handleCanvasMouseOut}><ReactFlow className="dependency-graph-canvas" nodes={nodes} edges={edges} nodeTypes={{ ...graphStageNodeTypes, ...graphNodeTypes }} edgeTypes={{ bundle: BundledGraphEdge }} {...graphViewReadOnlyProps} noPanClassName="dependency-graph-node" fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.2} onNodeMouseEnter={(_, node) => node.type === 'flow' && onNodeHover(node.id)} onEdgeMouseEnter={(_, edge) => onEdgeHover(edge)}><Background gap={16} size={1} /><Controls showInteractive={false} /></ReactFlow></div>;
};

const GraphGuide = ({ closeGuide }: { closeGuide: () => void }) =>
  createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="How to read this graph">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-bold">How to read this graph</h2>
        <dl className="mt-4 space-y-3 text-sm text-slate-700">
          <div><dt className="font-medium">Nodes</dt><dd className="text-slate-500">Each card is a user flow. Its dot and label show current health.</dd></div>
          <div><dt className="font-medium">Arrows and direction</dt><dd className="text-slate-500">An arrow leaves the source flow and points to the related flow.</dd></div>
          <div><dt className="font-medium">Connection style</dt><dd className="text-slate-500">Line color and pattern identify the relationship type.</dd></div>
          <div><dt className="font-medium">Incoming and outgoing</dt><dd className="text-slate-500">Outgoing edges leave a flow; incoming edges arrive from another flow.</dd></div>
        </dl>
        <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={closeGuide}>Close</Button></div>
      </div>
    </div>,
    document.body,
  );

export const FlowForm = ({
  projectId,
  initial,
  areas,
  onDone,
  onSaved = onDone,
  onError,
}: {
  projectId: string;
  initial: UserFlow | 'new';
  areas: Array<UserFlowArea | string>;
  onDone: () => void;
  onSaved?: () => void;
  onError: (message: string) => void;
}) => {
  const editing = initial !== 'new';
  const [data, setData] = useState({
    title: editing ? initial.title : '',
    description: editing ? initial.description || '' : '',
    goal: editing ? initial.goal || '' : '',
    entryPoint: editing ? initial.entryPoint || '' : '',
    successCriteria: editing ? initial.successCriteria || '' : '',
    areaId: editing ? initial.areaId || initial.area || '' : '',
    priority: editing ? initial.priority : 'not_defined',
    status: editing ? initial.status : 'draft',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data.title.trim()) {
      setErrors({ title: 'Title is required.' });
      return;
    }
    try {
      const catalogArea = areas.find((area) => typeof area !== 'string' && area.id === data.areaId);
      const payload = { ...data, ...(catalogArea ? {} : { area: data.areaId || null, areaId: undefined }), health: editing ? initial.health : 'unknown' };
      if (editing) await UserFlowsService.update(projectId, initial.id, payload);
      else await UserFlowsService.create(projectId, payload);
      onSaved();
    } catch (cause) {
      onError((cause as { message?: string }).message || 'Unable to save user flow.');
    }
  };
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
        <form
          aria-labelledby="user-flow-form-title"
          aria-modal="true"
          onSubmit={submit}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
          role="dialog"
        >
          <h2 className="text-lg font-bold" id="user-flow-form-title">
            {editing ? 'Edit User Flow' : 'Create User Flow'}
          </h2>
          <label className="block text-sm font-medium">
            Title <span className="text-red-600">*</span>
            <input
              aria-invalid={Boolean(errors.title)}
              className="mt-1 w-full rounded border p-2"
              value={data.title}
              onChange={(event) => setData({ ...data, title: event.target.value })}
            />
            {errors.title && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.title}
              </p>
            )}
          </label>
          <label className="block text-sm">
            Description
            <textarea
              className="mt-1 w-full rounded border p-2"
              value={data.description}
              onChange={(event) => setData({ ...data, description: event.target.value })}
            />
          </label>
          {(
            [
              ['Goal', 'goal', 'Describe what the user is trying to achieve.'],
              ['Entry Point', 'entryPoint', 'Where does this flow start?'],
              [
                'Success Criteria',
                'successCriteria',
                'What must be true for this flow to be considered successful?',
              ],
            ] as const
          ).map(([labelText, field, placeholder]) => (
            <label key={field} className="block text-sm">
              {labelText}
              <textarea
                placeholder={placeholder}
                className="mt-1 w-full rounded border p-2"
                value={data[field]}
                onChange={(event) => setData({ ...data, [field]: event.target.value })}
              />
            </label>
          ))}
          <label className="block text-sm">
            Area
            <Select aria-label="Area" className="mt-1" value={data.areaId} onChange={(value) => setData({ ...data, areaId: String(value) })} placeholder={areas.length ? 'Pilih Area' : 'Belum ada Area'} disabled={!areas.length} options={areas.map((area) => typeof area === 'string' ? ({ value: area, label: area }) : ({ value: area.id, label: area.name }))} size="md" />
            {!areas.length && <span className="mt-1 block text-xs text-slate-500">Tambahkan Area melalui Settings terlebih dahulu.</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Priority <span className="text-red-600">*</span>
              <Select aria-label="Priority" className="mt-1" value={data.priority} onChange={(value) => setData({ ...data, priority: String(value) as UserFlow['priority'] })} options={['not_defined', 'critical', 'high', 'medium', 'low'].map((value) => ({ value, label: title(value) }))} size="md" />
            </label>
            <label className="text-sm">
              Status <span className="text-red-600">*</span>
              <Select aria-label="Status" className="mt-1" value={data.status} onChange={(value) => setData({ ...data, status: String(value) as UserFlow['status'] })} options={['draft', 'active', 'deprecated'].map((value) => ({ value, label: title(value) }))} size="md" />
            </label>
          </div>
          <p className="text-xs text-slate-500">New flows start with Unknown health.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Create User Flow'}</Button>
          </div>
        </form>
      </div>
    </>
  );
};

export const UserFlowsPage = ({
  projects,
  projectId,
  onProjectChange,
  onOpenTestRun,
  canManage = true,
}: {
  projects: Project[];
  projectId: string;
  onProjectChange: (projectId: string) => void;
  onOpenTestRun?: (projectId: string, runId: string) => void;
  /** Matches the existing User Flow edit permission surface; the API remains authoritative. */
  canManage?: boolean;
}) => {
  const areaCatalog = useUserFlowAreaCatalog();
  const areas = areaCatalog.areas;
  const [flows, setFlows] = useState<UserFlow[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    healthy: 0,
    atRisk: 0,
    broken: 0,
    coverage: 0,
  });
  const [graph, setGraph] = useState<{
    nodes: UserFlow[];
    edges: Array<{ sourceFlowId: string; targetFlowId: string }>;
  }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'graph'>('list');
  const [detail, setDetail] = useState<UserFlow | null>(null);
  const [detailHistory, setDetailHistory] = useState<UserFlow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [detailRequest, setDetailRequest] = useState<UserFlow | null>(null);
  const [testCases, setTestCases] = useState<ProjectTestCaseRecord[]>([]);
  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [form, setForm] = useState<UserFlow | null | 'new'>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [deleting, setDeleting] = useState<UserFlow | null>(null);
  const [inlineUpdating, setInlineUpdating] = useState<string | null>(null);
  const loadRequestVersion = useRef(0);
  const load = useCallback(async () => {
    const requestVersion = ++loadRequestVersion.current;
    if (!projectId) {
      setFlows([]);
      setSummary({ total: 0, healthy: 0, atRisk: 0, broken: 0, coverage: 0 });
      setGraph({ nodes: [], edges: [] });
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const [collection, graphResponse] = await Promise.all([
        UserFlowsService.list(projectId),
        UserFlowsService.graph(projectId),
      ]);
      if (requestVersion === loadRequestVersion.current) {
        setFlows(collection.data.flows);
        setSummary(collection.data.summary);
        setGraph(graphResponse.data);
        setError(null);
      }
    } catch (cause) {
      if (requestVersion === loadRequestVersion.current)
        setError((cause as { message?: string }).message || 'Unable to load user flows.');
    } finally {
      if (requestVersion === loadRequestVersion.current) setLoading(false);
    }
  }, [projectId]);
  const deleteFlow = async () => {
    if (!deleting) return;
    try {
      await UserFlowsService.remove(projectId, deleting.id);
      setDeleting(null);
      await load();
    } catch (cause) {
      setToast({
        message: (cause as { message?: string }).message || 'Unable to delete user flow.',
        type: 'error',
      });
    }
  };
  const updateInlineField = async (flow: UserFlow, field: 'priority' | 'status', value: string) => {
    if (flow[field] === value || inlineUpdating) return;
    const previous = flow[field];
    let persisted = false;
    setInlineUpdating(`${flow.id}:${field}`);
    setFlows((current) => current.map((item) => item.id === flow.id ? { ...item, [field]: value } : item));
    try {
      await UserFlowsService.update(projectId, flow.id, { [field]: value });
      persisted = true;
      await load();
    } catch (cause) {
      if (!persisted) setFlows((current) => current.map((item) => item.id === flow.id ? { ...item, [field]: previous } : item));
      setToast({ message: (cause as { message?: string }).message || 'Unable to update user flow.', type: 'error' });
    } finally {
      setInlineUpdating(null);
    }
  };
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => onExecutionDataChanged((changedProjectId) => {
    if (changedProjectId === projectId) void load();
  }), [projectId, load]);
  const open = useCallback(async (flow: UserFlow) => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('userFlowId') !== flow.id) {
      url.searchParams.set('userFlowId', flow.id);
      window.history.pushState({ ...window.history.state, userFlowId: flow.id }, '', url);
    }
    setDetailRequest(flow);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [data, cases] = await Promise.all([
        UserFlowsService.get(projectId, flow.id),
        ProjectsService.listTestCases(projectId),
      ]);
      setDetail(data.data);
      setTestCases(cases.data);
    } catch (cause) {
      const status = typeof cause === 'object' && cause && 'status' in cause ? Number(cause.status) : undefined;
      setDetail(null);
      setDetailError({
        message: status === 404 ? 'User Flow tidak ditemukan.' : (cause as { message?: string }).message || 'User Flow tidak dapat dibuka.',
        notFound: status === 404,
      });
    } finally {
      setDetailLoading(false);
    }
  }, [projectId]);
  const openRelatedFlow = (flowId: string) => {
    if (detail) setDetailHistory((history) => [...history, detail]);
    void open({ id: flowId } as UserFlow);
  };
  const backToPreviousFlow = () => {
    const previous = detailHistory.at(-1);
    if (!previous) {
      setDetail(null);
      return;
    }
    setDetailHistory((history) => history.slice(0, -1));
    void open(previous);
  };
  const clearDetailState = useCallback(() => {
    setDetailHistory([]);
    setDetail(null);
    setDetailRequest(null);
    setDetailError(null);
  }, []);
  const closeDetail = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('userFlowId');
    window.history.pushState({ ...window.history.state, userFlowId: undefined }, '', url);
    clearDetailState();
  };
  useEffect(() => {
    const openFromUrl = () => {
      const flowId = new URL(window.location.href).searchParams.get('userFlowId');
      if (flowId) void open({ id: flowId } as UserFlow);
      else clearDetailState();
    };
    window.addEventListener('popstate', openFromUrl);
    const initialFlowId = new URL(window.location.href).searchParams.get('userFlowId');
    if (initialFlowId && !detail && !detailLoading) void open({ id: initialFlowId } as UserFlow);
    return () => window.removeEventListener('popstate', openFromUrl);
  }, [clearDetailState, detail, detailLoading, open]);
  const filtered = useMemo(
    () =>
      filterUserFlows(flows, {
        query,
        area: areaFilter,
        priority: priorityFilter,
        health: healthFilter,
        status: statusFilter,
      }),
    [flows, query, areaFilter, priorityFilter, healthFilter, statusFilter],
  );
  useEffect(() => setPage(1), [query, areaFilter, priorityFilter, healthFilter, statusFilter]);
  const totalPages = Math.max(1, perPage === -1 ? 1 : Math.ceil(filtered.length / perPage));
  useEffect(() => setPage((currentPage) => Math.min(currentPage, totalPages)), [totalPages]);
  const shown = perPage === -1 ? filtered : filtered.slice((page - 1) * perPage, page * perPage);
  if (detailLoading)
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading User Flow detail…
      </div>
    );
  if (detailError)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-red-900">{detailError.notFound ? 'User Flow tidak ditemukan' : 'User Flow gagal dimuat'}</h1>
        <p className="mt-2 text-sm text-red-700">{detailError.message}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="secondary" onClick={closeDetail}>User Flows</Button>
          {detailRequest && <Button onClick={() => void open(detailRequest)}>Coba lagi</Button>}
        </div>
      </div>
    );
  if (detail)
    return (
      <>
        <UserFlowDetail
          projectId={projectId}
          flow={detail}
          flows={flows}
          availableTestCases={testCases}
          onClose={closeDetail}
          onBack={detailHistory.length ? backToPreviousFlow : undefined}
          onViewFlow={openRelatedFlow}
          onOpenTestRun={(runId) => onOpenTestRun?.(projectId, runId)}
          canManage={canManage}
          onEdit={() => setForm(detail)}
          onRefresh={() => {
            void load();
            void open(detail);
          }}
          onError={(message) => setToast({ message, type: 'error' })}
        />
        {form && (
          <FlowForm
            projectId={projectId}
            initial={form}
            areas={areas}
            onDone={() => {
              setForm(null);
            }}
            onSaved={() => {
              setForm(null);
              void load();
              void open(detail);
            }}
            onError={(message) => setToast({ message, type: 'error' })}
          />
        )}
      </>
    );
  return (
    <>
      <div className="mx-auto w-full max-w-[1920px] space-y-5">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">User Flows</h1>
            <p className="text-sm text-slate-500">
              Manage journeys, coverage, and flow dependencies.
            </p>
          </div>
          <div className="flex gap-2">
            <Button disabled={!projectId} icon={<Plus size={16} />} onClick={() => setForm('new')}>
              New User Flow
            </Button>
          </div>
        </header>
        <div className="relative z-30 rounded-xl border border-slate-200/60 bg-white/60 p-2 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative shrink-0">
              <span className="sr-only">Project</span>
              <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Select aria-label="Project" className="min-w-44 pl-8" value={projectId} onChange={(value) => onProjectChange(String(value))} options={projects.map((project) => ({ value: project.id, label: project.name }))} placeholder="Project" />
            </label>
            <label className="group relative min-w-[12rem] flex-1">
              <Search
                className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${!projectId ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-brand-500'}`}
              />
              <input
                aria-label="Search user flows"
                className={`h-9 w-full rounded-lg border py-1.5 pl-9 pr-4 text-sm transition-all focus:outline-none focus:ring-2 ${!projectId ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 placeholder:text-slate-300' : 'border-slate-200 bg-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-brand-500/20'}`}
                disabled={!projectId}
                placeholder="Search user flows..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {[
              [
                'Area',
                areaFilter,
                setAreaFilter,
                areas,
              ],
              [
                'Priority',
                priorityFilter,
                setPriorityFilter,
                FLOW_PRIORITIES,
              ],
              [
                'Health',
                healthFilter,
                setHealthFilter,
                FLOW_HEALTHS,
              ],
              ['Status', statusFilter, setStatusFilter, FLOW_STATUSES],
            ].map(([label, value, setValue, options]) => (
              <label
                key={String(label)}
                className={`relative shrink-0 ${!projectId ? 'opacity-50' : ''}`}
              >
                <span className="sr-only">{String(label)}</span>
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Select aria-label={String(label)} className="min-w-28 pl-8" disabled={!projectId} value={String(value)} onChange={(next) => (setValue as (value: string) => void)(String(next))} options={(options as Array<string | UserFlowArea>).map((option) => typeof option === 'string' ? ({ value: option, label: title(option) }) : ({ value: option.id, label: option.name }))} placeholder={String(label)} />
              </label>
            ))}
          </div>
        </div>
        {projectId && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                ['Total', summary.total],
                ['Healthy', summary.healthy],
                ['At Risk', summary.atRisk],
                ['Broken', summary.broken],
                [
                  'Unknown',
                  Math.max(0, summary.total - summary.healthy - summary.atRisk - summary.broken),
                ],
                ['Coverage', formatPercentage(summary.coverage, { hasDenominator: summary.total > 0 })],
              ].map(([name, value]) => (
                <div key={String(name)} className="rounded-xl border bg-white p-4">
                  <p className="text-xs uppercase text-slate-500">{name}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              ))}
            </section>
            <div className="flex gap-2 border-b">
              <button
                className={`border-b-2 px-3 py-2 ${view === 'list' ? 'border-brand-600 text-brand-700' : 'border-transparent'}`}
                onClick={() => setView('list')}
              >
                List View
              </button>
              <button
                className={`border-b-2 px-3 py-2 ${view === 'graph' ? 'border-brand-600 text-brand-700' : 'border-transparent'}`}
                onClick={() => setView('graph')}
              >
                Graph View
              </button>
            </div>
            {view === 'list' ? (
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto rounded-t-xl">
                  <table className="w-full min-w-[94rem] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[20rem]" />
                      <col className="w-36" />
                      <col className="w-[6.5rem]" />
                      <col className="w-[6.5rem]" />
                      <col className="w-[6.5rem]" />
                      <col className="w-28" />
                      <col className="w-28" />
                      <col className="w-[8.5rem]" />
                      <col className="w-[8.5rem]" />
                      <col className="w-28" />
                      <col className="w-32" />
                    </colgroup>
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs text-slate-500">
                        <th className="px-4 py-4 font-semibold uppercase tracking-wider">Flow</th>
                        <th className="px-4 py-4 font-semibold uppercase tracking-wider">Area</th>
                        <th className="px-4 py-4 text-center font-semibold uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-4 py-4 text-center font-semibold uppercase tracking-wider">
                          Health
                        </th>
                        <th className="px-4 py-4 text-center font-semibold uppercase tracking-wider">
                          Coverage
                        </th>
                        <th className="px-4 py-4 text-center font-semibold uppercase tracking-wider">
                          Test Cases
                        </th>
                        <th className="px-4 py-4 text-center font-semibold uppercase tracking-wider">
                          Automated
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 font-semibold uppercase tracking-wider">
                          Last Tested
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 font-semibold uppercase tracking-wider">
                          Last Updated
                        </th>
                        <th className="px-4 py-4 text-center font-semibold uppercase tracking-wider">
                          Status
                        </th>
                        <th className={`px-4 py-4 ${ROW_ACTIONS_CELL_CLASS} text-right font-semibold uppercase tracking-wider`}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center">
                            Loading…
                          </td>
                        </tr>
                      ) : shown.length ? (
                        shown.map((flow) => (
                          <tr key={flow.id} className="group border-t">
                            <td className="align-middle px-4 py-4">
                              <button
                                className="block w-full min-w-0 text-left text-brand-700"
                                onClick={() => void open(flow)}
                                title={`${flow.flowKey} — ${flow.title}`}
                              >
                                <span className="block truncate text-xs text-slate-500">
                                  {flow.flowKey}
                                </span>
                                <span className="block truncate font-medium">{flow.title}</span>
                                {flow.description && (
                                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                                    {flow.description}
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="truncate px-4 py-4 align-middle" title={flow.area || undefined}>
                              {flow.area || '—'}
                            </td>
                            <td className="px-4 py-4 text-center align-middle">
                              {canManage ? <InlineBadgeSelect type="priority" label="Priority" value={flow.priority} options={FLOW_PRIORITIES} optionLabel={title} disabled={inlineUpdating !== null} onChange={(value) => updateInlineField(flow, 'priority', value)} /> : <Badge value={flow.priority} />}
                            </td>
                            <td className="px-4 py-4 text-center align-middle">
                              <Badge value={flow.health} />
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-center align-middle">
                              {formatPercentage(flow.coverage, { hasDenominator: flow.linkedTestCaseCount > 0 })}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-center align-middle">
                              {flow.linkedTestCaseCount}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-center align-middle">
                              {flow.automatedTestCaseCount}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 align-middle">
                              {flow.lastTestedAt
                                ? formatUserFlowDate(flow.lastTestedAt)
                                : 'Never tested'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 align-middle">
                              {formatUserFlowDate(flow.updatedAt)}
                            </td>
                            <td className="px-4 py-4 text-center align-middle">
                              {canManage ? <InlineBadgeSelect type="status" label="Status" value={flow.status} options={FLOW_STATUSES} optionLabel={title} disabled={inlineUpdating !== null} onChange={(value) => updateInlineField(flow, 'status', value)} /> : <Badge value={flow.status} />}
                            </td>
                            <td className={`px-4 py-4 ${ROW_ACTIONS_CELL_CLASS} text-right align-middle`}>
                              <div className="flex justify-end">
                                <FlowActions
                                  onView={() => void open(flow)}
                                  onEdit={() => setForm(flow)}
                                  onDelete={() => setDeleting(flow)}
                                  canManage={canManage}
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-slate-500">
                            No user flows match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  aria-label="User flow pagination"
                  currentPage={page}
                  itemsPerPage={perPage}
                  totalItems={filtered.length}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  onItemsPerPageChange={(value) => {
                    setPerPage(value);
                    setPage(1);
                  }}
                />
              </div>
            ) : (
              <GraphView
                graph={graph}
                loading={loading}
                error={error}
                onOpen={(flow) => void open(flow)}
              />
            )}
          </>
        )}
        <ConfirmationModal
          isOpen={Boolean(deleting)}
          title="Delete User Flow"
          message={`Delete ${deleting?.title || 'this user flow'}? Linked test cases will not be deleted.`}
          variant="danger"
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => void deleteFlow()}
        />
      </div>
      {form && (
        <FlowForm
          projectId={projectId}
          initial={form}
          areas={areas}
          onDone={() => {
            setForm(null);
            void load();
          }}
          onError={(message) => setToast({ message, type: 'error' })}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
};
