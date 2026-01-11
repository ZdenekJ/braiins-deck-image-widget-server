import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join, resolve } from "path";
import { existsSync } from "fs";
import { readdir, writeFile, unlink } from "fs/promises";
import * as esbuild from "esbuild";
import type { Widget } from "./types.js";
import type { WidgetConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Convert path to file:// URL for Windows compatibility
function toFileURL(path: string): string {
  return pathToFileURL(path).href;
}

// Transpile .tsx to .js in memory for production mode
async function transpileTsx(tsxPath: string): Promise<string> {
  try {
    const result = await esbuild.build({
      entryPoints: [tsxPath],
      write: false,
      bundle: false,
      format: "esm",
      target: "esnext",
      loader: { ".tsx": "tsx", ".ts": "ts" },
      platform: "node",
    });

    if (result.outputFiles && result.outputFiles.length > 0) {
      return result.outputFiles[0].text;
    }

    throw new Error("esbuild produced no output");
  } catch (error) {
    console.error(`Failed to transpile ${tsxPath}:`, error);
    throw error;
  }
}

// Check if running with tsx (dev mode)
function isDevMode(): boolean {
  // Check if tsx is in the process argv or if we're running from src/
  return (
    process.argv.some((arg) => arg.includes("tsx")) ||
    __dirname.includes("src")
  );
}

// Registry of loaded widgets
const widgetRegistry = new Map<string, { widget: Widget; config: any }>();

// Registry of available built-in widget types (auto-discovered)
const builtInWidgetTypes = new Set<string>();

// Map to store config for widgets (from config.yaml)
const widgetConfigMap = new Map<string, any>();

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

  const devMode = isDevMode();

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
        // Check if collision with built-in type
        const isBuiltInType = builtInWidgetTypes.has(widgetId);
        if (isBuiltInType) {
          console.log(
            `⚠ Skipping ${file} - widget '${widgetId}' already loaded from built-in (used in config.yaml)`
          );
        } else {
          console.log(
            `⚠ Skipping ${file} - widget '${widgetId}' already loaded`
          );
        }
        continue;
      }

      try {
        let widgetModule: any;

        // Dev mode: tsx can load .tsx directly
        if (devMode || file.endsWith(".js")) {
          const widgetURL = toFileURL(widgetPath);
          widgetModule = await import(widgetURL);
        }
        // Production mode: transpile .tsx with esbuild
        else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
          // Transpile to temporary .js file
          const transpiledCode = await transpileTsx(widgetPath);
          const tempJsPath = widgetPath.replace(/\.(tsx|ts)$/, ".temp.mjs");

          await writeFile(tempJsPath, transpiledCode, "utf-8");

          try {
            const tempURL = toFileURL(tempJsPath);
            widgetModule = await import(tempURL);
          } finally {
            // Clean up temp file
            try {
              await unlink(tempJsPath);
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }

        const widget: Widget = widgetModule?.default;

        if (widget && typeof widget.component === "function") {
          // Get config from widgetConfigMap if exists
          const config = widgetConfigMap.get(widgetId) || {};
          widgetRegistry.set(widgetId, { widget, config });
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

  // Step 2: Build config map and load configured widgets
  console.log(`Loading ${widgetConfigs.length} widgets from config...`);
  for (const widgetConfig of widgetConfigs) {
    const { id, type, file, plugin, config } = widgetConfig;

    // Store config for later use (for auto-discovered widgets)
    if (config) {
      widgetConfigMap.set(id, config);
    }

    // If type/file/plugin specified, load immediately
    if (type || file || plugin) {
      try {
        const loaded = await loadWidget(widgetConfig);
        widgetRegistry.set(widgetConfig.id, loaded);
      } catch (error) {
        console.error(`Failed to load widget '${widgetConfig.id}':`, error);
      }
    }
    // Otherwise, it's a config-only entry for auto-discovered widget
    else {
      console.log(
        `Config stored for widget '${id}' (will be applied if auto-discovered)`
      );
    }
  }

  // Step 3: Auto-discover custom widgets (won't override loaded widgets)
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
