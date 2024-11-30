import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStockData } from '../hooks/use-stocks';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface StockChartProps {
  symbol: string;
}

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold">{format(new Date(label), 'MMM d, yyyy')}</p>
        <p className="text-sm">Price: {formatPrice(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

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

  const chartData = [
    ...data.historicalPrices.map(price => ({
      timestamp: price.timestamp,
      price: price.close,
    })),
    ...(data.currentPrice ? [{
      timestamp: Date.now(),
      price: data.currentPrice.price,
    }] : []),
  ].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {symbol} Price Chart
          {data.currentPrice && (
            <span className="ml-2 text-sm font-normal">
              Current: {formatPrice(data.currentPrice.price)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(timestamp) => format(new Date(timestamp), 'MMM d')}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatPrice}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
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
