import { useQuery } from '@tanstack/react-query';
import type { Ranking } from '@db/schema';

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function useLeaderboard(timeFrame: TimeFrame) {
  return useQuery<Ranking[]>({
    queryKey: ['leaderboard', timeFrame],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard/${timeFrame}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}
