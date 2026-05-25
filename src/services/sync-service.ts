/**
 * Sync Service - Handles communication with backend
 */

const BACKEND_URL = 'https://attune-backend-5hke.onrender.com';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export class SyncService {
  private token: string | null = null;

  constructor() {
    // Load saved token
    this.token = localStorage.getItem('attune-auth-token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    const data: AuthResponse = await response.json();
    this.token = data.token;
    localStorage.setItem('attune-auth-token', data.token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    this.token = data.token;
    localStorage.setItem('attune-auth-token', data.token);
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('attune-auth-token');
  }

  async uploadData(data: any, familyGroupName?: string): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    // Include photos in the upload
    const photosToSync: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attune-profile-photo-')) {
        const photoData = localStorage.getItem(key);
        if (photoData) {
          photosToSync[key] = photoData;
        }
      }
    }

    const fullData = {
      appData: data,
      photos: photosToSync,
    };

    const response = await fetch(`${BACKEND_URL}/api/sync/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ data: fullData, familyGroupName }),
    });

    if (!response.ok) {
      const error = await response.json();
      // If token is invalid, clear it so user can re-login
      if (response.status === 403 || response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(error.error || 'Upload failed');
    }
  }

  async downloadData(): Promise<any> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${BACKEND_URL}/api/sync/download`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      // If token is invalid, clear it so user can re-login
      if (response.status === 403 || response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(error.error || 'Download failed');
    }

    const fullData = await response.json();
    
    // Restore photos to localStorage
    if (fullData.photos) {
      for (const [key, photoData] of Object.entries(fullData.photos)) {
        localStorage.setItem(key, photoData as string);
      }
    }

    // Return just the app data for saving to IndexedDB
    return fullData.appData || fullData;
  }

  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const syncService = new SyncService();
