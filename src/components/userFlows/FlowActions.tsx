import { Eye, Pencil, Trash2 } from 'lucide-react';
import { RowActions } from '@/src/components/projectsTestCases/ui/RowActions.tsx';

export const FlowActions = ({ onView, onEdit, onDelete, canManage = true }: { onView: () => void; onEdit: () => void; onDelete: () => void; canManage?: boolean }) => (
  <RowActions
    aria-label="User flow row actions"
    actions={[
      { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: onView },
      ...(canManage ? [
        { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onClick: onEdit },
        { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: onDelete, tone: 'danger' as const },
      ] : []),
    ]}
  />
);
