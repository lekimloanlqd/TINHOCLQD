import { User, ClassItem, SubjectItem, LessonRecord, DashboardData, AlertItem, SystemSettings } from '../types.ts';

const TOKEN_KEY = 'smart_classbook_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Lỗi yêu cầu (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  async login(identifier: string, password: string): Promise<{ token: string; user: User }> {
    return fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },

  async getMe(): Promise<{ user: User | null }> {
    return fetchWithAuth('/api/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string; user: User }> {
    return fetchWithAuth('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    return fetchWithAuth('/api/settings');
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return fetchWithAuth('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Classes
  async getClasses(): Promise<ClassItem[]> {
    return fetchWithAuth('/api/classes');
  },

  async createClass(data: Partial<ClassItem>): Promise<ClassItem> {
    return fetchWithAuth('/api/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClass(id: string, data: Partial<ClassItem>): Promise<ClassItem> {
    return fetchWithAuth(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteClass(id: string): Promise<{ message: string }> {
    return fetchWithAuth(`/api/classes/${id}`, {
      method: 'DELETE',
    });
  },

  // Subjects
  async getSubjects(): Promise<SubjectItem[]> {
    return fetchWithAuth('/api/subjects');
  },

  async createSubject(data: Partial<SubjectItem>): Promise<SubjectItem> {
    return fetchWithAuth('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSubject(id: string, data: Partial<SubjectItem>): Promise<SubjectItem> {
    return fetchWithAuth(`/api/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSubject(id: string): Promise<{ message: string }> {
    return fetchWithAuth(`/api/subjects/${id}`, {
      method: 'DELETE',
    });
  },

  // Lesson Records
  async getRecords(filters?: { class_id?: string; week_number?: number; semester?: number; grade?: number; date?: string }): Promise<LessonRecord[]> {
    const params = new URLSearchParams();
    if (filters?.class_id) params.set('class_id', filters.class_id);
    if (filters?.week_number) params.set('week_number', String(filters.week_number));
    if (filters?.semester) params.set('semester', String(filters.semester));
    if (filters?.grade) params.set('grade', String(filters.grade));
    if (filters?.date) params.set('date', filters.date);

    return fetchWithAuth(`/api/records?${params.toString()}`);
  },

  async createRecord(data: any): Promise<LessonRecord> {
    return fetchWithAuth('/api/records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRecord(id: string, data: Partial<LessonRecord>): Promise<LessonRecord> {
    return fetchWithAuth(`/api/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteRecord(id: string): Promise<{ success?: boolean; message: string }> {
    return fetchWithAuth(`/api/records/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async clearAllRecordsForYear(schoolYear?: string): Promise<{ success: boolean; message: string; deletedCount: number; school_year: string }> {
    const params = new URLSearchParams();
    if (schoolYear) params.set('school_year', schoolYear);
    return fetchWithAuth(`/api/records/all/clear-year?${params.toString()}`, {
      method: 'DELETE',
    });
  },

  async batchImportRecords(records: any[], onDuplicateAction: 'skip' | 'update' | 'cancel'): Promise<{ success: boolean; message: string; stats: any }> {
    return fetchWithAuth('/api/records/batch-import', {
      method: 'POST',
      body: JSON.stringify({ records, onDuplicateAction }),
    });
  },

  // Users (Admin only)
  async getUsers(): Promise<User[]> {
    return fetchWithAuth('/api/users');
  },

  async createUser(data: any): Promise<User> {
    return fetchWithAuth('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: any): Promise<User> {
    return fetchWithAuth(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async resetPassword(id: string, newPassword?: string): Promise<{ message: string }> {
    return fetchWithAuth(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  // Stats
  async getDashboardStats(filters?: { week_number?: number; semester?: number; grade?: number; school_year?: string }): Promise<DashboardData> {
    const params = new URLSearchParams();
    if (filters?.week_number) params.set('week_number', String(filters.week_number));
    if (filters?.semester) params.set('semester', String(filters.semester));
    if (filters?.grade) params.set('grade', String(filters.grade));
    if (filters?.school_year) params.set('school_year', filters.school_year);

    return fetchWithAuth(`/api/stats/dashboard?${params.toString()}`);
  },

  async getAlerts(): Promise<AlertItem[]> {
    return fetchWithAuth('/api/stats/alerts');
  },

  // AI features (Gemini backend)
  async getAIInsight(params: { week_number?: number; grade?: number }): Promise<{ text: string; error?: boolean }> {
    return fetchWithAuth('/api/ai/insight', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async askAIAssistant(question: string, currentWeek?: number): Promise<{ text: string; error?: boolean }> {
    return fetchWithAuth('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question, currentWeek }),
    });
  },

  async generateAIReport(params: { scope: string; weekNumber?: number; semester?: number; grade?: number }): Promise<{ text: string; error?: boolean }> {
    return fetchWithAuth('/api/ai/report', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
