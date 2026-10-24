import type {
  User,
  Prompt,
  Category,
  AuthResponse,
  PromptCreateInput,
  PromptUpdateInput,
  LibraryStats,
} from '../types';
import type { PromptFilterOptions } from '../utils/prompt-utils';

const TOKEN_KEY = 'prompthub_token';
const USER_KEY = 'prompthub_user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `İşlem başarısız oldu (${response.status})`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    authStorage.setToken(data.token);
    authStorage.setUser(data.user);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    authStorage.setToken(data.token);
    authStorage.setUser(data.user);
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const data = await request<{ user: User }>('/api/auth/me');
    authStorage.setUser(data.user);
    return data.user;
  },

  logout() {
    authStorage.clear();
  },

  async getPrompts(filters: PromptFilterOptions = {}): Promise<Prompt[]> {
    const params = new URLSearchParams();
    if (filters.searchQuery) params.append('search', filters.searchQuery);
    if (filters.category && filters.category !== 'Tümü') params.append('category', filters.category);
    if (filters.tag && filters.tag !== 'Tümü') params.append('tag', filters.tag);
    if (filters.onlyFavorites) params.append('onlyFavorites', 'true');
    if (filters.onlyFillable) params.append('onlyFillable', 'true');
    if (filters.sortBy) params.append('sortBy', filters.sortBy);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return request<Prompt[]>(`/api/prompts${queryStr}`);
  },

  async getRecentPrompts(limit = 3): Promise<Prompt[]> {
    return request<Prompt[]>(`/api/prompts/recent?limit=${limit}`);
  },

  async loadSamplePack(): Promise<{ count: number; total: number; message: string }> {
    return request('/api/prompts/load-sample-pack', {
      method: 'POST',
    });
  },

  async getPrompt(id: string): Promise<Prompt> {
    return request<Prompt>(`/api/prompts/${id}`);
  },

  async createPrompt(input: PromptCreateInput): Promise<Prompt> {
    return request<Prompt>('/api/prompts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updatePrompt(id: string, input: PromptUpdateInput): Promise<Prompt> {
    return request<Prompt>(`/api/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async deletePrompt(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/prompts/${id}`, {
      method: 'DELETE',
    });
  },

  async toggleFavorite(id: string): Promise<{ is_favorite: boolean }> {
    return request<{ is_favorite: boolean }>(`/api/prompts/${id}/favorite`, {
      method: 'POST',
    });
  },

  async incrementCopy(id: string): Promise<{ copy_count: number; last_copied_at?: string }> {
    return request<{ copy_count: number; last_copied_at?: string }>(`/api/prompts/${id}/copy`, {
      method: 'POST',
    });
  },

  async revertPrompt(
    id: string,
    version: number
  ): Promise<{ success: boolean; prompt: Prompt; message: string }> {
    return request<{ success: boolean; prompt: Prompt; message: string }>(
      `/api/prompts/${id}/revert`,
      {
        method: 'POST',
        body: JSON.stringify({ version }),
      }
    );
  },

  async createSnapshot(
    id: string,
    summary?: string
  ): Promise<{ success: boolean; prompt: Prompt; message: string }> {
    return request<{ success: boolean; prompt: Prompt; message: string }>(
      `/api/prompts/${id}/snapshot`,
      {
        method: 'POST',
        body: JSON.stringify({ summary }),
      }
    );
  },

  async getCategories(): Promise<Category[]> {
    return request<Category[]>('/api/categories');
  },

  async createCategory(name: string, color?: string): Promise<Category> {
    return request<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },

  async getTags(): Promise<string[]> {
    return request<string[]>('/api/tags');
  },

  async getStats(): Promise<LibraryStats> {
    return request<LibraryStats>('/api/stats');
  },

  async exportPrompts(): Promise<any> {
    return request('/api/export');
  },

  async importPrompts(prompts: any[]): Promise<{ count: number; message: string }> {
    return request<{ count: number; message: string }>('/api/import', {
      method: 'POST',
      body: JSON.stringify({ prompts }),
    });
  },

  async getStatus(): Promise<{ status: string; hasSupabaseEnv: boolean }> {
    return request('/api/status');
  },
};
