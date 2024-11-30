import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Prediction } from '@db/schema';
import { useToast } from '@/hooks/use-toast';

interface PredictionInput {
  symbol: string;
  predictedPrice: number;
  targetTime: Date;
}

export function usePredictions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: predictions, isLoading } = useQuery<Prediction[]>({
    queryKey: ['predictions'],
    queryFn: async () => {
      const response = await fetch('/api/predictions');
      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }
      return response.json();
    },
  });

  const submitPrediction = useMutation({
    mutationFn: async (input: PredictionInput) => {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      toast({
        title: "Success!",
        description: "Your prediction has been submitted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    predictions,
    isLoading,
    submitPrediction: submitPrediction.mutateAsync,
  };
}
