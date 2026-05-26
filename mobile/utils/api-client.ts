import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { authService } from '../services/auth-service';
import { API_BASE_URL } from '../constants/api';

/**
 * Create an authenticated API client
 * Automatically adds auth token to requests
 */
export async function createApiClient(): Promise<AxiosInstance> {
  const token = await authService.getToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout
  });

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      // If 401 Unauthorized, token might be expired
      if (error.response?.status === 401) {
        console.error('Authentication error - token may be expired');
        await authService.logout();
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Make an authenticated GET request
 */
export async function apiGet<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const client = await createApiClient();
  return client.get<T>(url, config);
}

/**
 * Make an authenticated POST request
 */
export async function apiPost<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const client = await createApiClient();
  return client.post<T>(url, data, config);
}

/**
 * Make an authenticated PUT request
 */
export async function apiPut<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const client = await createApiClient();
  return client.put<T>(url, data, config);
}

/**
 * Make an authenticated DELETE request
 */
export async function apiDelete<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const client = await createApiClient();
  return client.delete<T>(url, config);
}

/**
 * Upload a file with multipart/form-data
 */
export async function apiUploadFile<T = any>(
  url: string,
  formData: FormData,
  onUploadProgress?: (progressEvent: any) => void
): Promise<AxiosResponse<T>> {
  const token = await authService.getToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  return axios.post<T>(`${API_BASE_URL}${url}`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
    timeout: 120000, // 2 minute timeout for file uploads
  });
}
