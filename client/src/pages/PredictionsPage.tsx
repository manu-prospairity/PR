import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { PredictionForm } from '../components/PredictionForm';

type Prediction = {
  id: number;
  symbol: string;
  predictedPrice: string;
  actualPrice: string | null;
  predictionTime: string;
  targetTime: string;
};

export function PredictionsPage() {
  const { data: predictions, isLoading } = useQuery<Prediction[]>({
    queryKey: ['predictions'],
    queryFn: async () => {
      const response = await fetch('/api/predictions', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch predictions');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Predictions</h1>
        <PredictionForm />
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Predicted Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {predictions?.map((prediction) => (
              <tr key={prediction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{prediction.symbol}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${prediction.predictedPrice}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {prediction.actualPrice ? `$${prediction.actualPrice}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(prediction.targetTime).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {prediction.actualPrice ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Complete
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 