// LOCAL STAND-IN for @quikit/redis: delete at integration

export function getRedis() {
  return null;
}

export function isRedisAvailable(): boolean {
  return false;
}

export async function cacheGet<T>(_key: string): Promise<T | null> {
  return null;
}

export async function cacheSet<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
  // no-op in Mode B
}

export async function cacheDel(_key: string): Promise<void> {
  // no-op in Mode B
}
