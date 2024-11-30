import { useQuery } from '@tanstack/react-query';
import type { Ranking } from '@db/schema';

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function useLeaderboard(timeFrame: TimeFrame, stock?: string) {
  return useQuery<Ranking[]>({
    queryKey: ['leaderboard', timeFrame, stock],
    queryFn: async () => {
      const url = new URL(`/api/leaderboard/${timeFrame}`, window.location.origin);
      if (stock) {
        url.searchParams.set('stock', stock);
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}
