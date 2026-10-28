// React-like element type (no React dependency needed)
export interface ReactElement {
  type: string | Function;
  props: {
    children?: any;
    [key: string]: any;
  };
}

// FIXED BraiinsDeck sizes - NEVER compute dynamically!
export const DECK_SIZES = {
  s: { width: 317, height: 238 }, // small
  m: { width: 638, height: 238 }, // medium
  l: { width: 638, height: 480 }, // large
  fs: { width: 1280, height: 480 }, // fullscreen
} as const;

export type DeckSize = keyof typeof DECK_SIZES;

export interface WidgetProps<TConfig = any, TData = any> {
  width: number; // From DECK_SIZES
  height: number; // From DECK_SIZES
  config: TConfig;
  data?: TData; // Pre-fetched result of fetchData, if exported
  theme: "dark" | "light";
  locale: string;
  tz: string;
}

export interface Widget<TConfig = any, TData = any> {
  component: (props: WidgetProps<TConfig, TData>) => Promise<ReactElement | string>;
  cacheTtl?: number; // Cache TTL in seconds
  fetchData?: (config: TConfig, context: FetchContext) => Promise<TData>;
}

// Request context passed to fetchData (part of the data cache key)
export interface FetchContext {
  locale: string;
  tz: string;
}

export interface RenderRequest {
  widgetId: string;
  size: DeckSize;
  width: number; // Actual width (from size or deck_image_width)
  height: number; // Actual height (from size or deck_image_height)
  format: "png" | "jpg" | "jpeg";
  theme: "dark" | "light";
  locale: string;
  tz: string;
  refresh?: boolean;
}

const VALID_THEMES = ["dark", "light"] as const;
// Last-resort fallbacks, used only if the config defaults are invalid too
const DEFAULT_THEME = "dark";
const DEFAULT_TZ = "Europe/Prague";
const DEFAULT_LOCALE = "cs-CZ";

// Return the first candidate (query value, then config default) that passes validation
function firstValid(
  candidates: Array<string | undefined>,
  isValid: (value: string) => boolean,
  fallback: string
): string {
  for (const value of candidates) {
    if (value && isValid(value)) return value;
  }
  return fallback;
}

function isValidTheme(value: string): boolean {
  return (VALID_THEMES as readonly string[]).includes(value);
}

function isValidTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isValidLocale(value: string): boolean {
  try {
    Intl.DateTimeFormat(value);
    return true;
  } catch {
    return false;
  }
}

export function parseRenderRequest(
  widgetId: string,
  format: "png" | "jpg" | "jpeg",
  query: Record<string, any>,
  defaults: any
): RenderRequest {
  // Check if BraiinsDeck provides custom dimensions
  const customWidth = query.deck_image_width
    ? parseInt(query.deck_image_width, 10)
    : null;
  const customHeight = query.deck_image_height
    ? parseInt(query.deck_image_height, 10)
    : null;

  let width: number;
  let height: number;
  let size: DeckSize;

  const MAX_DIMENSION = 2560;

  // If both custom dimensions are provided, validate and use them
  if (customWidth !== null && customHeight !== null) {
    if (
      customWidth <= 0 || customHeight <= 0 ||
      customWidth > MAX_DIMENSION || customHeight > MAX_DIMENSION ||
      !Number.isFinite(customWidth) || !Number.isFinite(customHeight)
    ) {
      throw new Error(
        `Invalid dimensions: ${customWidth}x${customHeight}. Both values must be between 1 and ${MAX_DIMENSION}.`
      );
    }
    width = customWidth;
    height = customHeight;
    // Find closest matching size for cache key purposes
    size = findClosestSize(width, height);
    console.log(
      `Using custom dimensions: ${width}x${height} (mapped to size: ${size})`
    );
  } else {
    // Use predefined size
    size = (query.size || defaults.size || "m") as DeckSize;

    // Validate size
    if (!["s", "m", "l", "fs"].includes(size)) {
      throw new Error(`Invalid size: ${size}. Must be s, m, l, or fs`);
    }

    const dimensions = DECK_SIZES[size];
    width = dimensions.width;
    height = dimensions.height;
  }

  return {
    widgetId,
    size,
    width,
    height,
    format,
    theme: firstValid([query.theme, defaults.theme], isValidTheme, DEFAULT_THEME) as "dark" | "light",
    locale: firstValid([query.locale, defaults.locale], isValidLocale, DEFAULT_LOCALE),
    tz: firstValid([query.tz, defaults.tz], isValidTimezone, DEFAULT_TZ),
    refresh: query.refresh === "1" || query.refresh === "true",
  };
}

// Find the closest predefined size for a given width/height
function findClosestSize(width: number, height: number): DeckSize {
  let closestSize: DeckSize = "m";
  let minDiff = Infinity;

  for (const [size, dims] of Object.entries(DECK_SIZES)) {
    const diff =
      Math.abs(dims.width - width) + Math.abs(dims.height - height);
    if (diff < minDiff) {
      minDiff = diff;
      closestSize = size as DeckSize;
    }
  }

  return closestSize;
}

/**
 * Determine DeckSize from dimensions
 * Used by widgets to map width/height to size category
 *
 * @param width - Widget width in pixels
 * @param height - Widget height in pixels
 * @returns DeckSize (s, m, l, or fs)
 *
 * @example
 * getDeckSize(317, 238) // returns "s"
 * getDeckSize(638, 238) // returns "m"
 * getDeckSize(640, 240) // returns "m" (closest match)
 */
export function getDeckSize(width: number, height: number): DeckSize {
  // Exact matches
  if (width === 317 && height === 238) return "s";
  if (width === 638 && height === 238) return "m";
  if (width === 638 && height === 480) return "l";
  if (width === 1280 && height === 480) return "fs";

  // Fallback: find closest match
  return findClosestSize(width, height);
}

// JSX helper functions for widgets
export function h(type: any, props: any, ...children: any[]): ReactElement {
  return {
    type,
    props: { ...props, children },
  } as any;
}

export function Fragment(props: { children: any }): ReactElement {
  return props.children;
}

export function normalizeFormat(format: string): "png" | "jpg" {
  return format === "jpeg" ? "jpg" : (format as "png" | "jpg");
}
