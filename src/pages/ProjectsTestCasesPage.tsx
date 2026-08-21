import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/src/components/projectsTestCases/Layout/Sidebar.tsx';
import { TestCaseList } from '@/src/components/projectsTestCases/TestCaseList.tsx';
import { TestCaseForm } from '@/src/components/projectsTestCases/TestCaseForm.tsx';
import type { TestCaseSubmitMode } from '@/src/components/projectsTestCases/TestCaseForm.tsx';
import { TestCaseDetail } from '@/src/components/projectsTestCases/TestCaseDetail.tsx';
import { TestCaseImportDialog } from '@/src/components/projectsTestCases/TestCaseImportDialog.tsx';
import { TestCaseStats } from '@/src/components/projectsTestCases/TestCaseStats.tsx';
import { TestCaseFolderTree, type FolderScope } from '@/src/components/projectsTestCases/TestCaseFolderTree.tsx';
import { ProjectBoard } from '@/src/components/projectsTestCases/ProjectBoard.tsx';
import { PendingDeletionProjects } from '@/src/components/projectsTestCases/PendingDeletionProjects.tsx';
import { ProjectForm } from '@/src/components/projectsTestCases/ProjectForm.tsx';
import { UserFlowsPage } from '@/src/components/userFlows/UserFlowsPage.tsx';
import { TestRunsPage } from '@/src/components/testRuns/TestRunsPage.tsx';
import { ReportsPage } from '@/src/components/reports/ReportsPage.tsx';
import type { ReportFilters } from '@/src/api/reports.service.ts';
import { ConfirmationModal } from '@/src/components/projectsTestCases/ui/ConfirmationModal.tsx';
import { PromptModal } from '@/src/components/projectsTestCases/ui/PromptModal.tsx';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import { MultiSelect } from '@/src/components/projectsTestCases/ui/MultiSelect.tsx';
import { Select } from '@/src/components/projectsTestCases/ui/Select.tsx';
import { Toast,ToastType } from '@/src/components/projectsTestCases/ui/Toast.tsx';
import { SettingsPage } from '@/src/components/settings/SettingsPage.tsx';
import { TeamPage } from '@/src/components/team/TeamPage.tsx';
import { ProjectsService, type BulkTestCaseUpdates, type TestCasePayload } from '@/src/api/projects.service.ts';
import { onExecutionDataChanged } from '@/src/api/execution-refresh.ts';
import type { FolderDeleteImpact, ProjectAssignmentRecord, ProjectTestCaseRecord, TestCaseFolderRecord } from '@/src/types/api.ts';
import { useSessionUser } from '@/src/auth/SessionContext.tsx';
import { isCurrentProjectRequest } from '@/src/utils/projectStats.ts';
import { getVisibleTestCases } from '@/src/utils/testCaseSorting.ts';
import { formatBulkUpdateConfirmation } from '@/src/utils/bulkUpdateConfirmation.ts';
import { sectionCatalogStore, useSectionCatalogs } from '@/src/state/section-catalog.ts';
import { Plus, Filter, Trash2, Search, Briefcase, Zap, Check, X, Upload } from 'lucide-react';
import type { TestCaseImportPayload } from '@/src/types/api.ts';
import {
  TestCase,
  FilterState,
  SortField,
  SortOrder,
  Priority,
  Status,
  AutomationType,
  AutomationReadiness,
  normalizeAutomationReadiness,
  normalizePriority,
  Project,
} from '../components/projectsTestCases/types.ts';

const toProject = (project: ProjectAssignmentRecord): Project => ({
  id: project.id,
  name: project.name,
  key: project.key ?? project.name.slice(0, 4).toUpperCase(),
  description: project.description ?? '',
  lead: project.lead ?? 'Unassigned',
  externalLink: project.externalLink,
  status: project.status === 'Completed' ? 'Completed' : 'Active',
  createdBy: project.createdBy,
  dueDate: project.dueDate ? new Date(project.dueDate) : new Date(),
  updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date(),
  members: [],
  stats: { testCasesCount: project.testCasesCount ?? 0, userFlowsCount: project.userFlowsCount ?? 0, passRate: project.qualitySnapshot?.passRate ?? project.passRate ?? null },
});

const toTestCase = (testCase: ProjectTestCaseRecord, projectId: string): TestCase => ({
  id: testCase.id, tcNumber: testCase.tcNumber, projectKey: testCase.projectKey, title: testCase.title,
  projectId: testCase.projectId ?? projectId, sectionId: testCase.sectionId, section: testCase.section ?? 'Uncategorized', folderId: testCase.folderId, folderPath: testCase.folderPath,
  priority: normalizePriority(testCase.priority),
  status: Object.values(Status).includes(testCase.status as Status) ? testCase.status as Status : Status.Draft,
  automationType: Object.values(AutomationType).includes(testCase.automationType as AutomationType) ? testCase.automationType as AutomationType : AutomationType.Manual,
  automationReadiness: normalizeAutomationReadiness(testCase.automationReadiness), isReusable: testCase.isReusable ?? false,
  linkedPreconditions: (testCase.linkedPreconditions ?? []).map((link) => ({
    id: link.id, testCaseId: link.testCaseId, sortOrder: link.sortOrder, projectKey: link.projectKey, tcNumber: link.tcNumber, title: link.title, section: link.section,
    status: Object.values(Status).includes(link.status as Status) ? link.status as Status : Status.Draft,
    automationType: Object.values(AutomationType).includes(link.automationType as AutomationType) ? link.automationType as AutomationType : AutomationType.Manual,
    isDeprecated: link.isDeprecated,
  })),
  steps: testCase.steps ?? [], tags: testCase.tags ?? [], updatedAt: testCase.updatedAt ? new Date(testCase.updatedAt) : new Date(), createdBy: testCase.createdBy ?? '—', description: testCase.description ?? undefined, preconditions: testCase.preconditions ?? undefined, mainExpectedResult: testCase.mainExpectedResult ?? undefined,
});

const emptyFolderScope: FolderScope = { includeSubfolders: false };

export const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionUser = useSessionUser();
  const currentUserLabel = sessionUser?.username || sessionUser?.email || 'Current user';
  // --- View State ---
  // Default landing page is now 'projects'
  const [currentView, setCurrentView] = useState<
    'projects' | 'test-cases' | 'user-flows' | 'runs' | 'reports' | 'team' | 'settings'
  >(() => {
    const view = new URLSearchParams(location.search).get('view');
    return view === 'test-cases' || view === 'user-flows' || view === 'runs' || view === 'reports' || view === 'team' || view === 'settings'
      ? view
      : 'projects';
  });

  // --- Data State ---
  // Projects always begin empty and are populated only from the scoped API;
  // this avoids a transient render of a global/mock collection for non-admins.
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [pendingDeletionProjects, setPendingDeletionProjects] = useState<ProjectAssignmentRecord[]>([]);
  const [pendingDeletionLoading, setPendingDeletionLoading] = useState(false);
  const [pendingDeletionError, setPendingDeletionError] = useState<string | null>(null);
  const [pendingDeletionAvailable, setPendingDeletionAvailable] = useState(true);
  const [pendingDeletionBusyProjectId, setPendingDeletionBusyProjectId] = useState<string | null>(null);
  const [restoreUnavailableProjectIds, setRestoreUnavailableProjectIds] = useState<Set<string>>(new Set());
  const [authorizedProjectIds, setAuthorizedProjectIds] = useState<string[] | null>(null);
  const projectRequestVersion = useRef(0);
  const testCaseRequestVersion = useRef(0);
  // User Flows does not own this selection so navigation between workspace views
  // preserves it without introducing another global state mechanism.
  const [selectedUserFlowProjectId, setSelectedUserFlowProjectId] = useState('');
  const [selectedTestRunProjectId, setSelectedTestRunProjectId] = useState('');
  const [selectedReportProjectId, setSelectedReportProjectId] = useState('');

  // Displayed Test Cases (Filtered View)
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const sectionsByProject = useSectionCatalogs(projects.map((project) => project.id));
  const [foldersByProject, setFoldersByProject] = useState<Record<string, TestCaseFolderRecord[]>>({});
  const [folderScope, setFolderScope] = useState<FolderScope>(emptyFolderScope);
  // A scope is owned by the project from which it was selected.  Keeping that
  // ownership separate makes a project switch safe even while React batches state updates.
  const [folderScopeProjectId, setFolderScopeProjectId] = useState<string>();
  // Expansion is UI state, not folder selection state. Keep it per project so
  // leaving Test Cases does not collapse the tree, while project changes never
  // accidentally reuse an ID from another project's catalog.
  const [expandedFolderIdsByProject, setExpandedFolderIdsByProject] = useState<Record<string, Set<string>>>({});
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersError, setFoldersError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // --- Bulk Action State ---
  const [bulkStatus, setBulkStatus] = useState<Status | ''>('');
  const [bulkPriority, setBulkPriority] = useState<Priority | ''>('');
  const [bulkSectionId, setBulkSectionId] = useState('');
  const [bulkTestingType, setBulkTestingType] = useState<AutomationType | ''>('');
  const [bulkAutomationReadiness, setBulkAutomationReadiness] = useState<AutomationReadiness | ''>('');
  const [bulkMoveDestination, setBulkMoveDestination] = useState('');
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const bulkResetVersion = useRef(0);

  // --- Toast State ---
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);
  // The API enforces company/project scope. This only prevents a Kataloka
  // administrator from being offered lifecycle actions that policy disallows.
  const canManagePendingDeletion = sessionUser?.roleSlug.toLowerCase() === 'admin';
  const canManageTestCases = sessionUser?.roleSlug.toLowerCase() !== 'viewer';

  const refreshProjects = useCallback(async () => {
    const requestVersion = ++projectRequestVersion.current;
    try {
      const response = await ProjectsService.list({ force: true });
      if (!isCurrentProjectRequest(requestVersion, projectRequestVersion.current)) return;
      setProjects(response.data.map(toProject));
      setAuthorizedProjectIds(response.data.map((project) => project.id));
      setProjectsError(null);
    } catch (error) {
      if (!isCurrentProjectRequest(requestVersion, projectRequestVersion.current)) return;
      setProjects([]);
      setProjectsError(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Project tidak dapat dimuat.');
    }
  }, []);

  const refreshPendingDeletionProjects = useCallback(async () => {
    if (!canManagePendingDeletion) return;
    setPendingDeletionLoading(true);
    try {
      const response = await ProjectsService.listPendingDeletion({ force: true });
      setPendingDeletionProjects(response.data);
      setPendingDeletionError(null);
      setPendingDeletionAvailable(true);
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
      if (status === 403) {
        setPendingDeletionAvailable(false);
        setPendingDeletionProjects([]);
        setPendingDeletionError(null);
      } else {
        setPendingDeletionError(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Project menunggu penghapusan tidak dapat dimuat. Coba muat ulang halaman.');
      }
    } finally {
      setPendingDeletionLoading(false);
    }
  }, [canManagePendingDeletion]);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [viewingCase, setViewingCase] = useState<TestCase | null>(null);

  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [folderDeleteDialog, setFolderDeleteDialog] = useState<{ folder: TestCaseFolderRecord; impact: FolderDeleteImpact } | null>(null);
  const [folderDeleteStrategy, setFolderDeleteStrategy] = useState<'MOVE_TO_PARENT' | 'MOVE_TEST_CASES_TO_UNFILED' | 'DELETE_ALL'>('MOVE_TO_PARENT');
  const [folderDeleteConfirmation, setFolderDeleteConfirmation] = useState('');
  const [folderDeleteBusy, setFolderDeleteBusy] = useState(false);
  const [folderPrompt, setFolderPrompt] = useState<{ mode: 'create' | 'rename'; folder?: TestCaseFolderRecord; parentId?: string | null } | null>(null);
  const [folderPromptBusy, setFolderPromptBusy] = useState(false);
  const [folderPromptError, setFolderPromptError] = useState<string | null>(null);

  // Confirmation State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'primary' | 'danger';
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  const clearBulkActionDraft = useCallback(() => {
    bulkResetVersion.current += 1;
    setBulkStatus('');
    setBulkPriority('');
    setBulkSectionId('');
    setBulkTestingType('');
    setBulkAutomationReadiness('');
    setBulkMoveDestination('');
  }, []);

  const resetBulkSelectionState = useCallback(() => {
    setSelectedIds([]);
    clearBulkActionDraft();
    setConfirmState((current) => current.isOpen ? { ...current, isOpen: false } : current);
  }, [clearBulkActionDraft]);

  // Filters & Sort
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    section: [],
    priority: [],
    status: [],
    projectId: [], // Default is empty, user must select
    automationType: [],
    automationReadiness: [],
  });
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const deepLinkedTestCaseId = query.get('testCaseId');
  const deepLinkedProjectId = query.get('projectId');
  const deepLinkedFolderId = query.get('folderId');
  const deepLinkedUnfiled = query.get('unfiled') === '1';
  const deepLinkedIncludeSubfolders = query.get('includeSubfolders') === '1';
  const queryView = query.get('view');
  const queryRunId = query.get('runId') || undefined;
  const queryExecutionId = query.get('executionId') || undefined;
  const reportFilters = useMemo<ReportFilters>(() => ({ dateFrom: query.get('dateFrom') || undefined, dateTo: query.get('dateTo') || undefined, runId: query.get('runId') || undefined, sectionId: query.get('sectionId') || undefined, folderId: query.get('folderId') || undefined, tag: query.get('tag') || undefined, priority: query.get('priority') || undefined, automationType: query.get('automationType') || undefined, assigneeId: query.get('assigneeId') || undefined, result: query.get('result') || undefined, userFlowId: query.get('userFlowId') || undefined }), [query]);
  const updateWorkspaceQuery = useCallback((updates: Record<string, string | undefined>, replace = false) => {
    const next = new URLSearchParams(location.search);
    Object.entries(updates).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    navigate({ pathname: location.pathname, search: next.toString() ? `?${next.toString()}` : '' }, { replace });
  }, [location.pathname, location.search, navigate]);
  const activeProjectId = filters.projectId.length === 1 ? filters.projectId[0] : undefined;
  const activeFolderScope = activeProjectId && folderScopeProjectId === activeProjectId ? folderScope : emptyFolderScope;
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'updatedAt',
    order: 'desc',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // --- Options for MultiSelect ---
  const projectOptions = useMemo(
    () => projects.map((p) => ({ label: p.name, value: p.id })),
    [projects],
  );
  const sections = useMemo(() => Array.from(new Set(Object.values(sectionsByProject).flat().map((section) => section.name))).sort(), [sectionsByProject]);
  const sectionOptions = useMemo(() => sections.map((s) => ({ label: s, value: s })), [sections]);
  const bulkSectionOptions = useMemo(
    () => (activeProjectId ? sectionsByProject[activeProjectId] ?? [] : []).map((section) => ({ label: section.name, value: section.id })),
    [activeProjectId, sectionsByProject],
  );
  const priorityOptions = useMemo(
    () => Object.values(Priority).map((p) => ({ label: p, value: p })),
    [],
  );
  const statusOptions = useMemo(
    () => Object.values(Status).map((s) => ({ label: s, value: s })),
    [],
  );
  const automationOptions = useMemo(
    () => Object.values(AutomationType).map((a) => ({ label: a, value: a })),
    [],
  );
  const automationReadinessOptions = useMemo(
    () => Object.values(AutomationReadiness).map((readiness) => ({ label: readiness, value: readiness })),
    [],
  );

  const clearFolderQuery = useCallback(() => {
    if (!deepLinkedFolderId && !deepLinkedUnfiled && !query.has('includeSubfolders')) return;
    const next = new URLSearchParams(location.search);
    next.delete('folderId');
    next.delete('unfiled');
    next.delete('includeSubfolders');
    navigate({ pathname: location.pathname, search: next.toString() ? `?${next.toString()}` : '' }, { replace: true });
  }, [deepLinkedFolderId, deepLinkedUnfiled, location.pathname, location.search, navigate, query]);

  const resetFolderScope = useCallback((clearQuery = false) => {
    // Clear ownership synchronously with the scope so a new project can never
    // issue a request using a folder selected in the previous project.
    setFolderScopeProjectId(undefined);
    setFolderScope(emptyFolderScope);
    if (clearQuery) clearFolderQuery();
  }, [clearFolderQuery]);

  const changeProjects = useCallback((projectIds: string[], preserveFolderQuery = false) => {
    resetFolderScope(false);
    setFilters((current) => ({ ...current, projectId: projectIds }));
    updateWorkspaceQuery({
      projectId: projectIds.length === 1 ? projectIds[0] : undefined,
      ...(preserveFolderQuery ? {} : { folderId: undefined, unfiled: undefined, includeSubfolders: undefined }),
    }, !preserveFolderQuery);
  }, [resetFolderScope, updateWorkspaceQuery]);

  // --- Handlers ---

  const handleNavigate = (view: string) => {
    if (view !== 'test-cases') resetFolderScope(false);
    setCurrentView(view as any);
    updateWorkspaceQuery({
      view,
      unfiled: undefined,
      includeSubfolders: undefined,
      ...(view === 'runs' ? { projectId: selectedTestRunProjectId || undefined, runId: undefined, userFlowId: undefined } : {}),
      ...(view === 'reports' ? { projectId: selectedReportProjectId || undefined, runId: undefined } : {}),
    });
  };

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);
  useEffect(() => {
    if (currentView === 'projects') void refreshPendingDeletionProjects();
  }, [currentView, refreshPendingDeletionProjects]);
  useEffect(() => onExecutionDataChanged(() => { void refreshProjects(); }), [refreshProjects]);

  // Only a successful scoped response is authoritative for this fallback. A
  // later refresh failure clears the visual list but must not discard a valid
  // selection based on that failure.
  useEffect(() => {
    if (
      authorizedProjectIds &&
      selectedUserFlowProjectId &&
      !authorizedProjectIds.includes(selectedUserFlowProjectId)
    ) {
      setSelectedUserFlowProjectId('');
    }
  }, [authorizedProjectIds, selectedUserFlowProjectId]);

  useEffect(() => {
    if (!authorizedProjectIds) return;
    if (selectedTestRunProjectId && !authorizedProjectIds.includes(selectedTestRunProjectId)) setSelectedTestRunProjectId('');
    if (selectedReportProjectId && !authorizedProjectIds.includes(selectedReportProjectId)) setSelectedReportProjectId('');
  }, [authorizedProjectIds, selectedReportProjectId, selectedTestRunProjectId]);

  useEffect(() => {
    if (queryView === 'test-cases' || queryView === 'user-flows' || queryView === 'runs' || queryView === 'reports' || queryView === 'team' || queryView === 'settings') {
      setCurrentView(queryView);
    } else if (!queryView) {
      setCurrentView('projects');
    }
  }, [queryView]);

  useEffect(() => {
    if (!deepLinkedProjectId || !projects.some((project) => project.id === deepLinkedProjectId)) return;
    if (queryView === 'runs') setSelectedTestRunProjectId(deepLinkedProjectId);
    if (queryView === 'reports') setSelectedReportProjectId(deepLinkedProjectId);
  }, [deepLinkedProjectId, projects, queryView]);

  // Linked-precondition source actions open a focused, independent workspace tab.
  // The project remains server-authorized when its test-case list is fetched.
  useEffect(() => {
    // A projectId is also used by other workspace views. Only a URL without a
    // view (legacy test-case deep links) or an explicit test-cases view should
    // activate this focused test-case navigation.
    if (!deepLinkedProjectId || (queryView && queryView !== 'test-cases') || !projects.some((project) => project.id === deepLinkedProjectId)) return;
    // A project filter change updates the URL in the same event. During the
    // render before that URL update is visible, do not let the previous deep
    // link effect restore the old project selection.
    if (filters.projectId.length > 0 && filters.projectId[0] !== deepLinkedProjectId) return;
    if (filters.projectId[0] !== deepLinkedProjectId) changeProjects([deepLinkedProjectId], true);
    setCurrentView('test-cases');
  }, [changeProjects, deepLinkedProjectId, filters.projectId, projects, queryView]);

  const refreshSectionsForProject = useCallback(async (projectId: string) => {
    return sectionCatalogStore.refresh(projectId);
  }, []);

  const handleViewTestCases = (projectId: string) => {
    // Switch to test cases and filter by this project
    changeProjects([projectId]);
    setCurrentView('test-cases');
  };

  const handleViewUserFlows = (projectId: string) => {
    setSelectedUserFlowProjectId(projectId);
    setCurrentView('user-flows');
    updateWorkspaceQuery({ view: 'user-flows', projectId, folderId: undefined, unfiled: undefined, includeSubfolders: undefined, testCaseId: undefined });
  };

  const handleViewTestRuns = (projectId: string) => {
    setSelectedTestRunProjectId(projectId);
    setCurrentView('runs');
    updateWorkspaceQuery({ view: 'runs', projectId, runId: undefined, userFlowId: undefined });
  };

  const handleViewReports = (projectId: string) => {
    setSelectedReportProjectId(projectId);
    setCurrentView('reports');
    updateWorkspaceQuery({ view: 'reports', projectId, runId: undefined, dateFrom: undefined, dateTo: undefined, sectionId: undefined, folderId: undefined, tag: undefined, priority: undefined, automationType: undefined, assigneeId: undefined, result: undefined });
  };

  // Test cases are fetched per selected project. The API authorizes this
  // server-side, so a client cannot obtain other projects by changing a filter.
  // A request version prevents a slower response from an earlier scope/mutation
  // refresh from restoring stale rows after the latest response has arrived.
  const refreshTestCases = useCallback(async () => {
    const requestVersion = ++testCaseRequestVersion.current;
    const projectIds = filters.projectId;
    if (projectIds.length === 0) {
      setTestCases([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const responses = await Promise.all(projectIds.map((projectId) => projectIds.length === 1
        ? ProjectsService.listTestCasesInFolder(projectId, activeFolderScope)
        : ProjectsService.listTestCases(projectId, { force: true })));
      const projectData = responses.flatMap((response, index) => response.data.map((testCase: ProjectTestCaseRecord) => toTestCase(testCase, projectIds[index])));
      if (requestVersion !== testCaseRequestVersion.current) return;
      setTestCases(projectData);
      const deepLinkedCase = deepLinkedTestCaseId ? projectData.find((testCase) => testCase.id === deepLinkedTestCaseId) : undefined;
      if (deepLinkedCase) setViewingCase(deepLinkedCase);
    } catch (error) {
      if (requestVersion === testCaseRequestVersion.current) {
        setTestCases([]);
        showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Test cases tidak dapat dimuat.', 'error');
      }
    } finally {
      if (requestVersion === testCaseRequestVersion.current) setIsLoading(false);
    }
  }, [activeFolderScope, deepLinkedTestCaseId, filters.projectId, showToast]);

  useEffect(() => {
    void refreshTestCases();
  }, [refreshTestCases]);

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
  };

  const handleToggleSelect = (id: string) => {
    if (!canManageTestCases) return;
    // A checkbox can only select an item rendered for the active project/folder scope.
    if (filters.projectId.length !== 1 || !testCases.some((testCase) => testCase.id === id)) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Selection is intentionally local to the Test Cases workspace and its project/folder scope.
  // This prevents a stale selection being applied after navigation or a catalog switch.
  useEffect(() => {
    resetBulkSelectionState();
  }, [activeFolderScope.folderId, activeFolderScope.includeSubfolders, activeFolderScope.unfiled, currentView, filters.projectId, resetBulkSelectionState]);

  useEffect(() => {
    if (selectedIds.length === 0) resetBulkSelectionState();
  }, [resetBulkSelectionState, selectedIds.length]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig, itemsPerPage]);

  // CRUD Operations - Test Cases

  const handleCreate = () => {
    setEditingCase(null);
    setIsFormOpen(true);
  };

  const scopedSelectedIds = useMemo(() => {
    if (!activeProjectId) return [];
    const visibleIds = new Set(testCases
      .filter((testCase) => testCase.projectId === activeProjectId)
      .map((testCase) => testCase.id));
    return selectedIds.filter((id) => visibleIds.has(id));
  }, [activeProjectId, selectedIds, testCases]);
  const bulkMoveOptions = useMemo(
    () => [
      { label: 'Unfiled', value: '__unfiled__' },
      ...((activeProjectId ? foldersByProject[activeProjectId] : []) ?? []).map((folder) => ({ label: folder.name, value: folder.id })),
    ],
    [activeProjectId, foldersByProject],
  );
  const refreshFolders = useCallback(async (projectId: string) => {
    const response = await ProjectsService.listTestCaseFolders(projectId, { force: true });
    const flatten = (nodes: TestCaseFolderRecord[]): TestCaseFolderRecord[] => nodes.flatMap(({ children, ...folder }) => [folder, ...flatten(children ?? [])]);
    const folders = flatten(response.data.folders);
    setFoldersByProject((current) => ({ ...current, [projectId]: folders }));
    setExpandedFolderIdsByProject((current) => {
      const validIds = new Set(folders.map((folder) => folder.id));
      const previous = current[projectId] ?? new Set<string>();
      const next = new Set([...previous].filter((folderId) => validIds.has(folderId)));
      if (next.size === previous.size) return current;
      return { ...current, [projectId]: next };
    });
    return folders;
  }, []);
  useEffect(() => {
    if (!activeProjectId) {
      setFoldersError(null);
      return;
    }
    setFoldersLoading(true);
    void refreshFolders(activeProjectId)
      .then(() => setFoldersError(null))
      .catch((error) => {
        const message = error?.message ?? 'Folder tidak dapat dimuat.';
        setFoldersError(message);
        showToast(message, 'error');
      })
      .finally(() => setFoldersLoading(false));
  }, [activeProjectId, refreshFolders, showToast]);
  // URL folder scopes are only meaningful for their active project.  Wait for
  // that project's folder catalog, then either apply the scope or remove the
  // stale parameter before it can be sent to the test-case endpoint.
  useEffect(() => {
    if (!activeProjectId || !deepLinkedFolderId || !Object.hasOwn(foldersByProject, activeProjectId)) return;
    if ((foldersByProject[activeProjectId] ?? []).some((folder) => folder.id === deepLinkedFolderId)) {
      setFolderScopeProjectId(activeProjectId);
      setFolderScope({ folderId: deepLinkedFolderId, includeSubfolders: deepLinkedIncludeSubfolders });
      return;
    }
    resetFolderScope(true);
  }, [activeProjectId, deepLinkedFolderId, deepLinkedIncludeSubfolders, foldersByProject, resetFolderScope]);
  useEffect(() => {
    if (!activeProjectId || deepLinkedFolderId || !Object.hasOwn(foldersByProject, activeProjectId)) return;
    setFolderScopeProjectId(activeProjectId);
    setFolderScope(deepLinkedUnfiled ? { unfiled: true, includeSubfolders: false } : emptyFolderScope);
  }, [activeProjectId, deepLinkedFolderId, deepLinkedUnfiled, foldersByProject]);
  const createFolder = (parentId?: string | null) => {
    if (!activeProjectId) return;
    setFolderPromptError(null);
    setFolderPrompt({ mode: 'create', parentId });
  };
  const renameFolder = (folder: TestCaseFolderRecord) => {
    if (!activeProjectId) return;
    setFolderPromptError(null);
    setFolderPrompt({ mode: 'rename', folder });
  };
  const submitFolderPrompt = async (name: string) => {
    if (!activeProjectId || !folderPrompt) return;
    setFolderPromptBusy(true);
    setFolderPromptError(null);
    try {
      if (folderPrompt.mode === 'create') {
        await ProjectsService.createTestCaseFolder(activeProjectId, { name, parentId: folderPrompt.parentId });
        await refreshFolders(activeProjectId);
        showToast('Folder created.');
      } else if (folderPrompt.folder && name !== folderPrompt.folder.name) {
        await ProjectsService.updateTestCaseFolder(activeProjectId, folderPrompt.folder.id, { name });
        await refreshFolders(activeProjectId);
        showToast('Folder renamed.');
      }
      setFolderPrompt(null);
    } catch (error) {
      setFolderPromptError(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Folder gagal disimpan.');
    } finally {
      setFolderPromptBusy(false);
    }
  };
  const deleteFolder = (folder: TestCaseFolderRecord) => {
    if (!activeProjectId) return;
    void ProjectsService.getTestCaseFolderDeleteImpact(activeProjectId, folder.id).then((response) => { setFolderDeleteStrategy('MOVE_TO_PARENT'); setFolderDeleteConfirmation(''); setFolderDeleteDialog({ folder, impact: response.data }); }).catch((error) => showToast(error?.message ?? 'Dampak penghapusan folder tidak dapat dimuat.', 'error'));
  };
  const confirmFolderDelete = async () => {
    if (!activeProjectId || !folderDeleteDialog) return;
    const { folder } = folderDeleteDialog; setFolderDeleteBusy(true);
    try {
      await ProjectsService.removeTestCaseFolder(activeProjectId, folder.id, { strategy: folderDeleteStrategy, confirmation: folderDeleteConfirmation });
      const remainingFolders = await refreshFolders(activeProjectId);
      if (activeFolderScope.folderId && !remainingFolders.some((item) => item.id === activeFolderScope.folderId)) {
        resetFolderScope(true);
      } else {
        await refreshTestCases();
      }
      setFolderDeleteDialog(null);
      showToast('Folder deleted.');
    }
    catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Folder tidak dapat dihapus. Konflik atau reusable precondition eksternal tidak mengubah data.', 'error'); }
    finally { setFolderDeleteBusy(false); }
  };
  const performMove = async (folderId: string | null) => {
    if (!canManageTestCases) return;
    const scopedIds = scopedSelectedIds.filter((id) => testCases.some((testCase) => testCase.id === id && testCase.projectId === activeProjectId));
    if (isBulkMoving || !activeProjectId || !scopedIds.length) return;
    setIsBulkMoving(true);
    try {
      try {
        await ProjectsService.bulkMoveTestCases(activeProjectId, { testCaseIds: scopedIds, destinationFolderId: folderId });
      } catch (error) {
        showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Bulk move gagal; tidak ada test case yang dipindahkan.', 'error');
        return;
      }

      resetBulkSelectionState();
      await Promise.all([refreshTestCases(), refreshFolders(activeProjectId)]).catch((error) => {
        showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Data test case/folder belum dapat disegarkan.', 'error');
      });
      showToast('Test cases moved.');
    } finally {
      setIsBulkMoving(false);
    }
  };

  const requestMove = (folderId: string | null) => {
    const ids = scopedSelectedIds;
    if (!ids.length || !activeProjectId) return;
    setConfirmState({
      isOpen: true,
      title: 'Bulk Update',
      message: formatBulkUpdateConfirmation({ count: ids.length, updates: { folderId }, folders: foldersByProject[activeProjectId] ?? [] }),
      variant: 'primary',
      confirmLabel: 'Update',
      onConfirm: () => { void performMove(folderId); },
    });
  };

  const handleImport = async (projectId: string, payload: TestCaseImportPayload) => {
    const response = await ProjectsService.importTestCases(projectId, payload);
    const refreshed = await ProjectsService.listTestCases(projectId, { force: true });
    const imported = refreshed.data.map((testCase: ProjectTestCaseRecord) => toTestCase(testCase, projectId));
    setTestCases((current) => [...current.filter((testCase) => testCase.projectId !== projectId), ...imported]);
    ProjectsService.invalidateList();
    await refreshProjects();
    showToast(`${response.data.importedCount} test case${response.data.importedCount === 1 ? '' : 's'} imported successfully.`);
    return response.data;
  };

  const handleEdit = (tc: TestCase) => {
    setViewingCase(null);
    setEditingCase(tc);
    setIsFormOpen(true);
  };

  const handleView = (tc: TestCase) => setViewingCase(tc);

  // Executes the actual update state change (called after confirmation)
  const performUpdate = async (ids: string[], updates: Partial<TestCase>): Promise<boolean> => {
    if (!canManageTestCases) return false;
    if (isBulkUpdating) return false;
    const targets = ids.map((id) => ({ id, current: testCases.find((testCase) => testCase.id === id) })).filter((target): target is { id: string; current: TestCase } => Boolean(target.current));
    if (!targets.length) return false;
    setIsBulkUpdating(true);
    try {
      if (targets.length > 1) {
        const projectId = targets[0].current.projectId;
        const bulkUpdates: BulkTestCaseUpdates = {};
        if (updates.sectionId !== undefined) bulkUpdates.sectionId = updates.sectionId;
        if (updates.priority !== undefined) bulkUpdates.priority = updates.priority;
        if (updates.status !== undefined) bulkUpdates.status = updates.status;
        if (updates.automationType !== undefined) bulkUpdates.automationType = updates.automationType;
        if (updates.automationReadiness !== undefined) bulkUpdates.automationReadiness = updates.automationReadiness;
        if (updates.folderId !== undefined) bulkUpdates.folderId = updates.folderId;
        try {
          await ProjectsService.bulkUpdateTestCases(projectId, { testCaseIds: targets.map(({ id }) => id), updates: bulkUpdates });
        } catch (error) {
          showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Bulk update gagal; tidak ada test case yang diubah.', 'error');
          return false;
        }
        try {
          await Promise.all([refreshTestCases(), refreshFolders(projectId), refreshProjects()]);
        } catch (error) {
          setSelectedIds(ids);
          showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Data test case/folder belum dapat disegarkan.', 'error');
          return false;
        }
        resetBulkSelectionState();
        showToast(`Updated ${ids.length} test cases successfully.`);
        return true;
      }
      const results = await Promise.allSettled(targets.map(async ({ id, current }) => {
        const payload: TestCasePayload = {
          title: current.title,
          sectionId: updates.sectionId ?? current.sectionId ?? '',
          priority: updates.priority ?? current.priority,
          status: updates.status ?? current.status,
          automationType: updates.automationType ?? current.automationType,
          automationReadiness: updates.automationReadiness ?? current.automationReadiness ?? AutomationReadiness.Candidate,
          isReusable: current.isReusable ?? false,
          folderId: current.folderId ?? null,
          linkedPreconditions: current.linkedPreconditions?.map((link) => ({ testCaseId: link.testCaseId, sortOrder: link.sortOrder })) ?? [],
          description: current.description ?? null,
          preconditions: current.preconditions ?? null,
          mainExpectedResult: current.mainExpectedResult ?? null,
          steps: current.steps,
          tags: current.tags,
        };
        const response = await ProjectsService.updateTestCase(current.projectId, id, payload);
        return { id, current, saved: response.data };
      }));
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { id, current, saved } = result.value;
          setTestCases((items) => items.map((item) => item.id === id ? { ...item, ...toTestCase(saved, current.projectId) } : item));
        }
      });

      const projectIds = [...new Set(targets.map(({ current }) => current.projectId))];
      const refreshResults = await Promise.allSettled([
        refreshTestCases(),
        ...projectIds.map((projectId) => refreshFolders(projectId)),
        refreshProjects(),
      ]);
      const refreshFailures = refreshResults.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      const reason = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown error';
      if (failures.length > 0) {
        setSelectedIds(failures.map((failure) => targets[results.indexOf(failure)].id));
        showToast(`${targets.length - failures.length} updated; ${failures.length} failed: ${reason(failures[0].reason)}`, 'error');
        return false;
      }
      if (refreshFailures.length > 0) {
        showToast(`Updated ${targets.length} test cases, but refresh failed: ${reason(refreshFailures[0].reason)}`, 'error');
        setSelectedIds(ids);
        return false;
      }
      resetBulkSelectionState();
      showToast(ids.length === 1 ? 'Test case updated successfully.' : `Updated ${ids.length} test cases successfully.`);
      return true;
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Initiates update with Confirmation Modal
  const requestUpdate = (ids: string[], updates: Partial<TestCase>, displayContext?: { sections?: typeof sectionsByProject[string]; folders?: TestCaseFolderRecord[] }) => {
    const isBulk = ids.length > 1;
    const projectId = testCases.find((testCase) => ids.includes(testCase.id))?.projectId;

    setConfirmState({
      isOpen: true,
      title: isBulk ? 'Bulk Update' : 'Update Test Case',
      message: formatBulkUpdateConfirmation({
        count: ids.length,
        updates,
        sections: displayContext?.sections ?? (projectId ? sectionsByProject[projectId] : undefined),
        folders: displayContext?.folders ?? (projectId ? foldersByProject[projectId] : undefined),
      }),
      variant: 'primary',
      confirmLabel: 'Update',
      onConfirm: () => { void performUpdate(ids, updates); },
    });
  };

  const handleBulkApply = async () => {
    if (!canManageTestCases) return;
    const updates: Partial<TestCase> = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkPriority) updates.priority = bulkPriority;
    if (bulkSectionId) updates.sectionId = bulkSectionId;
    if (bulkTestingType) updates.automationType = bulkTestingType;
    if (bulkAutomationReadiness) updates.automationReadiness = bulkAutomationReadiness;

    if (Object.keys(updates).length === 0) return;
    const requestResetVersion = bulkResetVersion.current;
    try {
      const latestSections = activeProjectId && bulkSectionId ? await refreshSectionsForProject(activeProjectId) : undefined;
      if (requestResetVersion !== bulkResetVersion.current || selectedIds.length === 0) return;
      if (bulkSectionId && !latestSections?.some((section) => section.id === bulkSectionId)) {
        showToast('Section tidak lagi tersedia pada project ini. Pilih Section kembali.', 'error');
        setBulkSectionId('');
        return;
      }
      requestUpdate(scopedSelectedIds, updates, { sections: latestSections ?? (activeProjectId ? sectionsByProject[activeProjectId] : []), folders: activeProjectId ? foldersByProject[activeProjectId] : [] });
    } catch (error) {
      showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Katalog Section tidak dapat disegarkan.', 'error');
    }
  };

  const refreshBulkSections = useCallback(async () => {
    if (!activeProjectId) return;
    try {
      await refreshSectionsForProject(activeProjectId);
    } catch (error) {
      showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Katalog Section tidak dapat disegarkan.', 'error');
      throw error;
    }
  }, [activeProjectId, refreshSectionsForProject, showToast]);

  const handleSave = async (data: Partial<TestCase>, mode: TestCaseSubmitMode = 'close'): Promise<boolean> => {
    const projectId = editingCase ? editingCase.projectId : data.projectId ?? filters.projectId[0];
    if (!projectId) { showToast('Pilih project terlebih dahulu.', 'error'); return false; }
    const sectionId = data.sectionId ?? editingCase?.sectionId;
    if (!sectionId || !sectionsByProject[projectId]?.some((section) => section.id === sectionId)) {
      showToast('Pilih Section yang valid untuk project ini.', 'error');
      return false;
    }
    try {
      const payload = {
        title: data.title ?? editingCase?.title ?? 'Untitled', sectionId,
        priority: data.priority ?? editingCase?.priority ?? Priority.NotDefined, status: data.status ?? editingCase?.status ?? Status.Draft,
        automationType: data.automationType ?? editingCase?.automationType ?? AutomationType.Manual,
        automationReadiness: data.automationReadiness ?? editingCase?.automationReadiness ?? AutomationReadiness.Candidate,
        isReusable: data.isReusable ?? editingCase?.isReusable ?? false, folderId: data.folderId ?? editingCase?.folderId ?? activeFolderScope.folderId ?? null,
        linkedPreconditions: data.linkedPreconditions ?? editingCase?.linkedPreconditions?.map((link) => ({ testCaseId: link.testCaseId, sortOrder: link.sortOrder })) ?? [],
        description: data.description ?? editingCase?.description ?? null, preconditions: data.preconditions ?? editingCase?.preconditions ?? null, mainExpectedResult: data.mainExpectedResult ?? editingCase?.mainExpectedResult ?? null, steps: data.steps ?? editingCase?.steps ?? [], tags: data.tags ?? editingCase?.tags ?? [],
      };
      const response = editingCase
        ? await ProjectsService.updateTestCase(projectId, editingCase.id, payload)
        : await ProjectsService.createTestCase(projectId, payload);
      const saved = response.data;
      const testCase = toTestCase(saved, projectId);
      setTestCases((items) => editingCase ? items.map((item) => item.id === testCase.id ? { ...item, ...testCase } : item) : [testCase, ...items]);
      const folderAssignmentChanged = !editingCase || (editingCase.folderId ?? null) !== (payload.folderId ?? null);
      if (folderAssignmentChanged) {
        await Promise.all([refreshTestCases(), refreshFolders(projectId)]).catch((refreshError) => {
          showToast(refreshError && typeof refreshError === 'object' && 'message' in refreshError ? String(refreshError.message) : 'Data test case/folder belum dapat disegarkan.', 'error');
        });
      }
      if (!editingCase) {
        ProjectsService.invalidateList();
        await refreshProjects();
      }
      showToast(editingCase ? 'Test case updated successfully.' : 'New test case created.');
      if (mode === 'close') {
        setIsFormOpen(false);
        setEditingCase(null);
      }
      return true;
    } catch (error) {
      showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Test case gagal disimpan.', 'error');
      return false;
    }
  };

  const initiateDelete = (id?: string) => {
    if (!canManageTestCases) return;
    const targetIds = id ? [id] : scopedSelectedIds;
    const count = targetIds.length;

    setConfirmState({
      isOpen: true,
      title: 'Delete Test Case',
      message:
        count > 1
          ? `Are you sure you want to delete these ${count} test cases? This action cannot be undone and will remove all associated data.`
          : `Are you sure you want to delete this test case? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: () => { void (async () => {
        try {
        const targets = targetIds.map((testCaseId) => ({ id: testCaseId, testCase: testCases.find((item) => item.id === testCaseId) }));
        const results = await Promise.allSettled(targets.map(({ testCase }) => testCase ? ProjectsService.removeTestCase(testCase.projectId, testCase.id) : Promise.reject(new Error('TEST_CASE_NOT_FOUND'))));
        const successfulIds = targets.filter((_, index) => results[index].status === 'fulfilled').map(({ id: testCaseId }) => testCaseId);
        const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (successfulIds.length > 0) {
          setTestCases((items) => items.filter((item) => !successfulIds.includes(item.id)));
          setSelectedIds((items) => items.filter((item) => !successfulIds.includes(item)));
          ProjectsService.invalidateList();
          await refreshProjects();
          await Promise.all([...new Set(targets.filter(({ id }) => successfulIds.includes(id)).map(({ testCase }) => testCase?.projectId).filter((projectId): projectId is string => Boolean(projectId)))].map((projectId) => refreshFolders(projectId)));
        }
        if (failures.length > 0) {
          const firstFailure = failures[0].reason;
          const reason = firstFailure && typeof firstFailure === 'object' && 'message' in firstFailure ? String(firstFailure.message) : 'Unknown error';
          showToast(`${successfulIds.length} deleted; ${failures.length} failed: ${reason}`, 'error');
        } else {
          showToast(`${successfulIds.length} test case${successfulIds.length > 1 ? 's' : ''} deleted.`, 'success');
        }
        } catch (error) {
          showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Test case gagal dihapus.', 'error');
        }
        finally { setConfirmState((current) => ({ ...current, isOpen: false })); }
      })(); },
    });
  };

  // --- CRUD Operations - Projects ---
  const handleCreateProject = () => {
    setEditingProject(null);
    setIsProjectFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectFormOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Pindahkan project untuk dihapus',
      message:
        'Project akan dipindahkan ke status menunggu penghapusan. Project tidak lagi tersedia di alur kerja biasa, tetapi data dan attachment tetap utuh sampai Anda memulihkan atau menghapusnya secara permanen.',
      variant: 'danger',
      confirmLabel: 'Pindahkan project',
      onConfirm: () => { void (async () => {
        try {
        await ProjectsService.remove(projectId);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setTestCases((prev) => prev.filter((tc) => tc.projectId !== projectId));
        // Clear selection if needed
        if (filters.projectId.includes(projectId)) {
          setFilters((prev) => ({
            ...prev,
            projectId: prev.projectId.filter((id) => id !== projectId),
          }));
        }
        await refreshPendingDeletionProjects();
        showToast('Project dipindahkan ke status menunggu penghapusan.');
        } catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Project gagal dihapus.', 'error'); }
        finally { setConfirmState((prev) => ({ ...prev, isOpen: false })); }
      })();
      },
    });
  };

  const handleRestorePendingProject = (project: ProjectAssignmentRecord) => {
    setConfirmState({
      isOpen: true,
      title: 'Pulihkan project',
      message: `Project “${project.name}” akan dikembalikan ke daftar project aktif dan dapat digunakan kembali.`,
      variant: 'primary',
      confirmLabel: 'Pulihkan project',
      onConfirm: () => { void (async () => {
        setPendingDeletionBusyProjectId(project.id);
        try {
          await ProjectsService.restore(project.id);
          await Promise.all([refreshProjects(), refreshPendingDeletionProjects()]);
          showToast(`Project “${project.name}” berhasil dipulihkan.`);
        } catch (error) {
          showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Project gagal dipulihkan. Coba lagi atau hubungi admin project.', 'error');
        } finally {
          setPendingDeletionBusyProjectId(null);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      })(); },
    });
  };

  const handlePermanentlyRemovePendingProject = (project: ProjectAssignmentRecord) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus project secara permanen',
      message: `Tindakan ini tidak dapat dibatalkan. Project “${project.name}”, seluruh data terkait, dan semua attachment akan dihapus secara permanen.`,
      variant: 'danger',
      confirmLabel: 'Hapus permanen',
      onConfirm: () => { void (async () => {
        setPendingDeletionBusyProjectId(project.id);
        setPendingDeletionError(null);
        try {
          await ProjectsService.permanentlyRemove(project.id);
          await refreshPendingDeletionProjects();
          setRestoreUnavailableProjectIds((current) => { const next = new Set(current); next.delete(project.id); return next; });
          showToast(`Project “${project.name}” dan attachment-nya berhasil dihapus permanen.`);
        } catch (error) {
          const reason = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Pembersihan attachment gagal.';
          const cleanupWarning = `${reason} Cleanup permanen belum selesai dan project tetap menunggu penghapusan. Sebagian file attachment mungkin sudah terhapus, sehingga project tidak dapat dipulihkan pada sesi ini. Coba hapus permanen kembali. Jika masalah berlanjut, hubungi admin company.`;
          setPendingDeletionError(cleanupWarning);
          setRestoreUnavailableProjectIds((current) => new Set(current).add(project.id));
          showToast(cleanupWarning, 'error');
        } finally {
          setPendingDeletionBusyProjectId(null);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      })(); },
    });
  };

  const handleSaveProject = async (data: Partial<Project>) => {
    const name = (data.name || editingProject?.name || '').trim();
    const key = (data.key || editingProject?.key || '').trim().toUpperCase();
    if (!name) { showToast('Project Name wajib diisi.', 'error'); return; }
    if (!/^[A-Z0-9]{1,4}$/.test(key)) { showToast('Project Key harus unik, maksimal 4 karakter alfanumerik.', 'error'); return; }
    const conflicts = projects.some((project) => project.id !== editingProject?.id && (project.name.trim().toLowerCase() === name.toLowerCase() || project.key.toUpperCase() === key));
    if (conflicts) { showToast('Project Name atau Project Key sudah digunakan.', 'error'); return; }
    const payload = {
      name,
      key,
      description: data.description ?? editingProject?.description ?? '',
      lead: data.lead ?? editingProject?.lead ?? 'Unassigned',
      status: data.status === 'Completed' ? 'Completed' : 'Active',
      dueDate: data.dueDate?.toISOString() ?? editingProject?.dueDate?.toISOString(),
      externalLink: data.externalLink?.trim() || undefined,
    };
    try {
      const response = editingProject ? await ProjectsService.update(editingProject.id, payload) : await ProjectsService.create(payload);
      const saved = response.data;
      const project: Project = { id: saved.id, name: saved.name, key: saved.key ?? saved.name.slice(0, 4).toUpperCase(), description: saved.description ?? '', lead: saved.lead ?? 'Unassigned', externalLink: saved.externalLink, createdBy: saved.createdBy ?? currentUserLabel, status: saved.status === 'Completed' ? 'Completed' : 'Active', dueDate: saved.dueDate ? new Date(saved.dueDate) : new Date(), updatedAt: saved.updatedAt ? new Date(saved.updatedAt) : new Date(), members: [], stats: { testCasesCount: saved.testCasesCount ?? 0, userFlowsCount: saved.userFlowsCount ?? 0, passRate: 0 } };
      setProjects((current) => editingProject ? current.map((item) => item.id === project.id ? project : item) : [project, ...current]);
      showToast(editingProject ? 'Project details updated successfully.' : 'New project created successfully.');
      setIsProjectFormOpen(false); setEditingProject(null);
    } catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Project gagal disimpan.', 'error'); }
  };

  // --- Derived State ---

  const filteredTestCases = useMemo(() => {
    // Project filtering happens when testCases is loaded; this pipeline handles the table's remaining filters.
    return getVisibleTestCases(testCases, filters, sortConfig, 1, -1);
  }, [testCases, filters, sortConfig]);

  const paginatedTestCases = useMemo(
    () => getVisibleTestCases(testCases, filters, sortConfig, currentPage, itemsPerPage),
    [testCases, filters, sortConfig, currentPage, itemsPerPage],
  );

  const handleToggleSelectAll = () => {
    if (!canManageTestCases) return;
    if (!activeProjectId) return;
    const pageIds = paginatedTestCases.map((tc) => tc.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => scopedSelectedIds.includes(id));

    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const hasProjectSelected = filters.projectId.length > 0;

  const formProjects = projects;
  const activeFolder = activeProjectId && activeFolderScope.folderId
    ? (foldersByProject[activeProjectId] ?? []).find((folder) => folder.id === activeFolderScope.folderId)
    : undefined;
  const activeFolderBreadcrumb = useMemo(() => {
    if (!activeProjectId || !activeFolderScope.folderId) return '';
    const byId = new Map((foldersByProject[activeProjectId] ?? []).map((folder) => [folder.id, folder]));
    const names: string[] = [];
    for (let current = byId.get(activeFolderScope.folderId); current; current = current.parentId ? byId.get(current.parentId) : undefined) names.unshift(current.name);
    return names.join(' / ');
  }, [activeFolderScope.folderId, activeProjectId, foldersByProject]);
  const folderNavigation = (
    <TestCaseFolderTree
      folders={activeProjectId ? foldersByProject[activeProjectId] ?? [] : []}
      active={activeFolderScope}
      disabled={!activeProjectId || foldersLoading || Boolean(foldersError)}
      expandedFolderIds={activeProjectId ? expandedFolderIdsByProject[activeProjectId] ?? new Set<string>() : new Set<string>()}
      onExpandedFolderIdsChange={(next) => {
        if (!activeProjectId) return;
        setExpandedFolderIdsByProject((current) => ({ ...current, [activeProjectId]: next }));
      }}
      loading={foldersLoading}
      error={foldersError}
      onSelect={(scope) => {
        if (!activeProjectId) return;
        setFolderScopeProjectId(activeProjectId);
        setFolderScope(scope);
        resetBulkSelectionState();
        setCurrentView('test-cases');
        updateWorkspaceQuery({
          view: 'test-cases',
          projectId: activeProjectId,
          folderId: scope.folderId,
          unfiled: scope.unfiled ? '1' : undefined,
          includeSubfolders: scope.folderId && scope.includeSubfolders ? '1' : undefined,
        });
      }}
      onCreate={createFolder}
      onRename={renameFolder}
      onDelete={deleteFolder}
    />
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} testCaseNavigation={folderNavigation} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <main className="relative flex-1 overflow-auto p-8">
          {/* View: Projects (Landing Page) */}
          {currentView === 'projects' && (
            <>
              {projectsError && <div role="alert" className="mx-auto mb-5 max-w-7xl rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{projectsError}</div>}
              <ProjectBoard
                projects={projects}
                onViewTestCases={handleViewTestCases}
                onViewUserFlows={handleViewUserFlows}
                onViewReports={handleViewReports}
                onViewTestRuns={handleViewTestRuns}
                onCreate={handleCreateProject}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
                canManage={sessionUser?.roleSlug.toLowerCase() !== 'viewer'}
              />
              {canManagePendingDeletion && pendingDeletionAvailable && (
                <div className="mt-8">
                  <PendingDeletionProjects
                    busyProjectId={pendingDeletionBusyProjectId}
                    error={pendingDeletionError}
                    loading={pendingDeletionLoading}
                    onPermanentDelete={handlePermanentlyRemovePendingProject}
                    onRestore={handleRestorePendingProject}
                    projects={pendingDeletionProjects}
                    restoreUnavailableProjectIds={restoreUnavailableProjectIds}
                  />
                </div>
              )}
            </>
          )}

          {/* View: Test Cases */}
          {currentView === 'test-cases' && (
            <div className="animate-in fade-in mx-auto w-full max-w-[1920px] space-y-5 duration-300">
              {/* Page Header */}
              <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Test Cases</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage and organize your test repository.
                  </p>
                </div>
                <div className="mt-4 flex gap-3 sm:mt-0">
                  <Button
                    onClick={() => setIsImportOpen(true)}
                    icon={<Upload size={18} />}
                    variant="secondary"
                    disabled={projects.length === 0 && !isLoading}
                  >
                    Import JSON
                  </Button>
                  <Button
                    onClick={handleCreate}
                    icon={<Plus size={18} />}
                    disabled={!hasProjectSelected && !isLoading}
                  >
                    New Case
                  </Button>
                </div>
              </div>

              {/* Stats Legend / Dashboard */}
              <TestCaseStats testCases={testCases} />

              <section aria-label="Test case scope" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-slate-200 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-800">{activeFolderScope.unfiled ? 'Unfiled test cases' : activeFolderScope.folderId ? activeFolderBreadcrumb || 'Folder not found' : 'All test cases'}</h2>
                  {activeFolderScope.folderId && <p className="mt-0.5 text-xs text-slate-500">{activeFolder?.directTestCaseCount ?? 0} direct / {activeFolder?.totalTestCaseCount ?? 0} total</p>}
                  <p className="mt-1 text-xs text-slate-400">Select a folder to scope the list. Search and existing filters still apply.</p>
                </div>
                {activeFolderScope.folderId && (
                  <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
                    <input className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" type="checkbox" checked={activeFolderScope.includeSubfolders} onChange={(event) => {
                      const includeSubfolders = event.target.checked;
                      setFolderScope((scope) => ({ ...scope, includeSubfolders }));
                      updateWorkspaceQuery({ includeSubfolders: includeSubfolders ? '1' : undefined });
                    }} />
                    Include descendant folders
                  </label>
                )}
              </section>

              {/* Filters Bar */}
              <div className="relative z-30 rounded-xl border border-slate-200/60 bg-white/60 p-2 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Primary Filter: Project */}
                  <div>
                    <MultiSelect
                      label="Project"
                      options={projectOptions}
                      selectedValues={filters.projectId}
                      onChange={(vals) => changeProjects(vals)}
                      icon={<Briefcase className="h-3.5 w-3.5" />}
                    />
                  </div>

                  {/* Search Input */}
                  <div className="group relative min-w-[12rem] flex-1">
                    <Search
                      className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${!hasProjectSelected ? 'text-slate-300' : 'group-focus-within:text-brand-500 text-slate-400'}`}
                    />
                    <input
                      type="text"
                      placeholder="Search cases..."
                      className={`w-full rounded-lg border bg-white py-1.5 pl-9 pr-4 text-sm transition-all focus:outline-none focus:ring-2 ${
                        !hasProjectSelected
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 placeholder:text-slate-300'
                          : 'focus:ring-brand-500/20 focus:border-brand-500 border-slate-200 placeholder:text-slate-400'
                      } `}
                      value={filters.search}
                      onChange={(e) => handleSearch(e.target.value)}
                      disabled={!hasProjectSelected}
                    />
                  </div>

                  {/* Secondary Filters */}
                  <MultiSelect
                    label="Section"
                    options={sectionOptions}
                    selectedValues={filters.section}
                    onChange={(vals) => setFilters((prev) => ({ ...prev, section: vals }))}
                    icon={<Filter className="h-3.5 w-3.5" />}
                    disabled={!hasProjectSelected}
                  />

                  <MultiSelect
                    label="Priority"
                    options={priorityOptions}
                    selectedValues={filters.priority}
                    onChange={(vals) =>
                      setFilters((prev) => ({ ...prev, priority: vals as Priority[] }))
                    }
                    icon={<Filter className="h-3.5 w-3.5" />}
                    disabled={!hasProjectSelected}
                  />

                  <MultiSelect
                    label="Status"
                    options={statusOptions}
                    selectedValues={filters.status}
                    onChange={(vals) =>
                      setFilters((prev) => ({ ...prev, status: vals as Status[] }))
                    }
                    icon={<Filter className="h-3.5 w-3.5" />}
                    disabled={!hasProjectSelected}
                  />

                  <MultiSelect
                    label="Testing Type"
                    options={automationOptions}
                    selectedValues={filters.automationType}
                    onChange={(vals) =>
                      setFilters((prev) => ({ ...prev, automationType: vals as AutomationType[] }))
                    }
                    icon={<Zap className="h-3.5 w-3.5" />}
                    disabled={!hasProjectSelected}
                  />

                  <MultiSelect
                    label="Automation Readiness"
                    options={automationReadinessOptions}
                    selectedValues={filters.automationReadiness}
                    onChange={(vals) =>
                      setFilters((prev) => ({ ...prev, automationReadiness: vals as AutomationReadiness[] }))
                    }
                    icon={<Zap className="h-3.5 w-3.5" />}
                    disabled={!hasProjectSelected}
                  />

                  {(filters.section.length > 0 ||
                    filters.priority.length > 0 ||
                    filters.status.length > 0 ||
                    filters.automationType.length > 0 ||
                    filters.automationReadiness.length > 0 ||
                    filters.search) && (
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          search: '',
                          section: [],
                          priority: [],
                          status: [],
                          automationType: [],
                          automationReadiness: [],
                        }))
                      }
                      className="text-brand-600 hover:text-brand-800 hover:bg-brand-50 ml-2 rounded px-2 py-1 text-xs font-medium transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                {canManageTestCases && scopedSelectedIds.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-right-5 mt-2 flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 py-1.5 pl-3 pr-2 shadow-sm duration-200">
                    <span className="text-brand-800 mr-1 text-xs font-semibold">
                      {scopedSelectedIds.length} Selected
                    </span>
                    <div className="bg-brand-200 mx-1 h-4 w-px"></div>

                    {/* Bulk Actions with CTA */}
                    <div className="flex flex-wrap items-center gap-2">
                      {activeProjectId && (
                        <div className="w-32" aria-busy={isBulkMoving}>
                          <Select
                            placeholder={isBulkMoving ? 'Moving…' : 'Move to…'}
                            value={bulkMoveDestination}
                            options={bulkMoveOptions}
                            disabled={isBulkMoving || isBulkUpdating}
                            onChange={(value) => {
                              const destination = String(value);
                              setBulkMoveDestination('');
                              requestMove(destination === '__unfiled__' ? null : destination);
                            }}
                            className="w-full text-xs"
                          />
                          {isBulkMoving && <span className="sr-only" role="status">Moving selected test cases</span>}
                        </div>
                      )}
                      <div className="w-32">
                        <Select
                          placeholder="Set Status"
                          value={bulkStatus}
                          options={statusOptions}
                          disabled={isBulkMoving || isBulkUpdating}
                          onChange={(val) => setBulkStatus(val as Status)}
                          className="w-full text-xs"
                        />
                      </div>
                      <div className="w-32">
                        <Select
                          placeholder="Set Priority"
                          value={bulkPriority}
                          options={priorityOptions}
                          disabled={isBulkMoving || isBulkUpdating}
                          onChange={(val) => setBulkPriority(val as Priority)}
                          className="w-full text-xs"
                        />
                      </div>
                      {activeProjectId && (
                        <div className="w-32">
                          <Select
                            placeholder="Set Section"
                            value={bulkSectionId}
                            options={bulkSectionOptions}
                            disabled={isBulkMoving || isBulkUpdating}
                            onOpen={refreshBulkSections}
                            onChange={(val) => setBulkSectionId(String(val))}
                            className="w-full text-xs"
                          />
                        </div>
                      )}
                      <div className="w-36">
                        <Select
                          placeholder="Set Testing Type"
                          value={bulkTestingType}
                          options={automationOptions}
                          disabled={isBulkMoving || isBulkUpdating}
                          onChange={(val) => setBulkTestingType(val as AutomationType)}
                          className="w-full text-xs"
                        />
                      </div>
                      <div className="w-40">
                        <Select
                          placeholder="Set Automation Readiness"
                          value={bulkAutomationReadiness}
                          options={automationReadinessOptions}
                          disabled={isBulkMoving || isBulkUpdating}
                          onChange={(val) => setBulkAutomationReadiness(val as AutomationReadiness)}
                          className="w-full text-xs"
                        />
                      </div>

                      {(bulkStatus || bulkPriority || bulkSectionId || bulkTestingType || bulkAutomationReadiness) && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={handleBulkApply}
                            disabled={isBulkMoving || isBulkUpdating}
                            icon={<Check size={14} />}
                            className="ml-1 h-8 px-3"
                          >
                            {isBulkUpdating ? 'Updating…' : 'Update'}
                          </Button>
                          <button
                            onClick={clearBulkActionDraft}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Clear bulk fields"
                            title="Clear bulk fields"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={resetBulkSelectionState}
                      className="rounded-md px-2 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      Unselect All
                    </button>

                    <div className="bg-brand-200 mx-1 h-4 w-px"></div>

                    <button
                      onClick={() => initiateDelete()}
                      aria-label="Delete selected test cases"
                      className="flex items-center gap-1.5 rounded-md p-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                      title="Delete Selected"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Main List */}
              <div className="min-h-[500px]">
                <TestCaseList
                  testCases={paginatedTestCases}
                  projects={projects}
                  selectedIds={scopedSelectedIds}
                  sortField={sortConfig.field}
                  sortOrder={sortConfig.order}
                  onSort={handleSort}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={initiateDelete}
                  onUpdate={(id, updates) => {
                    if ('automationType' in updates || 'automationReadiness' in updates || 'sectionId' in updates) {
                      return performUpdate([id], updates);
                    }
                    requestUpdate([id], updates);
                  }}
                  sectionsByProject={sectionsByProject}
                  loading={isLoading}
                  hasProjectSelected={hasProjectSelected}
                  canManage={canManageTestCases}
                  pagination={{
                    currentPage,
                    totalPages:
                      itemsPerPage === -1 ? 1 : Math.ceil(filteredTestCases.length / itemsPerPage),
                    totalItems: filteredTestCases.length,
                    itemsPerPage,
                    onPageChange: setCurrentPage,
                    onItemsPerPageChange: (val) => {
                      setItemsPerPage(val);
                      setCurrentPage(1);
                    },
                  }}
                />
              </div>
            </div>
          )}

          {currentView === 'user-flows' && <UserFlowsPage canManage={sessionUser?.roleSlug.toLowerCase() !== 'viewer'} projects={projects} projectId={selectedUserFlowProjectId} onProjectChange={setSelectedUserFlowProjectId} onOpenTestRun={(projectId, runId) => { setSelectedTestRunProjectId(projectId); setCurrentView('runs'); updateWorkspaceQuery({ view: 'runs', projectId, runId, executionId: undefined, userFlowId: undefined }); }} />}

          {currentView === 'runs' && <TestRunsPage projects={projects} projectId={selectedTestRunProjectId} runId={queryView === 'runs' ? queryRunId : undefined} executionId={queryView === 'runs' ? queryExecutionId : undefined} returnToReports={query.get('reportReturn') === '1'} onReturnToReports={() => { setCurrentView('reports'); updateWorkspaceQuery({ view: 'reports', runId: undefined, executionId: undefined, reportReturn: undefined }); }} onProjectChange={(projectId) => { setSelectedTestRunProjectId(projectId); updateWorkspaceQuery({ view: 'runs', projectId, runId: undefined, userFlowId: undefined }); }} onRunChange={(runId) => updateWorkspaceQuery({ view: 'runs', projectId: selectedTestRunProjectId || undefined, runId, executionId: undefined, userFlowId: undefined })} onOpenUserFlow={(projectId, userFlowId) => { setSelectedUserFlowProjectId(projectId); setCurrentView('user-flows'); updateWorkspaceQuery({ view: 'user-flows', projectId, userFlowId, runId: undefined, executionId: undefined }); }} />}
          {currentView === 'reports' && <ReportsPage projects={projects} projectId={selectedReportProjectId} filters={reportFilters} onProjectChange={(projectId) => { setSelectedReportProjectId(projectId); updateWorkspaceQuery({ view: 'reports', projectId, runId: undefined }); }} onFiltersChange={(nextFilters) => updateWorkspaceQuery({ view: 'reports', projectId: selectedReportProjectId || undefined, runId: nextFilters.runId, dateFrom: nextFilters.dateFrom, dateTo: nextFilters.dateTo, sectionId: nextFilters.sectionId, folderId: nextFilters.folderId, tag: nextFilters.tag, priority: nextFilters.priority, automationType: nextFilters.automationType, assigneeId: nextFilters.assigneeId, result: nextFilters.result, userFlowId: nextFilters.userFlowId })} onOpenTestRun={(runId) => { setSelectedTestRunProjectId(selectedReportProjectId); setCurrentView('runs'); updateWorkspaceQuery({ view: 'runs', projectId: selectedReportProjectId, runId, executionId: undefined, reportReturn: '1' }); }} onOpenExecution={(runId, executionId) => { setSelectedTestRunProjectId(selectedReportProjectId); setCurrentView('runs'); updateWorkspaceQuery({ view: 'runs', projectId: selectedReportProjectId, runId, executionId, reportReturn: '1' }); }} />}
          {currentView === 'team' && <TeamPage onManageAssignments={() => setCurrentView('settings')} />}
          {currentView === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modals */}
      <TestCaseForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={editingCase}
        projects={formProjects}
        sectionsByProject={sectionsByProject}
        onProjectChange={refreshSectionsForProject}
        onNotify={showToast}
        preselectedProjectId={filters.projectId[0]}
      />

      <TestCaseImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
        projects={projects}
        sectionsByProject={Object.fromEntries(Object.entries(sectionsByProject).map(([projectId, sections]) => [projectId, sections.map((section) => section.name)]))}
        preselectedProjectId={filters.projectId[0]}
      />

      <TestCaseDetail
        onClose={() => setViewingCase(null)}
        onEdit={handleEdit}
        onNotify={showToast}
        project={projects.find((project) => project.id === viewingCase?.projectId)}
        testCase={viewingCase}
      />

      <ProjectForm
        isOpen={isProjectFormOpen}
        onClose={() => setIsProjectFormOpen(false)}
        onSave={handleSaveProject}
        initialData={editingProject}
        createdBy={currentUserLabel}
      />

      <PromptModal
        key={`${folderPrompt?.mode ?? 'closed'}-${folderPrompt?.folder?.id ?? folderPrompt?.parentId ?? 'root'}`}
        isOpen={Boolean(folderPrompt)}
        title={folderPrompt?.mode === 'rename' ? 'Rename folder' : 'Create Folder'}
        label="Folder name"
        initialValue={folderPrompt?.folder?.name ?? ''}
        submitLabel={folderPrompt?.mode === 'rename' ? 'Save changes' : 'Create Folder'}
        isSubmitting={folderPromptBusy}
        error={folderPromptError}
        onSubmit={(name) => void submitFolderPrompt(name)}
        onClose={() => { if (!folderPromptBusy) setFolderPrompt(null); }}
      />

      {folderDeleteDialog && (
        <div role="dialog" aria-modal="true" aria-labelledby="folder-delete-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 id="folder-delete-title" className="text-lg font-bold">Delete folder “{folderDeleteDialog.folder.name}”</h2>
            <p className="mt-2 text-sm text-slate-600">This folder has {folderDeleteDialog.impact.directTestCaseCount ?? 0} direct test case(s), {folderDeleteDialog.impact.directChildFolderCount ?? 0} child folder(s), and {folderDeleteDialog.impact.descendantFolderCount ?? 0} descendant folder(s) containing {folderDeleteDialog.impact.totalTestCaseCount ?? 0} test case(s). Every delete is transactional.</p>
            {(folderDeleteDialog.impact.externalReferences?.referenceCount ?? 0) > 0 && <div role="alert" className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-800"><p>{folderDeleteDialog.impact.externalReferences?.referenceCount} reusable-precondition reference(s) outside this subtree may block permanent deletion. Remove or replace those links first.</p><ul className="mt-1 list-disc pl-5">{folderDeleteDialog.impact.externalReferences?.references.map((reference) => <li key={`${reference.sourceId}-${reference.consumerId}`}>{reference.sourceTitle ?? 'Source test case'} → {reference.consumerTitle ?? 'Dependent test case'}</li>)}</ul></div>}
            <fieldset className="mt-4 space-y-2"><legend className="text-sm font-semibold">Delete strategy</legend>
              <label className="flex gap-2 text-sm"><input type="radio" checked={folderDeleteStrategy === 'MOVE_TO_PARENT'} onChange={() => setFolderDeleteStrategy('MOVE_TO_PARENT')} /> Move direct test cases and child folders to the parent</label>
              <label className="flex gap-2 text-sm"><input type="radio" checked={folderDeleteStrategy === 'MOVE_TEST_CASES_TO_UNFILED'} onChange={() => setFolderDeleteStrategy('MOVE_TEST_CASES_TO_UNFILED')} /> Move direct test cases to Unfiled; move child folders to the parent</label>
              <label className="flex gap-2 text-sm text-red-700"><input type="radio" checked={folderDeleteStrategy === 'DELETE_ALL'} onChange={() => setFolderDeleteStrategy('DELETE_ALL')} /> Permanently delete the folder subtree and contained test cases</label>
            </fieldset>
            <label className="mt-4 block text-sm font-semibold">Type <span className="font-mono">DELETE</span> to confirm<input autoFocus value={folderDeleteConfirmation} onChange={(event) => setFolderDeleteConfirmation(event.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 font-mono" /></label>
            <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setFolderDeleteDialog(null)} disabled={folderDeleteBusy}>Cancel</Button><Button variant="danger" onClick={() => void confirmFolderDelete()} disabled={folderDeleteConfirmation !== 'DELETE' || folderDeleteBusy}>{folderDeleteBusy ? 'Deleting…' : 'Delete folder'}</Button></div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default App;
