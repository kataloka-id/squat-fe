import React, { useMemo } from 'react';
import { TestCase, Status, Priority, AutomationType } from '../projectsTestCases/types.ts';
import { PieChart, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TestCaseStatsProps {
  testCases: TestCase[];
}

// Helper component for individual stat items with tooltip
const StatItem = ({ color, count, label, tooltip }: { color: string, count: number, label?: string, tooltip: string }) => (
  <div className="group relative flex items-center gap-1.5 cursor-pointer">
    <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
    {label && <span className="text-slate-500 text-xs">{label}</span>}
    <span className="font-medium text-slate-700">{count}</span>
    
    {/* Tooltip */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
      {tooltip}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-900"></div>
    </div>
  </div>
);

export const TestCaseStats: React.FC<TestCaseStatsProps> = ({ testCases }) => {
  const stats = useMemo(() => {
    const total = testCases.length;
    
    const status = {
      [Status.Ready]: 0,
      [Status.Draft]: 0,
      [Status.Review]: 0,
      [Status.Deprecated]: 0,
    };

    const automation = {
      [AutomationType.UI]: 0,
      [AutomationType.API]: 0,
      [AutomationType.Manual]: 0,
    };
    
    const priority = {
        [Priority.NotDefined]: 0,
        [Priority.Critical]: 0,
        [Priority.High]: 0,
        [Priority.Medium]: 0,
        [Priority.Low]: 0
    };

    testCases.forEach(tc => {
      if (status[tc.status] !== undefined) status[tc.status]++;
      if (automation[tc.automationType] !== undefined) automation[tc.automationType]++;
      if (priority[tc.priority] !== undefined) priority[tc.priority]++;
    });

    return { total, status, automation, priority };
  }, [testCases]);

  if (testCases.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
       {/* Total Card */}
       <div className="group relative bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-default">
          <div>
             <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Cases</p>
             <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
             <PieChart size={20} />
          </div>
          
          {/* Tooltip for Total */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
             Total test cases in current view
             <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-900"></div>
          </div>
       </div>

       {/* Status Stats */}
       <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
             <CheckCircle2 size={12} /> Status
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
             <StatItem color="bg-emerald-500" count={stats.status[Status.Ready]} tooltip="Ready for Execution" />
             <StatItem color="bg-brand-500" count={stats.status[Status.Review]} tooltip="Under Review" />
             <StatItem color="bg-amber-500" count={stats.status[Status.Draft]} tooltip="In Draft" />
             <StatItem color="bg-slate-300" count={stats.status[Status.Deprecated]} tooltip="Deprecated" />
          </div>
       </div>

       {/* Testing Type Stats */}
       <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
             <Activity size={12} /> Testing Type
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
             <StatItem color="bg-violet-500" count={stats.automation[AutomationType.UI]} tooltip="UI Tests" />
             <StatItem color="bg-cyan-500" count={stats.automation[AutomationType.API]} tooltip="API Tests" />
             <StatItem color="bg-slate-400" count={stats.automation[AutomationType.Manual]} tooltip="Manual Tests" />
          </div>
       </div>
       
       {/* Priority Stats */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
             <AlertCircle size={12} /> Priority
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
             <StatItem color="bg-slate-400" count={stats.priority[Priority.NotDefined]} tooltip="Not Defined Priority" />
             <StatItem color="bg-red-500" count={stats.priority[Priority.Critical]} tooltip="Critical Priority" />
             <StatItem color="bg-orange-500" count={stats.priority[Priority.High]} tooltip="High Priority" />
             <StatItem color="bg-blue-500" count={stats.priority[Priority.Medium]} tooltip="Medium Priority" />
             <StatItem color="bg-slate-400" count={stats.priority[Priority.Low]} tooltip="Low Priority" />
          </div>
       </div>
    </div>
  );
};
