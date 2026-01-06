import { readFileSync } from "fs";
import { parse } from "yaml";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ServerConfig {
  port: number;
  host: string;
  authToken?: string;
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

export function loadConfig(configPath?: string): Config {
  const path = configPath || join(__dirname, "..", "config.yaml");

  try {
    const fileContent = readFileSync(path, "utf-8");
    const parsed = parse(fileContent);
    const expanded = expandEnvVars(parsed);

    // Validate required fields
    if (!expanded.server) {
      throw new Error("Missing 'server' section in config.yaml");
    }
    if (!expanded.defaults) {
      throw new Error("Missing 'defaults' section in config.yaml");
    }
    if (!expanded.widgets || !Array.isArray(expanded.widgets)) {
      throw new Error("Missing or invalid 'widgets' section in config.yaml");
    }

    // Set defaults
    const config: Config = {
      server: {
        port: expanded.server.port || 3000,
        host: expanded.server.host || "0.0.0.0",
        authToken: expanded.server.authToken,
      },
      defaults: {
        locale: expanded.defaults.locale || "cs-CZ",
        tz: expanded.defaults.tz || "Europe/Prague",
        theme: expanded.defaults.theme || "dark",
        size: expanded.defaults.size || "m",
      },
      widgets: expanded.widgets,
    };

    return config;
  } catch (error) {
    console.error(`Failed to load config from ${path}:`, error);
    throw error;
  }
}
