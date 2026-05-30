// Real stock & index logos from Wikimedia Commons (direct SVG)
// Updated: 2026-06-26
export const STOCK_ICONS: Record<string, string> = {
  // US Tech
  "NVDA": "https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg",
  "AAPL": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  "MSFT": "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
  "TSLA": "https://upload.wikimedia.org/wikipedia/commons/b/bd/Tesla_Motors.svg",
  "GOOGL": "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  "AMZN": "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  "META": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
  "MSTR": "https://upload.wikimedia.org/wikipedia/commons/9/9f/MicroStrategy_logo.svg",
  "COIN": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Coinbase_Wordmark.svg",
  "HOOD": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Robinhood_Logo.svg",

  // Indices
  "MAG7SSI": "https://upload.wikimedia.org/wikipedia/commons/9/94/S%26P_Logo.svg",
  "MEMESSI": "https://upload.wikimedia.org/wikipedia/commons/9/94/S%26P_Logo.svg",
  "DEFISSI": "https://upload.wikimedia.org/wikipedia/commons/9/94/S%26P_Logo.svg",
  "USSI": "https://upload.wikimedia.org/wikipedia/commons/9/94/S%26P_Logo.svg",
  "XYZ100": "https://upload.wikimedia.org/wikipedia/commons/9/94/S%26P_Logo.svg",
  "SP500": "https://upload.wikimedia.org/wikipedia/commons/9/94/S%26P_Logo.svg",
  "NASDAQ": "https://upload.wikimedia.org/wikipedia/commons/8/83/Nasdaq_Logo.svg",

  // Commodities
  "XAUT": "https://upload.wikimedia.org/wikipedia/commons/7/7a/Gold-bars.jpg",
  "GOLD": "https://upload.wikimedia.org/wikipedia/commons/7/7a/Gold-bars.jpg",
  "PAXG": "https://upload.wikimedia.org/wikipedia/commons/7/7a/Gold-bars.jpg",
};

export function getStockIcon(symbol: string): string | null {
  return STOCK_ICONS[symbol.toUpperCase()] ?? null;
}
