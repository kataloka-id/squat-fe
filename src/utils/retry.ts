export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTimeout =
      error.code === 'ECONNABORTED' ||
      error.message?.toLowerCase().includes('timeout') ||
      !error.response;

    if (retries > 0 && isTimeout) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay);
    }
    throw error;
  }
}
