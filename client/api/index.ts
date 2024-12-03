import { z } from "zod";
import { toast } from "@/components/ui/use-toast";

// API response schemas
const errorResponseSchema = z.object({
  message: z.string()
});

const userSchema = z.object({
  id: z.number(),
  username: z.string()
});

const loginResponseSchema = z.object({
  message: z.string(),
  user: userSchema
});

const predictionSchema = z.object({
  id: z.number(),
  userId: z.number(),
  symbol: z.string(),
  predictedPrice: z.number(),
  actualPrice: z.number().nullable(),
  accuracy: z.number().nullable(),
  predictionTime: z.string(),
  targetTime: z.string(),
  createdAt: z.string()
});

const rankingSchema = z.object({
  userId: z.number(),
  symbol: z.string().nullable(),
  averageAccuracy: z.number(),
  totalPredictions: z.number(),
  timeFrame: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  updatedAt: z.string()
});

// API Error class
class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

// API client class
class APIClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Important for cookies/session
      });

      const data = await response.json();

      if (!response.ok) {
        const error = errorResponseSchema.parse(data);
        throw new APIError(response.status, error.message);
      }

      return data as T;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, 'An unexpected error occurred');
    }
  }

  // Auth methods
  async login(username: string, password: string) {
    try {
      const response = await this.request<z.infer<typeof loginResponseSchema>>('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      toast({
        title: "Success",
        description: "Successfully logged in",
      });
      return response;
    } catch (error) {
      if (error instanceof APIError) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  }

  async register(username: string, password: string) {
    try {
      const response = await this.request<z.infer<typeof loginResponseSchema>>('/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      toast({
        title: "Success",
        description: "Registration successful",
      });
      return response;
    } catch (error) {
      if (error instanceof APIError) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  }

  async logout() {
    try {
      const response = await this.request<{ message: string }>('/logout', {
        method: 'POST',
      });
      toast({
        title: "Success",
        description: "Successfully logged out",
      });
      return response;
    } catch (error) {
      if (error instanceof APIError) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  }

  async getCurrentUser() {
    return this.request<z.infer<typeof userSchema>>('/user');
  }

  // Predictions methods
  async getPredictions() {
    return this.request<z.infer<typeof predictionSchema>[]>('/predictions');
  }

  async createPrediction(data: {
    symbol: string;
    predictedPrice: number;
    targetTime: string;
  }) {
    try {
      const response = await this.request<z.infer<typeof predictionSchema>>('/predictions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast({
        title: "Success",
        description: "Prediction submitted successfully",
      });
      return response;
    } catch (error) {
      if (error instanceof APIError) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      throw error;
    }
  }

  // Stock methods
  async getStockPrice(symbol: string) {
    return this.request<{ symbol: string; price: number }>(`/stocks/${symbol}`);
  }

  async getHistoricalPrices(symbol: string) {
    return this.request<Array<{
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>>(`/stocks/${symbol}/history`);
  }

  async getAvailableStocks() {
    return this.request<string[]>('/stocks/available');
  }

  // Leaderboard methods
  async getLeaderboard(timeFrame: string, stock?: string) {
    const url = `/leaderboard/${timeFrame}${stock ? `?stock=${stock}` : ''}`;
    return this.request<z.infer<typeof rankingSchema>[]>(url);
  }
}

// Export singleton instance
export const api = new APIClient();
