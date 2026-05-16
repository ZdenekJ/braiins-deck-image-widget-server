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

export class RenderService {
  private config: any;

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
      throw new Error(`Widget '${req.widgetId}' not found`);
    }
    const { widget, config: widgetConfig } = loaded;

    // 3. Prepare Props & Data
    const props = await this.prepareProps(req, widget, widgetConfig);

    // 4. Render Widget Component (with timeout)
    const RENDER_TIMEOUT_MS = 10_000;
    const componentResult = await Promise.race([
      widget.component(props),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Widget render timed out")), RENDER_TIMEOUT_MS)
      ),
    ]);

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
  async renderError(message: string, req: RenderRequest): Promise<Buffer> {
    return renderErrorImage(message, {
      width: req.width,
      height: req.height,
      format: normalizeFormat(req.format),
    });
  }

  /**
   * Internal: Prepare props and fetch data if needed
   */
  private async prepareProps(
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

    const dataCacheKey = generateDataCacheKey(req.widgetId, widgetConfig);
    let data = getCachedData(dataCacheKey);

    if (!data || req.refresh) {
      console.log(`Fetching data for ${req.widgetId}...`);
      data = await widget.fetchData(widgetConfig);
      setCachedData(dataCacheKey, data, widget.cacheTtl);
    }

    return data;
  }

  getAvailableWidgets(): string[] {
    return getAllWidgetIds();
  }
}
