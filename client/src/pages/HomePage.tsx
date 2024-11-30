import { StockChart } from "../components/StockChart";
import { PredictionForm } from "../components/PredictionForm";
import { Leaderboard } from "../components/Leaderboard";

export default function HomePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
        Stock Prediction Game
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <StockChart symbol="AAPL" />
          <PredictionForm />
        </div>
        <div>
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
