# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Development server with hot reload (tsx watch)
npm run build      # Compile TypeScript to dist/
npm run start      # Run compiled server from dist/
npm run type-check # Type-check without emitting files
```

No test suite is configured. Type checking (`npm run type-check`) is the primary verification tool.

## Architecture

This is a **Fastify HTTP server** that renders widgets to PNG/JPG images on demand, intended for BraiinsDeck hardware displays. The rendering pipeline is: HTTP request → widget lookup → optional data fetch → widget component renders JSX → Satori converts JSX to SVG → Sharp converts SVG to PNG/JPG → cached result returned.

### Request flow

`GET /widget/:widgetId.png?size=m&theme=dark` triggers:
1. `WidgetController` (`src/controllers/widget.controller.ts`) parses query params via `parseRenderRequest()` in `src/types.ts`
2. `RenderService` (`src/services/render.service.ts`) checks the **image cache** (node-cache), calls `widget.fetchData()` if present (result goes into **data cache**), then calls `widget.component(props)`
3. `renderer.ts` passes the JSX element tree to **Satori** (SVG) then **Sharp** (PNG/JPG)

### Widget loading (three tiers)

`src/loader.ts` loads widgets in priority order at startup:

1. **Built-in** (`src/widgets/*.tsx`): matched by `type:` field in config — e.g., `type: weather` maps to `src/widgets/weather.tsx`
2. **Custom files** (`file:` field in config or auto-discovered from `./widgets/*.tsx`): transpiled at runtime by esbuild in production mode; loaded directly by tsx in dev mode
3. **NPM plugins** (`plugin:` field in config): imported as npm packages

Auto-discovery: any `.tsx`/`.ts`/`.js` file placed in `./widgets/` is automatically available as a widget with its filename as ID — no config entry required.

### Configuration system

Two-file YAML merge: `config.yaml` (base, tracked in git) + `config.local.yaml` (local overrides, gitignored). Local config takes precedence. Widget arrays are merged by `id` — local replaces base if same ID, otherwise both are included. Supports `${ENV_VAR}` interpolation in YAML values.

`debug: true` in config unlocks `/health`, `/debug/:widgetId`, and `?refresh=1` (cache bypass). In production (`debug: false`) these are hidden.

### Widget interface

Every widget module must export a default `Widget` object:

```typescript
export default {
  component: async (props: WidgetProps) => ReactElement | string,
  cacheTtl?: number,       // seconds; undefined uses node-cache default (60s)
  fetchData?: async (config) => data,  // result passed as props.data
} as Widget<MyConfig>;
```

`WidgetProps` provides: `width`, `height`, `config`, `data`, `theme` (`"dark"|"light"`), `locale`, `tz`.

### Fixed deck sizes

Defined in `src/types.ts` as `DECK_SIZES`:
- `s`: 317×238
- `m`: 638×238 (default)
- `l`: 638×480
- `fs`: 1280×480

BraiinsDeck can also pass `?deck_image_width=N&deck_image_height=N` for custom dimensions (max 2560).

### JSX without React

The project uses JSX syntax compiled to `h()` / `Fragment()` calls (configured in `tsconfig.json` via `jsxFactory`/`jsxFragmentFactory`). Both functions are exported from `src/types.ts`. Widgets should import them — or return plain object trees. **There is no React dependency.**

### Styling utilities

`src/styles/common.ts` exports `getThemeColors()`, `getBaseContainerStyle()`, `getCenteredContainerStyle()`, and `getStandardPadding()` — use these for consistent theming across widgets. All widgets must set `fontFamily` explicitly (e.g., `"Inter, sans-serif"`); it is not inherited.

### Cache

Two separate `NodeCache` instances in `src/cache.ts`:
- **Image cache**: keyed by `widgetId|size|format|theme|locale|tz`
- **Data cache**: keyed by `data:widgetId:<config-json>`

Both default to 60 s TTL, max 500/200 keys respectively. Widget's `cacheTtl` overrides the TTL per entry.

### Fonts

Fonts are loaded once at startup from paths relative to the project root (e.g., `fonts/Inter-Regular.ttf`). The `fonts/` directory ships Inter Regular/Bold/Black. To add fonts, place `.ttf` files there and list them in `config.yaml` under `server.fonts`. Satori requires fonts as `ArrayBuffer`; the renderer handles this. The first font in the list is the default.

### HTTP routes

| Route | Description |
|---|---|
| `GET /widget/:widgetId.:format` | Main render endpoint |
| `GET /widgets` | List all loaded widgets |
| `GET /health` | Cache stats (debug only) |
| `GET /debug/:widgetId` | Widget debug info (debug only) |
