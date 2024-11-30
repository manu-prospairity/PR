import { useState } from "react";
import { Link } from "wouter";
import { StockChart } from "../components/StockChart";
import { PredictionForm } from "../components/PredictionForm";
import { AVAILABLE_STOCKS } from "../lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HomePage() {
  const [selectedStock, setSelectedStock] = useState<string>("SPY");
  
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
        <Select value={selectedStock} onValueChange={setSelectedStock}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select stock" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_STOCKS.map((stock) => (
              <SelectItem key={stock} value={stock}>
                {stock}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <StockChart symbol={selectedStock} />
        <PredictionForm />
      </div>
    </div>
  );
}
