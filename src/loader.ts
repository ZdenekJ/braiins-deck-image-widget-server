import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join, resolve } from "path";
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import type { Widget } from "./types.js";
import type { WidgetConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Convert path to file:// URL for Windows compatibility
function toFileURL(path: string): string {
  return pathToFileURL(path).href;
}

// Registry of loaded widgets
const widgetRegistry = new Map<string, { widget: Widget; config: any }>();

// Registry of available built-in widget types (auto-discovered)
const builtInWidgetTypes = new Set<string>();

// Auto-discover built-in widgets from widgets/ directory
async function loadBuiltInWidgets(): Promise<void> {
  // Simple relative path - works in both dev (src/widgets) and production (dist/widgets)
  const builtInWidgetsDir = join(__dirname, "widgets");

  if (!existsSync(builtInWidgetsDir)) {
    console.log("No built-in widgets directory found");
    return;
  }

  try {
    console.log(`Scanning for built-in widgets in: ${builtInWidgetsDir}`);
    const files = await readdir(builtInWidgetsDir);
    // Accept both .tsx (dev with tsx) and .js (production compiled)
    const widgetFiles = files.filter((f) => f.endsWith(".tsx") || f.endsWith(".js"));

    console.log(
      `Discovered ${widgetFiles.length} built-in widget type(s): ${widgetFiles.map((f) => f.replace(/\.(tsx|js)$/, "")).join(", ")}`
    );

    for (const file of widgetFiles) {
      const widgetType = file.replace(/\.(tsx|js)$/, "");
      builtInWidgetTypes.add(widgetType);
    }
  } catch (error) {
    console.error("Failed to discover built-in widgets:", error);
  }
}

// Get the built-in widgets directory path
function getBuiltInWidgetsPath(): string {
  // Simple relative path - works in both dev and production
  return join(__dirname, "widgets");
}

// Load a single widget from config
async function loadWidget(
  widgetConfig: WidgetConfig
): Promise<{ widget: Widget; config: any }> {
  const { id, type, file, plugin, config } = widgetConfig;

  try {
    let widgetModule: any;

    // Tier 1: Built-in widgets (by type)
    if (type && builtInWidgetTypes.has(type)) {
      const builtInPath = getBuiltInWidgetsPath();
      // Try .tsx first (dev mode), fallback to .js (production)
      let modulePath = join(builtInPath, `${type}.tsx`);
      if (!existsSync(modulePath)) {
        modulePath = join(builtInPath, `${type}.js`);
      }
      const moduleURL = toFileURL(modulePath);
      widgetModule = await import(moduleURL);
    }
    // Tier 2: Custom .tsx files
    else if (file) {
      const customPath = resolve(process.cwd(), file);
      if (!existsSync(customPath)) {
        throw new Error(`Custom widget file not found: ${customPath}`);
      }
      const customURL = toFileURL(customPath);
      widgetModule = await import(customURL);
    }
    // Tier 3: NPM plugins (optional)
    else if (plugin) {
      try {
        widgetModule = await import(plugin);
      } catch (error) {
        throw new Error(
          `Failed to load NPM plugin '${plugin}'. Make sure it's installed: npm install ${plugin}`
        );
      }
    } else {
      throw new Error(
        `Widget '${id}' must specify either 'type', 'file', or 'plugin'`
      );
    }

    // Get the default export
    const widget: Widget = widgetModule.default;

    if (!widget || typeof widget.component !== "function") {
      throw new Error(
        `Widget '${id}' must export a Widget with a component function`
      );
    }

    console.log(`✓ Loaded widget: ${id} (${type || file || plugin})`);

    return { widget, config: config || {} };
  } catch (error) {
    console.error(`✗ Failed to load widget '${id}':`, error);
    throw error;
  }
}

// Auto-discover and load widgets from ./widgets/ directory
async function loadCustomWidgets(): Promise<void> {
  const widgetsDir = resolve(process.cwd(), "widgets");

  if (!existsSync(widgetsDir)) {
    console.log("No ./widgets/ directory found, skipping auto-discovery");
    return;
  }

  try {
    const files = await readdir(widgetsDir);
    const widgetFiles = files.filter(
      (f) => f.endsWith(".tsx") || f.endsWith(".ts") || f.endsWith(".js")
    );

    for (const file of widgetFiles) {
      const widgetPath = join(widgetsDir, file);
      const widgetId = file.replace(/\.(tsx|ts|js)$/, "");

      // Skip if already registered
      if (widgetRegistry.has(widgetId)) {
        console.log(`Skipping ${file} - widget '${widgetId}' already loaded`);
        continue;
      }

      try {
        const widgetURL = toFileURL(widgetPath);
        const widgetModule = await import(widgetURL);
        const widget: Widget = widgetModule.default;

        if (widget && typeof widget.component === "function") {
          widgetRegistry.set(widgetId, { widget, config: {} });
          console.log(`✓ Auto-discovered widget: ${widgetId} (${file})`);
        }
      } catch (error) {
        console.error(`✗ Failed to auto-load ${file}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to read ./widgets/ directory:", error);
  }
}

// Initialize all widgets from config
export async function initializeWidgets(
  widgetConfigs: WidgetConfig[]
): Promise<void> {
  // Step 1: Auto-discover built-in widget types
  await loadBuiltInWidgets();

  // Step 2: Load configured widgets
  console.log(`Loading ${widgetConfigs.length} widgets from config...`);
  for (const widgetConfig of widgetConfigs) {
    try {
      const loaded = await loadWidget(widgetConfig);
      widgetRegistry.set(widgetConfig.id, loaded);
    } catch (error) {
      console.error(`Failed to load widget '${widgetConfig.id}':`, error);
    }
  }

  // Step 3: Auto-discover custom widgets (won't override built-in)
  await loadCustomWidgets();

  console.log(`✓ Total widgets loaded: ${widgetRegistry.size}`);
}

// Get a widget by ID
export function getWidget(
  widgetId: string
): { widget: Widget; config: any } | undefined {
  return widgetRegistry.get(widgetId);
}

// Get all widget IDs
export function getAllWidgetIds(): string[] {
  return Array.from(widgetRegistry.keys());
}

// Get widget info for listing
export function getWidgetInfo(): Array<{
  id: string;
  cacheTtl?: number;
  hasFetchData: boolean;
}> {
  return Array.from(widgetRegistry.entries()).map(([id, { widget }]) => ({
    id,
    cacheTtl: widget.cacheTtl,
    hasFetchData: typeof widget.fetchData === "function",
  }));
}
