import React, { useState, useEffect } from 'react';
import { X, Save, Hash, Link as LinkIcon, User } from 'lucide-react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Project } from '../projectsTestCases/types.ts';

interface ProjectFormProps {
  isOpen: boolean;
  initialData?: Project | null;
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ isOpen, initialData, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    key: '',
    description: '',
    status: 'Active',
    externalLink: '',
    createdBy: 'System',
    members: []
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        key: '',
        description: '',
        status: 'Active',
        externalLink: '',
        createdBy: 'Alex Morgan', // Default user
        members: []
      });
    }
  }, [initialData, isOpen]);

  const generateKey = (name: string) => {
    // Generate simple key: remove non-alphanumeric, uppercase, take first 4 chars
    // In a real app, this would check for uniqueness on the server
    const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return clean.slice(0, 4);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        const updates: Partial<Project> = { [name]: value };
        
        // Auto-generate key if editing name and no initial data (new project)
        // Or if key hasn't been manually set (though we disabled manual set)
        if (name === 'name' && !initialData) {
            updates.key = generateKey(value);
        }
        
        return { ...prev, ...updates };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-600 border border-brand-100">
                 {initialData ? 'Details' : 'New'}
               </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {initialData ? 'Project Details' : 'Create Project'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="projectForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Project Name <span className="text-red-500">*</span></label>
            <div className="relative">
                <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Core Platform Redesign"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-900 transition-all"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Project Key</label>
                <div className="relative">
                    <input
                        type="text"
                        name="key"
                        required
                        disabled
                        value={formData.key}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg shadow-sm text-slate-500 text-sm font-mono uppercase cursor-not-allowed"
                    />
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Auto-generated from project name</p>
            </div>
            
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <Select
                  value={formData.status || 'Active'}
                  onChange={(val) => setFormData(prev => ({ ...prev, status: val as any }))}
                  options={[
                    { label: 'Active', value: 'Active' },
                    { label: 'On Hold', value: 'On Hold' },
                    { label: 'Completed', value: 'Completed' },
                    { label: 'Review', value: 'Review' }
                  ]}
                  className="w-full"
                  size="md"
                />
            </div>
          </div>

          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">External Link</label>
             <div className="relative">
                 <input
                     type="url"
                     name="externalLink"
                     value={formData.externalLink || ''}
                     onChange={handleChange}
                     placeholder="https://jira.company.com/browse/KEY"
                     className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-900 transition-all"
                 />
                 <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
             </div>
             <p className="text-[10px] text-slate-400 mt-1">Clicking project title will redirect here</p>
          </div>

          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">Created By</label>
             <div className="relative">
                 <input
                     type="text"
                     name="createdBy"
                     disabled
                     value={formData.createdBy || 'System'}
                     className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg shadow-sm text-slate-500 text-sm cursor-not-allowed"
                 />
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
             </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the project goals..."
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-900 transition-all resize-none"
            />
          </div>

        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="projectForm" icon={<Save size={16} />}>
              {initialData ? 'Save Changes' : 'Create Project'}
            </Button>
        </div>
      </div>
    </>
  );
};