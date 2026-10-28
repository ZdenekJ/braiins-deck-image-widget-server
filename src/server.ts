import "dotenv/config";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { initializeWidgets } from "./loader.js";
import { RenderService } from "./services/render.service.js";
import { WidgetController } from "./controllers/widget.controller.js";
import { setFonts } from "./renderer.js";

// Hide ?token=... from request URLs in logs
function maskToken(url: string): string {
  return url.replace(/([?&]token=)[^&]*/g, "$1***");
}

const app = Fastify({
  logger: {
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: maskToken(req.url),
          host: req.host,
          remoteAddress: req.ip,
          remotePort: req.socket?.remotePort,
        };
      },
    },
  },
});

// Load configuration
let config: ReturnType<typeof loadConfig>;

try {
  config = loadConfig();
  console.log(`Server will run on ${config.server.host}:${config.server.port}`);
} catch (error) {
  console.error("Failed to load configuration:", error);
  process.exit(1);
}

// Configure fonts for renderer
if (config.server.fonts && config.server.fonts.length > 0) {
  setFonts(config.server.fonts);
  console.log(`Fonts configured: ${config.server.fonts.length} font(s)`);
}

// Initialize logic
const renderService = new RenderService(config);
const widgetController = new WidgetController(renderService, config);

// Initialize widgets on startup
await initializeWidgets(config.widgets);

// Authentication (optional): token via ?token=... (BraiinsDeck can't send headers)
// or via "Authorization: Bearer ..." header
if (config.server.authToken) {
  const expectedToken = config.server.authToken;
  app.addHook("onRequest", async (request, reply) => {
    const header = request.headers.authorization;
    const headerToken = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const queryToken = (request.query as Record<string, unknown>)?.token;
    const token =
      headerToken ?? (typeof queryToken === "string" ? queryToken : undefined);

    if (token !== expectedToken) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
}

// Routes
app.get("/health", widgetController.healthCheck.bind(widgetController));
app.get("/widgets", widgetController.listWidgets.bind(widgetController));
app.get(
  "/debug/:widgetId",
  widgetController.debugWidget.bind(widgetController),
);
app.get(
  "/widget/:widgetId.:format",
  widgetController.renderWidget.bind(widgetController),
);

// Start server
const start = async () => {
  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    const address = `http://${config.server.host}:${config.server.port}`;
    app.log.info(`Server listening on ${address}`);

    // Log helpful info (using console.log for visibility in terminal)
    console.log(`\nExample URLs:`);
    console.log(`  ${address}/widget/date.png`);
    console.log(`  ${address}/health`);
    console.log(`  ${address}/widgets`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
