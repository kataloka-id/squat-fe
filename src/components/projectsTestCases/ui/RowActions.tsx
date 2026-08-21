import type { ReactNode } from 'react';

export type RowAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tooltip?: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
};

type RowActionsProps = {
  actions: RowAction[];
  'aria-label'?: string;
};

/** Shared end padding for table action cells; keeps icons off the table edge. */
export const ROW_ACTIONS_CELL_CLASS = 'pr-6';

/** Consistent direct actions for table/list rows. Actions are omitted by callers when unauthorized. */
export const RowActions = ({ actions, 'aria-label': ariaLabel = 'Row actions' }: RowActionsProps) => {
  if (!actions.length) return null;

  return (
    <div aria-label={ariaLabel} className="inline-flex items-center justify-end gap-1">
      {actions.map(({ label, icon, onClick, tooltip = label, tone = 'default', disabled = false }) => (
        <span className="group/action relative inline-flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" key={label} tabIndex={tooltip !== label ? 0 : undefined}>
          <button
            aria-label={label}
            className={`grid h-9 w-9 place-items-center rounded-md border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${tone === 'danger' ? 'text-slate-400 hover:border-red-100 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:border-slate-200 hover:bg-white hover:text-brand-600'}`}
            disabled={disabled}
            onClick={onClick}
            type="button"
          >
            {icon}
            <span className="sr-only">{label}</span>
          </button>
          {tooltip !== label && <span className="sr-only group-hover:opacity-100 group-focus:opacity-100" role="tooltip">{tooltip}</span>}
        </span>
      ))}
    </div>
  );
};
