# Font Configuration

This directory stores font files used for rendering widgets.

## Default Font (Inter)

By default, the server uses **Inter** font.

## Using a Custom Font

1. Place your font file (`.ttf` or `.otf`) in this directory
2. Edit `config.yaml`:

```yaml
server:
  font:
    family: "YourFontName" # Font family name
    file: fonts/YourFont.ttf # Path relative to project root
```

3. Restart the server

## Verification

After placing the font, restart the server:

```bash
npm run dev
```

You should see:

```
✓ Font 'Inter' loaded from D:\...\fonts\Inter-Regular.ttf
```

## Notes

- Font path is always relative to project root (works in both dev/src and production/dist)
- Satori supports `.ttf` and `.otf` font formats
- Only regular weight (400) is currently used
- Inter is open-source (SIL Open Font License)
