import satori from "satori";
import sharp from "sharp";
import type { ReactElement } from "./types.js";
import type { FontEntry } from "./config.js";
import parse from "html-react-parser";
import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface RenderOptions {
  width: number;
  height: number;
  format: "png" | "jpg" | "jpeg";
}

// Satori font weight type (100, 200, 300, 400, 500, 600, 700, 800, 900)
type SatoriWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

// Satori font type
interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: SatoriWeight;
  style: "normal" | "italic";
}

// Font cache - stores loaded font data by file path
const fontDataCache: Map<string, ArrayBuffer> = new Map();

// Current font configurations
let currentFonts: FontEntry[] = [
  {
    family: "Inter",
    file: "fonts/Inter-Regular.ttf",
    weight: 400,
    style: "normal",
  },
];

/**
 * Set font configurations (should be called once at server startup)
 */
export function setFonts(fonts: FontEntry[]): void {
  currentFonts = fonts;
  // Clear cache to force reload with new config
  fontDataCache.clear();
}

/**
 * Load a single font file and return ArrayBuffer
 */
async function loadFontFile(filePath: string): Promise<ArrayBuffer> {
  // Check cache first
  if (fontDataCache.has(filePath)) {
    return fontDataCache.get(filePath)!;
  }

  try {
    // Path is relative to project root (parent of src/ or dist/)
    const fullPath = join(__dirname, "..", filePath);
    const fontBuffer = await readFile(fullPath);
    const arrayBuffer = fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength
    );
    fontDataCache.set(filePath, arrayBuffer);
    return arrayBuffer;
  } catch (error) {
    console.error(`Failed to load font from '${filePath}':`, error);
    throw new Error(
      `Font file not found at '${filePath}'. Please check your font configuration in config.yaml. See fonts/README.md for instructions.`
    );
  }
}

/**
 * Load all configured fonts and return array for Satori
 */
async function loadAllFonts(): Promise<SatoriFont[]> {
  const fonts: SatoriFont[] = [];

  for (const fontConfig of currentFonts) {
    try {
      const data = await loadFontFile(fontConfig.file);
      const weight = (fontConfig.weight || 400) as SatoriWeight;
      const style = fontConfig.style || "normal";
      fonts.push({
        name: fontConfig.family,
        data,
        weight,
        style,
      });
      console.log(
        `✓ Font '${fontConfig.family}' (weight: ${weight}, style: ${style}) loaded from ${fontConfig.file}`
      );
    } catch (error) {
      console.error(`Failed to load font '${fontConfig.family}':`, error);
      // Continue loading other fonts
    }
  }

  if (fonts.length === 0) {
    throw new Error(
      "No fonts loaded. Please check your font configuration in config.yaml."
    );
  }

  return fonts;
}

// Cached Satori fonts array (loaded once)
let satoriFontsCache: SatoriFont[] | null = null;

/**
 * Get fonts for Satori (loads once, then cached)
 */
async function getSatoriFonts(): Promise<SatoriFont[]> {
  if (satoriFontsCache === null) {
    satoriFontsCache = await loadAllFonts();
  }
  return satoriFontsCache;
}

// Convert HTML string to React element using html-react-parser
function htmlToReactElement(html: string): ReactElement {
  const parsed = parse(html);
  // If parsed is an array, wrap it in a fragment
  if (Array.isArray(parsed)) {
    return { type: "div", props: { children: parsed } } as any;
  }
  return parsed as ReactElement;
}

// Render JSX or HTML string to image buffer
export async function renderToImage(
  content: ReactElement | string,
  options: RenderOptions
): Promise<Buffer> {
  const { width, height, format } = options;

  try {
    // Convert content to React element if it's a string
    let element: ReactElement;
    if (typeof content === "string") {
      element = htmlToReactElement(content);
    } else {
      element = content;
    }

    // Load all configured fonts
    const fonts = await getSatoriFonts();

    // Render to SVG using Satori
    const svg = await satori(element, {
      width,
      height,
      fonts,
    });

    // Convert SVG to PNG/JPG using Sharp
    let sharpInstance = sharp(Buffer.from(svg));

    if (format === "jpg" || format === "jpeg") {
      sharpInstance = sharpInstance.jpeg({ quality: 90 });
    } else {
      sharpInstance = sharpInstance.png();
    }

    const buffer = await sharpInstance.toBuffer();
    return buffer;
  } catch (error) {
    console.error("Rendering error:", error);
    throw new Error(`Failed to render image: ${error}`);
  }
}

// Create error image when widget fails
export async function renderErrorImage(
  message: string,
  options: RenderOptions
): Promise<Buffer> {
  const { width, height } = options;

  const errorElement = {
    type: "div",
    props: {
      style: {
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        color: "#ff4444",
        fontFamily: "sans-serif",
        padding: "20px",
      },
      children: [
        {
          type: "div",
          props: {
            style: { fontSize: "24px", marginBottom: "10px" },
            children: "⚠ Error",
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: "14px",
              textAlign: "center",
              maxWidth: `${width - 40}px`,
            },
            children: message,
          },
        },
      ],
    },
  } as ReactElement;

  return renderToImage(errorElement, options);
}
