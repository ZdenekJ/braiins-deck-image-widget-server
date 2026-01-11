Vytvoř widget server pro BraiinsDeck zařízení s následujícími požadavky:

## ZÁKLADNÍ POŽADAVKY

Vytvoř TypeScript projekt s názvem "braiins-widget-server", který:

- Generuje PNG/JPG obrázky z HTML/CSS/JS on-demand
- Běží jako HTTP server na portu 3000
- Používá Satori pro rendering (JSX → SVG → PNG)
- Používá Sharp pro konverzi do PNG/JPG
- Podporuje cache (in-memory)
- Má konfiguraci v YAML

## TECHNOLOGIE

- Node.js 20+, TypeScript 5.7+
- ESM moduly (type: "module")
- Fastify jako HTTP framework
- Satori 0.11+ pro rendering
- Sharp 0.33+ pro image processing
- node-cache pro caching
- YAML pro konfiguraci
- Bez Playwright/Puppeteer!

## ARCHITEKTURA

Tři úrovně složitosti:

**Tier 1: Built-in widgety**

- Uživatel jen edituje config.yaml
- 3 předpřipravené widgety: clock, weather, crypto-ticker

**Tier 2: Custom widgety**

- Uživatel vytvoří .tsx soubor v ./widgets/
- Automaticky se načtou a zaregistrují

**Tier 3: NPM pluginy** (volitelné)

- npm install @someone/braiins-widget-xyz
- Použití v config.yaml

## BRAINSDECK ROZMĚRY (FIXNÍ!)

BraiinsDeck podporuje pouze tyto rozměry:

```typescript
const DECK_SIZES = {
  s: { width: 317, height: 238 }, // small
  m: { width: 638, height: 238 }, // medium
  l: { width: 638, height: 480 }, // large
  fs: { width: 1280, height: 480 }, // fullscreen
} as const;
type DeckSize = "s" | "m" | "l" | "fs";
```

## WIDGET API (minimalistické!)

```typescript
// types.ts
export interface WidgetProps<TConfig = any> {
  width: number; // Z DECK_SIZES
  height: number; // Z DECK_SIZES
  config: TConfig;
  theme: "dark" | "light";
  locale: string;
  tz: string;
}
export interface Widget<TConfig = any> {
  component: (props: WidgetProps<TConfig>) => Promise<ReactElement | string>;
  cacheTtl?: number;
  fetchData?: (config: TConfig) => Promise<any>;
}
```

**DŮLEŽITÉ:** Widget component může vracet:

1. JSX element (pomocí h() funkce)
2. HTML string (template literal)

Renderer musí oba formáty zpracovat!

## URL FORMÁT

GET /widget/:widgetId.:format?size=m&theme=dark

**Povinné parametry:**

- `size` = s | m | l | fs (default: m)
- `format` = png | jpg (v URL jako přípona)

**Volitelné parametry:**

- `theme` = dark | light (default z config.yaml)
- `locale` = cs-CZ (default z config.yaml)
- `tz` = Europe/Prague (default z config.yaml)
- `refresh` = 1 (bypass cache)

**Ukázkové URL:**

http://localhost:3000/widget/fuzzy_clock.png?size=l
http://localhost:3000/widget/weather_prague.png?size=m&theme=light
http://localhost:3000/widget/btc_price.jpg?size=s
http://localhost:3000/widget/my_custom.png?size=fs&refresh=1

## CONFIG.YAML STRUKTURA

```yaml
server:
  port: 3000
  host: 0.0.0.0
  authToken: "${WIDGET_TOKEN}" # optional

defaults:
  locale: cs-CZ
  tz: Europe/Prague
  theme: dark
  size: m # default size

widgets:
  # Tier 1: Built-in
  - id: clock
    type: fuzzy-clock

  # Tier 2: Custom TSX
  - id: my_widget
    file: ./widgets/my-widget.tsx
    config:
      title: "Custom"

  # Tier 3: NPM plugin (optional)
  - id: advanced
    plugin: "@someone/widget-xyz"
    config:
      option: value
```

## BUILT-IN WIDGETY (3 základní)

### 1. Fuzzy Clock

- Textove hodiny
- Konfigurace: možnost zobrazit digitální čas
- Cache TTL: 60 sekund
- Responsive: velikost fontu podle size parametru

### 2. Weather

- OpenWeatherMap API (s fallback mock daty pokud není API key)
- Konfigurace: city, apiKey (optional), units (metric/imperial)
- Zobrazení: teplota, podmínky, vlhkost, vítr, emoji ikona
- Cache TTL: 10 minut
- API: https://api.openweathermap.org/data/2.5/weather
- Responsive: layout se přizpůsobí size (s=kompaktní, fs=plná šířka)

### 3. Crypto Ticker

- CoinGecko API (free, bez API key)
- Konfigurace: coin (BTC/ETH/...), fiat (USD/CZK/EUR)
- Zobrazení: cena, 24h změna, volume (optional)
- Cache TTL: 1 minuta
- API: https://api.coingecko.com/api/v3/simple/price
- Responsive: na small zobraz jen cenu, na large i volume

## STRUKTURA PROJEKTU

braiins-widget-server/
├── package.json
├── tsconfig.json
├── config.yaml
├── .gitignore
├── README.md
├── src/
│ ├── server.ts # Fastify server
│ ├── types.ts # Widget API types + DECK_SIZES
│ ├── config.ts # YAML loader
│ ├── loader.ts # Widget loader (Tier 1/2/3)
│ ├── renderer.ts # Satori + Sharp
│ ├── cache.ts # Cache layer
│ └── widgets/ # Built-in widgety
│ ├── clock.tsx
│ ├── weather.tsx
│ └── crypto-ticker.tsx
├── widgets/ # User custom widgety
│ └── README.md
├── examples/
│ └── custom-widget.tsx
└── fonts/
└── README.md

## TYPES.TS REQUIREMENTS

```typescript
export const DECK_SIZES = {
  s: { width: 317, height: 238 },
  m: { width: 638, height: 238 },
  l: { width: 638, height: 480 },
  fs: { width: 1280, height: 480 },
} as const;

export type DeckSize = keyof typeof DECK_SIZES;

export interface RenderRequest {
  widgetId: string;
  size: DeckSize;
  format: "png" | "jpg";
  theme: "dark" | "light";
  locale: string;
  tz: string;
  refresh?: boolean;
}

export function parseRenderRequest(
  widgetId: string,
  format: "png" | "jpg",
  query: Record<string, any>,
  defaults: any
): RenderRequest {
  const size = (query.size || defaults.size || "m") as DeckSize;

  // Validace size
  if (!["s", "m", "l", "fs"].includes(size)) {
    throw new Error(`Invalid size: ${size}. Must be s, m, l, or fs`);
  }

  return {
    widgetId,
    size,
    format,
    theme: query.theme || defaults.theme || "dark",
    locale: query.locale || defaults.locale || "cs-CZ",
    tz: query.tz || defaults.tz || "Europe/Prague",
    refresh: query.refresh === "1" || query.refresh === "true",
  };
}
```

## RENDERER REQUIREMENTS

renderer.ts musí podporovat:

**1. JSX input (h() funkce):**

```typescript
h("div", { style: { color: "red" } }, "Hello");
```

**2. HTML string input:**

```typescript
`<div style="color: red">Hello</div>`;
```

Použij tuto logiku:

- Pokud je result string → parsuj jako HTML
- Pokud je result object → je to JSX element
- Oba formáty předej Satori

## CACHE STRATEGIE

Dvě vrstvy:

1. Image cache (PNG/JPG buffer) - TTL z widget.cacheTtl
2. Data cache (fetchData result) - TTL z widget.cacheTtl

Cache key formát:
widgetId|size|format|theme|locale|tz

Příklad: `weather_prague|l|png|dark|cs-CZ|Europe/Prague`

## SCRIPTS V PACKAGE.JSON

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "type-check": "tsc --noEmit"
  }
}
```

## JSX HELPER FUNKCE

V types.ts přidej:

```typescript
export function h(type: any, props: any, ...children: any[]): ReactElement {
  return {
    type,
    props: { ...props, children },
  } as any;
}

export function Fragment(props: { children: any }): ReactElement {
  return props.children;
}
```

## ENDPOINTS

- `GET /widget/:widgetId.:format` - render widget
- `GET /health` - health check + cache stats
- `GET /widgets` - list všech widgetů
- `GET /debug/:widgetId` - debug endpoint (vrátí JSON místo PNG)

## RESPONSIVE SIZES HELPER

Widgety musí být responsive podle DECK_SIZES. Doporučený pattern:

```typescript
// V widgetu:
async function MyWidget(props: WidgetProps) {
  const { width, height } = props;

  // Responsive font sizes
  const titleSize = Math.min(width / 20, height / 10);
  const valueSize = Math.min(width / 4, height / 2.5);

  // Layout adaptace podle velikosti
  const isSmall = width < 400; // size=s
  const isFullscreen = width > 1000; // size=fs

  return `
    <div style="font-size: ${titleSize}px">
      ${isSmall ? "Compact view" : "Full view"}
    </div>
  `;
}
```

## THEME COLORS

```typescript
const bg = theme === "dark" ? "#1a1a1a" : "#f5f5f5";
const text = theme === "dark" ? "#ffffff" : "#0a0a0a";
```

## ERROR HANDLING

- Pokud widget selže, vrať 500 s JSON error
- Pokud widgetId neexistuje, vrať 404 s dostupnými widgety
- Pokud size není validní, vrať 400 s chybovou hláškou
- Loguj všechny chyby do console

## EXAMPLE CUSTOM WIDGET

Vytvoř examples/custom-widget.tsx:

```typescript
import type { Widget, WidgetProps } from "../src/types.js";

interface MyConfig {
  title: string;
  value: number;
}

// Varianta 1: HTML string (doporučeno)
async function MyWidget(props: WidgetProps<MyConfig>) {
  const { width, height, config, theme } = props;

  // Responsive sizes
  const titleSize = Math.min(width / 15, height / 8);
  const valueSize = Math.min(width / 4, height / 2.5);

  // Theme colors
  const bg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  const text = theme === "dark" ? "#ffffff" : "#0a0a0a";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          width: ${width}px;
          height: ${height}px;
          background: ${bg};
          color: ${text};
          font-family: Inter, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .title {
          font-size: ${titleSize}px;
          opacity: 0.7;
          margin-bottom: 10px;
        }
        .value {
          font-size: ${valueSize}px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="title">${config.title}</div>
      <div class="value">${config.value}</div>
    </body>
    </html>
  `;
}

export default {
  component: MyWidget,
  cacheTtl: 300,
} as Widget<MyConfig>;
```

## README.MD REQUIREMENTS

Zahrň:

- Rychlý start (instalace, spuštění)
- BraiinsDeck rozměry (tabulka s s/m/l/fs)
- URL formát a parametry
- Built-in widgety dokumentace
- Jak vytvořit custom widget (oba formáty: HTML string + h())
- Config.yaml příklady
- Troubleshooting

Ukázkové URL v README:

```markdown
## 🌐 Ukázkové URL

**Small (317x238):**
```

http://localhost:3000/widget/clock_main.png?size=s

**Medium (638x238) - default:**
http://localhost:3000/widget/weather_prague.png?size=m
http://localhost:3000/widget/weather_prague.png (bez size = použije default)

**Large (638x480):**
http://localhost:3000/widget/btc_price.png?size=l&theme=light

**Fullscreen (1280x480):**
http://localhost:3000/widget/dashboard.png?size=fs

## DŮLEŽITÉ POZNÁMKY

1. Všechny importy MUSÍ mít .js extension (ESM requirement)
2. Satori nepotřebuje fonty (použij fallback pokud nejsou)
3. Cache je in-memory (NodeCache), ne Redis
4. Environment variables: expanduj ${VAR} v config.yaml
5. Všechny fetch volání musí mít try/catch a fallback data
6. Widget component může být async
7. TypeScript strict mode
8. Žádné external CSS soubory - všechno inline style
9. DECK_SIZES jsou FIXNÍ - nikdy je nepočítej dynamicky!
10. Default size je 'm' pokud není specifikován

## TESTING

Po vytvoření otestuj:

```bash
npm install
npm run dev
```

Otevři:

- http://localhost:3000/widget/clock_main.png?size=s
- http://localhost:3000/widget/clock_main.png?size=m
- http://localhost:3000/widget/clock_main.png?size=l
- http://localhost:3000/widget/clock_main.png?size=fs
- http://localhost:3000/widget/weather_prague.png?size=m&theme=light
- http://localhost:3000/widget/btc_price.png?size=l
- http://localhost:3000/health

## DEPENDENCIES

```json
{
  "dependencies": {
    "@fastify/static": "^7.0.1",
    "fastify": "^5.1.0",
    "satori": "^0.11.2",
    "sharp": "^0.33.5",
    "yaml": "^2.6.1",
    "node-cache": "^5.1.2"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

## SERVER.TS - PARSING PŘÍKLAD

```typescript
app.get<{
  Params: { widgetId: string; format: "png" | "jpg" };
  Querystring: Record<string, string>;
}>("/widget/:widgetId.:format", async (request, reply) => {
  const { widgetId, format } = request.params;

  // Parse request s validací size
  const req = parseRenderRequest(
    widgetId,
    format,
    request.query,
    config.defaults
  );

  // Získej rozměry z DECK_SIZES
  const dimensions = DECK_SIZES[req.size];

  // Props pro widget
  const props: WidgetProps = {
    width: dimensions.width,
    height: dimensions.height,
    config: loaded.config,
    theme: req.theme,
    locale: req.locale,
    tz: req.tz,
  };

  // ... render
});
```

VYTVOŘ KOMPLETNÍ FUNKČNÍ PROJEKT S VŠEMI SOUBORY!
