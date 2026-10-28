import type { FastifyRequest, FastifyReply } from "fastify";
import { WidgetNotFoundError, type RenderService } from "../services/render.service.js";
import { parseRenderRequest, normalizeFormat, DECK_SIZES } from "../types.js";
import type { DeckSize, RenderRequest } from "../types.js";
import { getAllWidgetIds, getWidget, getWidgetInfo } from "../loader.js";
import { getCacheStats, CacheStats } from "../cache.js";

// Re-map cache stats for the controller
const getStats = getCacheStats;

export class WidgetController {
  private renderService: RenderService;
  private config: any;
  private debug: boolean;

  constructor(renderService: RenderService, config: any) {
    this.renderService = renderService;
    this.config = config;
    this.debug = config.server.debug === true;
  }

  /**
   * GET /health
   */
  async healthCheck(req: FastifyRequest, reply: FastifyReply) {
      if (!this.debug) {
        return reply.status(404).send({ error: "Not found" });
      }

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

    const imageFormat = normalizeFormat(format);
    let renderRequest: RenderRequest | undefined;

    try {
        // Parse request
        renderRequest = parseRenderRequest(
            widgetId,
            imageFormat,
            req.query,
            this.config.defaults
        );

        // refresh=1 is only honoured in debug mode
        if (!this.debug) {
            renderRequest.refresh = false;
        }

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
        
        if (error instanceof WidgetNotFoundError) {
             return reply.status(404).send({
                error: error.message,
                available: this.renderService.getAvailableWidgets(),
            });
        }

        // Try to render error image in the requested dimensions and format
        // (falls back to the default size if the request itself couldn't be parsed)
        try {
            const fallbackSize = DECK_SIZES[this.config.defaults.size as DeckSize] ?? DECK_SIZES.m;
            const errorBuffer = await this.renderService.renderError(
                error?.message || "Unknown error",
                {
                    width: renderRequest?.width ?? fallbackSize.width,
                    height: renderRequest?.height ?? fallbackSize.height,
                    format: imageFormat,
                }
            );
            return reply
                .type(imageFormat === "png" ? "image/png" : "image/jpeg")
                .send(errorBuffer);

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
    if (!this.debug) {
      return reply.status(404).send({ error: "Not found" });
    }

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

        // Same props (incl. fetchData result) as a real render, to expose internals
        const props = await this.renderService.prepareProps(
            renderRequest,
            widget,
            widgetConfig
        );

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
