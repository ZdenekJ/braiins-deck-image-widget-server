import type { Widget, WidgetProps } from "../src/types.js";

interface StatusConfig {
  label?: string;
  status?: "online" | "offline" | "warning";
  message?: string;
}

// Example functional widget that will be auto-discovered
async function StatusWidget(props: WidgetProps<StatusConfig>) {
  const { width, height, config, theme } = props;

  const label = config.label || "System Status";
  const status = config.status || "online";
  const message = config.message || "All systems operational";

  // Responsive sizing
  const labelSize = Math.min(width / 20, height / 12);
  const statusSize = Math.min(width / 6, height / 4);
  const messageSize = Math.min(width / 25, height / 15);

  // Theme colors
  const bg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  const text = theme === "dark" ? "#ffffff" : "#0a0a0a";
  const subtext = theme === "dark" ? "#888888" : "#666666";

  // Status colors
  const statusColors = {
    online: theme === "dark" ? "#22c55e" : "#16a34a",
    offline: theme === "dark" ? "#ef4444" : "#dc2626",
    warning: theme === "dark" ? "#f59e0b" : "#d97706",
  };

  const statusEmojis = {
    online: "✅",
    offline: "❌",
    warning: "⚠️",
  };

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
        gap: "10px",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              fontSize: `${labelSize}px`,
              color: subtext,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            },
            children: label,
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: `${statusSize}px`,
            },
            children: statusEmojis[status],
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: `${statusSize * 0.4}px`,
              fontWeight: "bold",
              color: statusColors[status],
              textTransform: "uppercase",
            },
            children: status,
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: `${messageSize}px`,
              color: subtext,
              textAlign: "center",
              marginTop: "5px",
            },
            children: message,
          },
        },
      ],
    },
  };
}

export default {
  component: StatusWidget,
  cacheTtl: 60, // 1 minute
} as Widget<StatusConfig>;
