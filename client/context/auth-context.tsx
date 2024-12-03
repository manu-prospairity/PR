import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/api';
import { useLoading } from './loading-context';

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { startLoading, stopLoading } = useLoading();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        // If not authenticated, user will remain null
        console.log('Not authenticated');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    startLoading('Logging in...');
    try {
      const response = await api.login(username, password);
      setUser(response.user);
    } finally {
      stopLoading();
    }
  };

  const register = async (username: string, password: string) => {
    startLoading('Creating account...');
    try {
      const response = await api.register(username, password);
      setUser(response.user);
    } finally {
      stopLoading();
    }
  };

  const logout = async () => {
    startLoading('Logging out...');
    try {
      await api.logout();
      setUser(null);
    } finally {
      stopLoading();
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component to protect routes
export const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return function WithAuthComponent(props: P) {
    const { user, isLoading } = useAuth();
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
      if (!isLoading && !user && !redirecting) {
        setRedirecting(true);
        // Redirect to login page
        window.location.href = '/login';
      }
    }, [user, isLoading, redirecting]);

    if (isLoading || redirecting) {
      return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};
