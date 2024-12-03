import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';

type NewPrediction = {
  symbol: string;
  predictedPrice: string;
  targetTime: string;
};

export function PredictionForm() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: createPrediction, isPending } = useMutation({
    mutationFn: async (prediction: NewPrediction) => {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(prediction),
      });
      if (!response.ok) throw new Error('Failed to create prediction');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      setIsOpen(false);
    },
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Prediction
      </button>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-lg font-semibold mb-4">New Prediction</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          createPrediction({
            symbol: formData.get('symbol') as string,
            predictedPrice: formData.get('predictedPrice') as string,
            targetTime: formData.get('targetTime') as string,
          });
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
            Stock Symbol
          </label>
          <input
            type="text"
            name="symbol"
            id="symbol"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g. AAPL"
          />
        </div>

        <div>
          <label htmlFor="predictedPrice" className="block text-sm font-medium text-gray-700">
            Predicted Price
          </label>
          <input
            type="number"
            step="0.01"
            name="predictedPrice"
            id="predictedPrice"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="targetTime" className="block text-sm font-medium text-gray-700">
            Target Date
          </label>
          <input
            type="date"
            name="targetTime"
            id="targetTime"
            required
            min={new Date().toISOString().split('T')[0]}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Prediction'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
