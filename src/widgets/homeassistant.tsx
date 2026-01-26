import type { Widget, WidgetProps, DeckSize } from "../types.js";
import { getDeckSize } from "../types.js";
import { getThemeColors } from "../styles/common.js";

interface HomeAssistantConfig {
  title?: string; // Optional title shown above all entities
  entities: string[]; // Array of entity IDs (e.g., ["sensor.temperature", "light.living_room"])
  host?: string; // Override HA_HOST from env
  token?: string; // Override HA_TOKEN from env
}

type CSSProperties = Record<string, string | number>;

interface EntityState {
  entityId: string;
  name: string; // Friendly name from HA
  state: string; // Current state value
  unit?: string; // Unit of measurement (if available)
  error?: string; // Error message if fetch failed
}

// Home Assistant logo SVG as data URI
const HA_LOGO_SVG = `data:image/svg+xml;base64,${Buffer.from(
  `<svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M240 224.762C240 233.012 233.25 239.762 225 239.762H15C6.75 239.762 0 233.012 0 224.762V134.762C0 126.512 4.77 114.993 10.61 109.153L109.39 10.3725C115.22 4.5425 124.77 4.5425 130.6 10.3725L229.39 109.162C235.22 114.992 240 126.522 240 134.772V224.772V224.762Z" fill="#F2F4F9"/>
<path d="M229.39 109.153L130.61 10.3725C124.78 4.5425 115.23 4.5425 109.4 10.3725L10.61 109.153C4.78 114.983 0 126.512 0 134.762V224.762C0 233.012 6.75 239.762 15 239.762H107.27L66.64 199.132C64.55 199.852 62.32 200.262 60 200.262C48.7 200.262 39.5 191.062 39.5 179.762C39.5 168.462 48.7 159.262 60 159.262C71.3 159.262 80.5 168.462 80.5 179.762C80.5 182.092 80.09 184.322 79.37 186.412L111 218.042V102.162C104.2 98.8225 99.5 91.8425 99.5 83.7725C99.5 72.4725 108.7 63.2725 120 63.2725C131.3 63.2725 140.5 72.4725 140.5 83.7725C140.5 91.8425 135.8 98.8225 129 102.162V183.432L160.46 151.972C159.84 150.012 159.5 147.932 159.5 145.772C159.5 134.472 168.7 125.272 180 125.272C191.3 125.272 200.5 134.472 200.5 145.772C200.5 157.072 191.3 166.272 180 166.272C177.5 166.272 175.12 165.802 172.91 164.982L129 208.892V239.772H225C233.25 239.772 240 233.022 240 224.772V134.772C240 126.522 235.23 115.002 229.39 109.162V109.153Z" fill="#18BCF2"/>
</svg>`,
).toString("base64")}`;

// ============================================================================
// STYLE FUNCTIONS - Pixel-perfect styles for each size
// ============================================================================

function getContainerStyle(theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  return {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    height: "100%",
    background: colors.bg,
    color: colors.text,
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
    padding: "20px",
    gap: "12px",
  };
}

function getLogoBadgeStyle(size: DeckSize): CSSProperties {
  const base = {
    position: "absolute",
    top: "8px",
    left: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { top: "6px", left: "6px", gap: "4px" },
    m: { top: "8px", left: "8px", gap: "8px" },
    l: { top: "10px", left: "10px", gap: "12px" },
    fs: { top: "12px", left: "12px", gap: "16px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getLogoIconStyle(size: DeckSize): CSSProperties {
  const sizeValues: Record<DeckSize, number> = {
    s: 16,
    m: 20,
    l: 24,
    fs: 32,
  };

  const iconSize = sizeValues[size];
  return {
    width: `${iconSize}px`,
    height: `${iconSize}px`,
  };
}

function getLogoTextStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    fontWeight: "500",
    color: colors.subtext,
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "10px", display: "none" }, // Hide text on small
    m: { fontSize: "20px" },
    l: { fontSize: "24px" },
    fs: { fontSize: "32px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getTitleStyle(size: DeckSize, theme: string): CSSProperties {
  const base = {
    fontWeight: "700",
    textAlign: "center",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "28px", lineHeight: "3" },
    m: { fontSize: "32px", lineHeight: "3" },
    l: { fontSize: "40px", lineHeight: "3" },
    fs: { fontSize: "48px", lineHeight: "3" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getEntityContainerStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  };
}

function getEntityRowStyle(size: DeckSize): CSSProperties {
  const base = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  return base;
}

function getEntityNameStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    fontWeight: "400",
    color: colors.subtext,
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "24px" },
    m: { fontSize: "24px" },
    l: { fontSize: "32px" },
    fs: { fontSize: "40px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getEntityValueStyle(size: DeckSize): CSSProperties {
  const base = {
    fontWeight: "700",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "40px" },
    m: { fontSize: "40px" },
    l: { fontSize: "56px" },
    fs: { fontSize: "96px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getErrorStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    fontWeight: "400",
    color: colors.error,
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "12px" },
    m: { fontSize: "16px" },
    l: { fontSize: "20px" },
    fs: { fontSize: "28px" },
  };

  return { ...base, ...sizeStyles[size] };
}

// ============================================================================
// HOME ASSISTANT API
// ============================================================================

async function fetchEntityState(
  entityId: string,
  host: string,
  token: string,
): Promise<EntityState> {
  try {
    const url = `${host}/api/states/${entityId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as any;

    return {
      entityId,
      name: data.attributes?.friendly_name || entityId,
      state: data.state,
      unit: data.attributes?.unit_of_measurement,
    };
  } catch (error) {
    console.error(`Failed to fetch HA entity ${entityId}:`, error);
    return {
      entityId,
      name: entityId,
      state: "N/A",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function fetchAllEntities(
  entities: string[],
  host: string,
  token: string,
): Promise<EntityState[]> {
  const promises = entities.map((entityId) =>
    fetchEntityState(entityId, host, token),
  );
  return Promise.all(promises);
}

// ============================================================================
// MAIN WIDGET COMPONENT
// ============================================================================

async function HomeAssistantWidget(props: WidgetProps<HomeAssistantConfig>) {
  const { width, height, config, theme } = props;
  const { title, entities } = config;

  // Get HA credentials from config or environment
  const host =
    config.host || process.env.HA_HOST || "http://homeassistant.local:8123";
  const token = config.token || process.env.HA_TOKEN || "";

  if (!token) {
    console.warn("No Home Assistant token provided in config or HA_TOKEN env");
  }

  // Determine deck size
  const size = getDeckSize(width, height);

  // Fetch all entity states
  const entityStates = await fetchAllEntities(entities, host, token);

  // Get styles for this size
  const containerStyle = getContainerStyle(theme);
  const logoBadgeStyle = getLogoBadgeStyle(size);
  const logoIconStyle = getLogoIconStyle(size);
  const logoTextStyle = getLogoTextStyle(size, theme);
  const titleStyle = getTitleStyle(size, theme);
  const entityContainerStyle = getEntityContainerStyle();
  const entityRowStyle = getEntityRowStyle(size);
  const entityNameStyle = getEntityNameStyle(size, theme);
  const entityValueStyle = getEntityValueStyle(size);
  const errorStyle = getErrorStyle(size, theme);

  // Build children array
  const children: any[] = [];

  // Add Home Assistant logo badge (absolute positioned)
  children.push({
    type: "div",
    props: {
      style: logoBadgeStyle,
      children: [
        {
          type: "img",
          props: {
            src: HA_LOGO_SVG,
            style: logoIconStyle,
            alt: "Home Assistant",
          },
        },
        {
          type: "div",
          props: {
            style: logoTextStyle,
            children: "Home Assistant",
          },
        },
      ],
    },
  });

  // Add title if provided
  if (title) {
    children.push({
      type: "div",
      props: {
        style: titleStyle,
        children: title,
      },
    });
  }

  // Add entities container
  const entityChildren = entityStates.map((entity) => {
    const valueChildren: any[] = [];

    // Entity name
    valueChildren.push({
      type: "div",
      props: {
        style: entityNameStyle,
        children: entity.name,
      },
    });

    // Entity value (state + unit)
    if (entity.error) {
      valueChildren.push({
        type: "div",
        props: {
          style: errorStyle,
          children: `Error: ${entity.error}`,
        },
      });
    } else {
      const valueText = entity.unit
        ? `${entity.state} ${entity.unit}`
        : entity.state;

      valueChildren.push({
        type: "div",
        props: {
          style: entityValueStyle,
          children: valueText,
        },
      });
    }

    return {
      type: "div",
      props: {
        style: entityRowStyle,
        children: valueChildren,
      },
    };
  });

  children.push({
    type: "div",
    props: {
      style: entityContainerStyle,
      children: entityChildren,
    },
  });

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
  component: HomeAssistantWidget,
  cacheTtl: 30, // Cache for 30 seconds (HA data changes frequently)
} as Widget<HomeAssistantConfig>;
