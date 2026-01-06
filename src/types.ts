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

export interface WidgetProps<TConfig = any> {
  width: number; // From DECK_SIZES
  height: number; // From DECK_SIZES
  config: TConfig;
  theme: "dark" | "light";
  locale: string;
  tz: string;
}

export interface Widget<TConfig = any> {
  component: (props: WidgetProps<TConfig>) => Promise<ReactElement | string>;
  cacheTtl?: number; // Cache TTL in seconds
  fetchData?: (config: TConfig) => Promise<any>;
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

  // If both custom dimensions are provided, use them
  if (customWidth && customHeight && customWidth > 0 && customHeight > 0) {
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
    theme: query.theme || defaults.theme || "dark",
    locale: query.locale || defaults.locale || "cs-CZ",
    tz: query.tz || defaults.tz || "Europe/Prague",
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
