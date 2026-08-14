import { GraphView } from '@/src/components/userFlows/UserFlowsPage.tsx';
import type { UserFlow } from '@/src/api/user-flows.service.ts';

const previewFlow = (id: string, flowKey: string, title: string): UserFlow => ({
  id,
  flowKey,
  title,
  priority: 'medium',
  health: 'healthy',
  status: 'draft',
  linkedTestCaseCount: 0,
  automatedTestCaseCount: 0,
  coverage: 0,
});

const previewGraph = {
  nodes: [
    previewFlow('start', 'UF-1', 'Start'),
    previewFlow('left', 'UF-2', 'Left branch'),
    previewFlow('right', 'UF-3', 'Right branch'),
    previewFlow('merge', 'UF-4', 'Merge target'),
  ],
  edges: [
    { sourceFlowId: 'start', targetFlowId: 'left', relationshipType: 'requires' as const },
    { sourceFlowId: 'start', targetFlowId: 'right', relationshipType: 'requires' as const },
    { sourceFlowId: 'left', targetFlowId: 'merge', relationshipType: 'requires' as const },
    { sourceFlowId: 'right', targetFlowId: 'merge', relationshipType: 'blocks' as const },
  ],
};

// Deterministic, auth-free browser fixture for the two-incoming-edge merge case.
export const GraphArrowheadPreview = () => (
  <main className="min-h-screen bg-slate-100 p-8">
    <div className="mx-auto max-w-5xl">
      <p className="mb-3 text-sm text-slate-600">Arrowhead visual verification fixture</p>
      <GraphView graph={previewGraph} loading={false} error={null} onOpen={() => {}} />
    </div>
  </main>
);
