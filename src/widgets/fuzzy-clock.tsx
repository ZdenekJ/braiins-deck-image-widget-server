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
      // Czech verb forms by hour count:
      // 1 -> feminine singular (Byla)
      // 2-4 -> plural (Byly)
      // 5+ -> neuter singular (Bylo)
      is1: "Je ",
      is24: "Jsou ",
      is50: "Je ",

      was1: "Byla ",
      was24: "Byly ",
      was50: "Bylo ",

      will1: "Bude ",
      will24: "Budou ",
      will50: "Bude ",

      // English-like keys are kept for compatibility but not used in Czech:
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

type CzechVerb = "is" | "was" | "will";

function getCzechVerb(verb: CzechVerb, h: number): string {
  const p = langData.cs.phrases;

  if (verb === "is") {
    if (h === 1) return p.is1;
    if (h >= 2 && h <= 4) return p.is24;
    return p.is50;
  }

  if (verb === "was") {
    if (h === 1) return p.was1;
    if (h >= 2 && h <= 4) return p.was24;
    return p.was50;
  }

  // verb === "will"
  if (h === 1) return p.will1;
  if (h >= 2 && h <= 4) return p.will24;
  return p.will50;
}

function getFuzzyTime(locale: string, tz: string): string {
  const isCzech = locale.startsWith("cs") || locale.startsWith("sk");
  const lang = isCzech ? langData.cs : langData.en;

  // Get current time in specified timezone
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const m = now.getMinutes();
  const h24 = now.getHours();

  const currH = h24 % 12 || 12;
  const nextH = (currH % 12) + 1;

  let text = "";

  const verb = (v: CzechVerb, hourForVerb: number) =>
    isCzech ? getCzechVerb(v, hourForVerb) : lang.phrases[v];

  // LOGIKA ZAOKROUHLOVÁNÍ
  if (m >= 58 || m <= 2) {
    const targetH = m >= 58 ? nextH : currH;
    text =
      verb("is", targetH) +
      lang.hours.nom[targetH] +
      (isCzech ? getCzechSuffix(targetH) : lang.phrases.oclock);
  } else if (m <= 7) {
    text =
      verb("was", currH) +
      lang.hours.nom[currH] +
      (isCzech ? getCzechSuffix(currH) : lang.phrases.oclock);
  } else if (m <= 12) {
    text =
      verb("will", nextH) +
      lang.phrases.quarter +
      (isCzech ? lang.hours.acc[nextH] : lang.hours.nom[currH]);
  } else if (m <= 17) {
    text =
      verb("is", nextH) +
      lang.phrases.quarter +
      (isCzech ? lang.hours.acc[nextH] : lang.hours.nom[currH]);
  } else if (m <= 22) {
    text =
      verb("was", nextH) +
      lang.phrases.quarter +
      (isCzech ? lang.hours.acc[nextH] : lang.hours.nom[currH]);
  } else if (m <= 27) {
    text =
      verb("will", nextH) +
      lang.phrases.half +
      (isCzech ? lang.hours.gen[nextH] : lang.hours.nom[currH]);
  } else if (m <= 32) {
    text =
      verb("is", nextH) +
      lang.phrases.half +
      (isCzech ? lang.hours.gen[nextH] : lang.hours.nom[currH]);
  } else if (m <= 37) {
    text =
      verb("was", nextH) +
      lang.phrases.half +
      (isCzech ? lang.hours.gen[nextH] : lang.hours.nom[currH]);
  } else if (m <= 42) {
    text =
      verb("will", nextH) +
      lang.phrases.threeQuarter +
      (isCzech ? lang.hours.acc[nextH] : lang.hours.acc[nextH]);
  } else if (m <= 47) {
    text =
      verb("is", nextH) +
      lang.phrases.threeQuarter +
      (isCzech ? lang.hours.acc[nextH] : lang.hours.acc[nextH]);
  } else if (m <= 52) {
    text =
      verb("was", nextH) +
      lang.phrases.threeQuarter +
      (isCzech ? lang.hours.acc[nextH] : lang.hours.acc[nextH]);
  } else {
    text =
      verb("will", nextH) +
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
    s: { fontSize: "40px" },
    m: { fontSize: "48px" },
    l: { fontSize: "64px" },
    fs: { fontSize: "96px" },
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
  cacheTtl: 60, // Enough for word clock
} as Widget<FuzzyClockConfig>;
