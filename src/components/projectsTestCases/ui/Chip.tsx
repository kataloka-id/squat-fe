import type { ReactNode } from 'react';

export type ChipType = 'priority' | 'status' | 'tag' | 'automation' | 'automationReadiness' | 'section' | 'health' | 'generic';
export interface ChipProps { type?: ChipType; value: string; label?: string; displayValue?: string; onClick?: () => void; disabled?: boolean; className?: string; leadingIcon?: ReactNode; }

const tones: Record<ChipType, Record<string, string>> = {
  priority: { Critical: 'bg-red-50 text-red-700 border-red-200', critical: 'bg-red-50 text-red-700 border-red-200', High: 'bg-orange-50 text-orange-700 border-orange-200', high: 'bg-orange-50 text-orange-700 border-orange-200', Medium: 'bg-blue-50 text-blue-700 border-blue-200', medium: 'bg-blue-50 text-blue-700 border-blue-200', Low: 'bg-slate-50 text-slate-600 border-slate-200', low: 'bg-slate-50 text-slate-600 border-slate-200', 'Not Defined': 'bg-slate-100 text-slate-500 border-slate-300', not_defined: 'bg-slate-100 text-slate-500 border-slate-300' },
  status: { Ready: 'bg-emerald-50 text-emerald-700 border-emerald-200', ready: 'bg-emerald-50 text-emerald-700 border-emerald-200', Draft: 'bg-amber-50 text-amber-700 border-amber-200', draft: 'bg-amber-50 text-amber-700 border-amber-200', Review: 'bg-brand-50 text-brand-700 border-brand-200', active: 'bg-emerald-50 text-emerald-700 border-emerald-200', Active: 'bg-emerald-50 text-emerald-700 border-emerald-200', deprecated: 'bg-slate-100 text-slate-500 border-slate-200', Deprecated: 'bg-slate-100 text-slate-500 border-slate-200', 'In Progress': 'bg-blue-50 text-blue-700 border-blue-200', Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200', Blocked: 'bg-red-50 text-red-700 border-red-200', Passed: 'bg-emerald-50 text-emerald-700 border-emerald-200', Failed: 'bg-red-50 text-red-700 border-red-200', Skipped: 'bg-slate-100 text-slate-700 border-slate-200', Untested: 'bg-amber-50 text-amber-700 border-amber-200' },
  automation: { UI: 'bg-violet-50 text-violet-700 border-violet-200', API: 'bg-cyan-50 text-cyan-700 border-cyan-200', Manual: 'bg-slate-100 text-slate-600 border-slate-200' },
  automationReadiness: { 'Not Automatable': 'bg-slate-100 text-slate-600 border-slate-200', Candidate: 'bg-amber-50 text-amber-700 border-amber-200', Ready: 'bg-blue-50 text-blue-700 border-blue-200', Automated: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  health: { healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200', at_risk: 'bg-amber-50 text-amber-700 border-amber-200', broken: 'bg-red-50 text-red-700 border-red-200', unknown: 'bg-slate-100 text-slate-600 border-slate-200' },
  section: {}, tag: {}, generic: {},
};
const dotColors: Record<ChipType, Record<string, string>> = {
  priority: { Critical: 'bg-red-500', critical: 'bg-red-500', High: 'bg-orange-500', high: 'bg-orange-500', Medium: 'bg-blue-500', medium: 'bg-blue-500', Low: 'bg-slate-400', low: 'bg-slate-400', 'Not Defined': 'bg-slate-400', not_defined: 'bg-slate-400' },
  status: { Ready: 'bg-emerald-500', ready: 'bg-emerald-500', Draft: 'bg-amber-500', draft: 'bg-amber-500', Review: 'bg-brand-500', active: 'bg-emerald-500', deprecated: 'bg-slate-400', Deprecated: 'bg-slate-400', 'In Progress': 'bg-blue-500', Completed: 'bg-emerald-500', Blocked: 'bg-red-500', Passed: 'bg-emerald-500', Failed: 'bg-red-500', Skipped: 'bg-slate-400', Untested: 'bg-amber-500' },
  automation: { UI: 'bg-violet-500', API: 'bg-cyan-500', Manual: 'bg-slate-400' },
  automationReadiness: { 'Not Automatable': 'bg-slate-400', Candidate: 'bg-amber-500', Ready: 'bg-blue-500', Automated: 'bg-emerald-500' },
  health: { healthy: 'bg-emerald-500', at_risk: 'bg-amber-500', broken: 'bg-red-500', unknown: 'bg-slate-400' },
  section: {}, tag: {}, generic: {},
};
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const Chip = ({ type = 'generic', value, label, displayValue, onClick, disabled = false, className = '', leadingIcon }: ChipProps) => {
  const text = displayValue ?? (type === 'tag' ? `#${value}` : type === 'section' || type === 'generic' ? value : titleCase(value));
  const isLongLabel = text.length > 24;
  const tone = tones[type][value] ?? (type === 'section' ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-100 text-slate-600 border-slate-200');
  const content = <>{label && <span className="shrink-0 font-semibold text-current opacity-70">{label}</span>}{label && <span aria-hidden="true" className="h-3 w-px shrink-0 bg-current opacity-20" />}{leadingIcon ?? (type !== 'section' && type !== 'tag' && <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${dotColors[type][value] ?? 'bg-slate-400'}`} />)}<span className={isLongLabel ? 'min-w-0 max-w-[16rem] truncate whitespace-nowrap' : 'shrink-0 whitespace-nowrap'} title={text}>{text}</span></>;
  const classes = `inline-flex min-w-0 min-h-7 max-w-full items-center gap-1.5 overflow-hidden rounded-md border px-2.5 py-1 text-xs font-medium leading-4 transition-colors duration-200 ${tone} ${onClick ? 'cursor-pointer hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`;
  if (onClick) return <button type="button" className={classes} onClick={onClick} disabled={disabled} aria-label={label ? `${label}: ${text}` : text}>{content}</button>;
  return <span className={classes} aria-label={label ? `${label}: ${text}` : undefined}>{content}</span>;
};
