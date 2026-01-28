import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface FontEntry {
  family: string; // Font family name (e.g., "Inter")
  file: string; // Path to font file relative to project root
  weight?: number; // Font weight (100-900), defaults to 400
  style?: "normal" | "italic"; // Font style, defaults to "normal"
}

export interface ServerConfig {
  port: number;
  host: string;
  authToken?: string;
  fonts?: FontEntry[]; // Array of font configurations
}

export interface DefaultsConfig {
  locale: string;
  tz: string;
  theme: "dark" | "light";
  size: "s" | "m" | "l" | "fs";
}

export interface WidgetConfig {
  id: string;
  type?: string; // Built-in widget type (clock, weather, crypto-ticker)
  file?: string; // Path to custom .tsx file
  plugin?: string; // NPM plugin name
  config?: any; // Widget-specific configuration
}

export interface Config {
  server: ServerConfig;
  defaults: DefaultsConfig;
  widgets: WidgetConfig[];
}

// Expand environment variables in strings (${VAR} format)
function expandEnvVars(obj: any): any {
  if (typeof obj === "string") {
    return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return process.env[varName] || "";
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(expandEnvVars);
  }
  if (typeof obj === "object" && obj !== null) {
    const result: any = {};
    for (const key in obj) {
      result[key] = expandEnvVars(obj[key]);
    }
    return result;
  }
  return obj;
}

/**
 * Merge server configuration from base and local
 * Local values take precedence over base values
 */
function mergeServerConfig(
  base: any,
  local: any | undefined
): Partial<ServerConfig> {
  if (!local) return base;

  // For fonts array: local completely replaces base if provided
  return {
    ...base,
    ...local,
    fonts: local.fonts ?? base.fonts,
  };
}

/**
 * Merge defaults configuration from base and local
 * Local values take precedence over base values
 */
function mergeDefaultsConfig(
  base: any,
  local: any | undefined
): Partial<DefaultsConfig> {
  if (!local) return base;

  return {
    ...base,
    ...local,
  };
}

/**
 * Merge widget arrays from base and local
 * Logic:
 * 1. All widgets from local config are used first
 * 2. Widgets from base config are added ONLY if their ID is not already in local
 * 3. If a widget ID exists in both, the local version completely replaces the base version
 */
function mergeWidgets(
  baseWidgets: WidgetConfig[],
  localWidgets: WidgetConfig[] | undefined
): WidgetConfig[] {
  if (!localWidgets || localWidgets.length === 0) {
    return baseWidgets;
  }

  // Collect all IDs from local widgets
  const localIds = new Set(localWidgets.map((w) => w.id));

  // Start with all local widgets
  const result = [...localWidgets];

  // Add base widgets that don't have ID conflicts
  for (const baseWidget of baseWidgets) {
    if (!localIds.has(baseWidget.id)) {
      result.push(baseWidget);
    }
  }

  return result;
}

/**
 * Load and parse a YAML config file
 */
function loadYamlFile(path: string): any | null {
  try {
    if (!existsSync(path)) {
      return null;
    }
    const fileContent = readFileSync(path, "utf-8");
    const parsed = parse(fileContent);
    return expandEnvVars(parsed);
  } catch (error) {
    console.error(`Failed to load config from ${path}:`, error);
    return null;
  }
}

export function loadConfig(configPath?: string): Config {
  const basePath = configPath || join(__dirname, "..", "config.yaml");
  const localPath = basePath.replace(/\.yaml$/, ".local.yaml");

  console.log("\n========================================");
  console.log("LOADING CONFIGURATION");
  console.log("========================================\n");

  // Load base config
  console.log(`📄 Loading base config: ${basePath}`);
  const baseConfig = loadYamlFile(basePath);

  if (!baseConfig) {
    throw new Error(`Failed to load base config from ${basePath}`);
  }

  // Validate required fields in base config
  if (!baseConfig.server) {
    throw new Error("Missing 'server' section in config.yaml");
  }
  if (!baseConfig.defaults) {
    throw new Error("Missing 'defaults' section in config.yaml");
  }
  if (!baseConfig.widgets || !Array.isArray(baseConfig.widgets)) {
    throw new Error("Missing or invalid 'widgets' section in config.yaml");
  }

  console.log(`   ✓ Base config loaded`);
  console.log(
    `   - ${baseConfig.widgets.length} widget(s) defined in base config`
  );

  // Try to load local config
  console.log(`\n📄 Looking for local config: ${localPath}`);
  const localConfig = loadYamlFile(localPath);

  let mergedServer: any;
  let mergedDefaults: any;
  let mergedWidgets: WidgetConfig[];

  if (localConfig) {
    console.log(`   ✓ Local config found - merging configurations\n`);

    // Merge server config
    console.log("🔀 Merging server configuration:");
    mergedServer = mergeServerConfig(baseConfig.server, localConfig.server);
    if (localConfig.server) {
      console.log(`   ✓ Server settings overridden by local config`);
      if (localConfig.server.port)
        console.log(`     - port: ${localConfig.server.port}`);
      if (localConfig.server.host)
        console.log(`     - host: ${localConfig.server.host}`);
      if (localConfig.server.authToken)
        console.log(`     - authToken: ***configured***`);
      if (localConfig.server.fonts)
        console.log(
          `     - fonts: ${localConfig.server.fonts.length} font(s) configured`
        );
    } else {
      console.log(`   ℹ️  Using base server configuration`);
    }

    // Merge defaults config
    console.log(`\n🔀 Merging defaults configuration:`);
    mergedDefaults = mergeDefaultsConfig(
      baseConfig.defaults,
      localConfig.defaults
    );
    if (localConfig.defaults) {
      console.log(`   ✓ Defaults overridden by local config`);
      if (localConfig.defaults.locale)
        console.log(`     - locale: ${localConfig.defaults.locale}`);
      if (localConfig.defaults.tz)
        console.log(`     - tz: ${localConfig.defaults.tz}`);
      if (localConfig.defaults.theme)
        console.log(`     - theme: ${localConfig.defaults.theme}`);
      if (localConfig.defaults.size)
        console.log(`     - size: ${localConfig.defaults.size}`);
    } else {
      console.log(`   ℹ️  Using base defaults configuration`);
    }

    // Merge widgets
    console.log(`\n🔀 Merging widgets configuration:`);
    const localWidgets = localConfig.widgets || [];
    mergedWidgets = mergeWidgets(baseConfig.widgets, localWidgets);

    if (localWidgets.length > 0) {
      console.log(`   ✓ Widgets merged (local takes precedence)`);
      console.log(
        `     - ${localWidgets.length} widget(s) from local config (primary)`
      );

      const localIds = new Set(localWidgets.map((w: WidgetConfig) => w.id));
      const addedFromBase = baseConfig.widgets.filter(
        (w: WidgetConfig) => !localIds.has(w.id)
      );
      const overriddenFromBase = baseConfig.widgets.filter(
        (w: WidgetConfig) => localIds.has(w.id)
      );

      if (addedFromBase.length > 0) {
        console.log(
          `     - ${addedFromBase.length} widget(s) added from base config`
        );
        addedFromBase.forEach((w: WidgetConfig) => {
          console.log(`       + ${w.id} (from base)`);
        });
      }

      if (overriddenFromBase.length > 0) {
        console.log(
          `     - ${overriddenFromBase.length} widget(s) overridden by local config`
        );
        overriddenFromBase.forEach((w: WidgetConfig) => {
          console.log(`       ⚠️  ${w.id} (local replaces base)`);
        });
      }

      console.log(`     - Total: ${mergedWidgets.length} widget(s) in final config`);
    } else {
      console.log(`   ℹ️  No widgets in local config, using all base widgets`);
      console.log(`     - ${mergedWidgets.length} widget(s) from base config`);
    }
  } else {
    console.log(`   ℹ️  No local config found - using base config only\n`);
    mergedServer = baseConfig.server;
    mergedDefaults = baseConfig.defaults;
    mergedWidgets = baseConfig.widgets;
  }

  // Default fonts if none provided
  const defaultFonts: FontEntry[] = [
    {
      family: "Inter",
      file: "fonts/Inter-Regular.ttf",
      weight: 400,
      style: "normal",
    },
  ];

  // Normalize fonts array (apply defaults for weight/style)
  const fonts: FontEntry[] = (mergedServer.fonts || defaultFonts).map(
    (f: any) => ({
      family: f.family,
      file: f.file,
      weight: f.weight || 400,
      style: f.style || "normal",
    })
  );

  // Apply defaults to merged config
  const config: Config = {
    server: {
      port: mergedServer.port || 3000,
      host: mergedServer.host || "0.0.0.0",
      authToken: mergedServer.authToken,
      fonts,
    },
    defaults: {
      locale: mergedDefaults.locale || "cs-CZ",
      tz: mergedDefaults.tz || "Europe/Prague",
      theme: mergedDefaults.theme || "dark",
      size: mergedDefaults.size || "m",
    },
    widgets: mergedWidgets,
  };

  // Final summary
  console.log(`\n========================================`);
  console.log("FINAL CONFIGURATION SUMMARY");
  console.log("========================================");
  console.log(`Server: ${config.server.host}:${config.server.port}`);
  if (config.server.fonts && config.server.fonts.length > 0) {
    console.log(`Fonts (${config.server.fonts.length}):`);
    config.server.fonts.forEach((f) => {
      console.log(`  - ${f.family} (weight: ${f.weight}, style: ${f.style}) → ${f.file}`);
    });
  }
  console.log(
    `Defaults: ${config.defaults.locale}, ${config.defaults.tz}, ${config.defaults.theme}, ${config.defaults.size}`
  );
  console.log(`Widgets (${config.widgets.length} total):`);
  config.widgets.forEach((w, i) => {
    const type = w.type ? `type: ${w.type}` : w.file ? `file: ${w.file}` : w.plugin ? `plugin: ${w.plugin}` : "unknown";
    console.log(`  ${i + 1}. ${w.id} (${type})`);
  });
  console.log("========================================\n");

  return config;
}
