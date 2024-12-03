import React from 'react';

interface LoadingProps {
  text?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  text = 'Loading...', 
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div className="space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        {text && (
          <p className="text-sm text-muted-foreground text-center">{text}</p>
        )}
      </div>
    </div>
  );
};

export const LoadingPage: React.FC<LoadingProps> = ({ text }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loading text={text} />
    </div>
  );
};

export const LoadingOverlay: React.FC<LoadingProps & { show: boolean }> = ({
  text,
  show
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Loading text={text} />
    </div>
  );
};
