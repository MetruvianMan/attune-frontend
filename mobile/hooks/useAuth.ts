import { useState, useEffect, useCallback } from 'react';
import { authService, LoginCredentials, AuthResponse, AuthError } from '../services/auth-service';

export interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  userEmail: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        await authService.initialize();
        setIsAuthenticated(authService.isAuthenticated());
        
        if (authService.isAuthenticated()) {
          const email = await authService.getUserEmail();
          setUserEmail(email);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(credentials);
      setIsAuthenticated(true);
      setUserEmail(response.user.email);
    } catch (err) {
      setError(err as AuthError);
      setIsAuthenticated(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logout();
      setIsAuthenticated(false);
      setUserEmail(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError({ message: 'Logout failed' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    error,
    userEmail,
    login,
    logout,
    clearError,
  };
}
