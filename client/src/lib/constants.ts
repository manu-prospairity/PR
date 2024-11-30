export const AVAILABLE_STOCKS = ["SPY", "TSLA", "AAPL", "NVDA"] as const;
export type AvailableStock = typeof AVAILABLE_STOCKS[number];
