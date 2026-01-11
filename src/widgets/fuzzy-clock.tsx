import type { Widget, WidgetProps, DeckSize } from "../types.js";
import { getDeckSize } from "../types.js";
import { getThemeColors } from "../styles/common.js";

interface FuzzyClockConfig {
  showDigital?: boolean; // Show small digital time below fuzzy text
}

type CSSProperties = Record<string, string | number>;

// ============================================================================
// LANGUAGE DATA
// ============================================================================

const langData = {
  cs: {
    hours: {
      nom: [
        null,
        "jedna",
        "dvě",
        "tři",
        "čtyři",
        "pět",
        "šest",
        "sedm",
        "osm",
        "devět",
        "deset",
        "jedenáct",
        "dvanáct",
      ],
      acc: [
        null,
        "jednu",
        "dvě",
        "tři",
        "čtyři",
        "pět",
        "šest",
        "sedm",
        "osm",
        "devět",
        "deset",
        "jedenáct",
        "dvanáct",
      ],
      gen: [
        null,
        "jedné",
        "druhé",
        "třetí",
        "čtvrté",
        "páté",
        "šesté",
        "sedmé",
        "osmé",
        "deváté",
        "desáté",
        "jedenácté",
        "dvanácté",
      ],
    },
    phrases: {
      is: "Je ",
      was: "Bylo ",
      will: "Bude ",
      quarter: "čtvrt na ",
      half: "půl ",
      threeQuarter: "tři čtvrtě na ",
      h1: " hodina",
      h24: " hodiny",
      h50: " hodin",
      oclock: "",
    },
  },
  en: {
    hours: {
      nom: [
        "twelve",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
        "eleven",
        "twelve",
      ],
      acc: [
        "twelve",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
        "eleven",
        "twelve",
      ],
      gen: [
        "twelve",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
        "eleven",
        "twelve",
      ],
    },
    phrases: {
      is: "It is ",
      was: "It was ",
      will: "It will be ",
      quarter: "quarter past ",
      half: "half past ",
      threeQuarter: "quarter to ",
      h1: "",
      h24: "",
      h50: "",
      oclock: " o'clock",
    },
  },
};

function getCzechSuffix(h: number): string {
  if (h === 1) return langData.cs.phrases.h1;
  if (h >= 2 && h <= 4) return langData.cs.phrases.h24;
  return langData.cs.phrases.h50;
}

function getFuzzyTime(locale: string, tz: string): string {
  // Parse locale to determine language
  const lang = locale.startsWith("cs")
    ? langData.cs
    : locale.startsWith("sk")
    ? langData.cs
    : langData.en;
  const isCzech = locale.startsWith("cs") || locale.startsWith("sk");

  // Get current time in specified timezone
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const m = now.getMinutes();
  const h24 = now.getHours();

  let currH = h24 % 12 || 12;
  let nextH = (currH % 12) + 1;

  let text = "";

  // LOGIKA ZAOKROUHLOVÁNÍ
  if (m >= 58 || m <= 2) {
    let targetH = m >= 58 ? nextH : currH;
    text =
      lang.phrases.is +
      lang.hours.nom[targetH] +
      (isCzech ? getCzechSuffix(targetH) : lang.phrases.oclock);
  } else if (m <= 7) {
    text =
      lang.phrases.was +
      lang.hours.nom[currH] +
      (isCzech ? getCzechSuffix(currH) : lang.phrases.oclock);
  } else if (m <= 12)
    text =
      lang.phrases.will +
      lang.phrases.quarter +
      (isCzech ? lang.hours.acc[nextH] : lang.hours.nom[currH]);
  else if (m <= 17)
    text =
      lang.phrases.is +
      lang.phrases.quarter +
      (isCzech ? lang.hours.acc[nextH] : lang.hours.nom[currH]);
  else if (m <= 22)
    text =
      lang.phrases.was +
      lang.phrases.quarter +
      (isCzech ? lang.hours.acc[nextH] : lang.hours.nom[currH]);
  else if (m <= 27)
    text =
      lang.phrases.will +
      lang.phrases.half +
      (isCzech ? lang.hours.gen[nextH] : lang.hours.nom[currH]);
  else if (m <= 32)
    text =
      lang.phrases.is +
      lang.phrases.half +
      (isCzech ? lang.hours.gen[nextH] : lang.hours.nom[currH]);
  else if (m <= 37)
    text =
      lang.phrases.was +
      lang.phrases.half +
      (isCzech ? lang.hours.gen[nextH] : lang.hours.nom[currH]);
  else if (m <= 42)
    text =
      lang.phrases.will + lang.phrases.threeQuarter + lang.hours.acc[nextH];
  else if (m <= 47)
    text = lang.phrases.is + lang.phrases.threeQuarter + lang.hours.acc[nextH];
  else if (m <= 52)
    text = lang.phrases.was + lang.phrases.threeQuarter + lang.hours.acc[nextH];
  else {
    text =
      lang.phrases.will +
      lang.hours.nom[nextH] +
      (isCzech ? getCzechSuffix(nextH) : lang.phrases.oclock);
  }

  return text;
}

function getDigitalTime(tz: string): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const h = now.getHours();
  const m = now.getMinutes();
  return `${h}:${m < 10 ? "0" + m : m}`;
}

// ============================================================================
// STYLE FUNCTIONS - Pixel-perfect styles for each size
// ============================================================================

function getContainerStyle(theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    background: colors.bg,
    color: colors.text,
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
    padding: "20px",
  };
}

function getFuzzyTextStyle(size: DeckSize): CSSProperties {
  const base = {
    fontWeight: "700",
    textAlign: "center",
    lineHeight: "1.2",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "28px" },
    m: { fontSize: "42px" },
    l: { fontSize: "56px" },
    fs: { fontSize: "84px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getDigitalTextStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    fontWeight: "400",
    textAlign: "center",
    marginTop: "16px",
    color: colors.subtext,
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "14px" },
    m: { fontSize: "18px" },
    l: { fontSize: "22px" },
    fs: { fontSize: "32px" },
  };

  return { ...base, ...sizeStyles[size] };
}

// ============================================================================
// MAIN WIDGET COMPONENT
// ============================================================================

async function FuzzyClockWidget(props: WidgetProps<FuzzyClockConfig>) {
  const { width, height, config, theme, locale, tz } = props;
  const { showDigital = false } = config;

  // Determine deck size
  const size = getDeckSize(width, height);

  // Get fuzzy and digital time
  const fuzzyText = getFuzzyTime(locale, tz);
  const digitalText = getDigitalTime(tz);

  // Get styles for this size
  const containerStyle = getContainerStyle(theme);
  const fuzzyTextStyle = getFuzzyTextStyle(size);
  const digitalTextStyle = getDigitalTextStyle(size, theme);

  // Build JSX structure
  return {
    type: "div",
    props: {
      style: containerStyle,
      children: [
        // Fuzzy time text
        {
          type: "div",
          props: {
            style: fuzzyTextStyle,
            children: fuzzyText,
          },
        },
        // Digital time (optional)
        showDigital && {
          type: "div",
          props: {
            style: digitalTextStyle,
            children: digitalText,
          },
        },
      ].filter(Boolean),
    },
  };
}

export default {
  component: FuzzyClockWidget,
  cacheTtl: 1, // Update every second
} as Widget<FuzzyClockConfig>;
