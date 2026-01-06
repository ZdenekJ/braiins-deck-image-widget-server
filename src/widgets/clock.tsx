import type { Widget, WidgetProps } from "../types.js";

interface ClockConfig {
  format?: "12h" | "24h";
  showSeconds?: boolean;
  showDate?: boolean;
}

async function ClockWidget(props: WidgetProps<ClockConfig>) {
  const { width, height, config, theme, locale, tz } = props;
  const format = config.format || "24h";
  const showSeconds = config.showSeconds ?? true;
  const showDate = config.showDate ?? true;

  // Get current time in specified timezone
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds && { second: "2-digit" }),
    hour12: format === "12h",
  };

  const timeStr = now.toLocaleTimeString(locale, options);

  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const dateStr = now.toLocaleDateString(locale, dateOptions);

  // Responsive font sizes
  const timeSize = Math.min(width / 6, height / 2.5);
  const dateSize = Math.min(width / 20, height / 12);

  // Theme colors
  const bg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  const text = theme === "dark" ? "#ffffff" : "#0a0a0a";
  const dateColor = theme === "dark" ? "#888888" : "#666666";

  return {
    type: "div",
    props: {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: bg,
        color: text,
        fontFamily: "sans-serif",
        padding: "20px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              fontSize: `${timeSize}px`,
              fontWeight: "bold",
              letterSpacing: "0.05em",
            },
            children: timeStr,
          },
        },
        showDate && {
          type: "div",
          props: {
            style: {
              fontSize: `${dateSize}px`,
              color: dateColor,
              marginTop: "10px",
              textAlign: "center",
            },
            children: dateStr,
          },
        },
      ].filter(Boolean),
    },
  };
}

export default {
  component: ClockWidget,
  cacheTtl: 1, // 1 second cache
} as Widget<ClockConfig>;
