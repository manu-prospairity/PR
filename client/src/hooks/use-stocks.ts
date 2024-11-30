import { useQuery } from '@tanstack/react-query';

interface StockPrice {
  symbol: string;
  price: number;
}

interface HistoricalPrice {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockData {
  currentPrice: StockPrice | null;
  historicalPrices: HistoricalPrice[];
}

export function useAvailableStocks() {
  return useQuery<string[]>({
    queryKey: ['available-stocks'],
    queryFn: async () => {
      const response = await fetch('/api/stocks/available');
      if (!response.ok) {
        throw new Error('Failed to fetch available stocks');
      }
      return response.json();
    },
    staleTime: 300000, // Consider data stale after 5 minutes
  });
}

export function useStockData(symbol: string) {
  const currentPrice = useQuery<StockPrice>({
    queryKey: ['stocks', symbol, 'current'],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const historicalPrices = useQuery<HistoricalPrice[]>({
    queryKey: ['stocks', symbol, 'history'],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${symbol}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  return {
    data: {
      currentPrice: currentPrice.data,
      historicalPrices: historicalPrices.data || [],
    },
    isLoading: currentPrice.isLoading || historicalPrices.isLoading,
    error: currentPrice.error || historicalPrices.error,
  };
}
