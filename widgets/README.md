# Custom Widgets Directory

Tato složka je určena pro vaše vlastní widgety. Všechny `.tsx`, `.ts` nebo `.js` soubory v této složce budou automaticky načteny při startu serveru.

## Auto-discovery

Pokud vytvoříte soubor v této složce:

```
./widgets/my-widget.tsx
```

Widget bude automaticky dostupný s ID `my-widget` bez nutnosti konfigurace v `config.yaml`.

## Jak vytvořit widget

Viz [examples/custom-widget.tsx](../examples/custom-widget.tsx) pro kompletní příklad.

Základní struktura:

```typescript
import type { Widget, WidgetProps } from "../src/types.js";

interface MyConfig {
  // Vaše konfigurace
}

async function MyWidget(props: WidgetProps<MyConfig>) {
  const { width, height, config, theme, locale, tz } = props;

  // Váš rendering kód
  return {
    type: "div",
    props: {
      style: { /* ... */ },
      children: [/* ... */],
    },
  };
}

export default {
  component: MyWidget,
  cacheTtl: 300, // volitelné (v sekundách)
} as Widget<MyConfig>;
```

## Tipy

1. **Responsive design** - používejte `width` a `height` pro výpočet velikostí fontů
2. **Theme support** - podporujte `dark` i `light` theme
3. **Cache TTL** - nastavte vhodnou `cacheTtl` hodnotu podle frekvence změn dat
4. **Error handling** - všechny async operace obalte try/catch s fallback daty

## Příklad widgetu

Funkční příklad najdete v [example.tsx](./example.tsx) - widget pro zobrazení statusu.
