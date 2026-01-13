import type { Widget, WidgetProps, DeckSize } from "../types.js";
import { getDeckSize } from "../types.js";
import { getThemeColors } from "../styles/common.js";

interface CryptoConfig {
  coin: string; // BTC, ETH, etc.
  fiat?: string; // USD, CZK, EUR
  showVolume?: boolean;
  showChange?: "1h" | "24h" | "7d" | "all"; // Which change periods to show (default: "24h")
}

type CSSProperties = Record<string, string | number>;

interface CryptoData {
  price: number;
  change1h?: number;
  change24h: number;
  change7d?: number;
  volume?: number;
  symbol: string;
  lastUpdated?: number; // Unix timestamp
}

// ============================================================================
// STYLE FUNCTIONS - Pixel-perfect styles for each size
// ============================================================================

function getContainerStyle(theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    background: colors.bg,
    color: colors.text,
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
    padding: "20px",
    gap: "8px",
  };
}

function getSymbolStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    fontWeight: "700",
    color: colors.subtext,
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "20px" },
    m: { fontSize: "26px" },
    l: { fontSize: "32px" },
    fs: { fontSize: "48px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getPriceStyle(size: DeckSize): CSSProperties {
  const base = {
    fontWeight: "700",
    lineHeight: "1.2",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "32px" },
    m: { fontSize: "48px" },
    l: { fontSize: "64px" },
    fs: { fontSize: "90px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getChangesContainerStyle(size: DeckSize): CSSProperties {
  const base = {
    display: "flex",
    flexDirection: "row",
    gap: "12px",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { gap: "8px" },
    m: { gap: "12px" },
    l: { gap: "16px" },
    fs: { gap: "20px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getChangeItemStyle(): CSSProperties {
  const base = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  };

  return base;
}

function getChangeLabelStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    fontWeight: "400",
    color: colors.muted,
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "18px" },
    m: { fontSize: "24px" },
    l: { fontSize: "28px" },
    fs: { fontSize: "32px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getChangeValueStyle(
  size: DeckSize,
  theme: string,
  isPositive: boolean
): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    fontWeight: "600",
    color: isPositive ? colors.positive : colors.negative,
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "18px" },
    m: { fontSize: "28px" },
    l: { fontSize: "32px" },
    fs: { fontSize: "40px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getVolumeStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    fontWeight: "400",
    color: colors.subtext,
    marginTop: "4px",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "11px", display: "none" }, // Hide on small
    m: { fontSize: "14px" },
    l: { fontSize: "16px" },
    fs: { fontSize: "22px" },
  };

  return { ...base, ...sizeStyles[size] };
}

function getLastUpdatedStyle(size: DeckSize, theme: string): CSSProperties {
  const colors = getThemeColors(theme as "dark" | "light");

  const base = {
    fontWeight: "400",
    color: colors.muted,
    marginTop: "4px",
  };

  const sizeStyles: Record<DeckSize, CSSProperties> = {
    s: { fontSize: "14px" },
    m: { fontSize: "14px" },
    l: { fontSize: "16px" },
    fs: { fontSize: "18px" },
  };

  return { ...base, ...sizeStyles[size] };
}

// ============================================================================
// DATA FETCHING
// ============================================================================

// Mock crypto data for fallback
const MOCK_CRYPTO: CryptoData = {
  price: 42500,
  change1h: -0.5,
  change24h: 2.5,
  change7d: 8.3,
  volume: 28000000000,
  symbol: "BTC",
  lastUpdated: Date.now(),
};

// Map common coin symbols to CoinGecko IDs
function getCoinGeckoId(coin: string): string {
  const coinLower = coin.toLowerCase();
  const mapping: Record<string, string> = {
    btc: "bitcoin",
    eth: "ethereum",
    usdt: "tether",
    bnb: "binancecoin",
    xrp: "ripple",
    ada: "cardano",
    doge: "dogecoin",
    sol: "solana",
    dot: "polkadot",
    matic: "polygon",
  };

  return mapping[coinLower] || coinLower;
}

// Fetch crypto data from CoinGecko API
async function fetchCryptoData(config: CryptoConfig): Promise<CryptoData> {
  const { coin = "bitcoin", fiat = "usd" } = config;

  try {
    const coinId = getCoinGeckoId(coin);
    const fiatLower = fiat.toLowerCase();

    // Use /coins/markets endpoint to get 1h, 24h, 7d changes
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${fiatLower}&ids=${coinId}&price_change_percentage=1h,24h,7d`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
      return MOCK_CRYPTO;
    }

    const data = (await response.json()) as any[];

    if (!data || data.length === 0) {
      console.error(`No data for coin: ${coinId}`);
      return MOCK_CRYPTO;
    }

    const coinData = data[0];

    return {
      price: coinData.current_price || 0,
      change1h: coinData.price_change_percentage_1h_in_currency,
      change24h: coinData.price_change_percentage_24h || 0,
      change7d: coinData.price_change_percentage_7d_in_currency,
      volume: coinData.total_volume,
      symbol: coin.toUpperCase(),
      lastUpdated: coinData.last_updated
        ? new Date(coinData.last_updated).getTime()
        : Date.now(),
    };
  } catch (error) {
    console.error("Failed to fetch crypto data:", error);
    return MOCK_CRYPTO;
  }
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

function formatPrice(price: number, locale: string, fiat: string): string {
  // Determine decimal places based on price magnitude
  let minimumFractionDigits: number;
  let maximumFractionDigits: number;

  if (price >= 1000) {
    minimumFractionDigits = 0;
    maximumFractionDigits = 0;
  } else if (price >= 1) {
    minimumFractionDigits = 2;
    maximumFractionDigits = 2;
  } else {
    minimumFractionDigits = 4;
    maximumFractionDigits = 6;
  }

  const formatted = price.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return `${formatted} ${fiat.toUpperCase()}`;
}

function formatVolume(vol: number | undefined, locale: string): string {
  if (!vol) return "N/A";

  if (vol >= 1e9) {
    return `${(vol / 1e9).toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}B`;
  }
  if (vol >= 1e6) {
    return `${(vol / 1e6).toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}M`;
  }
  return `${(vol / 1e3).toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}K`;
}

function formatChangePercent(
  change: number | undefined,
  locale: string
): string {
  if (change === undefined) return "N/A";

  const formatted = Math.abs(change).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const icon = change >= 0 ? "↗" : "↘";
  return `${icon} ${formatted}%`;
}

function formatLastUpdated(
  timestamp: number | undefined,
  locale: string,
  tz: string
): string {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  return date.toLocaleString(locale, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// MAIN WIDGET COMPONENT
// ============================================================================

async function CryptoTickerWidget(props: WidgetProps<CryptoConfig>) {
  const { width, height, config, theme, locale, tz } = props;
  const { fiat = "USD", showVolume = false, showChange = "24h" } = config;

  // Fetch crypto data
  const crypto = await fetchCryptoData(config);

  // Determine deck size
  const size = getDeckSize(width, height);

  // Get styles for this size
  const containerStyle = getContainerStyle(theme);
  const symbolStyle = getSymbolStyle(size, theme);
  const priceStyle = getPriceStyle(size);
  const changesContainerStyle = getChangesContainerStyle(size);
  const changeItemStyle = getChangeItemStyle();
  const changeLabelStyle = getChangeLabelStyle(size, theme);
  const volumeStyle = getVolumeStyle(size, theme);
  const lastUpdatedStyle = getLastUpdatedStyle(size, theme);

  // Build children array
  const children: any[] = [];

  // Add symbol
  children.push({
    type: "div",
    props: {
      style: symbolStyle,
      children: crypto.symbol,
    },
  });

  // Add price
  children.push({
    type: "div",
    props: {
      style: priceStyle,
      children: formatPrice(crypto.price, locale, fiat),
    },
  });

  // Add price changes
  const changeChildren: any[] = [];

  if (showChange === "all" || showChange === "1h") {
    if (crypto.change1h !== undefined) {
      changeChildren.push({
        type: "div",
        props: {
          style: changeItemStyle,
          children: [
            {
              type: "div",
              props: {
                style: changeLabelStyle,
                children: "1h",
              },
            },
            {
              type: "div",
              props: {
                style: getChangeValueStyle(size, theme, crypto.change1h >= 0),
                children: formatChangePercent(crypto.change1h, locale),
              },
            },
          ],
        },
      });
    }
  }

  if (showChange === "all" || showChange === "24h") {
    changeChildren.push({
      type: "div",
      props: {
        style: changeItemStyle,
        children: [
          {
            type: "div",
            props: {
              style: changeLabelStyle,
              children: "24h",
            },
          },
          {
            type: "div",
            props: {
              style: getChangeValueStyle(size, theme, crypto.change24h >= 0),
              children: formatChangePercent(crypto.change24h, locale),
            },
          },
        ],
      },
    });
  }

  if (showChange === "all" || showChange === "7d") {
    if (crypto.change7d !== undefined) {
      changeChildren.push({
        type: "div",
        props: {
          style: changeItemStyle,
          children: [
            {
              type: "div",
              props: {
                style: changeLabelStyle,
                children: "7d",
              },
            },
            {
              type: "div",
              props: {
                style: getChangeValueStyle(size, theme, crypto.change7d >= 0),
                children: formatChangePercent(crypto.change7d, locale),
              },
            },
          ],
        },
      });
    }
  }

  if (changeChildren.length > 0) {
    children.push({
      type: "div",
      props: {
        style: changesContainerStyle,
        children: changeChildren,
      },
    });
  }

  // Add volume if enabled
  if (showVolume) {
    children.push({
      type: "div",
      props: {
        style: volumeStyle,
        children: `Vol: ${formatVolume(crypto.volume, locale)}`,
      },
    });
  }

  // Add last updated time
  if (crypto.lastUpdated) {
    children.push({
      type: "div",
      props: {
        style: lastUpdatedStyle,
        children: `Updated: ${formatLastUpdated(
          crypto.lastUpdated,
          locale,
          tz
        )}`,
      },
    });
  }

  // Build JSX structure
  return {
    type: "div",
    props: {
      style: containerStyle,
      children,
    },
  };
}

export default {
  component: CryptoTickerWidget,
  cacheTtl: 60, // 1 minute cache
} as Widget<CryptoConfig>;
