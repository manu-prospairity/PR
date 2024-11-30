import { Link } from "wouter";
import { Leaderboard } from "../components/Leaderboard";

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Stock Prediction Game Leaderboard
        </h1>
        <Link href="/predict">
          <a className="text-blue-600 hover:text-blue-800 font-semibold">
            Make Predictions
          </a>
        </Link>
      </div>
      <div className="max-w-4xl mx-auto">
        <Leaderboard />
      </div>
    </div>
  );
}
