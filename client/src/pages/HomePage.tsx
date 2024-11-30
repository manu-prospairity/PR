import { Link } from "wouter";
import { StockChart } from "../components/StockChart";
import { PredictionForm } from "../components/PredictionForm";
import { AVAILABLE_STOCKS } from "../lib/constants";

export default function HomePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Make Predictions
        </h1>
        <Link href="/" className="text-blue-600 hover:text-blue-800 font-semibold">
          View Leaderboard
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-8">
          {AVAILABLE_STOCKS.map((symbol) => (
            <StockChart key={symbol} symbol={symbol} />
          ))}
        </div>
        <PredictionForm />
      </div>
    </div>
  );
}
