import * as SecureStore from 'expo-secure-store';
import axios, { AxiosError } from 'axios';
import { API_BASE_URL, API_ENDPOINTS, TOKEN_REFRESH_THRESHOLD_MS } from '../constants/api';
import { SECURE_STORAGE_KEYS } from '../constants/storage-keys';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface AuthError {
  message: string;
  code?: string;
}

export class AuthService {
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<void> | null = null;

  /**
   * Initialize the auth service by loading stored credentials
   */
  async initialize(): Promise<void> {
    try {
      this.token = await SecureStore.getItemAsync(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      const expiryStr = await SecureStore.getItemAsync(SECURE_STORAGE_KEYS.TOKEN_EXPIRY);
      this.tokenExpiry = expiryStr ? parseInt(expiryStr) : null;

      // Check if token needs refresh
      if (this.token && this.tokenExpiry) {
        const timeUntilExpiry = this.tokenExpiry - Date.now();
        if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
          // Token expires within 24 hours, refresh it
          await this.refreshToken();
        } else if (timeUntilExpiry <= 0) {
          // Token already expired, clear it
          await this.clearAuth();
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      await this.clearAuth();
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(
        `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`,
        credentials
      );

      const { token, expiresAt, user } = response.data;

      // Store token and expiry securely
      await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.AUTH_TOKEN, token);
      await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.TOKEN_EXPIRY, expiresAt.toString());
      await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.USER_EMAIL, user.email);

      // Update in-memory state
      this.token = token;
      this.tokenExpiry = expiresAt;

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || 'Login failed. Please check your credentials.';
      
      throw {
        message,
        code: axiosError.response?.status?.toString(),
      } as AuthError;
    }
  }

  /**
   * Logout and clear all auth data
   */
  async logout(): Promise<void> {
    await this.clearAuth();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.token || !this.tokenExpiry) {
      return false;
    }

    // Check if token is expired
    return this.tokenExpiry > Date.now();
  }

  /**
   * Get the current auth token
   * Automatically refreshes if needed
   */
  async getToken(): Promise<string | null> {
    if (!this.token || !this.tokenExpiry) {
      return null;
    }

    // Check if token is expired
    if (this.tokenExpiry <= Date.now()) {
      await this.clearAuth();
      return null;
    }

    // Check if token needs refresh (within 24 hours of expiry)
    const timeUntilExpiry = this.tokenExpiry - Date.now();
    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS) {
      await this.refreshToken();
    }

    return this.token;
  }

  /**
   * Refresh the auth token
   */
  async refreshToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._refreshToken();
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _refreshToken(): Promise<void> {
    if (!this.token) {
      throw new Error('No token to refresh');
    }

    try {
      const response = await axios.post<AuthResponse>(
        `${API_BASE_URL}${API_ENDPOINTS.REFRESH_TOKEN}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      const { token, expiresAt } = response.data;

      // Store new token and expiry
      await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.AUTH_TOKEN, token);
      await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.TOKEN_EXPIRY, expiresAt.toString());

      // Update in-memory state
      this.token = token;
      this.tokenExpiry = expiresAt;

      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // If refresh fails, clear auth and force re-login
      await this.clearAuth();
      throw error;
    }
  }

  /**
   * Get the stored user email
   */
  async getUserEmail(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SECURE_STORAGE_KEYS.USER_EMAIL);
    } catch (error) {
      console.error('Failed to get user email:', error);
      return null;
    }
  }

  /**
   * Clear all auth data
   */
  private async clearAuth(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.TOKEN_EXPIRY);
      await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.USER_EMAIL);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }

    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Create an axios instance with auth headers
   */
  async createAuthenticatedAxios() {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    return axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if token is close to expiry (within threshold)
   */
  isTokenNearExpiry(): boolean {
    if (!this.tokenExpiry) {
      return false;
    }

    const timeUntilExpiry = this.tokenExpiry - Date.now();
    return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS && timeUntilExpiry > 0;
  }

  /**
   * Get time until token expiry in milliseconds
   */
  getTimeUntilExpiry(): number | null {
    if (!this.tokenExpiry) {
      return null;
    }

    return Math.max(0, this.tokenExpiry - Date.now());
  }
}

// Singleton instance
export const authService = new AuthService();
