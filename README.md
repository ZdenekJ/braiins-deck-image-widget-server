# BraiinsDeck Widget Server

Widget server pro BraiinsDeck zařízení - generuje PNG/JPG obrázky z HTML/CSS/JS on-demand.

## Funkce

- 🎨 Renderování widgetů do PNG/JPG pomocí Satori + Sharp
- ⚡ HTTP server s Fastify
- 💾 In-memory cache pro rychlé odpovědi
- 🔧 3 úrovně widgetů: built-in, custom, NPM pluginy
- 🎯 Přesné rozměry pro BraiinsDeck displeje
- 🌍 Podpora lokalizace a časových pásem
- 🌓 Dark/Light theme

## Rychlý start

```bash
# Instalace závislostí
npm install

# Spuštění dev serveru
npm run dev

# Build pro produkci
npm run build

# Spuštění produkční verze
npm start
```

Server poběží na `http://localhost:3000`

## BraiinsDeck rozměry

BraiinsDeck podporuje pouze tyto rozměry (fixní!):

| Size | Rozměr | Popis |
|------|--------|-------|
| `s`  | 317×238 | Small |
| `m`  | 638×238 | Medium (výchozí) |
| `l`  | 638×480 | Large |
| `fs` | 1280×480 | Fullscreen |

## URL formát

```
GET /widget/:widgetId.:format?size={size}&theme={theme}
```

### Povinné parametry

- **format** - přípona v URL: `png` nebo `jpg`
- **size** - velikost displeje: `s`, `m`, `l`, `fs` (default: `m`)

### Volitelné parametry

- **theme** - `dark` nebo `light` (default z config.yaml)
- **locale** - např. `cs-CZ` (default z config.yaml)
- **tz** - časové pásmo, např. `Europe/Prague` (default z config.yaml)
- **refresh** - `1` pro bypass cache

### Ukázkové URL

**Small (317×238):**
```
http://localhost:3000/widget/clock_main.png?size=s
```

**Medium (638×238) - default:**
```
http://localhost:3000/widget/weather_prague.png?size=m
http://localhost:3000/widget/weather_prague.png  (bez size = použije default)
```

**Large (638×480):**
```
http://localhost:3000/widget/btc_price.png?size=l&theme=light
```

**Fullscreen (1280×480):**
```
http://localhost:3000/widget/crypto_dashboard.png?size=fs
```

## Built-in widgety

### 1. Clock

Digitální hodiny s datem.

**Konfigurace:**
```yaml
- id: clock_main
  type: clock
  config:
    format: 24h          # nebo 12h
    showSeconds: true    # zobrazit sekundy
    showDate: true       # zobrazit datum
```

**Příklad URL:**
```
http://localhost:3000/widget/clock_main.png?size=l
```

### 2. Weather

Počasí z OpenWeatherMap API s fallback na mock data.

**Konfigurace:**
```yaml
- id: weather_prague
  type: weather
  config:
    city: Prague
    apiKey: "${OPENWEATHER_API_KEY}"  # volitelné
    units: metric                      # nebo imperial
```

**API klíč:** Získej zdarma na [openweathermap.org](https://openweathermap.org/api)

**Příklad URL:**
```
http://localhost:3000/widget/weather_prague.png?size=m&theme=light
```

### 3. Crypto Ticker

Ceny kryptoměn z CoinGecko API (bez API klíče).

**Konfigurace:**
```yaml
- id: btc_price
  type: crypto-ticker
  config:
    coin: BTC           # BTC, ETH, ADA, atd.
    fiat: USD           # USD, EUR, CZK
    showVolume: true    # zobrazit volume (jen na velkých)
```

**Podporované coiny:** BTC, ETH, USDT, BNB, XRP, ADA, DOGE, SOL, DOT, MATIC

**Příklad URL:**
```
http://localhost:3000/widget/btc_price.png?size=s
```

## Vytvoření vlastního widgetu

### Způsob 1: JSX pomocí h() funkce

```typescript
import type { Widget, WidgetProps } from "../src/types.js";

interface MyConfig {
  title: string;
  value: number;
}

async function MyWidget(props: WidgetProps<MyConfig>) {
  const { width, height, config, theme } = props;

  // Responsive font sizes
  const titleSize = Math.min(width / 15, height / 8);
  const valueSize = Math.min(width / 4, height / 2.5);

  // Theme colors
  const bg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  const text = theme === "dark" ? "#ffffff" : "#0a0a0a";

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
      },
      children: [
        {
          type: "div",
          props: {
            style: { fontSize: `${titleSize}px` },
            children: config.title,
          },
        },
        {
          type: "div",
          props: {
            style: { fontSize: `${valueSize}px`, fontWeight: "bold" },
            children: config.value.toString(),
          },
        },
      ],
    },
  };
}

export default {
  component: MyWidget,
  cacheTtl: 300, // 5 minut
} as Widget<MyConfig>;
```

### Způsob 2: Auto-discovery

Vlož svůj widget do `./widgets/` složky a automaticky se načte:

```bash
./widgets/my-widget.tsx  →  dostupný jako widget ID "my-widget"
```

### Konfigurace v config.yaml

```yaml
widgets:
  # Použití custom widgetu
  - id: my_custom
    file: ./widgets/my-widget.tsx
    config:
      title: "Custom Value"
      value: 42
```

## Responsive design

Widgety musí reagovat na různé velikosti displejů:

```typescript
async function ResponsiveWidget(props: WidgetProps) {
  const { width, height } = props;

  // Responsive font sizes
  const titleSize = Math.min(width / 20, height / 10);
  const valueSize = Math.min(width / 4, height / 2.5);

  // Layout adaptace
  const isSmall = width < 400;      // size=s
  const isFullscreen = width > 1000; // size=fs

  return {
    type: "div",
    props: {
      style: {
        flexDirection: isSmall ? "column" : "row",
        // ...
      },
      children: [
        // Na small zobraz jen základní info
        // Na fullscreen zobraz všechno
      ],
    },
  };
}
```

## Theme colors

Doporučené barvy pro dark/light theme:

```typescript
const bg = theme === "dark" ? "#1a1a1a" : "#f5f5f5";
const text = theme === "dark" ? "#ffffff" : "#0a0a0a";
const subtext = theme === "dark" ? "#888888" : "#666666";
```

## Endpoints

### `GET /widget/:widgetId.:format`

Vyrenderuje widget jako obrázek.

### `GET /health`

Health check + statistiky cache.

**Odpověď:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "widgets": 7,
  "cache": {
    "image": { "keys": 15, "hits": 42, "misses": 8 },
    "data": { "keys": 3, "hits": 20, "misses": 2 }
  }
}
```

### `GET /widgets`

Seznam všech dostupných widgetů.

**Odpověď:**
```json
{
  "widgets": [
    { "id": "clock_main", "cacheTtl": 1, "hasFetchData": false },
    { "id": "weather_prague", "cacheTtl": 600, "hasFetchData": true }
  ],
  "total": 2
}
```

### `GET /debug/:widgetId`

Debug endpoint - vrátí JSON místo obrázku.

## Konfigurace (config.yaml)

```yaml
server:
  port: 3000
  host: 0.0.0.0
  authToken: "${WIDGET_TOKEN}"  # volitelné

  # Font configuration (optional)
  font:
    family: "Inter"  # Font family name
    file: fonts/Inter-Regular.ttf  # Path relative to project root

defaults:
  locale: cs-CZ
  tz: Europe/Prague
  theme: dark
  size: m

widgets:
  - id: clock_main
    type: clock
    config:
      format: 24h
      showSeconds: true

  - id: my_custom
    file: ./widgets/my-widget.tsx
    config:
      option: value
```

### Local Configuration (config.local.yaml)

Pro personální nastavení vytvoř soubor `config.local.yaml`. Tento soubor:
- **NENÍ** v Gitu (automaticky ignorován)
- **Merguje se** s `config.yaml` při startu
- **Local hodnoty mají přednost** před základními

#### Merge pravidla:

1. **server a defaults**: Jednotlivé property se mergují (local overriduje base)
2. **widgets**: Mergují se podle `id`
   - Widget s ID z local configu **kompletně nahradí** stejný widget z base configu
   - Widgety z base configu bez kolize ID se **přidají** do final configu

#### Příklad config.local.yaml:

```yaml
# Override server settings
server:
  port: 3001
  authToken: "${MY_LOCAL_TOKEN}"

# Override defaults
defaults:
  theme: light
  locale: en-US

# Override or add widgets
widgets:
  # This REPLACES the weather_prague widget from base config (same ID)
  - id: weather_prague
    type: weather
    config:
      city: Berlin
      apiKey: "${MY_API_KEY}"

  # This is a NEW widget (ID not in base config)
  - id: my_test_widget
    type: fuzzy-clock

# Widgets from base config that don't have ID conflicts will still be included
```

**Při startu serveru uvidíš detailní log mergování:**
```
🔀 Merging widgets configuration:
   ✓ Widgets merged (local takes precedence)
     - 2 widget(s) from local config (primary)
     - 7 widget(s) added from base config
     - 1 widget(s) overridden by local config
       ⚠️  weather_prague (local replaces base)
     - Total: 9 widget(s) in final config
```

Vzorový soubor: `config.local.yaml.example`

## Environment Variables

V config.yaml můžeš použít `${VAR_NAME}` pro načtení z environment:

```yaml
server:
  authToken: "${WIDGET_TOKEN}"

widgets:
  - id: weather
    type: weather
    config:
      apiKey: "${OPENWEATHER_API_KEY}"
```

```bash
export WIDGET_TOKEN="secret123"
export OPENWEATHER_API_KEY="your-api-key"
npm run dev
```

## Cache strategie

Dvě vrstvy cache:

1. **Image cache** - PNG/JPG buffery (TTL z `widget.cacheTtl`)
2. **Data cache** - výsledky `fetchData()` (TTL z `widget.cacheTtl`)

Cache key formát:
```
widgetId|size|format|theme|locale|tz
```

Bypass cache: přidej `?refresh=1` do URL.

## Struktura projektu

```
braiins-widget-server/
├── package.json
├── tsconfig.json
├── config.yaml             # Konfigurace serveru
├── README.md
├── .gitignore
├── src/
│   ├── server.ts           # Fastify server
│   ├── types.ts            # Widget API + DECK_SIZES
│   ├── config.ts           # YAML loader
│   ├── loader.ts           # Widget loader
│   ├── renderer.ts         # Satori + Sharp
│   ├── cache.ts            # Cache layer
│   └── widgets/            # Built-in widgety
│       ├── clock.tsx
│       ├── weather.tsx
│       └── crypto-ticker.tsx
├── widgets/                # Custom widgety (auto-discovery)
│   ├── README.md
│   └── example.tsx
├── examples/               # Příklady
│   └── custom-widget.tsx
└── fonts/
    └── README.md
```

## Troubleshooting

### Widget se nenačte

- Zkontroluj, že má widget export `export default { component, cacheTtl }`
- Zkontroluj, že je `component` async funkce
- Podívej se do konzole na chybové hlášky

### Obrázek se nekreslí správně

- Satori podporuje jen subset CSS - použij inline `style` objekty
- Všechny rozměry musí být v `px`
- Nepodporuje: CSS třídy, external stylesheets, komplexní layouty

### API volání selhávají

- Pro weather: zkontroluj API klíč a město
- Pro crypto: CoinGecko má rate limit, použij cache
- Všechny widgety mají fallback mock data

### Cache se nemaže

- Cache je in-memory, zmizí po restartu serveru
- Použij `?refresh=1` pro bypass cache
- V produkci zvažte Redis nebo jiné persistentní řešení

## Technologie

- **Node.js** 20+
- **TypeScript** 5.7+
- **Fastify** - HTTP framework
- **Satori** - JSX/HTML → SVG rendering
- **Sharp** - SVG → PNG/JPG konverze
- **NodeCache** - In-memory caching
- **YAML** - konfigurace

## License

MIT
