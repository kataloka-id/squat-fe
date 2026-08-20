import { describe, expect, it, vi } from 'vitest';
import { notifyExecutionDataChanged, onExecutionDataChanged } from './execution-refresh.ts';

describe('execution refresh signal', () => {
  it('notifies active execution-derived views and supports cleanup', () => {
    const listener = vi.fn();
    const unsubscribe = onExecutionDataChanged(listener);
    notifyExecutionDataChanged('project-1');
    expect(listener).toHaveBeenCalledWith('project-1');
    unsubscribe();
    notifyExecutionDataChanged('project-2');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
