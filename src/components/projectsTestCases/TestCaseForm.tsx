import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import {
  AutomationType,
  AutomationReadiness,
  Priority,
  Project,
  Status,
  TestCase,
  TestStep,
} from '../projectsTestCases/types.ts';
import { formatTestCaseDisplayId } from '@/src/utils/testCaseDisplayId.ts';
import { MarkdownEditor } from './ui/Markdown.tsx';
import type { SectionRecord } from '@/src/types/api.ts';

interface TestCaseFormProps {
  isOpen: boolean;
  initialData?: TestCase | null;
  projects: Project[];
  sectionsByProject: Record<string, SectionRecord[] | string[]>;
  preselectedProjectId?: string;
  onProjectChange?: (projectId: string) => Promise<SectionRecord[]>;
  onClose: () => void;
  onSave: (data: Partial<TestCase>) => void;
}

const inputClassName =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';
const fieldLabelClassName = 'mb-1.5 block text-sm font-semibold text-slate-700';
const sectionTitleClassName = 'text-sm font-semibold text-slate-900';
const projectSections = (sectionsByProject: Record<string, SectionRecord[] | string[]>, projectId: string): SectionRecord[] =>
  (sectionsByProject[projectId] ?? []).map((section) => typeof section === 'string'
    ? { id: section, name: section, projectId }
    : section);

export const TestCaseForm: React.FC<TestCaseFormProps> = ({
  isOpen,
  initialData,
  projects,
  sectionsByProject,
  preselectedProjectId,
  onProjectChange,
  onClose,
  onSave,
}) => {
  const [loadedSectionsByProject, setLoadedSectionsByProject] = useState<Record<string, SectionRecord[]>>({});
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const sectionRequestVersion = useRef(0);
  const getProjectSections = (projectId: string) => loadedSectionsByProject[projectId] ?? projectSections(sectionsByProject, projectId);
  const selectedInitialProjectId =
    initialData?.projectId ?? preselectedProjectId ?? projects[0]?.id ?? '';
  const initialSections = getProjectSections(selectedInitialProjectId);
  const [formData, setFormData] = useState<Partial<TestCase>>({
    title: '',
    projectId: selectedInitialProjectId,
    sectionId: initialSections[0]?.id || '',
    section: initialSections[0]?.name || '',
    priority: Priority.Medium,
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

  useEffect(() => {
    if (initialData) {
      const matchingSection = getProjectSections(initialData.projectId).find((section) =>
        section.id === initialData.sectionId || section.name === initialData.section,
      );
      setFormData({
        ...initialData,
        sectionId: matchingSection?.id ?? initialData.sectionId ?? '',
        section: matchingSection?.name ?? initialData.section,
        automationReadiness: initialData.automationReadiness ?? AutomationReadiness.Candidate,
      });
      setSteps(initialData.steps || []);
      return;
    }

    setFormData({
      title: '',
      projectId: selectedInitialProjectId,
      sectionId: getProjectSections(selectedInitialProjectId)[0]?.id || '',
      section: getProjectSections(selectedInitialProjectId)[0]?.name || '',
      priority: Priority.Medium,
      status: Status.Draft,
      automationType: AutomationType.Manual,
      automationReadiness: AutomationReadiness.Candidate,
      preconditions: '',
      tags: [],
    });
    setSteps([{ id: Date.now().toString(), action: '', expectedResult: '' }]);
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const selectedSection = availableSections.find((section) => section.id === formData.sectionId);
    if (!formData.title?.trim() || isLoadingSections || !selectedSection) return;
    onSave({ ...formData, steps });
  };

  const availableSections = getProjectSections(formData.projectId ?? '');
  const editingProjectKey = projects.find((project) => project.id === initialData?.projectId)?.key;

  const loadSectionsForProject = async (projectId: string) => {
    const requestVersion = ++sectionRequestVersion.current;
    setIsLoadingSections(true);
    setSectionsError(null);

    try {
      const sections = await onProjectChange?.(projectId) ?? getProjectSections(projectId);
      if (requestVersion !== sectionRequestVersion.current) return;
      setLoadedSectionsByProject((current) => ({ ...current, [projectId]: sections }));
      setFormData((previous) => previous.projectId === projectId
        ? { ...previous, sectionId: sections[0]?.id ?? '', section: sections[0]?.name ?? '' }
        : previous);
    } catch (error) {
      if (requestVersion !== sectionRequestVersion.current) return;
      setSectionsError(error instanceof Error ? error.message : 'Section catalog could not be loaded.');
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
            className="min-h-0 flex-1 overflow-y-auto"
            id="testCaseForm"
            onSubmit={handleSubmit}
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
                      <select
                        aria-describedby="project-assignment-help"
                        className={`${inputClassName} ${!initialData && projects.length > 1 ? 'cursor-pointer' : 'cursor-not-allowed bg-slate-100 text-slate-500'}`}
                        disabled={Boolean(initialData) || projects.length <= 1}
                        id="test-case-project"
                        name="projectId"
                        onChange={(event) => handleProjectChange(event.target.value)}
                        value={formData.projectId ?? ''}
                      >
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.key} — {project.name}
                          </option>
                        ))}
                      </select>
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
                        id="test-case-description"
                        label="Description"
                        onChange={(description) => setFormData((previous) => ({ ...previous, description }))}
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
                        <select
                          className={inputClassName}
                          disabled={isLoadingSections || availableSections.length === 0}
                          id="test-case-section"
                          name="sectionId"
                          onChange={(event) => {
                            const selected = availableSections.find((section) => section.id === event.target.value);
                            setFormData((previous) => ({ ...previous, sectionId: selected?.id ?? '', section: selected?.name ?? '' }));
                          }}
                          required
                          value={formData.sectionId ?? ''}
                        >
                          {isLoadingSections ? (
                            <option value="">Loading sections…</option>
                          ) : availableSections.length === 0 ? (
                            <option value="">No sections available</option>
                          ) : (
                            availableSections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.name}
                              </option>
                            ))
                          )}
                        </select>
                        {sectionsError ? (
                          <p className="mt-1.5 text-xs text-red-600" role="alert">
                            {sectionsError}{' '}
                            <button className="font-semibold underline" onClick={() => void loadSectionsForProject(formData.projectId ?? '')} type="button">
                              Retry
                            </button>
                          </p>
                        ) : <p className="mt-1.5 text-xs text-slate-400">Choose a section from the project catalog.</p>}
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
                          value={formData.priority ?? Priority.Medium}
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
                      <p className="mt-2 text-sm text-slate-500">Indicate whether this test case is suitable and ready for automation.</p>
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
                    className="min-h-28"
                    id="test-case-preconditions"
                    label="Preconditions"
                    onChange={(preconditions) => setFormData((previous) => ({ ...previous, preconditions }))}
                    placeholder="E.g. User must be logged in..."
                    rows={3}
                    value={formData.preconditions ?? ''}
                  />
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
                  <p aria-live="polite" className="sr-only">{stepMoveAnnouncement}</p>
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
                            id={`test-step-action-${step.id}`}
                            label={`Step ${index + 1} action`}
                            onChange={(event) =>
                              handleStepChange(step.id, 'action', event)
                            }
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
                            id={`test-step-result-${step.id}`}
                            label={`Step ${index + 1} expected result`}
                            onChange={(event) =>
                              handleStepChange(step.id, 'expectedResult', event)
                            }
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

              <section aria-labelledby="test-case-main-expected-result-heading" className="bg-white p-5 sm:p-7 lg:border-r lg:border-slate-200">
                <div className="mb-3">
                  <h3 className={sectionTitleClassName} id="test-case-main-expected-result-heading">
                    Main Expected Result
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Describe the final outcome expected after all test steps are completed.
                  </p>
                </div>
                <MarkdownEditor
                  id="test-case-main-expected-result"
                  label="Main Expected Result"
                  maxLength={10000}
                  onChange={(mainExpectedResult) => setFormData((previous) => ({ ...previous, mainExpectedResult }))}
                  placeholder="Describe the overall expected outcome..."
                  rows={4}
                  value={formData.mainExpectedResult ?? ''}
                />
              </section>
            </div>
          </form>

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs text-slate-400">
              {initialData
                ? `Last modified: ${new Date(initialData.updatedAt).toLocaleDateString()}`
                : 'Unsaved draft'}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <Button onClick={onClose} type="button" variant="secondary">
                Cancel
              </Button>
              <Button disabled={isLoadingSections || !availableSections.some((section) => section.id === formData.sectionId)} form="testCaseForm" icon={<Save size={16} />} type="submit">
                {initialData ? 'Save Changes' : 'Create Case'}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
  };
