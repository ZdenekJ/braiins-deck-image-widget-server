import type { Widget, WidgetProps } from "../src/types.js";

interface MyConfig {
  title: string;
  value: number;
  color?: string;
}

// Example widget using JSX-like h() function
async function MyWidget(props: WidgetProps<MyConfig>) {
  const { width, height, config, theme } = props;

  // Responsive sizes
  const titleSize = Math.min(width / 15, height / 8);
  const valueSize = Math.min(width / 4, height / 2.5);

  // Theme colors
  const bg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  const text = theme === "dark" ? "#ffffff" : "#0a0a0a";
  const accent = config.color || (theme === "dark" ? "#3b82f6" : "#2563eb");

  // You can return a React-like element using object notation
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
              fontSize: `${titleSize}px`,
              opacity: 0.7,
              marginBottom: "10px",
            },
            children: config.title,
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: `${valueSize}px`,
              fontWeight: "bold",
              color: accent,
            },
            children: config.value.toString(),
          },
        },
      ],
    },
  };
}

export default {
  component: MyWidget,
  cacheTtl: 300, // 5 minutes
} as Widget<MyConfig>;
