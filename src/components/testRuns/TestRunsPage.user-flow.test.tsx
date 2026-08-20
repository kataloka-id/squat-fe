// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { CreateRun } from './TestRunsPage.tsx';

const serviceMocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/src/api/user-flows.service.ts', async () => {
  const actual = await vi.importActual<typeof import('@/src/api/user-flows.service.ts')>('@/src/api/user-flows.service.ts');
  return { ...actual, UserFlowsService: { ...actual.UserFlowsService, list: serviceMocks.list } };
});
vi.mock('@/src/api/projects.service.ts', () => ({
  ProjectsService: { listTestCases: vi.fn().mockResolvedValue({ data: [] }) },
}));

describe('CreateRun User Flow selection', () => {
  afterEach(() => cleanup());

  it('shows the User Flow empty state in User Flow selection mode', async () => {
    serviceMocks.list.mockResolvedValueOnce({ data: { flows: [] } });
    render(<CreateRun projectId="project-1" members={[]} onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('tab', { name: 'User Flows' });
    fireEvent.click(screen.getByRole('tab', { name: 'User Flows' }));
    expect(await screen.findByText('Belum ada User Flow')).toBeTruthy();
  });
});
