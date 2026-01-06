import "dotenv/config";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import {
  initializeWidgets,
  getWidget,
  getAllWidgetIds,
  getWidgetInfo,
} from "./loader.js";
import {
  parseRenderRequest,
  DECK_SIZES,
  type WidgetProps,
  type RenderRequest,
} from "./types.js";
import {
  getCachedImage,
  setCachedImage,
  getCachedData,
  setCachedData,
  generateCacheKey,
  generateDataCacheKey,
  getCacheStats,
} from "./cache.js";
import { renderToImage, renderErrorImage } from "./renderer.js";
import { log } from "console";

const app = Fastify({ logger: true });

// Load configuration
let config: ReturnType<typeof loadConfig>;

try {
  config = loadConfig();
  console.log(`Server will run on ${config.server.host}:${config.server.port}`);
} catch (error) {
  console.error("Failed to load configuration:", error);
  process.exit(1);
}

// Initialize widgets on startup
await initializeWidgets(config.widgets);

// Authentication middleware (optional)
if (config.server.authToken) {
  app.addHook("onRequest", async (request, reply) => {
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (token !== config.server.authToken) {
      reply.status(401).send({ error: "Unauthorized" });
    }
  });
}

// Health check endpoint
app.get("/health", async (request, reply) => {
  const stats = getCacheStats();
  reply.send({
    status: "ok",
    uptime: process.uptime(),
    widgets: getAllWidgetIds().length,
    cache: stats,
  });
});

// List all widgets
app.get("/widgets", async (request, reply) => {
  const widgets = getWidgetInfo();
  reply.send({
    widgets,
    total: widgets.length,
  });
});

// Debug endpoint - returns JSON instead of image
app.get<{
  Params: { widgetId: string };
  Querystring: Record<string, string>;
}>("/debug/:widgetId", async (request, reply) => {
  const { widgetId } = request.params;

  const loaded = getWidget(widgetId);
  if (!loaded) {
    reply.status(404).send({
      error: `Widget '${widgetId}' not found`,
      available: getAllWidgetIds(),
    });
    return;
  }

  const { widget, config: widgetConfig } = loaded;

  // Parse request
  const req = parseRenderRequest(
    widgetId,
    "png",
    request.query,
    config.defaults
  );

  const props: WidgetProps = {
    width: req.width,
    height: req.height,
    config: widgetConfig,
    theme: req.theme,
    locale: req.locale,
    tz: req.tz,
  };

  try {
    const result = await widget.component(props);
    reply.send({
      widgetId,
      request: req,
      dimensions: { width: req.width, height: req.height },
      props,
      output: typeof result === "string" ? result : "<ReactElement>",
      cacheTtl: widget.cacheTtl,
    });
  } catch (error: any) {
    reply.status(500).send({
      error: "Widget execution failed",
      message: error?.message || String(error),
    });
  }
});

// Main widget rendering endpoint
app.get<{
  Params: { widgetId: string; format: string };
  Querystring: Record<string, string>;
}>("/widget/:widgetId.:format", async (request, reply) => {
  const { widgetId, format } = request.params;

  // Validate format
  if (!["png", "jpg", "jpeg"].includes(format)) {
    reply.status(400).send({
      error: `Invalid format: ${format}. Must be 'png', 'jpg', or 'jpeg'`,
    });
    return;
  }

  const normalizedFormat = (format === "jpeg" ? "jpg" : format) as "png" | "jpg";

  // Check if widget exists
  const loaded = getWidget(widgetId);
  if (!loaded) {
    reply.status(404).send({
      error: `Widget '${widgetId}' not found`,
      available: getAllWidgetIds(),
    });
    return;
  }

  const { widget, config: widgetConfig } = loaded;

  // Parse request
  let req: RenderRequest | null = null;
  try {
    req = parseRenderRequest(
      widgetId,
      normalizedFormat as "png" | "jpg",
      request.query,
      config.defaults
    );

    if (!req) {
      throw new Error("Failed to parse render request");
    }

    // Generate cache key
    const cacheKey = generateCacheKey(req);

    // Check cache (unless refresh is requested)
    if (!req.refresh) {
      const cached = getCachedImage(cacheKey);
      if (cached) {
        reply
          .type(normalizedFormat === "png" ? "image/png" : "image/jpeg")
          .send(cached);
        return;
      }
    }

    // Prepare widget props (using dimensions from request)
    const props: WidgetProps = {
      width: req.width,
      height: req.height,
      config: widgetConfig,
      theme: req.theme,
      locale: req.locale,
      tz: req.tz,
    };

    // Fetch data if needed (with caching)
    if (widget.fetchData) {
      const dataCacheKey = generateDataCacheKey(widgetId, widgetConfig);
      let data = getCachedData(dataCacheKey);

      if (!data || req.refresh) {
        data = await widget.fetchData(widgetConfig);
        setCachedData(dataCacheKey, data, widget.cacheTtl);
      }
    }

    // Render widget
    const result = await widget.component(props);

    // Render to image
    const buffer = await renderToImage(result, {
      width: req.width,
      height: req.height,
      format: normalizedFormat as "png" | "jpg",
    });

    // Cache the result
    setCachedImage(cacheKey, buffer, widget.cacheTtl);

    // Send response
    reply
      .type(normalizedFormat === "png" ? "image/png" : "image/jpeg")
      .send(buffer);
  } catch (error: any) {
    console.error(`Error rendering widget '${widgetId}':`, error);

    // Try to render an error image
    try {
      // Use req dimensions if available, otherwise fallback to medium size
      const errorWidth = req?.width || 638;
      const errorHeight = req?.height || 238;

      const errorBuffer = await renderErrorImage(
        error?.message || "Unknown error",
        {
          width: errorWidth,
          height: errorHeight,
          format: normalizedFormat as "png" | "jpg",
        }
      );

      reply.type("image/png").send(errorBuffer);
    } catch (renderError) {
      // If even error rendering fails, send JSON error
      reply.status(500).send({
        error: "Failed to render widget",
        message: error?.message || String(error),
      });
    }
  }
});

// Start server
const start = async () => {
  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });
    console.log(`✓ Server started successfully!`);
    console.log(
      `✓ Listening on http://${config.server.host}:${config.server.port}`
    );
    console.log(`\nExample URLs:`);
    const firstWidget = getAllWidgetIds()[0] || "clock_main";
    console.log(
      `  http://localhost:${config.server.port}/widget/${firstWidget}.png?size=s`
    );
    console.log(
      `  http://localhost:${config.server.port}/widget/${firstWidget}.png?size=m`
    );
    console.log(
      `  http://localhost:${config.server.port}/widget/${firstWidget}.png?size=l`
    );
    console.log(
      `  http://localhost:${config.server.port}/widget/${firstWidget}.png?size=fs`
    );
    console.log(
      `\nHealth check: http://localhost:${config.server.port}/health`
    );
    console.log(`Widget list: http://localhost:${config.server.port}/widgets`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
