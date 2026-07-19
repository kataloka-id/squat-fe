/**
 * Shared read client for authenticated GET resources.
 *
 * React StrictMode deliberately mounts effects twice in development. Keeping
 * this state outside React means both mounts share a single request, while the
 * short-lived cache also prevents duplicate reads between views.  Callers can
 * use `force: true` for an explicit refresh; mutations and auth transitions
 * must invalidate the affected resource keys.
 */
export type ReadOptions = {
  force?: boolean;
  cacheTtlMs?: number;
};

type CacheEntry<T> = { value: T; expiresAt: number; session: number; version: number; generation: number };
type PendingEntry<T> = { promise: Promise<T>; session: number; version: number; generation: number };

const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES = 100;
let sessionGeneration = 0;
let cacheGeneration = 0;
const cache = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, PendingEntry<unknown>>();
const keyVersions = new Map<string, number>();

const getKeyVersion = (key: string) => keyVersions.get(key) ?? 0;
const bumpKeyVersion = (key: string) => keyVersions.set(key, getKeyVersion(key) + 1);

const purgeExpired = () => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now || entry.session !== sessionGeneration || entry.generation !== cacheGeneration || entry.version !== getKeyVersion(key)) cache.delete(key);
  }
};

const remember = (key: string, value: unknown, ttlMs: number, session: number, version: number, generation: number) => {
  // A GET begun before a mutation, explicit refresh, or login transition may
  // still finish later. Its response must never repopulate the newer cache.
  if (ttlMs <= 0 || session !== sessionGeneration || version !== getKeyVersion(key) || generation !== cacheGeneration) return;
  cache.delete(key); // Map insertion order provides bounded LRU eviction.
  cache.set(key, { value, expiresAt: Date.now() + ttlMs, session, version, generation });
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
};

export const getCached = <T>(key: string, request: () => Promise<T>, options: ReadOptions = {}): Promise<T> => {
  const ttlMs = options.cacheTtlMs ?? DEFAULT_TTL_MS;
  // A user-requested refresh must win over an older in-flight request too.
  if (options.force) bumpKeyVersion(key);
  const session = sessionGeneration;
  const version = getKeyVersion(key);
  const generation = cacheGeneration;
  purgeExpired();

  if (!options.force) {
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    if (cached?.session === session && cached.version === version && cached.generation === generation) return Promise.resolve(cached.value);
    const active = pending.get(key) as PendingEntry<T> | undefined;
    if (active?.session === session && active.version === version && active.generation === generation) return active.promise;
  }

  const promise = request();
  const entry: PendingEntry<T> = { promise, session, version, generation };
  pending.set(key, entry);
  void promise.then(
    (value) => {
      if (pending.get(key) === entry) pending.delete(key);
      remember(key, value, ttlMs, session, version, generation);
    },
    () => {
      if (pending.get(key) === entry) pending.delete(key);
    },
  );
  return promise;
};

/** Invalidates a URL and all nested resources, e.g. `/v1/projects/:id`. */
export const invalidateReadCache = (keyPrefix?: string) => {
  if (!keyPrefix) {
    cacheGeneration += 1;
    cache.clear();
    return;
  }
  const keys = new Set([...cache.keys(), ...pending.keys(), ...keyVersions.keys()]);
  for (const key of keys) {
    if (key === keyPrefix || key.startsWith(`${keyPrefix}/`) || key.startsWith(`${keyPrefix}?`)) {
      cache.delete(key);
      bumpKeyVersion(key);
    }
  }
};

/** Prevents a response belonging to a previous login from being reused. */
export const invalidateReadCacheForSessionChange = () => {
  sessionGeneration += 1;
  cacheGeneration += 1;
  cache.clear();
};
