# Font Configuration

This directory stores font files used for rendering widgets.

## Default Font (Inter)

By default, the server uses **Inter** font (weight 400).

## Using Custom Fonts

1. Place your font files (`.ttf` or `.otf`) in this directory
2. Edit `config.yaml`:

```yaml
server:
  fonts:
    # Primary font (first in list)
    - family: "Inter"
      file: fonts/Inter-Regular.ttf
      weight: 400

    # Add more weights of the same font
    - family: "Inter"
      file: fonts/Inter-Bold.ttf
      weight: 700

    # Or add different font families
    - family: "Roboto Mono"
      file: fonts/RobotoMono-Regular.ttf
      weight: 400
```

3. Restart the server

## Font Properties

| Property | Description | Default |
|----------|-------------|---------|
| `family` | Font family name (used in CSS) | required |
| `file` | Path to font file (relative to project root) | required |
| `weight` | Font weight: 100, 200, 300, 400, 500, 600, 700, 800, 900 | 400 |
| `style` | Font style: "normal" or "italic" | "normal" |

## Using Fonts in Widgets

In your widget CSS, specify the font family directly:

```typescript
const style = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 700, // Satori will use Inter-Bold.ttf
};

// Or use a different font family:
const monoStyle = {
  fontFamily: "Roboto Mono, monospace",
  fontWeight: 400,
};
```

## Verification

After placing fonts, restart the server:

```bash
npm run dev
```

You should see:

```
✓ Font 'Inter' (weight: 400, style: normal) loaded from fonts/Inter-Regular.ttf
✓ Font 'Inter' (weight: 700, style: normal) loaded from fonts/Inter-Bold.ttf
```

## Notes

- Font path is always relative to project root (works in both dev/src and production/dist)
- Satori supports `.ttf` and `.otf` font formats
- Font family name in widget CSS must match the `family` value in config
- Inter is open-source (SIL Open Font License)
