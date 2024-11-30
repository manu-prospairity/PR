import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePredictions } from "../hooks/use-predictions";

const predictionSchema = z.object({
  symbol: z.string().min(1),
  predictedPrice: z.number().positive(),
  targetTime: z.string(),
});

type PredictionFormValues = z.infer<typeof predictionSchema>;

export function PredictionForm() {
  const { submitPrediction } = usePredictions();

  const form = useForm<PredictionFormValues>({
    defaultValues: {
      symbol: "",
      predictedPrice: 0,
      targetTime: "",
    },
  });

  const onSubmit = async (values: PredictionFormValues) => {
    await submitPrediction({
      ...values,
      predictedPrice: Number(values.predictedPrice),
      targetTime: new Date(values.targetTime),
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
                  <FormLabel>Target Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
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
