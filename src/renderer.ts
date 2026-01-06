import satori from "satori";
import sharp from "sharp";
import type { ReactElement } from "./types.js";
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

// Font cache
let fontDataCache: ArrayBuffer | null = null;

// Load font data from local file
async function loadFont(): Promise<ArrayBuffer> {
  if (fontDataCache) {
    return fontDataCache;
  }

  try {
    const fontPath = join(__dirname, "..", "fonts", "Inter-Regular.ttf");
    const fontBuffer = await readFile(fontPath);
    fontDataCache = fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength
    );
    console.log("✓ Font loaded successfully from", fontPath);
    return fontDataCache;
  } catch (error) {
    console.error("Failed to load font:", error);
    throw new Error(
      "Font file not found. Please download Inter font and place Inter-Regular.ttf in the ./fonts/ directory. See fonts/README.md for instructions."
    );
  }
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

    // Load font
    const fontData = await loadFont();

    // Render to SVG using Satori
    const svg = await satori(element, {
      width,
      height,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          weight: 400,
          style: "normal",
        },
      ],
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
