import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import {
  AutomationType,
  AutomationReadiness,
  Priority,
  Project,
  Status,
  TestCase,
  LinkedPrecondition,
  TestStep,
} from '../projectsTestCases/types.ts';
import { formatTestCaseDisplayId } from '@/src/utils/testCaseDisplayId.ts';
import { MarkdownEditor } from './ui/Markdown.tsx';
import { Attachments } from './Attachments.tsx';
import { ProjectsService } from '@/src/api/projects.service.ts';
import type { ReusableTestCaseRecord, SectionRecord } from '@/src/types/api.ts';
import { removeAttachmentMarkdownReferences } from '@/src/utils/attachmentMarkdown.ts';

interface TestCaseFormProps {
  isOpen: boolean;
  initialData?: TestCase | null;
  projects: Project[];
  sectionsByProject: Record<string, SectionRecord[] | string[]>;
  preselectedProjectId?: string;
  onProjectChange?: (projectId: string) => Promise<SectionRecord[]>;
  onClose: () => void;
  onSave: (
    data: Partial<TestCase>,
    mode: TestCaseSubmitMode,
  ) => Promise<boolean | void> | boolean | void;
  /** The containing page may hide editing actions for read-only project members. */
  canEdit?: boolean;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameters, not runtime bindings.
  onNotify?: (message: string, type: 'success' | 'error') => void;
}

export type TestCaseSubmitMode = 'close' | 'create-another';

const inputClassName =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';
const fieldLabelClassName = 'mb-1.5 block text-sm font-semibold text-slate-700';
const sectionTitleClassName = 'text-sm font-semibold text-slate-900';
const projectSections = (
  sectionsByProject: Record<string, SectionRecord[] | string[]>,
  projectId: string,
): SectionRecord[] =>
  (sectionsByProject[projectId] ?? []).map((section) =>
    typeof section === 'string' ? { id: section, name: section, projectId } : section,
  );

export const TestCaseForm: React.FC<TestCaseFormProps> = ({
  isOpen,
  initialData,
  projects,
  sectionsByProject,
  preselectedProjectId,
  onProjectChange,
  onClose,
  onSave,
  canEdit = true,
  onNotify = () => {},
}) => {
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [submitMode, setSubmitMode] = useState<TestCaseSubmitMode | null>(null);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const sectionRequestVersion = useRef(0);
  const isSubmittingRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const getProjectSections = (projectId: string) => projectSections(sectionsByProject, projectId);
  const selectedInitialProjectId =
    initialData?.projectId ?? preselectedProjectId ?? projects[0]?.id ?? '';
  const initialSections = getProjectSections(selectedInitialProjectId);
  const [formData, setFormData] = useState<Partial<TestCase>>({
    title: '',
    projectId: selectedInitialProjectId,
    sectionId: initialSections[0]?.id || '',
    section: initialSections[0]?.name || '',
    priority: Priority.NotDefined,
    status: Status.Draft,
    automationType: AutomationType.Manual,
    automationReadiness: AutomationReadiness.Candidate,
    preconditions: '',
    steps: [],
    tags: [],
  });
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [stepMoveAnnouncement, setStepMoveAnnouncement] = useState('');
  const [linkedPreconditions, setLinkedPreconditions] = useState<LinkedPrecondition[]>([]);
  const [draggedPreconditionId, setDraggedPreconditionId] = useState<string | null>(null);
  const [preconditionMoveAnnouncement, setPreconditionMoveAnnouncement] = useState('');
  const [isReusableSelectorOpen, setIsReusableSelectorOpen] = useState(false);
  const [reusableSearch, setReusableSearch] = useState('');
  const [reusableCandidates, setReusableCandidates] = useState<ReusableTestCaseRecord[]>([]);
  const [selectedReusableIds, setSelectedReusableIds] = useState<string[]>([]);
  const [isLoadingReusableCases, setIsLoadingReusableCases] = useState(false);
  const [reusableCasesError, setReusableCasesError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      const matchingSection = getProjectSections(initialData.projectId).find(
        (section) => section.id === initialData.sectionId || section.name === initialData.section,
      );
      setFormData({
        ...initialData,
        sectionId: matchingSection?.id ?? initialData.sectionId ?? '',
        section: matchingSection?.name ?? initialData.section,
        automationReadiness: initialData.automationReadiness ?? AutomationReadiness.Candidate,
      });
      setSteps(initialData.steps || []);
      setLinkedPreconditions(
        [...(initialData.linkedPreconditions ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
      );
      return;
    }

    setFormData({
      title: '',
      projectId: selectedInitialProjectId,
      sectionId: getProjectSections(selectedInitialProjectId)[0]?.id || '',
      section: getProjectSections(selectedInitialProjectId)[0]?.name || '',
      priority: Priority.NotDefined,
      status: Status.Draft,
      automationType: AutomationType.Manual,
      automationReadiness: AutomationReadiness.Candidate,
      preconditions: '',
      tags: [],
    });
    setSteps([{ id: Date.now().toString(), action: '', expectedResult: '' }]);
    setLinkedPreconditions([]);
    // Form fields must survive catalog refreshes and project switches.  Only
    // initialize when opening the dialog (or selecting a different record).
  }, [initialData, isOpen, selectedInitialProjectId]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleStepChange = (id: string, field: 'action' | 'expectedResult', value: string) => {
    setSteps((previous) =>
      previous.map((step) => (step.id === id ? { ...step, [field]: value } : step)),
    );
  };

  /** Removes a deleted attachment from every Markdown field in this form draft. */
  const removeDeletedAttachmentReferences = (attachmentId: string) => {
    setFormData((previous) => ({
      ...previous,
      description: removeAttachmentMarkdownReferences(previous.description ?? '', attachmentId),
      preconditions: removeAttachmentMarkdownReferences(previous.preconditions ?? '', attachmentId),
      mainExpectedResult: removeAttachmentMarkdownReferences(
        previous.mainExpectedResult ?? '',
        attachmentId,
      ),
    }));
    setSteps((previous) =>
      previous.map((step) => ({
        ...step,
        action: removeAttachmentMarkdownReferences(step.action, attachmentId),
        expectedResult: removeAttachmentMarkdownReferences(step.expectedResult, attachmentId),
      })),
    );
  };

  const addStep = () => {
    setSteps((previous) => [
      ...previous,
      { id: Date.now().toString(), action: '', expectedResult: '' },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((previous) => previous.filter((step) => step.id !== id));
  };

  const moveStep = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setSteps((previous) => {
      const sourceIndex = previous.findIndex((step) => step.id === sourceId);
      const targetIndex = previous.findIndex((step) => step.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return previous;
      const next = [...previous];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
  };

  const moveStepByOffset = (id: string, offset: -1 | 1) => {
    const currentIndex = steps.findIndex((step) => step.id === id);
    const destinationIndex = currentIndex + offset;
    if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= steps.length) return;
    moveStep(id, steps[destinationIndex].id);
    setStepMoveAnnouncement(`Step moved to position ${destinationIndex + 1}.`);
  };

  const resetForNextTestCase = async () => {
    const projectId = formData.projectId ?? '';
    const sections = getProjectSections(projectId);
    setFormData({
      title: '',
      projectId,
      sectionId: sections[0]?.id ?? '',
      section: sections[0]?.name ?? '',
      priority: Priority.NotDefined,
      status: Status.Draft,
      automationType: AutomationType.Manual,
      automationReadiness: AutomationReadiness.Candidate,
      preconditions: '',
      tags: [],
    });
    setSteps([{ id: Date.now().toString(), action: '', expectedResult: '' }]);
    setLinkedPreconditions([]);
    await loadSectionsForProject(projectId);
    titleInputRef.current?.focus();
  };

  const handleSubmit = async (event: React.FormEvent, mode: TestCaseSubmitMode = 'close') => {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    const selectedSection = availableSections.find((section) => section.id === formData.sectionId)
      ?? (formData.sectionId && formData.section ? { id: formData.sectionId, name: formData.section, projectId: formData.projectId ?? '' } : undefined);
    if (!formData.title?.trim() || isLoadingSections || !selectedSection) return;
    isSubmittingRef.current = true;
    setSubmitMode(mode);
    try {
      const succeeded = await onSave(
        {
          ...formData,
          steps,
          linkedPreconditions: linkedPreconditions.map((link, index) => ({
            testCaseId: link.testCaseId,
            sortOrder: index + 1,
          })),
        },
        mode,
      );
      if (succeeded === false || mode !== 'create-another') return;
      await resetForNextTestCase();
    } finally {
      isSubmittingRef.current = false;
      setSubmitMode(null);
    }
  };

  const moveLinkedPrecondition = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setLinkedPreconditions((previous) => {
      const sourceIndex = previous.findIndex((link) => link.testCaseId === sourceId);
      const targetIndex = previous.findIndex((link) => link.testCaseId === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return previous;
      const next = [...previous];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
  };

  const moveLinkedPreconditionByOffset = (id: string, offset: -1 | 1) => {
    const sourceIndex = linkedPreconditions.findIndex((link) => link.testCaseId === id);
    const targetIndex = sourceIndex + offset;
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= linkedPreconditions.length) return;
    moveLinkedPrecondition(id, linkedPreconditions[targetIndex].testCaseId);
    setPreconditionMoveAnnouncement(`Linked precondition moved to position ${targetIndex + 1}.`);
  };

  const loadReusableCases = async (search = reusableSearch) => {
    const projectId = formData.projectId;
    if (!projectId) return;
    setIsLoadingReusableCases(true);
    setReusableCasesError(null);
    try {
      const response = await ProjectsService.listReusableTestCases(projectId, {
        search: search || undefined,
        excludeTestCaseId: initialData?.id,
      });
      const linkedIds = new Set(linkedPreconditions.map((link) => link.testCaseId));
      setReusableCandidates(
        response.data.filter(
          (testCase) => testCase.id !== initialData?.id && !linkedIds.has(testCase.id),
        ),
      );
    } catch (error) {
      setReusableCasesError(
        error instanceof Error ? error.message : 'Reusable test cases could not be loaded.',
      );
    } finally {
      setIsLoadingReusableCases(false);
    }
  };

  const openReusableSelector = () => {
    setSelectedReusableIds([]);
    setReusableSearch('');
    setIsReusableSelectorOpen(true);
    void loadReusableCases('');
  };

  const addSelectedReusableCases = () => {
    const selected = reusableCandidates.filter((testCase) =>
      selectedReusableIds.includes(testCase.id),
    );
    setLinkedPreconditions((previous) => [
      ...previous,
      ...selected.map((testCase, index) => ({
        testCaseId: testCase.id,
        sortOrder: previous.length + index + 1,
        projectKey: testCase.projectKey,
        tcNumber: testCase.tcNumber,
        title: testCase.title,
        section: testCase.section,
        status: testCase.status as Status,
        automationType: testCase.automationType as AutomationType,
      })),
    ]);
    setIsReusableSelectorOpen(false);
  };

  const availableSections = getProjectSections(formData.projectId ?? '');
  const editingProjectKey = projects.find((project) => project.id === initialData?.projectId)?.key;
  const attachmentContext =
    formData.projectId && initialData?.id
      ? { projectId: formData.projectId, testCaseId: initialData.id }
      : undefined;

  const loadSectionsForProject = async (projectId: string) => {
    const requestVersion = ++sectionRequestVersion.current;
    setIsLoadingSections(true);
    setSectionsError(null);

    try {
      const sections = (await onProjectChange?.(projectId)) ?? getProjectSections(projectId);
      if (requestVersion !== sectionRequestVersion.current) return;
      // The parent shared catalog is the only source of truth. The returned
      // value is used only to select a valid default while its snapshot lands.
      setFormData((previous) =>
        previous.projectId === projectId
          ? { ...previous, sectionId: sections[0]?.id ?? '', section: sections[0]?.name ?? '' }
          : previous,
      );
    } catch (error) {
      if (requestVersion !== sectionRequestVersion.current) return;
      setSectionsError(
        error instanceof Error ? error.message : 'Section catalog could not be loaded.',
      );
    } finally {
      if (requestVersion === sectionRequestVersion.current) setIsLoadingSections(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    // Clear the old project-scoped value before starting the request so it can
    // neither be displayed nor submitted with the newly selected project.
    setFormData((previous) => ({ ...previous, projectId, sectionId: '', section: '' }));
    void loadSectionsForProject(projectId);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        role="presentation"
      >
        <div
          aria-labelledby="test-case-form-title"
          aria-modal="true"
          className="flex h-full w-full max-w-[90rem] flex-col overflow-hidden bg-white shadow-2xl sm:h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border sm:border-slate-200"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="rounded border border-brand-100 bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  {initialData ? 'Update' : 'New'}
                </span>
                <span className="truncate font-mono text-xs text-slate-400">
                  {initialData ? formatTestCaseDisplayId(initialData, editingProjectKey) : 'TC-NEW'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl" id="test-case-form-title">
                {initialData ? 'Edit Test Case' : 'Create Test Case'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Capture the scenario, its configuration, and the expected outcome for each step.
              </p>
            </div>
            <button
              aria-label="Close test case form"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <form
            aria-busy={Boolean(submitMode)}
            className="min-h-0 flex-1 overflow-y-auto"
            id="testCaseForm"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="grid min-h-full bg-slate-50/60 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="min-w-0 space-y-8 bg-white p-5 sm:p-7 lg:border-r lg:border-slate-200">
                <section aria-labelledby="test-case-details-heading">
                  <div className="mb-5">
                    <h3 className={sectionTitleClassName} id="test-case-details-heading">
                      Test case details
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Choose the project and describe the scenario being covered.
                    </p>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className={fieldLabelClassName} htmlFor="test-case-project">
                        Project
                      </label>
                      <Select aria-label="Project" className="mt-1" disabled={Boolean(initialData) || projects.length <= 1} value={formData.projectId ?? ''} onChange={(value) => handleProjectChange(String(value))} options={projects.map((project) => ({ value: project.id, label: `${project.key} — ${project.name}` }))} size="md" />
                      <p className="mt-1.5 text-xs text-slate-400" id="project-assignment-help">
                        Only projects assigned to you are available.
                      </p>
                    </div>

                    <div>
                      <label className={fieldLabelClassName} htmlFor="test-case-title">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        aria-label="Title"
                        className={inputClassName}
                        id="test-case-title"
                        name="title"
                        onChange={handleChange}
                        placeholder="Describe the test scenario..."
                        ref={titleInputRef}
                        required
                        type="text"
                        value={formData.title ?? ''}
                      />
                    </div>

                    <div>
                      <label className={fieldLabelClassName} htmlFor="test-case-description">
                        Description
                      </label>
                      <MarkdownEditor
                        attachmentContext={attachmentContext}
                        id="test-case-description"
                        label="Description"
                        onChange={(description) =>
                          setFormData((previous) => ({ ...previous, description }))
                        }
                        placeholder="Describe the purpose, context, and scope of this test case..."
                        rows={4}
                        value={formData.description ?? ''}
                      />
                      <p className="mt-1.5 text-xs text-slate-500">
                        Provide additional context about what this test case validates.
                      </p>
                    </div>
                  </div>
                </section>

                <section aria-labelledby="test-case-configuration-heading">
                  <div className="mb-5">
                    <h3 className={sectionTitleClassName} id="test-case-configuration-heading">
                      Configuration
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Set how this case is organized, automated, and tracked.
                    </p>
                  </div>
                  <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={fieldLabelClassName} htmlFor="test-case-section">
                          Section
                        </label>
                        <Select aria-label="Section" className="mt-1" disabled={isLoadingSections || (availableSections.length === 0 && !sectionsError)} loading={isLoadingSections} error={sectionsError} onRetry={() => loadSectionsForProject(formData.projectId ?? '')} value={formData.sectionId ?? ''} onChange={(value) => {
                            const selected = availableSections.find((section) => section.id === String(value));
                            setFormData((previous) => ({
                              ...previous,
                              sectionId: selected?.id ?? '',
                              section: selected?.name ?? '',
                            }));
                          }} options={availableSections.map((section) => ({ value: section.id, label: section.name }))} emptyMessage="No sections available" placeholder={isLoadingSections ? 'Loading sections…' : 'No sections available'} size="md" />
                        {sectionsError ? (
                          <p className="mt-1.5 text-xs text-red-600" role="alert">
                            {sectionsError}{' '}
                            <button
                              className="font-semibold underline"
                              onClick={() => void loadSectionsForProject(formData.projectId ?? '')}
                              type="button"
                            >
                              Retry
                            </button>
                          </p>
                        ) : (
                          <p className="mt-1.5 text-xs text-slate-400">
                            Choose a section from the project catalog.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={fieldLabelClassName} htmlFor="test-case-priority">
                          Priority
                        </label>
                        <Select
                          className="w-full"
                          onChange={(priority) =>
                            setFormData((previous) => ({
                              ...previous,
                              priority: priority as Priority,
                            }))
                          }
                          options={Object.values(Priority).map((priority) => ({
                            label: priority,
                            value: priority,
                          }))}
                          placeholder="Select priority"
                          size="md"
                          value={formData.priority ?? Priority.NotDefined}
                        />
                      </div>
                    </div>

                    <fieldset>
                      <legend className={fieldLabelClassName}>Testing Type</legend>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {Object.values(AutomationType).map((type) => (
                          <label
                            className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${formData.automationType === type ? 'border-brand-300 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                            key={type}
                          >
                            <input
                              checked={formData.automationType === type}
                              className="sr-only"
                              name="automationType"
                              onChange={handleChange}
                              type="radio"
                              value={type}
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className={fieldLabelClassName}>Automation Readiness</legend>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(0,1fr))]">
                        {Object.values(AutomationReadiness).map((readiness) => (
                          <label
                            className={`flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${formData.automationReadiness === readiness ? 'border-brand-300 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                            key={readiness}
                          >
                            <input
                              checked={formData.automationReadiness === readiness}
                              className="sr-only"
                              name="automationReadiness"
                              onChange={handleChange}
                              type="radio"
                              value={readiness}
                            />
                            {readiness}
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Indicate whether this test case is suitable and ready for automation.
                      </p>
                    </fieldset>

                    <fieldset>
                      <legend className={fieldLabelClassName}>Status</legend>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {Object.values(Status).map((status) => (
                          <label
                            className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${formData.status === status ? 'border-brand-300 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                            key={status}
                          >
                            <input
                              checked={formData.status === status}
                              className="sr-only"
                              name="status"
                              onChange={handleChange}
                              type="radio"
                              value={status}
                            />
                            {status}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-slate-300">
                      <input
                        aria-describedby="test-case-reusable-help"
                        aria-label="Reusable Test Case"
                        checked={formData.isReusable ?? false}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        disabled={!canEdit}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            isReusable: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          Reusable Test Case
                        </span>
                        <span
                          className="mt-0.5 block text-xs text-slate-500"
                          id="test-case-reusable-help"
                        >
                          Allow this test case to be reused as a precondition.
                        </span>
                      </span>
                    </label>
                  </div>
                </section>

                <section aria-labelledby="test-case-preconditions-heading">
                  <div className="mb-3">
                    <h3 className={sectionTitleClassName} id="test-case-preconditions-heading">
                      Preconditions
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Record anything required before this case can be run.
                    </p>
                  </div>
                  <MarkdownEditor
                    attachmentContext={attachmentContext}
                    className="min-h-28"
                    id="test-case-preconditions"
                    label="Preconditions"
                    onChange={(preconditions) =>
                      setFormData((previous) => ({ ...previous, preconditions }))
                    }
                    placeholder="E.g. User must be logged in..."
                    rows={3}
                    value={formData.preconditions ?? ''}
                  />

                  <div className="mt-6 border-t border-slate-200 pt-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          Linked Reusable Test Cases
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          References stay current with the source test case.
                        </p>
                      </div>
                      <Button
                        disabled={!canEdit}
                        onClick={openReusableSelector}
                        size="sm"
                        type="button"
                        icon={<Plus size={15} />}
                      >
                        Link Test Case
                      </Button>
                    </div>
                    <p aria-live="polite" className="sr-only">
                      {preconditionMoveAnnouncement}
                    </p>
                    <div className="mt-3 space-y-2">
                      {linkedPreconditions.map((link, index) => {
                        const displayId = formatTestCaseDisplayId(link);
                        const isDeprecated = link.isDeprecated || link.status === Status.Deprecated;
                        return (
                          <article
                            className="group flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                            draggable={canEdit}
                            key={link.testCaseId}
                            onDragEnd={() => setDraggedPreconditionId(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDragStart={() => setDraggedPreconditionId(link.testCaseId)}
                            onDrop={() => {
                              if (draggedPreconditionId)
                                moveLinkedPrecondition(draggedPreconditionId, link.testCaseId);
                              setDraggedPreconditionId(null);
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className="mt-1 cursor-move text-slate-300 group-hover:text-slate-500"
                            >
                              <GripVertical size={16} />
                            </span>
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                <span className="font-mono text-xs text-slate-500">
                                  {displayId}
                                </span>{' '}
                                — {link.title ?? 'Linked test case'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {link.status ?? 'Status unavailable'}
                                {link.section ? ` · ${link.section}` : ''}
                                {link.automationType ? ` · ${link.automationType}` : ''}
                              </p>
                              {isDeprecated && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                                  <AlertTriangle size={13} /> This linked test case is deprecated.
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <a
                                aria-label={`Open ${displayId} in a new tab`}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                href={`/workspace?projectId=${encodeURIComponent(formData.projectId ?? '')}&testCaseId=${encodeURIComponent(link.testCaseId)}`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <ExternalLink size={15} />
                              </a>
                              {canEdit && (
                                <>
                                  <button
                                    aria-label={`Move linked precondition ${index + 1} up`}
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                                    disabled={index === 0}
                                    onClick={() =>
                                      moveLinkedPreconditionByOffset(link.testCaseId, -1)
                                    }
                                    type="button"
                                  >
                                    <ChevronUp size={15} />
                                  </button>
                                  <button
                                    aria-label={`Move linked precondition ${index + 1} down`}
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                                    disabled={index === linkedPreconditions.length - 1}
                                    onClick={() =>
                                      moveLinkedPreconditionByOffset(link.testCaseId, 1)
                                    }
                                    type="button"
                                  >
                                    <ChevronDown size={15} />
                                  </button>
                                  <button
                                    aria-label={`Remove linked precondition ${index + 1}`}
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    onClick={() =>
                                      setLinkedPreconditions((previous) =>
                                        previous.filter(
                                          (item) => item.testCaseId !== link.testCaseId,
                                        ),
                                      )
                                    }
                                    type="button"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </article>
                        );
                      })}
                      {linkedPreconditions.length === 0 && (
                        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
                          No reusable test cases linked.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              <section
                aria-labelledby="test-case-steps-heading"
                className="bg-slate-50/60 p-5 sm:p-7"
              >
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className={sectionTitleClassName} id="test-case-steps-heading">
                      Test steps
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Keep each step focused on one action and its expected result.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">
                    {steps.length} {steps.length === 1 ? 'step' : 'steps'}
                  </span>
                </div>

                <div className="space-y-3">
                  <p aria-live="polite" className="sr-only">
                    {stepMoveAnnouncement}
                  </p>
                  {steps.map((step, index) => (
                    <article
                      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-200"
                      draggable
                      onDragEnd={() => setDraggedStepId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragStart={() => setDraggedStepId(step.id)}
                      onDrop={() => {
                        if (draggedStepId) moveStep(draggedStepId, step.id);
                        setDraggedStepId(null);
                      }}
                      key={step.id}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className="cursor-move text-slate-300 group-hover:text-slate-500"
                            title="Drag to reorder step"
                          >
                            <GripVertical size={16} />
                          </span>
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {index + 1}
                          </span>
                          <span className="text-sm font-semibold text-slate-700">
                            Step {index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            aria-label={`Move step ${index + 1} up`}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={index === 0}
                            onClick={() => moveStepByOffset(step.id, -1)}
                            type="button"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            aria-label={`Move step ${index + 1} down`}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={index === steps.length - 1}
                            onClick={() => moveStepByOffset(step.id, 1)}
                            type="button"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            aria-label={`Delete step ${index + 1}`}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            onClick={() => removeStep(step.id)}
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label
                            className="mb-1.5 block text-xs font-semibold text-slate-600"
                            htmlFor={`test-step-action-${step.id}`}
                          >
                            Action
                          </label>
                          <MarkdownEditor
                            attachmentContext={attachmentContext}
                            id={`test-step-action-${step.id}`}
                            label={`Step ${index + 1} action`}
                            onChange={(event) => handleStepChange(step.id, 'action', event)}
                            placeholder="What action will be performed?"
                            rows={3}
                            value={step.action}
                          />
                        </div>
                        <div>
                          <label
                            className="mb-1.5 block text-xs font-semibold text-slate-600"
                            htmlFor={`test-step-result-${step.id}`}
                          >
                            Expected result
                          </label>
                          <MarkdownEditor
                            attachmentContext={attachmentContext}
                            id={`test-step-result-${step.id}`}
                            label={`Step ${index + 1} expected result`}
                            onChange={(event) => handleStepChange(step.id, 'expectedResult', event)}
                            placeholder="What is the expected result?"
                            rows={3}
                            value={step.expectedResult}
                          />
                        </div>
                      </div>
                    </article>
                  ))}

                  {steps.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                      <p className="text-sm font-semibold text-slate-700">No steps defined</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Add the first action to begin documenting this test case.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-200 bg-white py-3 text-sm font-semibold text-brand-700 transition-all hover:border-brand-400 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  onClick={addStep}
                  type="button"
                >
                  <Plus size={17} />
                  Add step
                </button>
              </section>

              <section
                aria-labelledby="test-case-main-expected-result-heading"
                className="bg-white p-5 sm:p-7 lg:border-r lg:border-slate-200"
              >
                <div className="mb-3">
                  <h3 className={sectionTitleClassName} id="test-case-main-expected-result-heading">
                    Main Expected Result
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Describe the final outcome expected after all test steps are completed.
                  </p>
                </div>
                <MarkdownEditor
                  attachmentContext={attachmentContext}
                  id="test-case-main-expected-result"
                  label="Main Expected Result"
                  maxLength={10000}
                  onChange={(mainExpectedResult) =>
                    setFormData((previous) => ({ ...previous, mainExpectedResult }))
                  }
                  placeholder="Describe the overall expected outcome..."
                  rows={4}
                  value={formData.mainExpectedResult ?? ''}
                />
                {attachmentContext && (
                  <Attachments
                    onDeleted={removeDeletedAttachmentReferences}
                    onNotify={onNotify}
                    projectId={attachmentContext.projectId}
                    testCaseId={attachmentContext.testCaseId!}
                  />
                )}
              </section>
            </div>
          </form>

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs text-slate-400">
              {initialData
                ? `Last modified: ${new Date(initialData.updatedAt).toLocaleDateString()}`
                : 'Unsaved draft'}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                disabled={Boolean(submitMode)}
                onClick={onClose}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              {!initialData && (
                <Button
                  disabled={
                    Boolean(submitMode) ||
                    isLoadingSections ||
                    !availableSections.some((section) => section.id === formData.sectionId)
                  }
                  onClick={(event) => void handleSubmit(event, 'create-another')}
                  type="button"
                  variant="secondary"
                >
                  {submitMode === 'create-another'
                    ? 'Creating & Adding Another…'
                    : 'Create & Add Another'}
                </Button>
              )}
              <Button
                disabled={
                  Boolean(submitMode) ||
                  isLoadingSections ||
                  !availableSections.some((section) => section.id === formData.sectionId)
                }
                form="testCaseForm"
                icon={<Save size={16} />}
                type="submit"
              >
                {submitMode === 'close'
                  ? 'Creating…'
                  : initialData
                    ? 'Save Changes'
                    : 'Create Case'}
              </Button>
            </div>
          </footer>
        </div>
      </div>
      {isReusableSelectorOpen && (
        <div
          aria-labelledby="reusable-test-case-selector-title"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
        >
          <div className="max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h3
                  className="text-base font-bold text-slate-900"
                  id="reusable-test-case-selector-title"
                >
                  Link Reusable Test Cases
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Only reusable cases from this project are available.
                </p>
              </div>
              <button
                aria-label="Close reusable test case selector"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setIsReusableSelectorOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <label className="sr-only" htmlFor="reusable-test-case-search">
                Search reusable test cases
              </label>
              <input
                className={inputClassName}
                id="reusable-test-case-search"
                onChange={(event) => {
                  const search = event.target.value;
                  setReusableSearch(search);
                  void loadReusableCases(search);
                }}
                placeholder="Search by test case key, title, or section"
                value={reusableSearch}
              />
              {reusableCasesError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {reusableCasesError}
                </p>
              )}
              <div className="mt-4 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {isLoadingReusableCases ? (
                  <p className="p-4 text-sm text-slate-500">Loading reusable test cases…</p>
                ) : reusableCandidates.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No reusable test cases found.</p>
                ) : (
                  reusableCandidates.map((testCase) => {
                    const disabled = testCase.status === Status.Deprecated;
                    const checked = selectedReusableIds.includes(testCase.id);
                    return (
                      <label
                        className={`flex gap-3 p-4 ${disabled ? 'cursor-not-allowed bg-slate-50 opacity-65' : 'cursor-pointer hover:bg-slate-50'}`}
                        key={testCase.id}
                      >
                        <input
                          aria-label={`Link ${formatTestCaseDisplayId(testCase)} — ${testCase.title}`}
                          checked={checked}
                          disabled={disabled}
                          onChange={() =>
                            setSelectedReusableIds((previous) =>
                              checked
                                ? previous.filter((id) => id !== testCase.id)
                                : [...previous, testCase.id],
                            )
                          }
                          type="checkbox"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">
                            <span className="font-mono text-xs text-slate-500">
                              {formatTestCaseDisplayId(testCase)}
                            </span>{' '}
                            — {testCase.title}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {testCase.section} · {testCase.status} · {testCase.automationType}
                          </span>
                          {testCase.status === Status.Draft || testCase.status === Status.Review ? (
                            <span className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                              <AlertTriangle size={13} /> {testCase.status} test case
                            </span>
                          ) : null}
                          {disabled ? (
                            <span className="mt-1 block text-xs text-amber-700">
                              Deprecated test cases cannot be newly linked.
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <Button
                onClick={() => setIsReusableSelectorOpen(false)}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                disabled={selectedReusableIds.length === 0}
                onClick={addSelectedReusableCases}
                type="button"
              >
                Link selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
