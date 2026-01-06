import type { Widget, WidgetProps } from "../types.js";

interface CryptoConfig {
  coin: string; // BTC, ETH, etc.
  fiat?: string; // USD, CZK, EUR
  showVolume?: boolean;
}

interface CryptoData {
  price: number;
  change24h: number;
  volume?: number;
  symbol: string;
}

// Mock crypto data for fallback
const MOCK_CRYPTO: CryptoData = {
  price: 42500,
  change24h: 2.5,
  volume: 28000000000,
  symbol: "BTC",
};

// Fetch crypto data from CoinGecko API (free, no API key needed)
async function fetchCryptoData(config: CryptoConfig): Promise<CryptoData> {
  const { coin = "bitcoin", fiat = "usd" } = config;

  try {
    // Map common symbols to CoinGecko IDs
    const coinId = coin.toLowerCase().replace(/^btc$/i, "bitcoin")
      .replace(/^eth$/i, "ethereum")
      .replace(/^usdt$/i, "tether")
      .replace(/^bnb$/i, "binancecoin")
      .replace(/^xrp$/i, "ripple")
      .replace(/^ada$/i, "cardano")
      .replace(/^doge$/i, "dogecoin")
      .replace(/^sol$/i, "solana")
      .replace(/^dot$/i, "polkadot")
      .replace(/^matic$/i, "polygon");

    const fiatLower = fiat.toLowerCase();

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${fiatLower}&include_24hr_change=true&include_24hr_vol=true`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
      return MOCK_CRYPTO;
    }

    const data = (await response.json()) as any;
    const coinData = data[coinId];

    if (!coinData) {
      console.error(`No data for coin: ${coinId}`);
      return MOCK_CRYPTO;
    }

    return {
      price: coinData[fiatLower],
      change24h: coinData[`${fiatLower}_24h_change`] || 0,
      volume: coinData[`${fiatLower}_24h_vol`],
      symbol: coin.toUpperCase(),
    };
  } catch (error) {
    console.error("Failed to fetch crypto data:", error);
    return MOCK_CRYPTO;
  }
}

async function CryptoTickerWidget(props: WidgetProps<CryptoConfig>) {
  const { width, height, config, theme } = props;
  const { fiat = "USD", showVolume = false } = config;

  // Fetch crypto data
  const crypto = await fetchCryptoData(config);

  // Responsive sizing
  const isSmall = width < 400;
  const isLarge = width >= 600;
  const symbolSize = Math.min(width / 15, height / 8);
  const priceSize = Math.min(width / 5, height / 2.5);
  const changeSize = Math.min(width / 20, height / 12);
  const labelSize = Math.min(width / 25, height / 15);

  // Theme colors
  const bg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  const text = theme === "dark" ? "#ffffff" : "#0a0a0a";
  const subtext = theme === "dark" ? "#888888" : "#666666";
  const positiveColor = theme === "dark" ? "#22c55e" : "#16a34a";
  const negativeColor = theme === "dark" ? "#ef4444" : "#dc2626";

  // Format price with appropriate decimals
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    } else if (price >= 1) {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      });
    }
  };

  // Format volume
  const formatVolume = (vol: number | undefined): string => {
    if (!vol) return "N/A";
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
    return `$${(vol / 1e3).toFixed(1)}K`;
  };

  const changeColor = crypto.change24h >= 0 ? positiveColor : negativeColor;
  const changeIcon = crypto.change24h >= 0 ? "↗" : "↘";

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
        padding: "20px",
        gap: "10px",
      },
      children: [
        // Symbol
        {
          type: "div",
          props: {
            style: {
              fontSize: `${symbolSize}px`,
              fontWeight: "bold",
              color: subtext,
            },
            children: crypto.symbol,
          },
        },
        // Price
        {
          type: "div",
          props: {
            style: {
              fontSize: `${priceSize}px`,
              fontWeight: "bold",
            },
            children: `${formatPrice(crypto.price)} ${fiat.toUpperCase()}`,
          },
        },
        // 24h change
        {
          type: "div",
          props: {
            style: {
              fontSize: `${changeSize}px`,
              color: changeColor,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            },
            children: `${changeIcon} ${Math.abs(crypto.change24h).toFixed(2)}%`,
          },
        },
        // Volume (only on large displays)
        isLarge &&
          showVolume && {
            type: "div",
            props: {
              style: {
                fontSize: `${labelSize}px`,
                color: subtext,
                marginTop: "5px",
              },
              children: `Vol: ${formatVolume(crypto.volume)}`,
            },
          },
      ].filter(Boolean),
    },
  };
}

export default {
  component: CryptoTickerWidget,
  cacheTtl: 60, // 1 minute cache
  fetchData: fetchCryptoData,
} as Widget<CryptoConfig>;
