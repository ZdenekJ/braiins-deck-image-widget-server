import type { DeckSize } from "../types.js";

type CSSProperties = Record<string, string | number>;

// ============================================================================
// THEME COLORS
// ============================================================================

/**
 * Get theme colors for consistent styling across all widgets
 *
 * @param theme - "dark" or "light"
 * @returns Object with standardized colors
 *
 * @example
 * const colors = getThemeColors("dark");
 * // { bg: "#000000", text: "#ffffff", ... }
 */
export function getThemeColors(theme: "dark" | "light") {
  return {
    // Primary colors
    bg: theme === "dark" ? "#000000" : "#eeeeee",
    text: theme === "dark" ? "#ffffff" : "#0a0a0a",

    // Secondary/muted colors
    subtext: theme === "dark" ? "#888888" : "#666666",
    muted: theme === "dark" ? "#666666" : "#999999",

    // Semantic colors
    positive: theme === "dark" ? "#22c55e" : "#16a34a",
    negative: theme === "dark" ? "#ef4444" : "#dc2626",
    error: theme === "dark" ? "#ff6b6b" : "#c92a2a",
  };
}

// ============================================================================
// BASE CONTAINER STYLES
// ============================================================================

/**
 * Get base container styles that should be used by all widgets
 * These provide consistent foundation (dimensions, theme colors, font family)
 *
 * @param theme - "dark" or "light"
 * @returns Base CSS properties for widget container
 *
 * @example
 * const containerStyle = {
 *   ...getBaseContainerStyle(theme),
 *   padding: "20px",
 *   // Add widget-specific styles...
 * };
 */
export function getBaseContainerStyle(theme: "dark" | "light"): CSSProperties {
  const colors = getThemeColors(theme);

  return {
    width: "100%",
    height: "100%",
    background: colors.bg,
    color: colors.text,
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
  };
}

/**
 * Get standard padding for each deck size
 *
 * @param size - DeckSize (s, m, l, fs)
 * @returns Padding value in pixels
 */
export function getStandardPadding(size: DeckSize): string {
  const paddingMap: Record<DeckSize, string> = {
    s: "12px",
    m: "16px",
    l: "20px",
    fs: "32px",
  };

  return paddingMap[size];
}

/**
 * Get centered flex container with standard padding
 * Most common container style for widgets
 *
 * @param size - DeckSize
 * @param theme - "dark" or "light"
 * @returns Complete container style
 */
export function getCenteredContainerStyle(
  size: DeckSize,
  theme: "dark" | "light"
): CSSProperties {
  return {
    ...getBaseContainerStyle(theme),
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: getStandardPadding(size),
  };
}
