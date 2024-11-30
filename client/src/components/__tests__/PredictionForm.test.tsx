import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PredictionForm } from '../PredictionForm';
import { createWrapper } from '../../test/setup';

// Mock the hooks we need
vi.mock('@/hooks/use-stocks', () => ({
  useStocks: () => ({
    stocks: ['SPY', 'TSLA', 'AAPL', 'NVDA'],
    isLoading: false,
    error: null
  })
}));

vi.mock('@/hooks/use-predictions', () => ({
  usePredictions: () => ({
    predictions: [],
    isLoading: false,
    error: null,
    submitPrediction: vi.fn()
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('PredictionForm', () => {
  it('renders stock options', () => {
    const wrapper = createWrapper();
    render(<PredictionForm />, { wrapper });
    expect(screen.getByText(/make a prediction/i)).toBeInTheDocument();
  });
});
