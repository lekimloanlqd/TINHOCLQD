import type { User, ClassItem, SubjectItem, LessonRecord, DashboardData, AlertItem, SystemSettings } from '../types.ts';
import { localDb } from './localDb.ts';

const TOKEN_KEY = 'smart_classbook_auth_token';

// Automatically detect whether backend server is reachable or if running in static client mode (e.g. Vercel static)
let isClientMode = false;

let memoryToken: string | null = null;

export function getStoredToken(): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(TOKEN_KEY);
  }
  return memoryToken;
}

export function setStoredToken(token: string | null): void {
  memoryToken = token;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

export function isLocalClientMode(): boolean {
  return isClientMode;
}

export function setLocalClientMode(val: boolean): void {
  isClientMode = val;
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

  const contentType = response.headers.get('content-type') || '';
  let data: any = {};
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    await response.text().catch(() => '');
  }

  if (!response.ok) {
    const error: any = new Error(data.error || data.message || `Lỗi yêu cầu (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function shouldFallbackToLocal(err: any): boolean {
  return (
    isClientMode ||
    err?.status === 404 ||
    err?.message?.includes('404') ||
    err?.name === 'TypeError' ||
    err?.message?.includes('Failed to fetch') ||
    err?.message?.includes('NetworkError')
  );
}

export const api = {
  // Auth
  async login(identifier: string, password: string): Promise<{ token: string; user: User }> {
    if (!isClientMode) {
      try {
        const res = await fetchWithAuth('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        });
        if (res?.token) {
          setStoredToken(res.token);
        }
        return res;
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
          console.info('API 404 or unreachable, falling back to local database for login.');
        } else {
          throw err;
        }
      }
    }

    const localRes = localDb.login(identifier, password);
    setStoredToken(localRes.token);
    return localRes;
  },

  async getMe(): Promise<{ user: User | null }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/auth/me');
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.getMe(getStoredToken());
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; user: User }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword }),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    const token = getStoredToken();
    const me = localDb.getMe(token);
    if (!me.user) {
      throw new Error('Vui lòng đăng nhập để đổi mật khẩu.');
    }
    return localDb.changePassword(me.user.id, currentPassword, newPassword);
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/settings');
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.getSettings();
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/settings', {
          method: 'PUT',
          body: JSON.stringify(settings),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.updateSettings(settings);
  },

  // Classes
  async getClasses(): Promise<ClassItem[]> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/classes');
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.getClasses();
  },

  async createClass(data: Partial<ClassItem>): Promise<ClassItem> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/classes', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.addClass(data);
  },

  async updateClass(id: string, data: Partial<ClassItem>): Promise<ClassItem> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth(`/api/classes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.updateClass(id, data);
  },

  async deleteClass(id: string): Promise<{ message: string }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth(`/api/classes/${id}`, {
          method: 'DELETE',
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.deleteClass(id);
  },

  // Subjects
  async getSubjects(): Promise<SubjectItem[]> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/subjects');
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.getSubjects();
  },

  async createSubject(data: Partial<SubjectItem>): Promise<SubjectItem> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/subjects', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.addSubject(data);
  },

  async updateSubject(id: string, data: Partial<SubjectItem>): Promise<SubjectItem> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth(`/api/subjects/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.updateSubject(id, data);
  },

  async deleteSubject(id: string): Promise<{ message: string }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth(`/api/subjects/${id}`, {
          method: 'DELETE',
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.deleteSubject(id);
  },

  // Lesson Records
  async getRecords(filters?: {
    class_id?: string;
    week_number?: number;
    semester?: number;
    grade?: number;
    date?: string;
  }): Promise<LessonRecord[]> {
    if (!isClientMode) {
      try {
        const params = new URLSearchParams();
        if (filters?.class_id) params.set('class_id', filters.class_id);
        if (filters?.week_number) params.set('week_number', String(filters.week_number));
        if (filters?.semester) params.set('semester', String(filters.semester));
        if (filters?.grade) params.set('grade', String(filters.grade));
        if (filters?.date) params.set('date', filters.date);

        return await fetchWithAuth(`/api/records?${params.toString()}`);
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.getLessonRecords(filters);
  },

  async createRecord(data: any): Promise<LessonRecord> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/records', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    const token = getStoredToken();
    const me = localDb.getMe(token);
    return localDb.addLessonRecord(data, me.user);
  },

  async updateRecord(id: string, data: Partial<LessonRecord>): Promise<LessonRecord> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth(`/api/records/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.updateLessonRecord(id, data);
  },

  async deleteRecord(id: string): Promise<{ success?: boolean; message: string }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth(`/api/records/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.deleteLessonRecord(id);
  },

  async clearAllRecordsForYear(
    schoolYear?: string
  ): Promise<{ success: boolean; message: string; deletedCount: number; school_year: string }> {
    if (!isClientMode) {
      try {
        const params = new URLSearchParams();
        if (schoolYear) params.set('school_year', schoolYear);
        return await fetchWithAuth(`/api/records/all/clear-year?${params.toString()}`, {
          method: 'DELETE',
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.clearAllRecordsForYear(schoolYear);
  },

  async batchImportRecords(
    records: any[],
    onDuplicateAction: 'skip' | 'update' | 'cancel'
  ): Promise<{ success: boolean; message: string; stats: any }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/records/batch-import', {
          method: 'POST',
          body: JSON.stringify({ records, onDuplicateAction }),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.batchImportRecords(records, onDuplicateAction);
  },

  // Users (Admin only)
  async getUsers(): Promise<User[]> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/users');
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.getUsers();
  },

  async createUser(data: any): Promise<User> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/users', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.addUser(data);
  },

  async updateUser(id: string, data: any): Promise<User> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth(`/api/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.updateUser(id, data);
  },

  async resetPassword(id: string, newPassword?: string): Promise<{ message: string }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth(`/api/users/${id}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ newPassword }),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.resetPassword(id, newPassword);
  },

  // Stats
  async getDashboardStats(filters?: {
    week_number?: number;
    semester?: number;
    grade?: number;
    school_year?: string;
  }): Promise<DashboardData> {
    if (!isClientMode) {
      try {
        const params = new URLSearchParams();
        if (filters?.week_number) params.set('week_number', String(filters.week_number));
        if (filters?.semester) params.set('semester', String(filters.semester));
        if (filters?.grade) params.set('grade', String(filters.grade));
        if (filters?.school_year) params.set('school_year', filters.school_year);

        return await fetchWithAuth(`/api/stats/dashboard?${params.toString()}`);
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.getDashboardStats(filters);
  },

  async getAlerts(): Promise<AlertItem[]> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/stats/alerts');
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    return localDb.getAlerts();
  },

  // AI features
  async getAIInsight(params: { week_number?: number; grade?: number }): Promise<{ text: string; error?: boolean }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/ai/insight', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    const stats = localDb.getDashboardStats({ week_number: params.week_number, grade: params.grade });
    return {
      text: `### TỔNG HỢP NHANH THI ĐUA (AI INSIGHT)
- **Tổng số tiết đã ghi nhận**: ${stats.summary.totalRecords} tiết.
- **Điểm trung bình toàn khối**: ${stats.summary.avgScore}/10 điểm.
- **Tỷ lệ giờ học Tốt**: ${stats.summary.goodRate}% | **Chưa đạt**: ${stats.summary.failRate}%.
- **Lớp tiêu biểu dẫn đầu**: ${stats.top3.map((c) => c.class_name).join(', ') || 'Đang cập nhật'}.
- **Khuyến nghị**: Tiếp tục giữ vững phong trào tự quản giờ tự học và đôn đốc trật tự vệ sinh đầu giờ.`,
    };
  },

  async askAIAssistant(question: string, currentWeek?: number): Promise<{ text: string; error?: boolean }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/ai/ask', {
          method: 'POST',
          body: JSON.stringify({ question, currentWeek }),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    const stats = localDb.getDashboardStats({ week_number: currentWeek });
    return {
      text: `Dựa trên dữ liệu Sổ đầu bài tuần ${currentWeek || 1}: Toàn trường hiện có ${stats.summary.totalRecords} tiết học ghi nhận. Điểm trung bình đạt ${stats.summary.avgScore}/10. Ba lớp dẫn đầu hiện tại là ${stats.top3.map((c) => `${c.class_name} (${c.avgScore} điểm)`).join(', ')}. Cán bộ Đoàn và Lớp phó học tập hãy tiếp tục theo dõi chặt chẽ chuyên cần và kỉ luật tiết học!`,
    };
  },

  async generateAIReport(params: {
    scope: string;
    weekNumber?: number;
    semester?: number;
    grade?: number;
  }): Promise<{ text: string; error?: boolean }> {
    if (!isClientMode) {
      try {
        return await fetchWithAuth('/api/ai/report', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      } catch (err: any) {
        if (shouldFallbackToLocal(err)) {
          isClientMode = true;
        } else {
          throw err;
        }
      }
    }

    const stats = localDb.getDashboardStats({ week_number: params.weekNumber, semester: params.semester, grade: params.grade });
    return {
      text: `# BÁO CÁO THI ĐUA NỀ NẾP HỌC TẬP TUẦN ${params.weekNumber || 1}
**Đoàn TNCS Hồ Chí Minh - THPT Phan Bội Châu**

### I. TÌNH HÌNH CHUNG
- Tổng số tiết ghi sổ đầu bài: **${stats.summary.totalRecords}** tiết.
- Điểm trung bình toàn đợt: **${stats.summary.avgScore}/10** điểm.
- Tỷ lệ tiết Tốt: **${stats.summary.goodRate}%** (${Math.round((stats.summary.totalRecords * stats.summary.goodRate) / 100)} tiết).
- Tỷ lệ tiết Chưa đạt: **${stats.summary.failRate}%**.

### II. CÁC LỚP NỔI BẬT & KHEN THƯỞNG
${stats.top3.map((c, i) => `${i + 1}. **Lớp ${c.class_name}** - Điểm TB: ${c.avgScore}, Tỷ lệ Tốt: ${c.goodRate}%`).join('\n')}

### III. ĐỀ XUẤT TUẦN TỚI
1. Tuyên dương các lớp có thành tích xuất sắc trong buổi Chào cờ đầu tuần.
2. Ban Thi đua Đoàn trường phối hợp GVCN các lớp có giờ Chưa đạt để chấn chỉnh kịp thời.`,
    };
  },
};
