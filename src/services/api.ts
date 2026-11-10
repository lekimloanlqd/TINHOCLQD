import type { User, ClassItem, SubjectItem, LessonRecord, DashboardData, AlertItem, SystemSettings } from '../types.ts';
import { localDb } from './localDb.ts';

const TOKEN_KEY = 'smart_classbook_auth_token';

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

export const api = {
  // Auth
  async login(identifier: string, password: string): Promise<{ token: string; user: User }> {
    try {
      const res = await fetchWithAuth('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      if (res?.token) {
        setStoredToken(res.token);
        // Also ensure localDb has this user active and synced
        try { localDb.login(identifier, password); } catch (_) {}
      }
      return res;
    } catch (err: any) {
      // Fallback to localDb for offline or static environments
      try {
        const localRes = localDb.login(identifier, password);
        setStoredToken(localRes.token);
        return localRes;
      } catch (localErr: any) {
        if (err.data?.error) {
          throw new Error(err.data.error);
        }
        throw localErr;
      }
    }
  },

  async getMe(): Promise<{ user: User | null }> {
    try {
      const serverRes = await fetchWithAuth('/api/auth/me');
      if (serverRes?.user) {
        return serverRes;
      }
    } catch (err) {}

    return localDb.getMe(getStoredToken());
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; user: User }> {
    // 1. Immediately update in local persistent storage
    const token = getStoredToken();
    const me = localDb.getMe(token);
    let localRes: any = null;
    if (me.user) {
      localRes = localDb.changePassword(me.user.id, currentPassword, newPassword);
    }

    // 2. Sync to server
    try {
      const serverRes = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return serverRes;
    } catch (err: any) {
      if (localRes) return localRes;
      throw err;
    }
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const localSettings = localDb.getSettings();
    try {
      const serverSettings = await fetchWithAuth('/api/settings');
      if (serverSettings && serverSettings.current_school_year) {
        return localDb.syncSettings(serverSettings);
      }
    } catch (err) {}
    return localSettings;
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    try {
      const serverSettings = await fetchWithAuth('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      if (serverSettings && serverSettings.current_school_year) {
        return localDb.syncSettings(serverSettings);
      }
    } catch (err: any) {
      console.info('Settings update on server deferred, saving locally:', err.message);
    }

    return localDb.updateSettings(settings);
  },

  // Classes
  async getClasses(): Promise<ClassItem[]> {
    const localClasses = localDb.getClasses();
    try {
      const serverClasses = await fetchWithAuth('/api/classes');
      if (Array.isArray(serverClasses) && serverClasses.length > 0) {
        return localDb.syncClasses(serverClasses);
      }
    } catch (err) {}

    return localClasses;
  },

  async createClass(data: Partial<ClassItem>): Promise<ClassItem> {
    try {
      const serverClass = await fetchWithAuth('/api/classes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (serverClass && serverClass.id) {
        return localDb.addClass(serverClass);
      }
    } catch (err: any) {
      console.info('Class saving to server deferred, storing locally:', err.message);
    }

    return localDb.addClass(data);
  },

  async updateClass(id: string, data: Partial<ClassItem>): Promise<ClassItem> {
    try {
      const serverClass = await fetchWithAuth(`/api/classes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (serverClass && serverClass.id) {
        return localDb.updateClass(serverClass.id, serverClass);
      }
    } catch (err: any) {
      console.info('Class update on server deferred, updating locally:', err.message);
    }

    return localDb.updateClass(id, data);
  },

  async deleteClass(id: string): Promise<{ message: string }> {
    try {
      const res = await fetchWithAuth(`/api/classes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      localDb.deleteClass(id);
      return res;
    } catch (err: any) {
      console.info('Class delete on server deferred, deleting locally:', err.message);
    }

    return localDb.deleteClass(id);
  },

  // Subjects
  async getSubjects(): Promise<SubjectItem[]> {
    const localSubs = localDb.getSubjects();
    try {
      const serverSubs = await fetchWithAuth('/api/subjects');
      if (Array.isArray(serverSubs) && serverSubs.length > 0) {
        return localDb.syncSubjects(serverSubs);
      }
    } catch (err) {}
    return localSubs;
  },

  async createSubject(data: Partial<SubjectItem>): Promise<SubjectItem> {
    try {
      const serverSub = await fetchWithAuth('/api/subjects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (serverSub && serverSub.id) {
        return localDb.addSubject(serverSub);
      }
    } catch (err: any) {}
    return localDb.addSubject(data);
  },

  async updateSubject(id: string, data: Partial<SubjectItem>): Promise<SubjectItem> {
    try {
      const serverSub = await fetchWithAuth(`/api/subjects/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (serverSub && serverSub.id) {
        return localDb.updateSubject(serverSub.id, serverSub);
      }
    } catch (err: any) {}
    return localDb.updateSubject(id, data);
  },

  async deleteSubject(id: string): Promise<{ message: string }> {
    try {
      const res = await fetchWithAuth(`/api/subjects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      localDb.deleteSubject(id);
      return res;
    } catch (err: any) {}
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
    const localRecs = localDb.getLessonRecords(filters);
    try {
      const params = new URLSearchParams();
      if (filters?.class_id) params.set('class_id', filters.class_id);
      if (filters?.week_number) params.set('week_number', String(filters.week_number));
      if (filters?.semester) params.set('semester', String(filters.semester));
      if (filters?.grade) params.set('grade', String(filters.grade));
      if (filters?.date) params.set('date', filters.date);

      const serverRecs = await fetchWithAuth(`/api/records?${params.toString()}`);
      if (Array.isArray(serverRecs) && serverRecs.length > 0) {
        localDb.syncRecords(serverRecs);
        return localDb.getLessonRecords(filters);
      }
    } catch (err) {}

    return localRecs;
  },

  async createRecord(data: any): Promise<LessonRecord> {
    const token = getStoredToken();
    const me = localDb.getMe(token);
    if (!data.created_by && me.user) {
      data.created_by = me.user.full_name;
    }

    try {
      const serverRecord = await fetchWithAuth('/api/records', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (serverRecord && serverRecord.id) {
        return localDb.addLessonRecord(serverRecord, me.user);
      }
    } catch (err: any) {
      console.info('Record saving to server deferred, storing locally:', err.message);
    }

    return localDb.addLessonRecord(data, me.user);
  },

  async updateRecord(id: string, data: Partial<LessonRecord>): Promise<LessonRecord> {
    try {
      const serverRecord = await fetchWithAuth(`/api/records/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (serverRecord && serverRecord.id) {
        return localDb.updateLessonRecord(serverRecord.id, serverRecord);
      }
    } catch (err: any) {
      console.info('Record updating on server deferred, storing locally:', err.message);
    }

    return localDb.updateLessonRecord(id, data);
  },

  async deleteRecord(id: string): Promise<{ success?: boolean; message: string }> {
    try {
      const res = await fetchWithAuth(`/api/records/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      localDb.deleteLessonRecord(id);
      return res;
    } catch (err: any) {
      console.info('Record delete on server deferred, deleting locally:', err.message);
    }

    return localDb.deleteLessonRecord(id);
  },

  async clearAllRecordsForYear(
    schoolYear?: string
  ): Promise<{ success: boolean; message: string; deletedCount: number; school_year: string }> {
    try {
      const params = new URLSearchParams();
      if (schoolYear) params.set('school_year', schoolYear);
      const serverRes = await fetchWithAuth(`/api/records/all/clear-year?${params.toString()}`, {
        method: 'DELETE',
      });
      localDb.clearAllRecordsForYear(schoolYear);
      return serverRes;
    } catch (err: any) {
      console.info('Clear year on server deferred, clearing locally:', err.message);
    }

    return localDb.clearAllRecordsForYear(schoolYear);
  },

  async batchImportRecords(
    records: any[],
    onDuplicateAction: 'skip' | 'update' | 'cancel'
  ): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      const serverRes = await fetchWithAuth('/api/records/batch-import', {
        method: 'POST',
        body: JSON.stringify({ records, onDuplicateAction }),
      });
      // Synchronize all updated records into localDb
      try {
        const freshRecs = await fetchWithAuth('/api/records');
        if (Array.isArray(freshRecs)) {
          localDb.syncRecords(freshRecs);
        }
      } catch (_) {}
      return serverRes;
    } catch (err: any) {
      console.info('Server batch-import failed, falling back to localDb:', err.message);
    }

    return localDb.batchImportRecords(records, onDuplicateAction);
  },

  // Users (Admin only)
  async getUsers(): Promise<User[]> {
    try {
      const serverUsers = await fetchWithAuth('/api/users');
      if (Array.isArray(serverUsers) && serverUsers.length > 0) {
        localDb.syncUsers(serverUsers);
        return serverUsers;
      }
    } catch (err) {}
    return localDb.getUsers();
  },

  async createUser(data: any): Promise<User> {
    try {
      const serverUser = await fetchWithAuth('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (serverUser && serverUser.id) {
        return localDb.addUser(serverUser);
      }
    } catch (err: any) {
      if (err.data?.error || err.status === 400 || err.status === 401 || err.status === 403) {
        throw err;
      }
    }
    return localDb.addUser(data);
  },

  async updateUser(id: string, data: any): Promise<User> {
    try {
      const serverUser = await fetchWithAuth(`/api/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (serverUser && serverUser.id) {
        return localDb.updateUser(serverUser.id, serverUser);
      }
    } catch (err: any) {
      if (err.data?.error || err.status === 400 || err.status === 401 || err.status === 403) {
        throw err;
      }
    }
    return localDb.updateUser(id, data);
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      await fetchWithAuth(`/api/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (err.data?.error || err.status === 400 || err.status === 401 || err.status === 403) {
        throw err;
      }
    }
    return localDb.deleteUser(id);
  },

  async resetPassword(id: string, newPassword?: string): Promise<{ message: string }> {
    const res = localDb.resetPassword(id, newPassword);
    try {
      await fetchWithAuth(`/api/users/${encodeURIComponent(id)}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
    } catch (err: any) {}
    return res;
  },

  // Stats
  async getDashboardStats(filters?: {
    week_number?: number;
    semester?: number;
    grade?: number;
    school_year?: string;
  }): Promise<DashboardData> {
    try {
      const params = new URLSearchParams();
      if (filters?.week_number) params.set('week_number', String(filters.week_number));
      if (filters?.semester) params.set('semester', String(filters.semester));
      if (filters?.grade) params.set('grade', String(filters.grade));
      if (filters?.school_year) params.set('school_year', filters.school_year);

      const serverStats = await fetchWithAuth(`/api/stats/dashboard?${params.toString()}`);
      if (serverStats && serverStats.summary && serverStats.rankings) {
        return serverStats;
      }
    } catch (err) {}

    return localDb.getDashboardStats(filters);
  },

  async getAlerts(): Promise<AlertItem[]> {
    try {
      const serverAlerts = await fetchWithAuth('/api/stats/alerts');
      if (Array.isArray(serverAlerts)) {
        return serverAlerts;
      }
    } catch (err) {}

    return localDb.getAlerts();
  },

  // AI features
  async getAIInsight(params: { week_number?: number; grade?: number }): Promise<{ text: string; error?: boolean }> {
    try {
      const serverInsight = await fetchWithAuth('/api/ai/insight', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (serverInsight?.text) return serverInsight;
    } catch (err) {}

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
    try {
      const serverRes = await fetchWithAuth('/api/ai/ask', {
        method: 'POST',
        body: JSON.stringify({ question, currentWeek }),
      });
      if (serverRes?.text) return serverRes;
    } catch (err) {}

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
    try {
      const serverRes = await fetchWithAuth('/api/ai/report', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (serverRes?.text) return serverRes;
    } catch (err) {}

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

  async getStatus(): Promise<{
    status: string;
    storage: 'supabase' | 'file';
    supabaseConfigured: boolean;
    totalClasses: number;
    totalRecords: number;
    currentSchoolYear: string;
  }> {
    try {
      const res = await fetchWithAuth('/api/status');
      if (res && res.status) return res;
    } catch (_) {}
    return {
      status: 'ok',
      storage: 'file',
      supabaseConfigured: false,
      totalClasses: localDb.getClasses().length,
      totalRecords: localDb.getLessonRecords().length,
      currentSchoolYear: localDb.getSettings().current_school_year,
    };
  },

  async refreshCloudSync(): Promise<{ success: boolean; message: string; storage: string }> {
    try {
      const res = await fetchWithAuth('/api/sync/refresh', { method: 'POST' });
      const [classes, subjects, records, settings, users] = await Promise.all([
        fetchWithAuth('/api/classes').catch(() => null),
        fetchWithAuth('/api/subjects').catch(() => null),
        fetchWithAuth('/api/records').catch(() => null),
        fetchWithAuth('/api/settings').catch(() => null),
        fetchWithAuth('/api/users').catch(() => null),
      ]);
      if (Array.isArray(classes)) localDb.syncClasses(classes);
      if (Array.isArray(subjects)) localDb.syncSubjects(subjects);
      if (Array.isArray(records)) localDb.syncRecords(records);
      if (settings) localDb.syncSettings(settings);
      if (Array.isArray(users)) localDb.syncUsers(users);
      return res;
    } catch (err: any) {
      return { success: false, message: err.message || 'Không thể đồng bộ', storage: 'file' };
    }
  },

  async getAIStatus(): Promise<{ configured: boolean; keyPrefix?: string; defaultModel: string }> {
    try {
      return await fetchWithAuth('/api/ai/status');
    } catch (_) {
      return { configured: false, defaultModel: 'gemini-3.8-flash' };
    }
  },

  async testAIConnection(): Promise<{ success: boolean; message: string; modelUsed?: string; keyPrefix?: string }> {
    return await fetchWithAuth('/api/ai/test', { method: 'POST' });
  },
};
