# Fonts Directory

**DŮLEŽITÉ:** Aplikace vyžaduje font Inter pro správné fungování.

## Jak stáhnout Inter font

### Možnost 1: Přes Google Fonts (doporučeno)

1. Jdi na https://fonts.google.com/specimen/Inter
2. Klikni na "Download family" (vpravo nahoře)
3. Rozbal stažený ZIP soubor
4. Najdi soubor `Inter-Regular.ttf` (ve složce `static/`)
5. Zkopíruj ho do této složky (`./fonts/`)

### Možnost 2: Přes oficiální GitHub

1. Jdi na https://github.com/rsms/inter/releases
2. Stáhni nejnovější verzi (např. `Inter-X.X.zip`)
3. Rozbal ZIP
4. Najdi `Inter-Regular.ttf`
5. Zkopíruj ho do této složky (`./fonts/`)

### Možnost 3: Přímý download

Stáhni přímo odsud:
```
https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf
```

A ulož jako `./fonts/Inter-Regular.ttf`

## Požadovaná struktura

Po stažení by měla být struktura:

```
fonts/
├── README.md           (tento soubor)
└── Inter-Regular.ttf   (stažený font)
```

##Ověření

Po umístění fontu restartuj server:

```bash
npm run dev
```

Měl bys vidět zprávu:
```
✓ Font loaded successfully from D:\...\fonts\Inter-Regular.ttf
```

## Poznámky

- **Inter** je volně dostupný open-source font (SIL Open Font License)
- Má vynikající čitelnost na malých velikostech
- Je optimalizovaný pro displeje
- Podporuje Unicode a emoji
