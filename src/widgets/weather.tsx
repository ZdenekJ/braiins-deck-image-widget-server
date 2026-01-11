import type { Widget, WidgetProps, DeckSize } from "../types.js";
import { getDeckSize } from "../types.js";
import { getThemeColors } from "../styles/common.js";
import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { text } from "stream/consumers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WeatherConfig {
  city: string;
  country?: string;
  apiKey?: string;
  units?: "metric" | "imperial";
}

type CSSProperties = Record<string, string | number>;

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  wind: number;
  conditionCode: number;
  icon: string; // OpenWeatherMap icon code (e.g., "01d", "10n")
  iconDataUri: string; // Base64 data URI of the icon
}

// ============================================================================
// STYLE FUNCTIONS - Pixel-perfect styles for each size
// ============================================================================

function getContainerStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    background: colors.bg,
    color: colors.text,
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { padding: "12px", flexDirection: "column-reverse" },
    m: { padding: "16px" },
    l: { padding: "20px" },
    fs: { padding: "32px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getLeftSideStyle(size: DeckSize): CSSProperties {
  const base = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: {
      width: "90%",
      height: "auto",
      padding: "0",
    },
    m: {
      width: "40%",
      height: "80%",
      padding: "10px",
    },
    l: {
      width: "40%",
      height: "60%",
      padding: "10px",
    },
    fs: {
      width: "40%",
      height: "80%",
      padding: "10px",
    },
  };

  return { ...base, ...sizeStyles[size] };
}

function getRightSideStyle(size: DeckSize): CSSProperties {
  const base = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: {
      width: "90%",
      height: "30%",
      padding: "0",
    },
    m: { width: "40%", height: "80%", padding: "0 10px" },
    l: { width: "40%", height: "60%", padding: "20px 10px" },
    fs: { width: "40%", height: "80%", padding: "0 10px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getIconStyle(size: DeckSize): CSSProperties {
  const sizeValues: Record<DeckSize, number> = {
    s: 60,
    m: 100,
    l: 140,
    fs: 220,
  };

  const iconSize = sizeValues[size];
  return {
    width: `${iconSize}px`,
    height: `${iconSize}px`,
  };
}

function getTempStyle(size: DeckSize): CSSProperties {
  const base = {
    fontWeight: "700",
    lineHeight: "1",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "32px" },
    m: { fontSize: "48px" },
    l: { fontSize: "64px" },
    fs: { fontSize: "96px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getCityStyle(size: DeckSize): CSSProperties {
  const base = {
    fontWeight: "700",
    marginBottom: "auto",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "22px", margin: "0 auto" },
    m: { fontSize: "26px" },
    l: { fontSize: "32px" },
    fs: { fontSize: "48px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getConditionStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    textTransform: "capitalize",
    color: colors.subtext,
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "20px", margin: "0 auto" },
    m: { fontSize: "24px" },
    l: { fontSize: "32px" },
    fs: { fontSize: "48px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getDetailStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    color: colors.subtext,
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "10px", display: "none" }, // Hide on small
    m: { fontSize: "20px" },
    l: { fontSize: "24px" },
    fs: { fontSize: "32px" },
  };

  return { ...base, ...sizeStyles[size] };
}

// Map OpenWeatherMap icon codes to Meteocons icon names
const weatherIconMap: Record<string, string> = {
  // Jasno (Clear sky)
  "01d": "clear-day",
  "01n": "clear-night",

  // Málo oblačnosti (Few clouds)
  "02d": "partly-cloudy-day",
  "02n": "partly-cloudy-night",

  // Polojasno (Scattered clouds)
  "03d": "cloudy",
  "03n": "cloudy",

  // Zataženo / Oblačno (Broken clouds / Overcast)
  "04d": "overcast-day",
  "04n": "overcast-night",

  // Přeháňky (Shower rain)
  "09d": "rain",
  "09n": "rain",

  // Déšť (Rain)
  "10d": "partly-cloudy-day-rain",
  "10n": "partly-cloudy-night-rain",

  // Bouřka (Thunderstorm)
  "11d": "thunderstorms-day",
  "11n": "thunderstorms-night",

  // Sníh (Snow)
  "13d": "partly-cloudy-day-snow",
  "13n": "partly-cloudy-night-snow",

  // Mlha (Mist)
  "50d": "mist",
  "50n": "mist",
};

// ============================================================================
// ICON LOADING
// ============================================================================

// Load SVG icon from assets and return as data URI
async function loadIconDataUri(iconCode: string): Promise<string> {
  try {
    // Map icon code to file name
    const iconFileName = weatherIconMap[iconCode] || "not-available";
    const iconPath = join(
      __dirname,
      "..",
      "..",
      "assets",
      "icons",
      "weather",
      `${iconFileName}.svg`
    );

    // Read SVG file
    const svgContent = await readFile(iconPath, "utf-8");

    // Create data URI
    return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString(
      "base64"
    )}`;
  } catch (error) {
    console.error(`Failed to load weather icon for ${iconCode}:`, error);
    // Return empty data URI as fallback
    return "";
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

// Map locale to OpenWeatherMap language code
function getWeatherLang(locale: string): string {
  if (locale.startsWith("cs")) return "cz";
  if (locale.startsWith("sk")) return "sk";
  return "en";
}

// Get localized text labels
function getLabels(locale: string) {
  if (locale.startsWith("cs") || locale.startsWith("sk")) {
    return {
      humidity: "Vlhkost",
      wind: "Vítr",
    };
  }
  return {
    humidity: "Humidity",
    wind: "Wind",
  };
}

// Fetch weather data from OpenWeatherMap API
async function fetchWeatherData(
  config: WeatherConfig,
  locale: string
): Promise<WeatherData> {
  const { city, country, apiKey, units = "metric" } = config;

  let iconCode = "03d"; // Default icon
  let temp = 22;
  let condition = "Partly Cloudy";
  let humidity = 65;
  let wind = 12;
  let conditionCodeVal = 802;

  // If API key provided, try to fetch real data
  if (apiKey) {
    try {
      // Build city query with optional country code
      const cityQuery = country
        ? `${encodeURIComponent(city)},${encodeURIComponent(country)}`
        : encodeURIComponent(city);

      const lang = getWeatherLang(locale);
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityQuery}&appid=${apiKey}&units=${units}&lang=${lang}`;

      const response = await fetch(url);

      if (response.ok) {
        const data = (await response.json()) as any;
        temp = Math.round(data.main.temp);
        condition = data.weather[0]?.description || "Unknown";
        humidity = data.main.humidity;
        wind = Math.round(data.wind.speed);
        conditionCodeVal = data.weather[0]?.id || 800;
        iconCode = data.weather[0]?.icon || "01d";
      } else {
        console.error(
          `OpenWeatherMap API error: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
    }
  } else {
    console.log("No OpenWeatherMap API key provided, using mock data");
  }

  // Load icon data URI
  const iconDataUri = await loadIconDataUri(iconCode);

  return {
    temp,
    condition,
    humidity,
    wind,
    conditionCode: conditionCodeVal,
    icon: iconCode,
    iconDataUri,
  };
}

// ============================================================================
// MAIN WIDGET COMPONENT
// ============================================================================

async function WeatherWidget(props: WidgetProps<WeatherConfig>) {
  const { width, height, config, theme, locale } = props;
  const { city, units = "metric" } = config;

  // Determine deck size
  const size = getDeckSize(width, height);

  // Get localized labels
  const labels = getLabels(locale);

  // Fetch weather data (includes icon data URI)
  const weather = await fetchWeatherData(config, locale);

  // Unit symbols
  const tempUnit = units === "imperial" ? "°F" : "°C";
  const windUnit = units === "imperial" ? "mph" : "m/s";

  // Get styles for this size
  const containerStyle = getContainerStyle(size, theme);
  const leftStyle = getLeftSideStyle(size);
  const rightStyle = getRightSideStyle(size);
  const iconStyle = getIconStyle(size);
  const tempStyle = getTempStyle(size);
  const cityStyle = getCityStyle(size);
  const conditionStyle = getConditionStyle(size, theme);
  const detailStyle = getDetailStyle(size, theme);

  // Build JSX structure with pixel-perfect styles
  return {
    type: "div",
    props: {
      style: containerStyle,
      children: [
        // Left side: Icon and Temperature
        {
          type: "div",
          props: {
            style: leftStyle,
            children: [
              // Weather icon
              weather.iconDataUri && {
                type: "img",
                props: {
                  src: weather.iconDataUri,
                  style: iconStyle,
                  alt: "weather icon",
                },
              },
              // Temperature
              {
                type: "div",
                props: {
                  style: tempStyle,
                  children: `${weather.temp}${tempUnit}`,
                },
              },
            ].filter(Boolean),
          },
        },
        // Right side: Details
        {
          type: "div",
          props: {
            style: rightStyle,
            children: [
              // City
              {
                type: "div",
                props: {
                  style: cityStyle,
                  children: city,
                },
              },
              // Condition
              {
                type: "div",
                props: {
                  style: conditionStyle,
                  children: weather.condition,
                },
              },
              // Humidity (hidden on small size via CSS)
              {
                type: "div",
                props: {
                  style: detailStyle,
                  children: `${labels.humidity}: ${weather.humidity}%`,
                },
              },
              // Wind (hidden on small size via CSS)
              {
                type: "div",
                props: {
                  style: detailStyle,
                  children: `${labels.wind}: ${weather.wind} ${windUnit}`,
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export default {
  component: WeatherWidget,
  cacheTtl: 600, // 10 minutes cache
  // Note: fetchData is not used because we need locale from props
} as Widget<WeatherConfig>;
