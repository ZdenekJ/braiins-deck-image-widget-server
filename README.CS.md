# BraiinsDeck Widget Server

> [English version](./README.md)

Malý lokální server, který na požádání vygeneruje **obrázek widgetu** (PNG nebo JPG) pro displej **BraiinsDeck**. Hodiny, datum, počasí, kurz kryptoměn, hodnoty ze Smart Home (Home Assistant) – BraiinsDeck si jednoduše z URL stáhne a zobrazí obrázek.

Widgety se konfigurují v YAML souboru. Každý widget potom dostane vlastní URL, například:

```text
http://localhost:3000/widget/btc-price.png
```

Tuhle URL může načíst BraiinsDeck, prohlížeč nebo jakékoli jiné zařízení, které umí zobrazit PNG/JPG obrázek. Pro BraiinsDeck je potřeba použít síťovou adresu počítače, na kterém server běží.

<p align="center">
  <img src="docs/images/btc-price-large.png" width="480" alt="Ukázka widgetu Bitcoin price (large)">
</p>

---

## Obsah

1. [Co server umí](#co-server-umí)
2. [Rychlý start](#rychlý-start)
3. [URL widgetu](#url-widgetu)
4. [Velikosti displeje](#velikosti-displeje)
5. [Vestavěné widgety](#vestavěné-widgety)
6. [Konfigurace – `config.yaml`](#konfigurace--configyaml)
7. [Lokální konfigurace – `config.local.yaml`](#lokální-konfigurace--configlocalyaml)
8. [Environment proměnné a `.env`](#environment-proměnné-a-env)
9. [Tmavý a světlý motiv](#tmavý-a-světlý-motiv)
10. [Vlastní widget](#vlastní-widget)
11. [Jak server zpracuje požadavek](#jak-server-zpracuje-požadavek)
12. [API endpointy a debugování](#api-endpointy-a-debugování)
13. [Cache](#cache)
14. [Fonty](#fonty)
15. [Řešení problémů](#řešení-problémů)
16. [Struktura projektu](#struktura-projektu)
17. [Technologie](#technologie)
18. [Licence](#licence)

---

## Co server umí

Server generuje obrázkové widgety v několika velikostech a ve světlém nebo tmavém motivu. Výchozí konfigurace obsahuje několik ukázkových widgetů, které lze použít hned po spuštění.

| Widget                                     | Náhled                                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| **Fuzzy clock** – textové „slovní“ hodiny  | <img src="docs/images/fuzzy-clock.png" alt="fuzzy-clock">   |
| **Date** – datum, den v týdnu, číslo týdne | <img src="docs/images/date.png" alt="date">                 |
| **Weather** – počasí z OpenWeatherMap      | <img src="docs/images/weather-zdar.png" alt="weather Žďár"> |
| **Crypto ticker** – cena BTC/ETH/…         | <img src="docs/images/eth-price.png"  alt="ETH price">      |
| **Home Assistant** – hodnoty entit z HA    | <img src="docs/images/ha-balkon.png"  alt="HA balkon">      |

Stejný widget může mít různé rozměry podle toho, o jakou velikost si zařízení řekne. Příklad pro Bitcoin:

| Velikost             | Náhled                                            |
| -------------------- | ------------------------------------------------- |
| `size=s` (317×238)   | <img src="docs/images/btc-price-small.png">       |
| `size=m` (638×238)   | <img src="docs/images/btc-price-medium.png">      |
| `size=l` (638×480)   | <img src="docs/images/btc-price-large.png">       |
| `size=fs` (1280×480) | <img src="docs/images/btc-price-full-screen.png"> |

---

## Rychlý start

Cílem této části je nainstalovat server, spustit ho a otevřít první vygenerovaný obrázek v prohlížeči. Výchozí widgety fungují i bez API klíčů (kromě počasí).

### 1. Předpoklady

- **Node.js 20 nebo novější** – ověříš příkazem `node -v`.
- Git, pokud projekt stahuješ z repozitáře. Pokud máš ZIP archiv, stačí ho rozbalit.

### 2. Instalace

V kořenové složce projektu spusť:

```bash
npm install
```

### 3. Spuštění

Pro vývoj:

```bash
npm run dev
```

V tomto režimu se server automaticky restartuje při změnách v kódu.

Pro běžné spuštění:

```bash
npm run build
npm start
```

Server poběží na adrese:

```text
http://localhost:3000
```

### 4. První obrázek

Otevři v prohlížeči:

```text
http://localhost:3000/widget/fuzzy-clock.png
```

Pokud se zobrazí obrázek se slovním zápisem aktuálního času, server běží správně.

### 5. Další vyzkoušení

Výchozí konfigurace obsahuje například tyto widgety:

- `fuzzy-clock`
- `date`
- `weather-zdar`
- `btc-price`
- `eth-price`
- `ha-balkon`

Velikost lze změnit query parametrem:

```text
http://localhost:3000/widget/btc-price.png?size=s
http://localhost:3000/widget/btc-price.png?size=m
http://localhost:3000/widget/btc-price.png?size=l
http://localhost:3000/widget/btc-price.png?size=fs
```

Světlý motiv:

```text
http://localhost:3000/widget/btc-price.png?theme=light
```

Obejití cache při ladění:

```text
http://localhost:3000/widget/btc-price.png?refresh=1
```

### 6. Adresa pro BraiinsDeck

Adresa `localhost` funguje pouze na počítači, na kterém server běží. BraiinsDeck je jiné zařízení v síti, takže mu musíš zadat síťovou IP adresu tohoto počítače.

Pokud server běží například na počítači s IP adresou:

```text
192.168.1.50
```

pak bude adresa widgetu pro BraiinsDeck vypadat takto:

```text
http://192.168.1.50:3000/widget/fuzzy-clock.png
```

A pro konkrétní widget s parametry například takto:

```text
http://192.168.1.50:3000/widget/btc-price.png?size=m&theme=dark
```

IP adresu počítače zjistíš například takto:

#### Windows

```powershell
ipconfig
```

Hledej síťový adaptér, přes který je počítač připojený k síti, a hodnotu `IPv4 Address`.

#### Linux / macOS

```bash
ip addr
```

nebo:

```bash
ifconfig
```

Hledej adresu lokální sítě, typicky ve tvaru `192.168.x.x`, `10.x.x.x` nebo `172.16.x.x`.

Pro běžné používání je vhodné, aby server běžel na zařízení, které je zapnuté pořád nebo většinu času – například domácí server, mini PC, Raspberry Pi, NAS nebo počítač, který se nevypíná. Pokud se změní IP adresa zařízení, bude potřeba upravit i URL v BraiinsDecku. Praktické řešení je nastavit zařízení v routeru statickou DHCP rezervaci.

---

## URL widgetu

Widget se načítá přes endpoint:

```text
GET /widget/{widgetId}.{format}?size=...&theme=...&locale=...&tz=...
```

### Povinná část URL

| Část         | Význam                     | Příklad          |
| ------------ | -------------------------- | ---------------- |
| `{widgetId}` | ID widgetu z `config.yaml` | `btc-price`      |
| `{format}`   | Výstupní formát            | `png` nebo `jpg` |

### Volitelné parametry

| Parametr            | Význam                                                 | Výchozí             |
| ------------------- | ------------------------------------------------------ | ------------------- |
| `size`              | Velikost displeje: `s`, `m`, `l`, `fs`                 | z `defaults.size`   |
| `theme`             | Motiv: `dark` nebo `light`                             | z `defaults.theme`  |
| `locale`            | Lokalizace, např. `cs-CZ`, `en-US`                     | z `defaults.locale` |
| `tz`                | Časové pásmo, např. `Europe/Prague`                    | z `defaults.tz`     |
| `refresh`           | `1` obejde cache pro jeden request                     | –                   |
| `deck_image_width`  | Vlastní šířka v px – BraiinsDeck ji posílá automaticky | –                   |
| `deck_image_height` | Vlastní výška v px – BraiinsDeck ji posílá automaticky | –                   |

### Příklady

```text
http://localhost:3000/widget/fuzzy-clock.png
http://localhost:3000/widget/btc-price.png?size=s
http://localhost:3000/widget/weather-zdar.png?size=l&theme=light
http://localhost:3000/widget/btc-price.png?size=fs&refresh=1
```

---

## Velikosti displeje

BraiinsDeck používá čtyři standardní velikosti. Server pro ně vrací tyto rozměry:

| Klíč | Rozměr (px) | Popis                                |
| ---- | ----------- | ------------------------------------ |
| `s`  | 317 × 238   | Small – jedno políčko                |
| `m`  | 638 × 238   | Medium – dvě políčka vedle sebe      |
| `l`  | 638 × 480   | Large – dvě políčka na výšku i šířku |
| `fs` | 1280 × 480  | Fullscreen                           |

Server akceptuje také parametry `deck_image_width` a `deck_image_height`. BraiinsDeck je posílá automaticky. Pro účely cache se vlastní rozměr přiřadí k nejbližší standardní velikosti.

---

> ⚠️ **Bezpečnostní upozornění:** Widget (ať built-in, custom `.tsx` nebo NPM plugin) je spouštěn jako plnohodnotný Node.js kód. Instalujte pouze widgety, jejichž kód jste si přečetli nebo jejichž autorovi důvěřujete.

---

## Vestavěné widgety

Vestavěné widgety jsou součástí serveru. V `config.yaml` se používají přes `type`.

### Fuzzy clock (`type: fuzzy-clock`)

Slovní hodiny, například „je půl deváté“ nebo „bude tři čtvrtě na pět“. Jazyk se řídí hodnotou `locale`.

```yaml
- id: fuzzy-clock
  type: fuzzy-clock
  config:
    showDigital: true # volitelně zobrazí i digitální čas
```

<img src="docs/images/fuzzy-clock.png" width="380" alt="fuzzy-clock">

### Date (`type: date`)

Datum, volitelně den v týdnu a číslo týdne.

```yaml
- id: date
  type: date
  config:
    weekday: long # short | long  (vynech = nezobrazovat)
    month: long # numeric | 2-digit | short | long
    showWeekNumber: true
    locale: cs-CZ # přepíše defaults.locale jen pro tento widget
```

| Výchozí                                              | S dnem v týdnu a číslem týdnu                | Anglicky                                         |
| ---------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| <img src="docs/images/date-default.png" width="280"> | <img src="docs/images/date.png" width="280"> | <img src="docs/images/date-eng.png" width="280"> |

### Weather (`type: weather`)

Aktuální počasí z OpenWeatherMap. Bez `apiKey` widget vykreslí ukázková data a upozorní, že nejde o reálný výsledek.

```yaml
- id: weather-zdar
  type: weather
  config:
    city: Žďár nad Sázavou
    country: CZ
    apiKey: "${OPENWEATHER_API_KEY}" # volitelné
    units: metric # metric | imperial
```

API klíč lze získat na [openweathermap.org](https://openweathermap.org/api). Doporučené umístění je do `.env` souboru.

| Žďár nad Sázavou                                     | New York                                           |
| ---------------------------------------------------- | -------------------------------------------------- |
| <img src="docs/images/weather-zdar.png" width="380"> | <img src="docs/images/weather-ny.png" width="380"> |

### Crypto ticker (`type: crypto-ticker`)

Aktuální cena kryptoměny z CoinGecko. API klíč není potřeba.

```yaml
- id: btc-price
  type: crypto-ticker
  config:
    coin: BTC # BTC, ETH, USDT, BNB, XRP, ADA, DOGE, SOL, DOT, MATIC
    fiat: USD # USD, EUR, CZK, …
    showVolume: true # zobrazí objem
    showChange: all # 1h | 24h | 7d | all  (výchozí 24h)
```

<img src="docs/images/btc-price-medium.png" width="480" alt="BTC ticker">

### Home Assistant (`type: homeassistant`)

Widget zobrazí stav jedné nebo více entit z Home Assistanta.

```yaml
- id: ha-balkon
  type: homeassistant
  config:
    title: "Teploměr balkon"
    entities:
      - sensor.venkovni_teplota
      - sensor.venkovni_vlhkost
    # host: http://homeassistant.local:8123  # volitelně přepíše HA_HOST
    # token: "${HA_TOKEN}"                   # volitelně přepíše HA_TOKEN
```

Pro připojení k Home Assistantovi je potřeba nastavit:

- `HA_HOST` – URL Home Assistant instance,
- `HA_TOKEN` – long-lived access token z profilu uživatele v HA.

Obě hodnoty je vhodné uložit do `.env`.

<img src="docs/images/ha-balkon.png" width="380" alt="HA balkon">

---

## Konfigurace – `config.yaml`

Hlavní konfigurace je v souboru `config.yaml` v kořenové složce projektu. Obsahuje tři základní části:

- `server` – nastavení HTTP serveru, autentizace a fontů,
- `defaults` – výchozí hodnoty pro widgety,
- `widgets` – seznam dostupných widgetů.

Ukázka:

```yaml
server:
  port: 3000
  host: 0.0.0.0
  debug: false # true zapne /health, /debug/:widgetId a ?refresh=1
  # authToken: "${WIDGET_AUTH_TOKEN}"   # volitelný Bearer token
  fonts:
    - family: Inter
      file: fonts/Inter-Regular.ttf
      weight: 400
    - family: Inter
      file: fonts/Inter-Bold.ttf
      weight: 700
    - family: Inter
      file: fonts/Inter-Black.ttf
      weight: 900

defaults:
  locale: cs-CZ
  tz: Europe/Prague
  theme: dark # dark | light
  size: m # s | m | l | fs

widgets:
  - id: fuzzy-clock
    type: fuzzy-clock

  - id: btc-price
    type: crypto-ticker
    config:
      coin: BTC
      fiat: USD
```

Každý widget musí mít unikátní `id`. Server ho může načíst třemi způsoby:

| Způsob                         | Použití                                      |
| ------------------------------ | -------------------------------------------- |
| `type: ...`                    | Vestavěný widget dodaný serverem             |
| `file: ./widgets/foo.tsx`      | Vlastní lokální widget                       |
| ~~`plugin: "@autor/balicek"`~~ | ~~Widget z NPM balíčku~~ možná v budoucnu... |

Při změně `config.yaml` je potřeba server restartovat. V režimu `npm run dev` se restart provede automaticky.

---

## Lokální konfigurace – `config.local.yaml`

Pro vlastní nastavení, API klíče nebo lokální úpravy lze použít soubor `config.local.yaml`. Tento soubor je v `.gitignore` a má přednost před hlavním `config.yaml`.

Vzorový soubor:

```text
config.local.yaml.example
```

Zkopírování:

```bash
cp config.local.yaml.example config.local.yaml
```

### Pravidla sloučení konfigurací

- `server` a `defaults` se slučují po jednotlivých klíčích.
- Hodnoty z `config.local.yaml` přepíšou stejné hodnoty z `config.yaml`.
- `widgets` se slučují podle `id`.

Chování `widgets`:

- widget se stejným `id` v lokální konfiguraci nahradí widget ze základní konfigurace,
- widgety pouze v základní konfiguraci zůstanou zachované,
- widgety pouze v lokální konfiguraci se přidají.

### Příklad

```yaml
# config.local.yaml
server:
  port: 8080

defaults:
  theme: light

widgets:
  # Přepíše widget weather-zdar ze základního configu
  - id: weather-zdar
    type: weather
    config:
      city: Brno
      country: CZ
      apiKey: "${OPENWEATHER_API_KEY}"
      units: metric

  # Přidá nový widget
  - id: my-test
    type: fuzzy-clock
    config:
      showDigital: true
```

Při startu server vypíše do konzole, jak byla konfigurace sloučena.

---

## Environment proměnné a `.env`

Citlivé hodnoty, jako jsou API klíče a tokeny, nepatří přímo do YAML konfigurace. Pro tyto hodnoty je určený `.env` soubor, který server načítá automaticky.

Vzor je v souboru:

```text
.env.example
```

Příklad `.env`:

```env
# Volitelný Bearer token pro přístup k API serveru
WIDGET_AUTH_TOKEN=tajny-token

# OpenWeatherMap
OPENWEATHER_API_KEY=tvuj-klic

# Home Assistant
HA_HOST=http://homeassistant.local:8123
HA_TOKEN=tvuj-long-lived-access-token
```

V YAML konfiguraci se environment proměnné používají syntaxí `${NAZEV_PROMENNE}`:

```yaml
widgets:
  - id: weather-zdar
    type: weather
    config:
      apiKey: "${OPENWEATHER_API_KEY}"
```

Soubor `.env` je v `.gitignore`, takže se běžně nedostane do repozitáře.

---

## Tmavý a světlý motiv

Widget může použít tmavý nebo světlý motiv. Motiv lze nastavit globálně v `defaults.theme` nebo pro konkrétní request query parametrem:

```text
?theme=dark
?theme=light
```

Ve vlastních widgetech lze použít připravené barvy:

```ts
import { getThemeColors } from "../src/styles/common.js";

const colors = getThemeColors(theme); // theme = "dark" | "light"
// colors.bg, colors.text, colors.subtext, colors.muted, ...
```

Případně lze barvy definovat přímo ve widgetu:

```ts
const bg = theme === "dark" ? "#1a1a1a" : "#f5f5f5";
const text = theme === "dark" ? "#ffffff" : "#0a0a0a";
const subtext = theme === "dark" ? "#888888" : "#666666";
```

---

## Vlastní widget

Vlastní widget lze přidat jako samostatný `.tsx` soubor ve složce `widgets/`.

### 1. Vytvoření souboru

Nejjednodušší je zkopírovat připravený příklad:

```bash
cp widgets/example.tsx widgets/muj-widget.tsx
```

### 2. Minimální widget

Soubor `widgets/muj-widget.tsx` může vypadat například takto:

```ts
import type { Widget, WidgetProps } from "../src/types.js";

interface MyConfig {
  title?: string;
  value?: number;
}

async function MyWidget(props: WidgetProps<MyConfig>) {
  const { width, height, config, theme, locale, tz } = props;

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
        background: bg,
        color: text,
        fontFamily: "Inter, sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              fontSize: `${Math.min(width / 10, height / 4)}px`,
              fontWeight: 700,
            },
            children: config.title || "Hello",
          },
        },
      ],
    },
  };
}

export default {
  component: MyWidget,
  cacheTtl: 60, // sekundy
} as Widget<MyConfig>;
```

### 3. Načítání externích dat

Pokud widget potřebuje data z externího API, může exportovat funkci `fetchData`. Server ji zavolá před renderováním a výsledek uloží do data cache.

```ts
export default {
  component: MyWidget,
  cacheTtl: 300,
  fetchData: async (config) => {
    const res = await fetch(`https://api.example.com/${config.symbol}`);
    return res.json();
  },
} as Widget<MyConfig>;
```

### 4. Registrace widgetu

Existují dvě možnosti.

#### Varianta A – automatické nalezení souboru

Pokud je soubor ve složce `widgets/`, server ho při startu najde automaticky. Soubor `widgets/muj-widget.tsx` bude dostupný jako widget s ID `muj-widget`.

```text
http://localhost:3000/widget/muj-widget.png
```

#### Varianta B – registrace přes konfiguraci

Pokud widget potřebuje vlastní konfiguraci, přidej ho do `config.yaml`:

```yaml
widgets:
  - id: muj-widget
    file: ./widgets/muj-widget.tsx
    config:
      title: "Ahoj"
      value: 42
```

### 5. Testování

Po spuštění serveru otevři:

```text
http://localhost:3000/widget/muj-widget.png
```

Při ladění se může hodit obejít cache:

```text
http://localhost:3000/widget/muj-widget.png?refresh=1
```

### Responsivní layout

Widget dostane skutečné rozměry v `props.width` a `props.height`. Podle nich lze upravit velikost písma, rozložení nebo množství zobrazených informací.

```ts
const titleSize = Math.min(width / 20, height / 10);
const valueSize = Math.min(width / 4, height / 2.5);

const isSmall = width < 400;
const isFullscreen = width > 1000;
```

K dispozici je také helper `getDeckSize(width, height)` z `src/types.js`, který vrátí symbolickou velikost:

```ts
"s" | "m" | "l" | "fs";
```

### Omezení Satori

Renderování zajišťuje knihovna [Satori](https://github.com/vercel/satori). Nepodporuje celé CSS, ale jen jeho část.

Praktická omezení:

- styly se zadávají inline přes objekt `style: { ... }`,
- nepoužívají se CSS třídy ani externí CSS soubory,
- rozměry by měly být v `px`,
- flexbox funguje,
- `position: absolute` funguje,
- gradienty fungují,
- CSS grid, složité selektory a pseudotřídy typu `:hover` nejsou vhodné.

---

## Jak server zpracuje požadavek

Každý request na widget projde renderovací pipeline:

1. **Fastify** přijme request `GET /widget/:widgetId.:format`.
2. `parseRenderRequest()` z URL a query parametrů vytvoří normalizovaný `RenderRequest`.
3. `RenderService` zkontroluje image cache.
4. Pokud je v cache hotový obrázek, server ho vrátí rovnou a nastaví hlavičku `X-Cache: HIT`.
5. Pokud obrázek v cache není, načte se widget přes `loader.ts`.
6. Pokud widget obsahuje `fetchData(config)`, server zavolá tuto funkci a výsledek uloží do data cache.
7. Komponenta widgetu dostane `WidgetProps` a vrátí JSX-like objekt `{ type, props }`.
8. `renderer.ts` předá výsledek do Satori, které vytvoří SVG.
9. Sharp převede SVG na PNG nebo JPG.
10. Hotový buffer se uloží do image cache a vrátí klientovi.

Klíč image cache je složený z hodnot:

```text
widgetId|size|format|theme|locale|tz
```

### Důležité soubory

| Soubor                                 | Účel                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `src/server.ts`                        | Start serveru, Fastify, routy, autentizace                                 |
| `src/config.ts`                        | Načtení a sloučení konfigurací, rozšíření `${ENV}` proměnných              |
| `src/loader.ts`                        | Discovery a načítání widgetů, transpile přes esbuild                       |
| `src/types.ts`                         | `WidgetProps`, `Widget`, `DECK_SIZES`, `parseRenderRequest`, `getDeckSize` |
| `src/renderer.ts`                      | Satori, Sharp, načítání fontů                                              |
| `src/cache.ts`                         | Image cache, data cache, statistiky cache                                  |
| `src/services/render.service.ts`       | Orchestrace renderování: cache → data → render → cache                     |
| `src/controllers/widget.controller.ts` | Endpointy `/health`, `/widgets`, `/widget/...`, `/debug/...`               |
| `src/widgets/*.tsx`                    | Vestavěné widgety                                                          |

---

## API endpointy a debugování

### `GET /widget/:widgetId.:format`

Vrátí binární obrázek ve formátu PNG nebo JPG.

Hlavička `X-Cache` ukazuje, jestli byl výsledek načtený z cache:

```text
X-Cache: HIT
X-Cache: MISS
```

### `GET /widgets`

Vrátí seznam načtených widgetů včetně informace, jestli mají `fetchData` a jaké používají `cacheTtl`.

Příklad odpovědi:

```json
{
  "total": 7,
  "widgets": [
    { "id": "fuzzy-clock", "cacheTtl": 60, "hasFetchData": false },
    { "id": "btc-price", "cacheTtl": 60, "hasFetchData": true }
  ]
}
```

### `GET /health`

Dostupný pouze při `server.debug: true`. Vrátí healthcheck a základní statistiky cache.

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

### `GET /debug/:widgetId`

Dostupný pouze při `server.debug: true`. Vrátí JSON s informacemi užitečnými při ladění widgetu:

- vstupní props,
- parsovaný `RenderRequest`,
- `cacheTtl`,
- informace o výsledném elementu.

Tento endpoint se hodí ve chvíli, kdy se widget vykresluje jinak, než očekáváš, nebo když chceš ověřit hodnoty předané do komponenty.

### `?refresh=1`

Obejití cache je dostupné pouze při `server.debug: true`. V produkčním režimu (`debug: false`) je parametr ignorován.

### Autentizace

Pokud je nastavený `server.authToken`, všechny requesty musí obsahovat HTTP hlavičku:

```text
Authorization: Bearer tvuj-token
```

Typické nastavení přes environment proměnnou:

```yaml
server:
  authToken: "${WIDGET_AUTH_TOKEN}"
```

---

## Cache

Server používá dvě samostatné vrstvy cache.

| Vrstva          | Co cachuje             | TTL               |
| --------------- | ---------------------- | ----------------- |
| **Image cache** | Hotové PNG/JPG buffery | `widget.cacheTtl` |
| **Data cache**  | Výsledky `fetchData()` | `widget.cacheTtl` |

Image cache ukládá už hotový obrázek. Data cache ukládá výsledek externího načtení dat, například z CoinGecko nebo Home Assistanta.

Klíč image cache:

```text
widgetId|size|format|theme|locale|tz
```

Cache lze obejít pro jeden request parametrem:

```text
?refresh=1
```

Cache je pouze in-memory. Po restartu serveru se vyprázdní.

---

## Fonty

Satori potřebuje mít fonty dostupné před renderováním. Výchozí konfigurace používá tři řezy fontu Inter:

```text
fonts/
├── Inter-Regular.ttf  (weight 400)
├── Inter-Bold.ttf     (weight 700)
└── Inter-Black.ttf    (weight 900)
```

Vlastní font lze přidat v `config.yaml`:

```yaml
server:
  fonts:
    - family: Inter
      file: fonts/Inter-Regular.ttf
      weight: 400
    - family: "Roboto Mono"
      file: fonts/RobotoMono-Regular.ttf
      weight: 400
```

Ve widgetu se pak font použije přes `fontFamily`:

```ts
style: {
  fontFamily: "Roboto Mono, monospace";
}
```

---

## Řešení problémů

### Server nestartuje a hlásí „Failed to load configuration“

Zkontroluj:

- že `config.yaml` existuje v kořenové složce projektu,
- že jde o validní YAML,
- že obsahuje sekce `server`, `defaults` a `widgets`,
- že odsazení v YAML odpovídá struktuře objektů a polí.

### Widget se nenačte a hlásí „Widget '...' must export a Widget with a component function“

Možné příčiny:

- `.tsx` soubor neobsahuje `export default`,
- exportovaný objekt nemá `component`,
- `component` není `async` funkce,
- `id` v konfiguraci neodpovídá názvu souboru nebo očekávanému ID,
- cesta ve `file` nevede na existující soubor.

Minimální export:

```ts
export default {
  component: MyWidget,
  cacheTtl: 60,
};
```

### Obrázek je prázdný nebo má rozbitý layout

Nejčastější příčiny:

- použití CSS vlastností, které Satori nepodporuje,
- styly nejsou zadané inline,
- některé rozměry chybí nebo nejsou v `px`,
- rodičovský prvek nemá vhodně nastavený `display`,
- layout je závislý na CSS gridu nebo externích třídách.

Doporučený základ pro kořenový prvek:

```ts
style: {
  width: `${width}px`,
  height: `${height}px`,
  display: "flex",
}
```

### Volání externího API selhává

Podle typu widgetu zkontroluj:

- u počasí hodnotu `OPENWEATHER_API_KEY` a název města,
- u Home Assistanta hodnoty `HA_HOST` a `HA_TOKEN`,
- u kryptoměn rate limit CoinGecko.

Pokud API často vrací chybu nebo rate limit, zvyš `cacheTtl`.

### Změna v `config.yaml` se neprojevuje

V produkčním režimu je po změně konfigurace potřeba restartovat server.

V dev režimu:

```bash
npm run dev
```

by se měl server restartovat automaticky.

Při ladění konkrétní URL může být potřeba obejít image cache:

```text
?refresh=1
```

### Port 3000 je obsazený

Změň port v `config.yaml` nebo `config.local.yaml`:

```yaml
server:
  port: 8080
```

---

## Struktura projektu

```text
braiins-deck-image-widget-server/
├── package.json
├── tsconfig.json
├── config.yaml                  # hlavní konfigurace
├── config.local.yaml.example    # vzor lokální konfigurace
├── .env.example                 # vzor environment proměnných
├── README.md                    # anglická dokumentace nebo hlavní README
├── README.CS.md                 # česká dokumentace
│
├── src/
│   ├── server.ts                # Fastify bootstrap
│   ├── config.ts                # YAML loader + merge
│   ├── loader.ts                # Discovery widgetů
│   ├── renderer.ts              # Satori + Sharp
│   ├── cache.ts                 # Cache wrapper
│   ├── types.ts                 # WidgetProps, DECK_SIZES, helpers
│   ├── controllers/
│   │   └── widget.controller.ts
│   ├── services/
│   │   └── render.service.ts
│   ├── styles/
│   │   └── common.ts            # getThemeColors()
│   └── widgets/                 # vestavěné widgety
│       ├── fuzzy-clock.tsx
│       ├── date.tsx
│       ├── weather.tsx
│       ├── crypto-ticker.tsx
│       └── homeassistant.tsx
│
├── widgets/                     # vlastní widgety
│   ├── README.md
│   └── example.tsx
│
├── fonts/                       # TTF fonty
│   ├── Inter-Regular.ttf
│   ├── Inter-Bold.ttf
│   └── Inter-Black.ttf
│
└── docs/
    └── images/                  # screenshoty widgetů pro README
```

---

## Technologie

- **Node.js 20+**
- **TypeScript 5.7+**
- **Fastify** – HTTP server
- **Satori** – převod JSX-like struktury na SVG
- **Sharp** – převod SVG na PNG/JPG
- **NodeCache** – in-memory cache
- **YAML** – konfigurace
- **esbuild** – transpile vlastních `.tsx` widgetů
- **dotenv** – načítání `.env`

---

## Licence

MIT – viz [LICENSE](./LICENSE).
