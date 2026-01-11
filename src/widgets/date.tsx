import type { Widget, WidgetProps, DeckSize } from "../types.js";

interface DateConfig {
  weekday?: "short" | "long"; // If not set, don't show weekday
  month?: "numeric" | "2-digit" | "short" | "long"; // Default: long
  showWeekNumber?: boolean; // Show week number (e.g., "2. týden"), default: false
  locale?: string; // Override default locale (e.g., "en-US", "cs-CZ")
}

type CSSProperties = Record<string, string | number>;

// ============================================================================
// DATE FORMATTING FUNCTIONS
// ============================================================================

function getWeekNumber(date: Date): number {
  // ISO 8601 week number calculation
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

function getWeekNumberText(locale: string, weekNum: number): string {
  const lang = locale.split("-")[0];

  if (lang === "cs") {
    return `${weekNum}. týden`;
  } else if (lang === "en") {
    return `Week ${weekNum}`;
  } else {
    return `Week ${weekNum}`;
  }
}

function getDateText(
  tz: string,
  locale: string,
  monthFormat: "numeric" | "2-digit" | "short" | "long"
): string {
  const now = new Date();

  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    day: "numeric",
    month: monthFormat,
    year: "numeric",
  };

  return now.toLocaleDateString(locale, dateOptions);
}

function getWeekdayText(
  tz: string,
  locale: string,
  weekdayFormat: "short" | "long"
): string {
  const now = new Date();

  const weekdayOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    weekday: weekdayFormat,
  };

  return now.toLocaleDateString(locale, weekdayOptions);
}

// ============================================================================
// STYLE FUNCTIONS - Pixel-perfect styles for each size
// ============================================================================

function getContainerStyle(size: DeckSize, theme: string): CSSProperties {
  const base = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    background: theme === "dark" ? "#000000" : "#eeeeee",
    color: theme === "dark" ? "#ffffff" : "#0a0a0a",
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
    padding: "20px",
  };

  return base;
}

function getWeekdayStyle(size: DeckSize, theme: string): CSSProperties {
  const base = {
    fontWeight: "400",
    textAlign: "center",
    textTransform: "capitalize",
    color: theme === "dark" ? "#888888" : "#666666",
    marginBottom: "8px",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "16px" },
    m: { fontSize: "20px" },
    l: { fontSize: "24px" },
    fs: { fontSize: "36px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getDateStyle(size: DeckSize): CSSProperties {
  const base = {
    fontWeight: "700",
    textAlign: "center",
    lineHeight: "1.2",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "32px" },
    m: { fontSize: "48px" },
    l: { fontSize: "64px" },
    fs: { fontSize: "96px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getWeekNumberStyle(size: DeckSize, theme: string): CSSProperties {
  const base = {
    fontWeight: "400",
    textAlign: "center",
    marginTop: "12px",
    color: theme === "dark" ? "#888888" : "#666666",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "14px" },
    m: { fontSize: "18px" },
    l: { fontSize: "22px" },
    fs: { fontSize: "32px" },
  };

  return { ...base, ...sizeStyles[size] };
}

// Helper: Determine size from dimensions
function getDeckSize(width: number, height: number): DeckSize {
  if (width === 317 && height === 238) return "s";
  if (width === 638 && height === 238) return "m";
  if (width === 638 && height === 480) return "l";
  if (width === 1280 && height === 480) return "fs";

  // Fallback: find closest match
  const sizes = [
    { size: "s" as DeckSize, w: 317, h: 238 },
    { size: "m" as DeckSize, w: 638, h: 238 },
    { size: "l" as DeckSize, w: 638, h: 480 },
    { size: "fs" as DeckSize, w: 1280, h: 480 },
  ];

  let closest = sizes[0];
  let minDiff = Math.abs(width - closest.w) + Math.abs(height - closest.h);

  for (const s of sizes) {
    const diff = Math.abs(width - s.w) + Math.abs(height - s.h);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }

  return closest.size;
}

// ============================================================================
// MAIN WIDGET COMPONENT
// ============================================================================

async function DateWidget(props: WidgetProps<DateConfig>) {
  const { width, height, config, theme, locale, tz } = props;
  const { weekday, month = "long", showWeekNumber = false, locale: configLocale } = config;

  // Determine deck size
  const size = getDeckSize(width, height);

  // Use config locale if provided, otherwise use default locale from props
  const effectiveLocale = configLocale || locale;

  // Get date parts
  const dateText = getDateText(tz, effectiveLocale, month);
  const weekdayText = weekday ? getWeekdayText(tz, effectiveLocale, weekday) : null;
  const weekNumberText = showWeekNumber
    ? getWeekNumberText(effectiveLocale, getWeekNumber(new Date()))
    : null;

  // Get styles for this size
  const containerStyle = getContainerStyle(size, theme);
  const weekdayStyle = getWeekdayStyle(size, theme);
  const dateStyle = getDateStyle(size);
  const weekNumberStyle = getWeekNumberStyle(size, theme);

  // Build children array
  const children: any[] = [];

  // Add weekday if configured
  if (weekdayText) {
    children.push({
      type: "div",
      props: {
        style: weekdayStyle,
        children: weekdayText,
      },
    });
  }

  // Add main date
  children.push({
    type: "div",
    props: {
      style: dateStyle,
      children: dateText,
    },
  });

  // Add week number if configured
  if (weekNumberText) {
    children.push({
      type: "div",
      props: {
        style: weekNumberStyle,
        children: weekNumberText,
      },
    });
  }

  // Build JSX structure
  return {
    type: "div",
    props: {
      style: containerStyle,
      children,
    },
  };
}

export default {
  component: DateWidget,
  cacheTtl: 3600, // Cache for 1 hour (date changes once per day, but refresh hourly for safety)
} as Widget;
