import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePredictions } from "../hooks/use-predictions";
import { addDays, setHours, setMinutes, isBefore, isWeekend, format } from "date-fns";

const predictionSchema = z.object({
  symbol: z.string().min(1).toUpperCase(),
  predictedPrice: z.number().positive(),
  targetTime: z.string().refine((time) => ['9:30', '16:00'].includes(time), {
    message: "Time must be either 9:30 AM or 4:00 PM EST",
  }),
});

type PredictionFormValues = z.infer<typeof predictionSchema>;

function getNextTradingDay(date = new Date()) {
  let nextDay = date;
  
  // If it's after 4 PM, start with tomorrow
  if (date.getHours() >= 16) {
    nextDay = addDays(date, 1);
  }
  
  // Skip weekends
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  
  return nextDay;
}

function createTargetDateTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const targetDate = setMinutes(setHours(date, hours), minutes);
  return targetDate;
}

export function PredictionForm() {
  const { submitPrediction } = usePredictions();
  const nextTradingDay = getNextTradingDay();

  const form = useForm<PredictionFormValues>({
    defaultValues: {
      symbol: "",
      predictedPrice: 0,
      targetTime: "",
    },
  });

  const onSubmit = async (values: PredictionFormValues) => {
    const targetDateTime = createTargetDateTime(nextTradingDay, values.targetTime);
    
    if (isBefore(targetDateTime, new Date())) {
      form.setError("targetTime", {
        message: "Target time must be in the future",
      });
      return;
    }

    await submitPrediction({
      ...values,
      predictedPrice: Number(values.predictedPrice),
      targetTime: targetDateTime,
    });
    form.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Prediction</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Symbol</FormLabel>
                  <FormControl>
                    <Input placeholder="AAPL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="predictedPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Predicted Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Target Time (EST) for {format(nextTradingDay, "MMM d, yyyy")}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="9:30">9:30 AM EST (Market Open)</SelectItem>
                      <SelectItem value="16:00">4:00 PM EST (Market Close)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Submit Prediction
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
