import { useQuery } from '@tanstack/react-query';

interface StockData {
  symbol: string;
  price: number;
}

export function useStockData(symbol: string) {
  return useQuery<StockData>({
    queryKey: ['stocks', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });
}
