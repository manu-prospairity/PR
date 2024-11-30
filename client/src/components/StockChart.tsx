import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStockData } from '../hooks/use-stocks';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Component, ErrorInfo, ReactNode } from 'react';

interface StockChartProps {
  symbol: string;
}
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('StockChart error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load the stock chart. Please try refreshing the page.</p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
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
    const date = new Date(label);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold">{format(date, 'MMM d, yyyy')}</p>
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
          <CardTitle>
            {symbol} Price Chart
            <span className="ml-2 text-sm font-normal">Loading...</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="space-y-4 w-full">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-8 w-1/2 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.currentPrice && !data.historicalPrices.length)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} Price Chart</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            No price data available for {symbol}.<br />
            Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

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
    <ErrorBoundary>
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
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  return isNaN(date.getTime()) ? '' : format(date, 'MMM d');
                }}
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
    </ErrorBoundary>
  );
}
