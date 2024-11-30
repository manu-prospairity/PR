import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStockData } from '../hooks/use-stocks';
import { Skeleton } from '@/components/ui/skeleton';

interface StockChartProps {
  symbol: string;
}

export function StockChart({ symbol }: StockChartProps) {
  const { data, isLoading } = useStockData(symbol);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{symbol} Price Chart</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[data]}>
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(210, 100%, 50%)"
              fill="hsl(210, 100%, 50%, 0.2)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
