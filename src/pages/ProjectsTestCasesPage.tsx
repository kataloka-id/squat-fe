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
import { ProjectForm } from '@/src/components/projectsTestCases/ProjectForm.tsx';
import { UnderDevelopment } from '@/src/components/projectsTestCases/UnderDevelopment.tsx';
import { UserFlowsPage } from '@/src/components/userFlows/UserFlowsPage.tsx';
import { ConfirmationModal } from '@/src/components/projectsTestCases/ui/ConfirmationModal.tsx';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import { MultiSelect } from '@/src/components/projectsTestCases/ui/MultiSelect.tsx';
import { Select } from '@/src/components/projectsTestCases/ui/Select.tsx';
import { Toast,ToastType } from '@/src/components/projectsTestCases/ui/Toast.tsx';
import { SettingsPage } from '@/src/components/settings/SettingsPage.tsx';
import { TeamPage } from '@/src/components/team/TeamPage.tsx';
import { ProjectsService } from '@/src/api/projects.service.ts';
import type { FolderDeleteImpact, ProjectAssignmentRecord, ProjectTestCaseRecord, SectionRecord, TestCaseFolderRecord } from '@/src/types/api.ts';
import { useSessionUser } from '@/src/auth/SessionContext.tsx';
import { isCurrentProjectRequest } from '@/src/utils/projectStats.ts';
import { getVisibleTestCases } from '@/src/utils/testCaseSorting.ts';
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
  stats: { testCasesCount: project.testCasesCount ?? 0, userFlowsCount: project.userFlowsCount ?? 0, passRate: 0 },
});

const toTestCase = (testCase: ProjectTestCaseRecord, projectId: string): TestCase => ({
  id: testCase.id, tcNumber: testCase.tcNumber, projectKey: testCase.projectKey, title: testCase.title,
  projectId: testCase.projectId ?? projectId, sectionId: testCase.sectionId, section: testCase.section ?? 'Uncategorized', folderId: testCase.folderId, folderPath: testCase.folderPath,
  priority: Object.values(Priority).includes(testCase.priority as Priority) ? testCase.priority as Priority : Priority.Medium,
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
  >('projects');

  // --- Data State ---
  // Projects always begin empty and are populated only from the scoped API;
  // this avoids a transient render of a global/mock collection for non-admins.
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [authorizedProjectIds, setAuthorizedProjectIds] = useState<string[] | null>(null);
  const projectRequestVersion = useRef(0);
  // User Flows does not own this selection so navigation between workspace views
  // preserves it without introducing another global state mechanism.
  const [selectedUserFlowProjectId, setSelectedUserFlowProjectId] = useState('');

  // Displayed Test Cases (Filtered View)
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [sectionsByProject, setSectionsByProject] = useState<Record<string, SectionRecord[]>>({});
  const [foldersByProject, setFoldersByProject] = useState<Record<string, TestCaseFolderRecord[]>>({});
  const [folderScope, setFolderScope] = useState<FolderScope>(emptyFolderScope);
  // A scope is owned by the project from which it was selected.  Keeping that
  // ownership separate makes a project switch safe even while React batches state updates.
  const [folderScopeProjectId, setFolderScopeProjectId] = useState<string>();
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersError, setFoldersError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // --- Bulk Action State ---
  const [bulkStatus, setBulkStatus] = useState<Status | ''>('');
  const [bulkPriority, setBulkPriority] = useState<Priority | ''>('');
  const [bulkMoveDestination, setBulkMoveDestination] = useState('');
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // --- Toast State ---
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

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
    if (!deepLinkedFolderId) return;
    const next = new URLSearchParams(location.search);
    next.delete('folderId');
    navigate({ pathname: location.pathname, search: next.toString() ? `?${next.toString()}` : '' }, { replace: true });
  }, [deepLinkedFolderId, location.pathname, location.search, navigate]);

  const resetFolderScope = useCallback((clearQuery = false) => {
    // Clear ownership synchronously with the scope so a new project can never
    // issue a request using a folder selected in the previous project.
    setFolderScopeProjectId(undefined);
    setFolderScope(emptyFolderScope);
    setExpandedFolderIds(new Set());
    if (clearQuery) clearFolderQuery();
  }, [clearFolderQuery]);

  const changeProjects = useCallback((projectIds: string[], preserveFolderQuery = false) => {
    resetFolderScope(!preserveFolderQuery);
    setFilters((current) => ({ ...current, projectId: projectIds }));
  }, [resetFolderScope]);

  // --- Handlers ---

  const handleNavigate = (view: string) => {
    if (view !== 'test-cases') resetFolderScope(true);
    setCurrentView(view as any);
  };

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

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

  // Linked-precondition source actions open a focused, independent workspace tab.
  // The project remains server-authorized when its test-case list is fetched.
  useEffect(() => {
    if (!deepLinkedProjectId || !projects.some((project) => project.id === deepLinkedProjectId)) return;
    if (filters.projectId[0] !== deepLinkedProjectId) changeProjects([deepLinkedProjectId], true);
    setCurrentView('test-cases');
  }, [changeProjects, deepLinkedProjectId, filters.projectId, projects]);

  // The API scopes each project's catalog to the signed-in user's assignment.
  useEffect(() => {
    let active = true;
    if (projects.length === 0) {
      setSectionsByProject({});
      return () => { active = false; };
    }
    void Promise.all(projects.map(async (project) => [project.id, (await ProjectsService.listSections(project.id)).data] as const))
      .then((entries) => { if (active) setSectionsByProject(Object.fromEntries(entries)); })
      .catch((error) => { if (active) showToast(error?.message ?? 'Katalog Section tidak dapat dimuat.', 'error'); });
    return () => { active = false; };
  }, [projects]);

  const refreshSectionsForProject = useCallback(async (projectId: string) => {
    const response = await ProjectsService.listSections(projectId, { force: true });
    setSectionsByProject((current) => ({ ...current, [projectId]: response.data }));
    return response.data;
  }, []);

  useEffect(() => {
    const refreshCatalog = () => {
      if (!projects.length) return;
      void Promise.all(projects.map(async (project) => [project.id, (await ProjectsService.listSections(project.id, { force: true })).data] as const))
        .then((entries) => setSectionsByProject(Object.fromEntries(entries)))
        .catch((error) => showToast(error?.message ?? 'Katalog Section tidak dapat dimuat.', 'error'));
    };
    window.addEventListener('sections-catalog-updated', refreshCatalog);
    return () => window.removeEventListener('sections-catalog-updated', refreshCatalog);
  }, [projects]);

  const handleViewTestCases = (projectId: string) => {
    // Switch to test cases and filter by this project
    changeProjects([projectId]);
    setCurrentView('test-cases');
  };

  const handleViewUserFlows = (projectId: string) => {
    setSelectedUserFlowProjectId(projectId);
    setCurrentView('user-flows');
  };

  const handleViewTestRuns = (projectId: string) => {
    // In a real app we might filter runs by this project ID
    // setFilters(prev => ({ ...prev, projectId: [projectId] }));
    setCurrentView('runs');
  };

  const handleViewReports = (projectId: string) => {
    // Switch to reports view (which is under development, but simulates the flow)
    setCurrentView('reports');
  };

  // Test cases are fetched per selected project. The API authorizes this
  // server-side, so a client cannot obtain other projects by changing a filter.
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      // If no project selected, clear table
      if (filters.projectId.length === 0) {
        if (active) setTestCases([]);
        return;
      }

      setIsLoading(true);
      try {
        const responses = await Promise.all(filters.projectId.map((projectId) => filters.projectId.length === 1 ? ProjectsService.listTestCasesInFolder(projectId, activeFolderScope) : ProjectsService.listTestCases(projectId)));
        const projectData = responses.flatMap((response, index) => response.data.map((testCase: ProjectTestCaseRecord) => toTestCase(testCase, filters.projectId[index])));
        if (active) {
          setTestCases(projectData);
          const deepLinkedCase = deepLinkedTestCaseId ? projectData.find((testCase) => testCase.id === deepLinkedTestCaseId) : undefined;
          if (deepLinkedCase) setViewingCase(deepLinkedCase);
        }
      } catch (error) {
        if (active) { setTestCases([]); showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Test cases tidak dapat dimuat.', 'error'); }
      } finally { if (active) setIsLoading(false); }
    };

    void loadData();
    return () => { active = false; };
  }, [activeFolderScope, filters.projectId]);

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
    // A checkbox can only select an item rendered for the active project/folder scope.
    if (filters.projectId.length !== 1 || !testCases.some((testCase) => testCase.id === id)) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Selection is intentionally local to the Test Cases workspace and its project/folder scope.
  // This prevents a stale selection being applied after navigation or a catalog switch.
  useEffect(() => {
    setSelectedIds([]);
    setBulkStatus('');
    setBulkPriority('');
    setBulkMoveDestination('');
  }, [activeFolderScope.folderId, activeFolderScope.includeSubfolders, activeFolderScope.unfiled, currentView, filters.projectId]);

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
      setFolderScope({ folderId: deepLinkedFolderId, includeSubfolders: false });
      return;
    }
    resetFolderScope(true);
  }, [activeProjectId, deepLinkedFolderId, foldersByProject, resetFolderScope]);
  const createFolder = async (parentId?: string | null) => {
    if (!activeProjectId) return; const name = window.prompt('Folder name'); if (!name?.trim()) return;
    try { await ProjectsService.createTestCaseFolder(activeProjectId, { name: name.trim(), parentId }); await refreshFolders(activeProjectId); showToast('Folder created.'); }
    catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Folder gagal dibuat.', 'error'); }
  };
  const renameFolder = async (folder: TestCaseFolderRecord) => {
    if (!activeProjectId) return; const name = window.prompt('Rename folder', folder.name); if (!name?.trim() || name.trim() === folder.name) return;
    try { await ProjectsService.updateTestCaseFolder(activeProjectId, folder.id, { name: name.trim() }); await refreshFolders(activeProjectId); showToast('Folder renamed.'); }
    catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Folder gagal diubah.', 'error'); }
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
      if (activeFolderScope.folderId && !remainingFolders.some((item) => item.id === activeFolderScope.folderId)) resetFolderScope(true);
      setFolderDeleteDialog(null);
      showToast('Folder deleted.');
    }
    catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Folder tidak dapat dihapus. Konflik atau reusable precondition eksternal tidak mengubah data.', 'error'); }
    finally { setFolderDeleteBusy(false); }
  };
  const moveSelected = async (folderId: string | null) => {
    const scopedIds = scopedSelectedIds.filter((id) => testCases.some((testCase) => testCase.id === id && testCase.projectId === activeProjectId));
    if (isBulkMoving || !activeProjectId || !scopedIds.length) return;
    setIsBulkMoving(true);
    try { await ProjectsService.bulkMoveTestCases(activeProjectId, { testCaseIds: scopedIds, destinationFolderId: folderId }); setSelectedIds([]); setFolderScope((value) => ({ ...value })); await refreshFolders(activeProjectId); showToast('Test cases moved.'); }
    catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Bulk move gagal; tidak ada test case yang dipindahkan.', 'error'); }
    finally { setIsBulkMoving(false); }
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
    try {
      await Promise.all(ids.map(async (id) => {
        const current = testCases.find((testCase) => testCase.id === id);
        if (!current) return;
        const response = await ProjectsService.updateTestCase(current.projectId, id, { ...current, ...updates, description: updates.description ?? current.description ?? null, preconditions: updates.preconditions ?? current.preconditions ?? null, mainExpectedResult: updates.mainExpectedResult ?? current.mainExpectedResult ?? null });
        const saved = response.data;
        setTestCases((items) => items.map((item) => item.id === id ? { ...item, ...toTestCase(saved, current.projectId) } : item));
      }));
      setBulkStatus(''); setBulkPriority('');
      showToast(ids.length === 1 ? 'Test case updated successfully.' : `Updated ${ids.length} test cases successfully.`);
      return true;
    } catch (error) {
      showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Test case gagal diperbarui.', 'error');
      return false;
    }
  };

  // Initiates update with Confirmation Modal
  const requestUpdate = (ids: string[], updates: Partial<TestCase>) => {
    const isBulk = ids.length > 1;

    // Create a readable list of changes
    const changesList = Object.entries(updates)
      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} to "${v}"`)
      .join(', ');

    setConfirmState({
      isOpen: true,
      title: isBulk ? 'Bulk Update' : 'Update Test Case',
      message: isBulk
        ? `Are you sure you want to update ${ids.length} selected test cases? This will set ${changesList}.`
        : `Are you sure you want to update this test case? This will set ${changesList}.`,
      variant: 'primary',
      confirmLabel: 'Update',
      onConfirm: () => { void performUpdate(ids, updates); },
    });
  };

  const handleBulkApply = () => {
    const updates: Partial<TestCase> = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkPriority) updates.priority = bulkPriority;

    if (Object.keys(updates).length > 0) {
      requestUpdate(scopedSelectedIds, updates);
    }
  };

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
        priority: data.priority ?? editingCase?.priority ?? Priority.Medium, status: data.status ?? editingCase?.status ?? Status.Draft,
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
      title: 'Delete Project',
      message:
        'Are you sure you want to delete this project? This will also remove all associated test cases, test runs, and reports. This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete Project',
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
        showToast('Project and associated data deleted successfully.');
        } catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Project gagal dihapus.', 'error'); }
        finally { setConfirmState((prev) => ({ ...prev, isOpen: false })); }
      })();
      },
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
      expandedFolderIds={expandedFolderIds}
      onExpandedFolderIdsChange={setExpandedFolderIds}
      loading={foldersLoading}
      error={foldersError}
      onSelect={(scope) => { setFolderScopeProjectId(activeProjectId); setFolderScope(scope); setSelectedIds([]); }}
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
              />
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
                    <input className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" type="checkbox" checked={activeFolderScope.includeSubfolders} onChange={(event) => setFolderScope((scope) => ({ ...scope, includeSubfolders: event.target.checked }))} />
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

                {scopedSelectedIds.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-right-5 mt-2 flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 py-1.5 pl-3 pr-2 shadow-sm duration-200">
                    <span className="text-brand-800 mr-1 text-xs font-semibold">
                      {scopedSelectedIds.length} Selected
                    </span>
                    <div className="bg-brand-200 mx-1 h-4 w-px"></div>

                    {/* Bulk Actions with CTA */}
                    <div className="flex items-center gap-2">
                      {activeProjectId && (
                        <div className="w-32" aria-busy={isBulkMoving}>
                          <Select
                            placeholder={isBulkMoving ? 'Moving…' : 'Move to…'}
                            value={bulkMoveDestination}
                            options={bulkMoveOptions}
                            disabled={isBulkMoving}
                            onChange={(value) => {
                              const destination = String(value);
                              setBulkMoveDestination('');
                              void moveSelected(destination === '__unfiled__' ? null : destination);
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
                          onChange={(val) => setBulkStatus(val as Status)}
                          className="w-full text-xs"
                        />
                      </div>
                      <div className="w-32">
                        <Select
                          placeholder="Set Priority"
                          value={bulkPriority}
                          options={priorityOptions}
                          onChange={(val) => setBulkPriority(val as Priority)}
                          className="w-full text-xs"
                        />
                      </div>

                      {(bulkStatus || bulkPriority) && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={handleBulkApply}
                            icon={<Check size={14} />}
                            className="ml-1 h-8 px-3"
                          >
                            Update
                          </Button>
                          <button
                            onClick={() => {
                              setBulkStatus('');
                              setBulkPriority('');
                            }}
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
                      onClick={() => setSelectedIds([])}
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
                    if ('automationType' in updates || 'automationReadiness' in updates) {
                      return performUpdate([id], updates);
                    }
                    requestUpdate([id], updates);
                  }}
                  loading={isLoading}
                  hasProjectSelected={hasProjectSelected}
                  canManage
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

          {currentView === 'user-flows' && <UserFlowsPage projects={projects} projectId={selectedUserFlowProjectId} onProjectChange={setSelectedUserFlowProjectId} />}

          {/* Under Development Views */}
          {['runs', 'reports'].includes(currentView) && <UnderDevelopment />}
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

      {folderDeleteDialog && (
        <div role="dialog" aria-modal="true" aria-labelledby="folder-delete-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 id="folder-delete-title" className="text-lg font-bold">Delete folder “{folderDeleteDialog.folder.name}”</h2>
            <p className="mt-2 text-sm text-slate-600">This folder has {folderDeleteDialog.impact.directTestCaseCount ?? 0} direct test case(s), {folderDeleteDialog.impact.directChildFolderCount ?? 0} child folder(s), and {folderDeleteDialog.impact.descendantFolderCount ?? 0} descendant folder(s) containing {folderDeleteDialog.impact.totalTestCaseCount ?? 0} test case(s). Every delete is transactional.</p>
            {(folderDeleteDialog.impact.externalReferences?.referenceCount ?? 0) > 0 && <div role="alert" className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-800"><p>{folderDeleteDialog.impact.externalReferences?.referenceCount} reusable-precondition reference(s) outside this subtree may block permanent deletion. Remove or replace those links first.</p><ul className="mt-1 list-disc pl-5">{folderDeleteDialog.impact.externalReferences?.references.map((reference) => <li key={`${reference.sourceId}-${reference.consumerId}`}>{reference.sourceTitle ?? reference.sourceId} → {reference.consumerTitle ?? reference.consumerId}</li>)}</ul></div>}
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
