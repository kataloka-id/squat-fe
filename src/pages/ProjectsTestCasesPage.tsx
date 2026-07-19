import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from '@/src/components/projectsTestCases/Layout/Sidebar.tsx';
import { TestCaseList } from '@/src/components/projectsTestCases/TestCaseList.tsx';
import { TestCaseForm } from '@/src/components/projectsTestCases/TestCaseForm.tsx';
import { TestCaseStats } from '@/src/components/projectsTestCases/TestCaseStats.tsx';
import { ProjectBoard } from '@/src/components/projectsTestCases/ProjectBoard.tsx';
import { ProjectForm } from '@/src/components/projectsTestCases/ProjectForm.tsx';
import { UnderDevelopment } from '@/src/components/projectsTestCases/UnderDevelopment.tsx';
import { ConfirmationModal } from '@/src/components/projectsTestCases/ui/ConfirmationModal.tsx';
import { Button } from '@/src/components/projectsTestCases/ui/Button.tsx';
import { MultiSelect } from '@/src/components/projectsTestCases/ui/MultiSelect.tsx';
import { Select } from '@/src/components/projectsTestCases/ui/Select.tsx';
import { Toast,ToastType } from '@/src/components/projectsTestCases/ui/Toast.tsx';
import { SettingsPage } from '@/src/components/settings/SettingsPage.tsx';
import { TeamPage } from '@/src/components/team/TeamPage.tsx';
import { ProjectsService } from '@/src/api/projects.service.ts';
import type { ProjectAssignmentRecord, ProjectTestCaseRecord } from '@/src/types/api.ts';
import { useSessionUser } from '@/src/auth/SessionContext.tsx';
import { isCurrentProjectRequest } from '@/src/utils/projectStats.ts';
import { Plus, Filter, Trash2, Search, Briefcase, Zap, Check, X } from 'lucide-react';
import {
  TestCase,
  FilterState,
  SortField,
  SortOrder,
  Priority,
  Status,
  AutomationType,
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
  stats: { testCasesCount: project.testCasesCount ?? 0, passRate: 0 },
});

const App: React.FC = () => {
  const sessionUser = useSessionUser();
  const currentUserLabel = sessionUser?.username || sessionUser?.email || 'Current user';
  // --- View State ---
  // Default landing page is now 'projects'
  const [currentView, setCurrentView] = useState<
    'projects' | 'test-cases' | 'runs' | 'reports' | 'team' | 'settings'
  >('projects');

  // --- Data State ---
  // Projects always begin empty and are populated only from the scoped API;
  // this avoids a transient render of a global/mock collection for non-admins.
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const projectRequestVersion = useRef(0);

  // Displayed Test Cases (Filtered View)
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [sectionsByProject, setSectionsByProject] = useState<Record<string, string[]>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // --- Bulk Action State ---
  const [bulkStatus, setBulkStatus] = useState<Status | ''>('');
  const [bulkPriority, setBulkPriority] = useState<Priority | ''>('');

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
      setProjectsError(null);
    } catch (error) {
      if (!isCurrentProjectRequest(requestVersion, projectRequestVersion.current)) return;
      setProjects([]);
      setProjectsError(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Project tidak dapat dimuat.');
    }
  }, []);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);

  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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
  });
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
  const sections = useMemo(() => Array.from(new Set(Object.values(sectionsByProject).flat())).sort(), [sectionsByProject]);
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

  // --- Handlers ---

  const handleNavigate = (view: string) => {
    setCurrentView(view as any);
  };

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  // The API scopes each project's catalog to the signed-in user's
  // assignment. Fetch all assigned projects so changing the form's Project
  // selector never exposes an unapproved or stale free-text section.
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
    setFilters((prev) => ({ ...prev, projectId: [projectId] }));
    setCurrentView('test-cases');
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
        const responses = await Promise.all(filters.projectId.map((projectId) => ProjectsService.listTestCases(projectId)));
        const projectData = responses.flatMap((response, index) => response.data.map((testCase: ProjectTestCaseRecord): TestCase => ({
          id: testCase.id, tcNumber: testCase.tcNumber, projectKey: testCase.projectKey, title: testCase.title, projectId: testCase.projectId ?? filters.projectId[index], section: testCase.section ?? 'Uncategorized',
          priority: Object.values(Priority).includes(testCase.priority as Priority) ? testCase.priority as Priority : Priority.Medium,
          status: Object.values(Status).includes(testCase.status as Status) ? testCase.status as Status : Status.Draft,
          automationType: Object.values(AutomationType).includes(testCase.automationType as AutomationType) ? testCase.automationType as AutomationType : AutomationType.Manual,
          steps: testCase.steps ?? [], tags: testCase.tags ?? [], updatedAt: testCase.updatedAt ? new Date(testCase.updatedAt) : new Date(), createdBy: testCase.createdBy ?? '—', preconditions: testCase.preconditions,
        })));
        if (active) setTestCases(projectData);
      } catch (error) {
        if (active) { setTestCases([]); showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Test cases tidak dapat dimuat.', 'error'); }
      } finally { if (active) setIsLoading(false); }
    };

    void loadData();
    return () => { active = false; };
  }, [filters.projectId]);

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
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig, itemsPerPage]);

  // CRUD Operations - Test Cases

  const handleCreate = () => {
    setEditingCase(null);
    setIsFormOpen(true);
  };

  const handleEdit = (tc: TestCase) => {
    setEditingCase(tc);
    setIsFormOpen(true);
  };

  // Executes the actual update state change (called after confirmation)
  const performUpdate = async (ids: string[], updates: Partial<TestCase>) => {
    try {
      await Promise.all(ids.map(async (id) => {
        const current = testCases.find((testCase) => testCase.id === id);
        if (!current) return;
        const response = await ProjectsService.updateTestCase(current.projectId, id, { ...current, ...updates, preconditions: updates.preconditions ?? current.preconditions ?? null });
        const saved = response.data;
        setTestCases((items) => items.map((item) => item.id === id ? { ...item, ...saved, projectId: saved.projectId ?? current.projectId, priority: saved.priority as Priority, status: saved.status as Status, automationType: saved.automationType as AutomationType, preconditions: saved.preconditions ?? undefined, updatedAt: saved.updatedAt ? new Date(saved.updatedAt) : new Date() } : item));
      }));
      setBulkStatus(''); setBulkPriority('');
      showToast(ids.length === 1 ? 'Test case updated successfully.' : `Updated ${ids.length} test cases successfully.`);
    } catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Test case gagal diperbarui.', 'error'); }
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
      requestUpdate(selectedIds, updates);
    }
  };

  const handleSave = async (data: Partial<TestCase>) => {
    const projectId = editingCase?.projectId ?? data.projectId ?? filters.projectId[0];
    if (!projectId) { showToast('Pilih project terlebih dahulu.', 'error'); return; }
    try {
      const payload = {
        title: data.title ?? editingCase?.title ?? 'Untitled', section: data.section ?? editingCase?.section ?? 'Uncategorized',
        priority: data.priority ?? editingCase?.priority ?? Priority.Medium, status: data.status ?? editingCase?.status ?? Status.Draft,
        automationType: data.automationType ?? editingCase?.automationType ?? AutomationType.Manual,
        preconditions: data.preconditions ?? editingCase?.preconditions ?? null, steps: data.steps ?? editingCase?.steps ?? [], tags: data.tags ?? editingCase?.tags ?? [],
      };
      const response = editingCase
        ? await ProjectsService.updateTestCase(projectId, editingCase.id, payload)
        : await ProjectsService.createTestCase(projectId, payload);
      const saved = response.data;
      const testCase: TestCase = { id: saved.id, tcNumber: saved.tcNumber, projectKey: saved.projectKey, title: saved.title, projectId: saved.projectId ?? projectId, section: saved.section, priority: saved.priority as Priority, status: saved.status as Status, automationType: saved.automationType as AutomationType, steps: saved.steps, tags: saved.tags, createdBy: saved.createdBy ?? '—', updatedAt: saved.updatedAt ? new Date(saved.updatedAt) : new Date(), preconditions: saved.preconditions ?? undefined };
      setTestCases((items) => editingCase ? items.map((item) => item.id === testCase.id ? { ...item, ...testCase } : item) : [testCase, ...items]);
      if (!editingCase) {
        ProjectsService.invalidateList();
        await refreshProjects();
      }
      showToast(editingCase ? 'Test case updated successfully.' : 'New test case created.');
      setIsFormOpen(false); setEditingCase(null);
    } catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Test case gagal disimpan.', 'error'); }
  };

  const initiateDelete = (id?: string) => {
    const targetIds = id ? [id] : selectedIds;
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
      const project: Project = { id: saved.id, name: saved.name, key: saved.key ?? saved.name.slice(0, 4).toUpperCase(), description: saved.description ?? '', lead: saved.lead ?? 'Unassigned', externalLink: saved.externalLink, createdBy: saved.createdBy ?? currentUserLabel, status: saved.status === 'Completed' ? 'Completed' : 'Active', dueDate: saved.dueDate ? new Date(saved.dueDate) : new Date(), updatedAt: saved.updatedAt ? new Date(saved.updatedAt) : new Date(), members: [], stats: { testCasesCount: 0, passRate: 0 } };
      setProjects((current) => editingProject ? current.map((item) => item.id === project.id ? project : item) : [project, ...current]);
      showToast(editingProject ? 'Project details updated successfully.' : 'New project created successfully.');
      setIsProjectFormOpen(false); setEditingProject(null);
    } catch (error) { showToast(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Project gagal disimpan.', 'error'); }
  };

  // --- Derived State ---

  const filteredTestCases = useMemo(() => {
    // Start with the displayed set (which is already filtered by project in useEffect)
    let result = [...testCases];

    // Filter by Search, Section, Priority, Status
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (tc) => tc.title.toLowerCase().includes(q) || tc.id.toLowerCase().includes(q),
      );
    }
    // Note: Project ID filtering is handled in useEffect against global state

    if (filters.section.length > 0) {
      result = result.filter((tc) => filters.section.includes(tc.section));
    }
    if (filters.priority.length > 0) {
      result = result.filter((tc) => filters.priority.includes(tc.priority));
    }
    if (filters.status.length > 0) {
      result = result.filter((tc) => filters.status.includes(tc.status));
    }
    if (filters.automationType.length > 0) {
      result = result.filter((tc) => filters.automationType.includes(tc.automationType));
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortConfig.field];
      let bVal = b[sortConfig.field];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [testCases, filters, sortConfig]);

  const paginatedTestCases = useMemo(() => {
    if (itemsPerPage === -1) {
      return filteredTestCases;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTestCases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTestCases, currentPage, itemsPerPage]);

  const handleToggleSelectAll = () => {
    const pageIds = paginatedTestCases.map((tc) => tc.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const hasProjectSelected = filters.projectId.length > 0;

  const formProjects = projects;

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <main className="relative flex-1 overflow-auto p-8">
          {/* View: Projects (Landing Page) */}
          {currentView === 'projects' && (
            <>
              {projectsError && <div role="alert" className="mx-auto mb-5 max-w-7xl rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{projectsError}</div>}
              <ProjectBoard
                projects={projects}
                onViewTestCases={handleViewTestCases}
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
            <div className="animate-in fade-in mx-auto w-full max-w-[1920px] space-y-6 duration-300">
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

              {/* Filters Bar */}
              <div className="relative z-30 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/60 bg-white/60 p-1.5 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-center gap-2 p-1">
                  {/* Primary Filter: Project */}
                  <div className="mr-2">
                    <MultiSelect
                      label="Project"
                      options={projectOptions}
                      selectedValues={filters.projectId}
                      onChange={(vals) => setFilters((prev) => ({ ...prev, projectId: vals }))}
                      icon={<Briefcase className="h-3.5 w-3.5" />}
                    />
                  </div>

                  <div className="mx-2 h-6 w-px bg-slate-300" />

                  {/* Search Input */}
                  <div className="group relative mr-2">
                    <Search
                      className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${!hasProjectSelected ? 'text-slate-300' : 'group-focus-within:text-brand-500 text-slate-400'}`}
                    />
                    <input
                      type="text"
                      placeholder="Search cases..."
                      className={`w-48 rounded-lg border bg-white py-1.5 pl-9 pr-4 text-sm transition-all focus:outline-none focus:ring-2 lg:w-64 ${
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
                    label="Automation"
                    options={automationOptions}
                    selectedValues={filters.automationType}
                    onChange={(vals) =>
                      setFilters((prev) => ({ ...prev, automationType: vals as AutomationType[] }))
                    }
                    icon={<Zap className="h-3.5 w-3.5" />}
                    disabled={!hasProjectSelected}
                  />

                  {(filters.section.length > 0 ||
                    filters.priority.length > 0 ||
                    filters.status.length > 0 ||
                    filters.automationType.length > 0 ||
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
                        }))
                      }
                      className="text-brand-600 hover:text-brand-800 hover:bg-brand-50 ml-2 rounded px-2 py-1 text-xs font-medium transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                {selectedIds.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-right-5 bg-brand-50 border-brand-100 mr-1 flex items-center gap-2 rounded-lg border py-1.5 pl-3 pr-2 shadow-sm duration-200">
                    <span className="text-brand-800 mr-1 text-xs font-semibold">
                      {selectedIds.length} Selected
                    </span>
                    <div className="bg-brand-200 mx-1 h-4 w-px"></div>

                    {/* Bulk Actions with CTA */}
                    <div className="flex items-center gap-2">
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
                            title="Clear selection"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-brand-200 mx-1 h-4 w-px"></div>

                    <button
                      onClick={() => initiateDelete()}
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
                  selectedIds={selectedIds}
                  sortField={sortConfig.field}
                  sortOrder={sortConfig.order}
                  onSort={handleSort}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                  onEdit={handleEdit}
                  onDelete={initiateDelete}
                  onUpdate={(id, updates) => requestUpdate([id], updates)}
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
        preselectedProjectId={filters.projectId[0]}
      />

      <ProjectForm
        isOpen={isProjectFormOpen}
        onClose={() => setIsProjectFormOpen(false)}
        onSave={handleSaveProject}
        initialData={editingProject}
        createdBy={currentUserLabel}
      />

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
