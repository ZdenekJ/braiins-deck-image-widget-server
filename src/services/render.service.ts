import {
  getCachedImage,
  setCachedImage,
  getCachedData,
  setCachedData,
  generateCacheKey,
  generateDataCacheKey,
} from "../cache.js";
import { renderToImage, renderErrorImage } from "../renderer.js";
import type { RenderRequest, WidgetProps, Widget } from "../types.js";
import { normalizeFormat } from "../types.js";
import { getWidget, getAllWidgetIds } from "../loader.js";

interface RenderResult {
  buffer: Buffer;
  contentType: "image/png" | "image/jpeg";
  fromCache: boolean;
}

// Max time for fetchData + component together
const RENDER_TIMEOUT_MS = 10_000;

export class WidgetNotFoundError extends Error {
  constructor(widgetId: string) {
    super(`Widget '${widgetId}' not found`);
    this.name = "WidgetNotFoundError";
  }
}

// Reject if the promise doesn't settle in time; always clears the timer
async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export class RenderService {
  private config: any;
  // In-flight fetchData calls by data cache key, so concurrent requests share one fetch
  private pendingFetches = new Map<string, Promise<any>>();

  constructor(config: any) {
    this.config = config;
  }

  /**
   * Main render method
   */
  async renderWidget(req: RenderRequest): Promise<RenderResult> {
    const contentType = req.format === "png" ? "image/png" : "image/jpeg";
    const cacheKey = generateCacheKey(req);

    // 1. Check Image Cache
    if (!req.refresh) {
      const cached = getCachedImage(cacheKey);
      if (cached) {
        return { buffer: cached, contentType, fromCache: true };
      }
    }

    // 2. Load Widget
    const loaded = getWidget(req.widgetId);
    if (!loaded) {
      throw new WidgetNotFoundError(req.widgetId);
    }
    const { widget, config: widgetConfig } = loaded;

    // 3. Prepare Props & Data, 4. Render Widget Component (with timeout)
    const componentResult = await withTimeout(
      (async () => {
        const props = await this.prepareProps(req, widget, widgetConfig);
        return widget.component(props);
      })(),
      RENDER_TIMEOUT_MS,
      `Widget '${req.widgetId}' timed out after ${RENDER_TIMEOUT_MS / 1000}s`
    );

    // 5. Render to Image
    const buffer = await renderToImage(componentResult, {
      width: req.width,
      height: req.height,
      format: normalizeFormat(req.format),
    });

    // 6. Cache Result
    setCachedImage(cacheKey, buffer, widget.cacheTtl);

    return { buffer, contentType, fromCache: false };
  }

  /**
   * Render error image using the same renderer
   */
  async renderError(
    message: string,
    options: Pick<RenderRequest, "width" | "height" | "format">
  ): Promise<Buffer> {
    return renderErrorImage(message, {
      width: options.width,
      height: options.height,
      format: normalizeFormat(options.format),
    });
  }

  /**
   * Prepare props and fetch data if needed (also used by the debug endpoint)
   */
  async prepareProps(
    req: RenderRequest,
    widget: Widget,
    widgetConfig: any
  ): Promise<WidgetProps> {
    const data = widget.fetchData
      ? await this.resolveData(req, widget, widgetConfig)
      : undefined;

    return {
      width: req.width,
      height: req.height,
      config: widgetConfig,
      data,
      theme: req.theme,
      locale: req.locale,
      tz: req.tz,
    };
  }

  /**
   * Internal: Fetch and cache data, returns the fetched data
   */
  private async resolveData(
    req: RenderRequest,
    widget: Widget,
    widgetConfig: any
  ): Promise<any> {
    if (!widget.fetchData) return undefined;

    const context = { locale: req.locale, tz: req.tz };
    const dataCacheKey = generateDataCacheKey(req.widgetId, widgetConfig, context);

    if (!req.refresh) {
      const cached = getCachedData(dataCacheKey);
      if (cached !== undefined) return cached;
    }

    const pending = this.pendingFetches.get(dataCacheKey);
    if (pending) return pending;

    console.log(`Fetching data for ${req.widgetId}...`);
    // Own timeout so a hung fetch is released from pendingFetches and can be retried
    const fetchPromise = withTimeout(
      widget.fetchData(widgetConfig, context),
      RENDER_TIMEOUT_MS,
      `fetchData for '${req.widgetId}' timed out after ${RENDER_TIMEOUT_MS / 1000}s`
    )
      .then((data) => {
        setCachedData(dataCacheKey, data, widget.cacheTtl);
        return data;
      })
      .finally(() => this.pendingFetches.delete(dataCacheKey));

    this.pendingFetches.set(dataCacheKey, fetchPromise);
    return fetchPromise;
  }

  getAvailableWidgets(): string[] {
    return getAllWidgetIds();
  }
}
