import NodeCache from "node-cache";
import type { RenderRequest } from "./types.js";

const imageCache = new NodeCache({ stdTTL: 60, checkperiod: 120, maxKeys: 500 });
const dataCache  = new NodeCache({ stdTTL: 60, checkperiod: 120, maxKeys: 200 });

// Caching is best-effort: a failed set (e.g. ECACHEFULL when maxKeys is reached) must not break rendering
function cacheSet<T>(cache: NodeCache, key: string, value: T, ttl?: number): void {
  try {
    if (ttl !== undefined) {
      cache.set(key, value, ttl);
    } else {
      cache.set(key, value);
    }
  } catch (error) {
    console.warn(`Cache set failed for '${key}':`, error instanceof Error ? error.message : error);
  }
}

function extractStats(stats: NodeCache.Stats) {
  const { keys, hits, misses, ksize, vsize } = stats;
  return { keys, hits, misses, ksize, vsize };
}

export function generateCacheKey(req: RenderRequest): string {
  return `${req.widgetId}|${req.width}x${req.height}|${req.format}|${req.theme}|${req.locale}|${req.tz}`;
}

export function generateDataCacheKey(
  widgetId: string,
  config: any,
  context: { locale: string; tz: string }
): string {
  const configStr = JSON.stringify(config || {});
  return `data:${widgetId}:${context.locale}|${context.tz}:${configStr}`;
}

export function getCachedImage(key: string): Buffer | undefined {
  return imageCache.get<Buffer>(key);
}

export function setCachedImage(key: string, buffer: Buffer, ttl?: number): void {
  cacheSet(imageCache, key, buffer, ttl);
}

export function getCachedData<T = any>(key: string): T | undefined {
  return dataCache.get<T>(key);
}

export function setCachedData<T = any>(key: string, data: T, ttl?: number): void {
  cacheSet(dataCache, key, data, ttl);
}

export interface CacheStats {
  image: { keys: number; hits: number; misses: number; ksize: number; vsize: number };
  data: { keys: number; hits: number; misses: number; ksize: number; vsize: number };
}

export function getCacheStats(): CacheStats {
  return {
    image: extractStats(imageCache.getStats()),
    data: extractStats(dataCache.getStats()),
  };
}

export function clearAllCaches(): void {
  imageCache.flushAll();
  dataCache.flushAll();
}
