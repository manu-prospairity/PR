import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLeaderboard } from "../hooks/use-leaderboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type TimeFrame = "daily" | "weekly" | "monthly" | "yearly";

export function Leaderboard() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("daily");
  const { data: rankings, isLoading } = useLeaderboard(timeFrame);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={timeFrame === "daily" ? "default" : "outline"}
            onClick={() => setTimeFrame("daily")}
          >
            Daily
          </Button>
          <Button
            variant={timeFrame === "weekly" ? "default" : "outline"}
            onClick={() => setTimeFrame("weekly")}
          >
            Weekly
          </Button>
          <Button
            variant={timeFrame === "monthly" ? "default" : "outline"}
            onClick={() => setTimeFrame("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={timeFrame === "yearly" ? "default" : "outline"}
            onClick={() => setTimeFrame("yearly")}
          >
            Yearly
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Predictions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings?.map((ranking, index) => (
                <TableRow key={ranking.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{ranking.userId}</TableCell>
                  <TableCell>{Number(ranking.averageAccuracy).toFixed(2)}%</TableCell>
                  <TableCell>{ranking.totalPredictions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
