/* eslint-disable no-unused-vars -- repository lint misidentifies TypeScript callback props. */
import React from 'react';
import { 
  Settings,
  Plus, 
  FolderOpen,
  PieChart,
  Trash2,
  Activity,
  Route,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { Project } from '../projectsTestCases/types.ts';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip.tsx';
import { formatPercentage } from '@/src/utils/percentage.ts';
import { RowActions } from './ui/RowActions.tsx';

interface ProjectBoardProps {
  projects: Project[];
  onViewTestCases: (projectId: string) => void;
  onViewUserFlows?: (projectId: string) => void;
  onViewReports: (projectId: string) => void;
  onViewTestRuns: (projectId: string) => void;
  onCreate: () => void;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  canManage?: boolean;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({
    projects, 
    onViewTestCases, 
    onViewUserFlows = () => {},
    onViewReports,
    onViewTestRuns, 
    onCreate, 
    onEdit, 
    onDelete,
    canManage = true,
}) => {
  
  const handleTitleClick = (project: Project) => {
    if (project.externalLink) {
      window.open(project.externalLink, '_blank', 'noopener,noreferrer');
    } else {
      onViewTestCases(project.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of all active QA projects.
          </p>
        </div>
        <Button onClick={onCreate} icon={<Plus size={18} />}>Create Project</Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
           return (
            <div 
              key={project.id}
              className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-brand-200 transition-all duration-200 flex flex-col"
            >
              <div className="p-6 flex-1 flex flex-col">
                {/* Card Header */}
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-start gap-3">
                    {/* Stylized Project Key */}
                    <div className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white text-xs font-bold rounded-lg shadow-md font-mono tracking-tighter shrink-0 select-none">
                      {project.key.slice(0, 4)}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                          <h3 
                            className="font-bold text-lg text-slate-900 leading-tight group-hover:text-brand-600 transition-colors cursor-pointer truncate pr-1" 
                            onClick={() => handleTitleClick(project)}
                            title={project.externalLink ? `Open: ${project.externalLink}` : project.name}
                          >
                            {project.name}
                          </h3>
                          {project.externalLink && (
                              <ExternalLink size={12} className="text-slate-400 group-hover:text-brand-500 flex-shrink-0" />
                          )}
                      </div>
                      
                      {/* Subtle Status */}
                      <Chip type="status" value={project.status} displayValue={project.status} className="mt-1.5" />
                    </div>
                  </div>
                  
                  {canManage && <div onClick={(event) => event.stopPropagation()}>
                    <RowActions aria-label={`Actions for ${project.name}`} actions={[
                      { label: 'Edit', icon: <Settings className="h-4 w-4" />, onClick: () => onEdit(project) },
                      { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => onDelete(project.id), tone: 'danger' },
                    ]} />
                  </div>}
                </div>

                <p 
                    className="text-sm text-slate-500 mb-6 line-clamp-2 flex-1 leading-relaxed"
                >
                  {project.description}
                </p>

                {/* Stats Grid: two columns keep related project metrics aligned. */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {/* Test Cases */}
                  <div 
                    onClick={() => onViewTestCases(project.id)}
                    className="bg-slate-50 hover:bg-brand-50 hover:border-brand-200 rounded-lg p-3 border border-slate-100 transition-all cursor-pointer group/stats"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 group-hover/stats:text-brand-600">
                      <FolderOpen size={12} /> Test Cases
                    </div>
                    <div className="text-xl font-bold text-slate-900 group-hover/stats:text-brand-700">
                        {project.stats.testCasesCount}
                    </div>
                  </div>

                  {/* Pass Rate */}
                  <div 
                    onClick={() => onViewTestRuns(project.id)}
                    className="bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 rounded-lg p-3 border border-slate-100 transition-all cursor-pointer group/pass"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 group-hover/pass:text-emerald-600">
                      <Activity size={12} /> Pass Rate
                    </div>
                    <div title="Pass rate dari Test Run terakhir yang selesai. Skipped dan Untested tidak dihitung." className={`text-xl font-bold ${project.stats.passRate == null ? 'text-slate-500' : project.stats.passRate >= 90 ? 'text-emerald-600' : project.stats.passRate >= 70 ? 'text-amber-500' : 'text-red-500'} group-hover/pass:text-emerald-700`}>
                        {formatPercentage(project.stats.passRate)}
                    </div>
                  </div>

                  {/* User Flows */}
                  <button
                    type="button"
                    onClick={() => onViewUserFlows(project.id)}
                    className="bg-slate-50 hover:bg-brand-50 hover:border-brand-200 rounded-lg border border-slate-100 p-3 text-left transition-all group/flows focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 group-hover/flows:text-brand-600">
                      <Route size={12} /> User Flows
                    </div>
                    <div className="text-xl font-bold text-slate-900 group-hover/flows:text-brand-700">
                      {project.stats.userFlowsCount ?? 0}
                    </div>
                  </button>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                        <Calendar size={12} />
                        Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                    <button 
                        onClick={() => onViewReports(project.id)}
                        className="text-xs font-bold text-slate-600 hover:text-brand-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                        Report <PieChart size={14} />
                    </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
