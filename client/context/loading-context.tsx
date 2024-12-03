import React, { createContext, useContext, useState } from 'react';
import { LoadingOverlay } from '@/components/loading';

interface LoadingContextType {
  startLoading: (text?: string) => void;
  stopLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string | undefined>();

  const startLoading = (text?: string) => {
    setLoadingText(text);
    setLoading(true);
  };

  const stopLoading = () => {
    setLoading(false);
    setLoadingText(undefined);
  };

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading, isLoading: loading }}>
      {children}
      <LoadingOverlay show={loading} text={loadingText} />
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
