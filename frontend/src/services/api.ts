// API service with authentication support
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = 'An error occurred';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }

      throw new ApiError(errorMessage, response.status);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return {} as T;
  }

  async request<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options;

    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: requiresAuth ? this.getAuthHeaders() : { 'Content-Type': 'application/json' },
      ...fetchOptions,
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error occurred', 0);
    }
  }

  // Convenience methods
  get<T>(endpoint: string, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth });
  }

  post<T>(endpoint: string, data?: any, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
    });
  }

  put<T>(endpoint: string, data?: any, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
    });
  }

  delete<T>(endpoint: string, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }
}

// Export singleton instance
export const api = new ApiService();

export default api;