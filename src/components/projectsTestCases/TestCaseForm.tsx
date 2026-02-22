import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, Save, ChevronDown, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { TestCase, Priority, Status, TestStep, Project, AutomationType } from '../projectsTestCases/types.ts';
import { SECTIONS } from '../projectsTestCases/constants.ts';

interface TestCaseFormProps {
  isOpen: boolean;
  initialData?: TestCase | null;
  projects: Project[];
  onClose: () => void;
  onSave: (data: Partial<TestCase>) => void;
}

export const TestCaseForm: React.FC<TestCaseFormProps> = ({ isOpen, initialData, projects, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<TestCase>>({
    title: '',
    projectId: projects[0]?.id || '',
    section: SECTIONS[0],
    priority: Priority.Medium,
    status: Status.Draft,
    automationType: AutomationType.Manual,
    preconditions: '',
    steps: [],
    tags: []
  });

  const [steps, setSteps] = useState<TestStep[]>([]);
  
  // Custom Dropdown State
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const projectContainerRef = useRef<HTMLDivElement>(null);

  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const sectionContainerRef = useRef<HTMLDivElement>(null);

  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const priorityContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setSteps(initialData.steps || []);
    } else {
      // Reset form
      setFormData({
        title: '',
        projectId: projects[0]?.id || '',
        section: SECTIONS[0],
        priority: Priority.Medium,
        status: Status.Draft,
        automationType: AutomationType.Manual,
        preconditions: '',
        tags: []
      });
      setSteps([{ id: Date.now().toString(), action: '', expectedResult: '' }]);
    }
  }, [initialData, isOpen, projects]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectContainerRef.current && !projectContainerRef.current.contains(event.target as Node)) {
        setIsProjectOpen(false);
      }
      if (sectionContainerRef.current && !sectionContainerRef.current.contains(event.target as Node)) {
        setIsSectionOpen(false);
      }
      if (priorityContainerRef.current && !priorityContainerRef.current.contains(event.target as Node)) {
        setIsPriorityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStepChange = (id: string, field: 'action' | 'expectedResult', value: string) => {
    setSteps(prev => prev.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  const addStep = () => {
    setSteps(prev => [...prev, { id: Date.now().toString(), action: '', expectedResult: '' }]);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(step => step.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, steps });
  };

  const selectedProject = projects.find(p => p.id === formData.projectId);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-600 border border-brand-100">
                 {initialData ? 'Update' : 'New'}
               </span>
               <span className="text-sm text-slate-400 font-mono">
                  {initialData?.id || 'TC-NEW'}
               </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {initialData ? `Edit Test Case` : 'Create Test Case'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="testCaseForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
          
          <div className="space-y-6">
            
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Project</label>
              <div className="relative" ref={projectContainerRef}>
                <div
                    onClick={() => {
                        if (projects.length > 1) setIsProjectOpen(!isProjectOpen);
                    }}
                    className={`
                        w-full px-4 py-2.5 bg-white border rounded-lg shadow-sm flex items-center justify-between transition-all
                        ${projects.length > 1 ? 'cursor-pointer hover:border-brand-300' : 'cursor-not-allowed bg-slate-50 text-slate-500'}
                        ${isProjectOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : 'border-slate-200'}
                    `}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                         {selectedProject ? (
                             <>
                                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {selectedProject.key}
                                </span>
                                <span className="truncate text-sm text-slate-900 font-medium">
                                    {selectedProject.name}
                                </span>
                             </>
                         ) : (
                             <span className="text-slate-400 text-sm">Select a project...</span>
                         )}
                    </div>
                    {projects.length > 1 && (
                         <ChevronDown size={16} className={`text-slate-400 transition-transform ${isProjectOpen ? 'rotate-180' : ''}`} />
                    )}
                </div>
                
                {isProjectOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                         {projects.map(p => (
                             <div 
                                key={p.id}
                                onClick={() => {
                                    setFormData(prev => ({ ...prev, projectId: p.id }));
                                    setIsProjectOpen(false);
                                }}
                                className={`
                                    px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-colors text-sm
                                    ${p.id === formData.projectId ? 'bg-brand-50' : 'hover:bg-slate-50'}
                                `}
                             >
                                <div className="flex-1 flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-12 text-center shrink-0">
                                        {p.key}
                                    </span>
                                    <span className={`truncate font-medium ${p.id === formData.projectId ? 'text-brand-700' : 'text-slate-700'}`}>
                                        {p.name}
                                    </span>
                                </div>
                                {p.id === formData.projectId && <Check size={16} className="text-brand-600" />}
                             </div>
                         ))}
                    </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="Describe the test scenario..."
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-900 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              
              {/* Section Field with Custom Combobox */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Section</label>
                <div className="relative" ref={sectionContainerRef}>
                    <div className="relative">
                        <input
                            type="text"
                            name="section"
                            value={formData.section}
                            onChange={(e) => {
                                handleChange(e);
                                setIsSectionOpen(true);
                            }}
                            onFocus={() => setIsSectionOpen(true)}
                            placeholder="Select or type..."
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-900 transition-all"
                            autoComplete="off"
                        />
                        <div 
                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors"
                            onClick={() => setIsSectionOpen(!isSectionOpen)}
                        >
                             <ChevronDown size={16} className={`transition-transform ${isSectionOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </div>

                    {isSectionOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 custom-scrollbar">
                             {(() => {
                                 const filteredSections = SECTIONS.filter(s => 
                                    s.toLowerCase().includes((formData.section || '').toLowerCase())
                                 );
                                 
                                 return filteredSections.length > 0 ? (
                                     filteredSections.map(s => (
                                         <div 
                                            key={s}
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, section: s }));
                                                setIsSectionOpen(false);
                                            }}
                                            className={`
                                                px-4 py-2.5 text-sm cursor-pointer transition-colors
                                                ${s === formData.section ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}
                                            `}
                                         >
                                            {s}
                                         </div>
                                     ))
                                 ) : (
                                     <div className="px-4 py-3 text-sm text-slate-500 italic bg-slate-50">
                                        Press Enter to create new section: <span className="font-semibold text-slate-700">{formData.section}</span>
                                     </div>
                                 );
                             })()}
                        </div>
                    )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
                <div className="relative" ref={priorityContainerRef}>
                  <div
                    onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-900 transition-all"
                  >
                    <span>{formData.priority}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isPriorityOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      {Object.values(Priority).map(p => (
                        <div 
                          key={p}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, priority: p }));
                            setIsPriorityOpen(false);
                          }}
                          className={`
                            px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                            ${p === formData.priority ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}
                          `}
                        >
                          {p}
                          {p === formData.priority && <Check size={16} className="text-brand-600" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Automation Type</label>
              <div className="flex gap-3">
                {Object.values(AutomationType).map((type) => (
                   <label key={type} className={`
                      flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all flex items-center justify-center gap-2
                      ${formData.automationType === type 
                        ? 'bg-brand-50 border-brand-200 text-brand-700 ring-1 ring-brand-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }
                   `}>
                     <input
                       type="radio"
                       name="automationType"
                       value={type}
                       checked={formData.automationType === type}
                       onChange={handleChange}
                       className="sr-only"
                     />
                     {type}
                   </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Status</label>
              <div className="flex gap-3">
                {Object.values(Status).map((status) => (
                   <label key={status} className={`
                      flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all
                      ${formData.status === status 
                        ? 'bg-brand-50 border-brand-200 text-brand-700 ring-1 ring-brand-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }
                   `}>
                     <input
                       type="radio"
                       name="status"
                       value={status}
                       checked={formData.status === status}
                       onChange={handleChange}
                       className="sr-only"
                     />
                     {status}
                   </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Preconditions</label>
              <textarea
                name="preconditions"
                value={formData.preconditions}
                onChange={handleChange}
                rows={2}
                placeholder="E.g. User must be logged in..."
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-900 transition-all"
              />
            </div>

            {/* Dynamic Steps */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Test Steps</label>
              
              <div className="space-y-3 mb-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="group relative bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-brand-200 transition-all">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 cursor-move opacity-0 group-hover:opacity-100 p-1 hover:text-slate-500">
                      <GripVertical size={14} />
                    </div>
                    <div className="flex gap-4 ml-4">
                      <div className="flex-1 space-y-3">
                         <div className="flex gap-3">
                           <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-1 h-fit mt-1">#{index + 1}</span>
                           <div className="flex-1">
                             <input
                                placeholder="Action performed..."
                                value={step.action}
                                onChange={(e) => handleStepChange(step.id, 'action', e.target.value)}
                                className="w-full px-3 py-1.5 border-b border-slate-200 text-sm text-slate-900 focus:border-brand-500 focus:outline-none placeholder:text-slate-300 transition-colors bg-transparent"
                              />
                           </div>
                         </div>
                         <div className="flex gap-3">
                           <span className="w-7"></span>
                           <div className="flex-1">
                             <input
                                placeholder="Expected result..."
                                value={step.expectedResult}
                                onChange={(e) => handleStepChange(step.id, 'expectedResult', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-50/50 border-b border-slate-200 text-sm text-slate-600 focus:border-brand-500 focus:outline-none placeholder:text-slate-300 transition-colors"
                              />
                           </div>
                         </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className="text-slate-300 hover:text-red-500 self-start p-1 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {steps.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 bg-slate-50/50">
                    <p className="text-sm font-medium">No steps defined</p>
                    <p className="text-xs text-slate-400 mt-1">Start adding steps below</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={addStep}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-sm font-medium hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/50 transition-all flex items-center justify-center gap-2 bg-white"
              >
                <Plus size={16} />
                Add New Step
              </button>
            </div>
            
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            {initialData ? `Last modified: ${new Date(initialData.updatedAt).toLocaleDateString()}` : 'Unsaved draft'}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="testCaseForm" icon={<Save size={16} />}>
              {initialData ? 'Save Changes' : 'Create Case'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};