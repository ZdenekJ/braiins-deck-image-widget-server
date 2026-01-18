import type { FastifyRequest, FastifyReply } from "fastify";
import type { RenderService } from "../services/render.service.js";
import { parseRenderRequest } from "../types.js";
import { getAllWidgetIds, getWidget, getWidgetInfo } from "../loader.js";
import { getCacheStats, CacheStats } from "../cache.js";

// Re-map cache stats for the controller
const getStats = getCacheStats;

export class WidgetController {
  private renderService: RenderService;
  private config: any;

  constructor(renderService: RenderService, config: any) {
    this.renderService = renderService;
    this.config = config;
  }

  /**
   * GET /health
   */
  async healthCheck(req: FastifyRequest, reply: FastifyReply) {
      const stats = getStats();
      const widgets = getAllWidgetIds();
      
      return {
        status: "ok",
        uptime: process.uptime(),
        widgets: widgets.length,
        cache: stats,
      };
  }

  /**
   * GET /widgets
   */
  async listWidgets(req: FastifyRequest, reply: FastifyReply) {
    const widgets = getWidgetInfo();
    return {
      widgets,
      total: widgets.length,
    };
  }

  /**
   * GET /widget/:widgetId.:format
   */
  async renderWidget(
    req: FastifyRequest<{
      Params: { widgetId: string; format: string };
      Querystring: Record<string, string>;
    }>,
    reply: FastifyReply
  ) {
    const { widgetId, format } = req.params;

    // Validate format
    if (!["png", "jpg", "jpeg"].includes(format)) {
      return reply.status(400).send({
        error: `Invalid format: ${format}. Must be 'png', 'jpg', or 'jpeg'`,
      });
    }

    try {
        // Parse request
        const renderRequest = parseRenderRequest(
            widgetId,
            format === "jpeg" ? "jpg" : (format as "png" | "jpg"),
            req.query,
            this.config.defaults
        );

        // Render via service
        const result = await this.renderService.renderWidget(renderRequest);

        // Send response
        reply.type(result.contentType);
        if (result.fromCache) {
            reply.header("X-Cache", "HIT");
        } else {
            reply.header("X-Cache", "MISS");
        }
        return reply.send(result.buffer);

    } catch (error: any) {
        req.log.error(error);
        
        // Handle specific errors (e.g. not found)
        if (error.message.includes("not found")) {
             return reply.status(404).send({
                error: error.message,
                available: this.renderService.getAvailableWidgets(),
            });
        }

        // Try to render error image
        try {
            // Best effort to get dimensions
            const width = parseInt(req.query.width || "638");
            const height = parseInt(req.query.height || "238");
            
            // We need to construct a partial render request or just pass manual dims
            // But renderError needs a proper RenderRequest object in my previous design? 
            // Let's modify service to be more flexible or mock it here.
            // Actually, let's try to parse it again or use defaults.
            
            // Simplified error rendering uses just text + dims
            const errorBuffer = await this.renderService.renderError(
                error.message || "Unknown error",
                {
                    // Fallback RenderRequest-like object
                    widgetId,
                    size: "m", // Fallback
                    width: isNaN(width) ? 638 : width,
                    height: isNaN(height) ? 238 : height,
                    format: (format === "jpeg" ? "jpg" : format) as "png" | "jpg",
                    theme: "dark",
                    locale: "en",
                    tz: "UTC"
                }
            );
            return reply.type("image/png").send(errorBuffer);
        
        } catch (renderErr) {
            return reply.status(500).send({
                error: "Failed to render widget",
                message: error.message
            });
        }
    }
  }

  /**
   * GET /debug/:widgetId
   */
  async debugWidget(
    req: FastifyRequest<{
      Params: { widgetId: string };
      Querystring: Record<string, string>;
    }>,
    reply: FastifyReply
  ) {
    const { widgetId } = req.params;

    const loaded = getWidget(widgetId);
    if (!loaded) {
      return reply.status(404).send({
        error: `Widget '${widgetId}' not found`,
        available: getAllWidgetIds(),
      });
    }

    try {
         const renderRequest = parseRenderRequest(
            widgetId,
            "png", // Default for debug
            req.query,
            this.config.defaults
        );
        
        const { widget, config: widgetConfig } = loaded;

        // Manually running logic similar to service to expose internals
        const props = {
            width: renderRequest.width,
            height: renderRequest.height,
            config: widgetConfig,
            theme: renderRequest.theme,
            locale: renderRequest.locale,
            tz: renderRequest.tz,
        };

        const result = await widget.component(props);

        return {
            widgetId,
            request: renderRequest,
            dimensions: { width: renderRequest.width, height: renderRequest.height },
            props,
            output: typeof result === "string" ? result : "<ReactElement>",
            cacheTtl: widget.cacheTtl,
        };

    } catch (error: any) {
        req.log.error(error);
        return reply.status(500).send({
            error: "Widget execution failed",
            message: error?.message
        });
    }
  }
}
