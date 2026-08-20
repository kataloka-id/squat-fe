/* eslint-disable no-unused-vars -- repository lint misidentifies callback type parameters. */
/** Cross-view refresh signal for data derived from Test Run executions. */
const listeners = new Set<(projectId: string) => void>();
export const notifyExecutionDataChanged = (projectId: string) => listeners.forEach((listener) => listener(projectId));
export const onExecutionDataChanged = (listener: (projectId: string) => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
