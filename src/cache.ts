import NodeCache from "node-cache";
import type { RenderRequest } from "./types.js";

// Two-layer cache system:
// 1. Image cache (PNG/JPG buffers)
// 2. Data cache (fetchData results)

const imageCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
const dataCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Generate cache key from render request
export function generateCacheKey(req: RenderRequest): string {
  return `${req.widgetId}|${req.size}|${req.format}|${req.theme}|${req.locale}|${req.tz}`;
}

// Generate data cache key (without format)
export function generateDataCacheKey(widgetId: string, config: any): string {
  const configStr = JSON.stringify(config || {});
  return `data:${widgetId}:${configStr}`;
}

// Image cache operations
export function getCachedImage(key: string): Buffer | undefined {
  return imageCache.get<Buffer>(key);
}

export function setCachedImage(
  key: string,
  buffer: Buffer,
  ttl?: number
): void {
  if (ttl !== undefined) {
    imageCache.set(key, buffer, ttl);
  } else {
    imageCache.set(key, buffer);
  }
}

// Data cache operations
export function getCachedData<T = any>(key: string): T | undefined {
  return dataCache.get<T>(key);
}

export function setCachedData<T = any>(
  key: string,
  data: T,
  ttl?: number
): void {
  if (ttl !== undefined) {
    dataCache.set(key, data, ttl);
  } else {
    dataCache.set(key, data);
  }
}

// Cache stats for health endpoint
export interface CacheStats {
  image: {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  };
  data: {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  };
}

export function getCacheStats(): CacheStats {
  const imageStats = imageCache.getStats();
  const dataStats = dataCache.getStats();

  return {
    image: {
      keys: imageStats.keys,
      hits: imageStats.hits,
      misses: imageStats.misses,
      ksize: imageStats.ksize,
      vsize: imageStats.vsize,
    },
    data: {
      keys: dataStats.keys,
      hits: dataStats.hits,
      misses: dataStats.misses,
      ksize: dataStats.ksize,
      vsize: dataStats.vsize,
    },
  };
}

// Clear all caches
export function clearAllCaches(): void {
  imageCache.flushAll();
  dataCache.flushAll();
}
