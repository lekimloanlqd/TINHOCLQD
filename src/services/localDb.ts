import type { User, ClassItem, SubjectItem, LessonRecord, DashboardData, AlertItem, SystemSettings } from '../types.ts';
import { initialData, DatabaseData } from '../data/initialData.ts';

const LOCAL_STORAGE_DB_KEY = 'smart_classbook_local_db_v3';
const TOKEN_KEY = 'smart_classbook_auth_token';

// In-memory token storage for active sessions in client mode
const sessions = new Map<string, { userId: string; createdAt: number }>();

function generateToken(userId: string): string {
  const token = `tok_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

export function computeScoreAndClassification(
  study: number,
  discipline: number,
  hygiene: number,
  attendance: number
): { total_score: number; classification: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' } {
  const s = Math.min(3, Math.max(0, Number(study) || 0));
  const d = Math.min(3, Math.max(0, Number(discipline) || 0));
  const h = Math.min(2, Math.max(0, Number(hygiene) || 0));
  const a = Math.min(2, Math.max(0, Number(attendance) || 0));

  const total_score = Number((s + d + h + a).toFixed(2));
  let classification: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' = 'Chưa đạt';

  if (total_score >= 9) {
    classification = 'Tốt';
  } else if (total_score >= 7) {
    classification = 'Khá';
  } else if (total_score >= 5) {
    classification = 'Đạt';
  } else {
    classification = 'Chưa đạt';
  }

  return { total_score, classification };
}

class LocalDatabase {
  private data: DatabaseData;

  constructor() {
    this.data = this.loadData();
  }

  public reloadFromStorage(): DatabaseData {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.classes) && Array.isArray(parsed.lesson_records)) {
            this.data = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    return this.data;
  }

  private loadData(): DatabaseData {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.classes) && Array.isArray(parsed.lesson_records)) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initialData', e);
    }

    const init = JSON.parse(JSON.stringify(initialData));
    this.saveData(init);
    return init;
  }

  private saveData(data: DatabaseData): void {
    this.data = data;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Could not persist to localStorage', e);
    }
  }

  public getSettings(): SystemSettings {
    this.reloadFromStorage();
    return this.data.settings;
  }

  public updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    this.reloadFromStorage();
    this.data.settings = { ...this.data.settings, ...partial };
    this.saveData(this.data);
    return this.data.settings;
  }

  public syncSettings(incoming: SystemSettings): SystemSettings {
    this.reloadFromStorage();
    if (!incoming) return this.data.settings;
    this.data.settings = { ...this.data.settings, ...incoming };
    this.saveData(this.data);
    return this.data.settings;
  }

  public getUserById(id: string): User | undefined {
    this.reloadFromStorage();
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmailOrPhone(identifier: string): User | undefined {
    this.reloadFromStorage();
    const term = identifier.trim().toLowerCase();
    return this.data.users.find(
      (u) =>
        u.email.toLowerCase() === term ||
        u.phone === term ||
        (term === 'admin' && u.role === 'ADMIN')
    );
  }

  public login(identifier: string, password: string): { token: string; user: User } {
    this.reloadFromStorage();
    if (!identifier || !password) {
      throw new Error('Vui lòng nhập tên đăng nhập/email/SĐT và mật khẩu.');
    }
    const user = this.getUserByEmailOrPhone(identifier);
    if (!user) {
      throw new Error('Tài khoản không tồn tại trong hệ thống.');
    }
    if (user.status === 'LOCKED') {
      throw new Error('Tài khoản này đã bị khóa. Vui lòng liên hệ Admin.');
    }
    if (user.password !== password) {
      throw new Error('Mật khẩu không chính xác.');
    }

    const token = generateToken(user.id);
    const { password: _, ...userSafe } = user;
    return { token, user: userSafe as User };
  }

  public getMe(token: string | null): { user: User | null } {
    this.reloadFromStorage();
    if (!token) return { user: null };
    let session = sessions.get(token);
    let userId = session?.userId;

    if (!userId && token.startsWith('tok_')) {
      const parts = token.split('_');
      if (parts.length >= 2) {
        userId = parts[1];
      }
    }

    if (!userId) return { user: null };
    const user = this.getUserById(userId);
    if (!user || user.status === 'LOCKED') return { user: null };

    const { password: _, ...userSafe } = user;
    return { user: userSafe as User };
  }

  public changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): { success: boolean; message: string; user: User } {
    this.reloadFromStorage();
    const user = this.getUserById(userId);
    if (!user) throw new Error('Người dùng không tồn tại.');
    if (user.password !== currentPassword) {
      throw new Error('Mật khẩu hiện tại không đúng.');
    }
    if (newPassword.length < 4) {
      throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự.');
    }

    user.password = newPassword;
    user.must_change_password = false;
    user.updated_at = new Date().toISOString();
    this.saveData(this.data);

    const { password: _, ...userSafe } = user;
    return { success: true, message: 'Đổi mật khẩu thành công!', user: userSafe as User };
  }

  public getClasses(): ClassItem[] {
    this.reloadFromStorage();
    return [...this.data.classes];
  }

  public addClass(data: Partial<ClassItem>): ClassItem {
    this.reloadFromStorage();
    const classId = (data.class_name || data.id || '').trim();
    if (!classId) throw new Error('Tên lớp là bắt buộc.');

    const existingIndex = this.data.classes.findIndex(
      (c) => c.id.toLowerCase() === classId.toLowerCase() || c.class_name.toLowerCase() === classId.toLowerCase()
    );

    const newClass: ClassItem = {
      id: classId,
      class_name: data.class_name || classId,
      grade: Number(data.grade) || 10,
      school_year: data.school_year || this.data.settings.current_school_year,
      homeroom_teacher: data.homeroom_teacher || '',
      student_count: Number(data.student_count) || 40,
      status: data.status || 'ACTIVE',
      created_at: existingIndex >= 0 ? this.data.classes[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.data.classes[existingIndex] = newClass;
    } else {
      this.data.classes.push(newClass);
    }

    this.saveData(this.data);
    return newClass;
  }

  public updateClass(id: string, partial: Partial<ClassItem>): ClassItem {
    this.reloadFromStorage();
    const idx = this.data.classes.findIndex((c) => c.id === id || c.class_name === id);
    if (idx === -1) {
      return this.addClass({ ...partial, id, class_name: partial.class_name || id });
    }
    this.data.classes[idx] = {
      ...this.data.classes[idx],
      ...partial,
      updated_at: new Date().toISOString(),
    };
    this.saveData(this.data);
    return this.data.classes[idx];
  }

  public deleteClass(id: string): { message: string } {
    this.reloadFromStorage();
    const hasRecords = this.data.lesson_records.some((r) => r.class_id === id);
    if (hasRecords) {
      this.updateClass(id, { status: 'INACTIVE' });
      return { message: 'Lớp đã có dữ liệu Sổ đầu bài nên được chuyển sang trạng thái Vô hiệu hóa.' };
    }
    this.data.classes = this.data.classes.filter((c) => c.id !== id && c.class_name !== id);
    this.saveData(this.data);
    return { message: 'Xóa lớp thành công.' };
  }

  public syncClasses(incoming: ClassItem[]): ClassItem[] {
    this.reloadFromStorage();
    if (!Array.isArray(incoming)) return this.data.classes;
    const map = new Map<string, ClassItem>();
    // First keep all local classes (e.g. offline additions)
    this.data.classes.forEach((c) => map.set(c.id, c));
    // Server classes override matching local classes
    incoming.forEach((c) => map.set(c.id, c));
    this.data.classes = Array.from(map.values());
    this.saveData(this.data);
    return this.data.classes;
  }

  public getSubjects(): SubjectItem[] {
    this.reloadFromStorage();
    return [...this.data.subjects];
  }

  public addSubject(data: Partial<SubjectItem>): SubjectItem {
    this.reloadFromStorage();
    const code = (data.subject_code || '').toUpperCase().trim();
    if (!code) throw new Error('Mã môn học là bắt buộc.');

    const existingIdx = this.data.subjects.findIndex((s) => s.id === code || s.subject_code === code);
    const newSub: SubjectItem = {
      id: code,
      subject_code: code,
      subject_name: data.subject_name || '',
      status: data.status || 'ACTIVE',
      created_at: existingIdx >= 0 ? this.data.subjects[existingIdx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      this.data.subjects[existingIdx] = newSub;
    } else {
      this.data.subjects.push(newSub);
    }

    this.saveData(this.data);
    return newSub;
  }

  public updateSubject(id: string, partial: Partial<SubjectItem>): SubjectItem {
    this.reloadFromStorage();
    const idx = this.data.subjects.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Không tìm thấy môn học.');
    this.data.subjects[idx] = {
      ...this.data.subjects[idx],
      ...partial,
      updated_at: new Date().toISOString(),
    };
    this.saveData(this.data);
    return this.data.subjects[idx];
  }

  public deleteSubject(id: string): { message: string } {
    this.reloadFromStorage();
    const idx = this.data.subjects.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.data.subjects[idx].status = 'INACTIVE';
      this.saveData(this.data);
    }
    return { message: 'Đã vô hiệu hóa môn học.' };
  }

  public syncSubjects(incoming: SubjectItem[]): SubjectItem[] {
    this.reloadFromStorage();
    if (!Array.isArray(incoming)) return this.data.subjects;
    const map = new Map<string, SubjectItem>();
    this.data.subjects.forEach((s) => map.set(s.id, s));
    incoming.forEach((s) => map.set(s.id, s));
    this.data.subjects = Array.from(map.values());
    this.saveData(this.data);
    return this.data.subjects;
  }

  public getLessonRecords(filters?: {
    class_id?: string;
    week_number?: number;
    semester?: number;
    grade?: number;
    date?: string;
  }): LessonRecord[] {
    this.reloadFromStorage();
    let records = [...this.data.lesson_records];
    if (filters?.class_id) {
      records = records.filter((r) => r.class_id === filters.class_id);
    }
    if (filters?.week_number) {
      records = records.filter((r) => r.week_number === Number(filters.week_number));
    }
    if (filters?.semester) {
      records = records.filter((r) => r.semester === Number(filters.semester));
    }
    if (filters?.date) {
      records = records.filter((r) => r.date === filters.date);
    }
    if (filters?.grade) {
      const classesOfGrade = this.data.classes
        .filter((c) => c.grade === Number(filters.grade))
        .map((c) => c.id);
      records = records.filter((r) => classesOfGrade.includes(r.class_id));
    }

    records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.period - b.period;
    });

    return records;
  }

  public addLessonRecord(record: any, currentUser?: User | null): LessonRecord {
    this.reloadFromStorage();
    const study = Number(record.study_score) || 0;
    const disc = Number(record.discipline_score) || 0;
    const hyg = Number(record.hygiene_score) || 0;
    const att = Number(record.attendance_score) || 0;
    const { total_score, classification } = computeScoreAndClassification(study, disc, hyg, att);

    const newRec: LessonRecord = {
      id: record.id || `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      school_year: record.school_year || this.data.settings.current_school_year,
      class_id: record.class_id,
      date: record.date,
      week_number: Number(record.week_number) || 1,
      semester: Number(record.semester) || 1,
      period: Number(record.period),
      subject_id: record.subject_id,
      study_score: study,
      discipline_score: disc,
      hygiene_score: hyg,
      attendance_score: att,
      total_score,
      classification,
      note: record.note || '',
      created_by: currentUser?.full_name || record.created_by || 'Người dùng',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const duplicateIndex = this.data.lesson_records.findIndex(
      (r) =>
        r.class_id === newRec.class_id &&
        r.date === newRec.date &&
        r.period === newRec.period &&
        r.subject_id === newRec.subject_id
    );

    if (duplicateIndex >= 0) {
      this.data.lesson_records[duplicateIndex] = newRec;
    } else {
      this.data.lesson_records.push(newRec);
    }

    this.saveData(this.data);
    return newRec;
  }

  public updateLessonRecord(id: string, partial: any): LessonRecord {
    this.reloadFromStorage();
    const idx = this.data.lesson_records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Không tìm thấy tiết học.');

    const current = this.data.lesson_records[idx];
    const study = partial.study_score !== undefined ? Number(partial.study_score) : current.study_score;
    const disc = partial.discipline_score !== undefined ? Number(partial.discipline_score) : current.discipline_score;
    const hyg = partial.hygiene_score !== undefined ? Number(partial.hygiene_score) : current.hygiene_score;
    const att = partial.attendance_score !== undefined ? Number(partial.attendance_score) : current.attendance_score;

    const { total_score, classification } = computeScoreAndClassification(study, disc, hyg, att);

    this.data.lesson_records[idx] = {
      ...current,
      ...partial,
      study_score: study,
      discipline_score: disc,
      hygiene_score: hyg,
      attendance_score: att,
      total_score,
      classification,
      updated_at: new Date().toISOString(),
    };

    this.saveData(this.data);
    return this.data.lesson_records[idx];
  }

  public deleteLessonRecord(id: string): { success: boolean; message: string } {
    this.reloadFromStorage();
    this.data.lesson_records = this.data.lesson_records.filter((r) => r.id !== id);
    this.saveData(this.data);
    return { success: true, message: 'Xóa tiết học thành công!' };
  }

  public clearAllRecordsForYear(schoolYear?: string): { success: boolean; message: string; deletedCount: number; school_year: string } {
    this.reloadFromStorage();
    const year = schoolYear || this.data.settings.current_school_year;
    const prevCount = this.data.lesson_records.length;
    this.data.lesson_records = this.data.lesson_records.filter((r) => r.school_year !== year);
    const deletedCount = prevCount - this.data.lesson_records.length;
    this.saveData(this.data);
    return {
      success: true,
      message: `Đã xóa toàn bộ ${deletedCount} tiết học của năm học ${year} thành công.`,
      deletedCount,
      school_year: year,
    };
  }

  public syncRecords(incoming: LessonRecord[]): LessonRecord[] {
    this.reloadFromStorage();
    if (!Array.isArray(incoming)) return this.data.lesson_records;
    const map = new Map<string, LessonRecord>();
    // First keep all existing local records (e.g. offline drafts)
    this.data.lesson_records.forEach((r) => map.set(r.id, r));
    // Server records override matching records
    incoming.forEach((r) => map.set(r.id, r));
    this.data.lesson_records = Array.from(map.values());
    this.saveData(this.data);
    return this.data.lesson_records;
  }

  public batchImportRecords(records: any[], onDuplicateAction: 'skip' | 'update' | 'cancel'): { success: boolean; message: string; stats: any } {
    this.reloadFromStorage();
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of records) {
      const existing = this.data.lesson_records.find(
        (r) =>
          r.class_id === row.class_id &&
          r.date === row.date &&
          r.period === Number(row.period) &&
          r.subject_id === row.subject_id
      );

      if (existing) {
        if (onDuplicateAction === 'skip') {
          skippedCount++;
          continue;
        } else if (onDuplicateAction === 'update') {
          this.updateLessonRecord(existing.id, row);
          updatedCount++;
          continue;
        }
      }

      this.addLessonRecord(row);
      insertedCount++;
    }

    return {
      success: true,
      message: `Nhập Excel thành công! Đã thêm mới: ${insertedCount}, cập nhật: ${updatedCount}, bỏ qua: ${skippedCount} bản ghi.`,
      stats: { insertedCount, updatedCount, skippedCount },
    };
  }

  public getUsers(): User[] {
    this.reloadFromStorage();
    return this.data.users.map((u) => {
      const { password: _, ...safe } = u;
      return safe as User;
    });
  }

  public addUser(data: any): User {
    this.reloadFromStorage();
    const newUser: User = {
      id: `usr-${Date.now()}`,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || '',
      role: data.role,
      class_id: data.role === 'LPHT' ? data.class_id : null,
      status: 'ACTIVE',
      password: data.password || '123456',
      must_change_password: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.saveData(this.data);
    const { password: _, ...safe } = newUser;
    return safe as User;
  }

  public updateUser(id: string, data: any): User {
    this.reloadFromStorage();
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Không tìm thấy người dùng.');
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.saveData(this.data);
    const { password: _, ...safe } = this.data.users[idx];
    return safe as User;
  }

  public resetPassword(id: string, newPassword?: string): { message: string } {
    this.reloadFromStorage();
    const user = this.getUserById(id);
    if (!user) throw new Error('Không tìm thấy người dùng.');
    const pass = newPassword || '123456';
    user.password = pass;
    user.must_change_password = true;
    user.updated_at = new Date().toISOString();
    this.saveData(this.data);
    return { message: `Đã đặt lại mật khẩu thành công cho ${user.full_name}. Mật khẩu mới: ${pass}` };
  }

  public getDashboardStats(filters?: {
    week_number?: number;
    semester?: number;
    grade?: number;
    school_year?: string;
  }): DashboardData {
    this.reloadFromStorage();
    let records = [...this.data.lesson_records];
    let classes = this.data.classes.filter((c) => c.status === 'ACTIVE');

    if (filters?.grade) {
      classes = classes.filter((c) => c.grade === Number(filters.grade));
      const classIds = classes.map((c) => c.id);
      records = records.filter((r) => classIds.includes(r.class_id));
    }
    if (filters?.week_number) {
      records = records.filter((r) => r.week_number === Number(filters.week_number));
    }
    if (filters?.semester) {
      records = records.filter((r) => r.semester === Number(filters.semester));
    }
    if (filters?.school_year) {
      records = records.filter((r) => r.school_year === filters.school_year);
    }

    const totalRecords = records.length;
    let totalScoreSum = 0;
    let goodCount = 0;
    let fairCount = 0;
    let passCount = 0;
    let failCount = 0;

    let studySum = 0;
    let discSum = 0;
    let hygSum = 0;
    let attSum = 0;

    records.forEach((r) => {
      totalScoreSum += r.total_score;
      studySum += r.study_score;
      discSum += r.discipline_score;
      hygSum += r.hygiene_score;
      attSum += r.attendance_score;

      if (r.classification === 'Tốt') goodCount++;
      else if (r.classification === 'Khá') fairCount++;
      else if (r.classification === 'Đạt') passCount++;
      else failCount++;
    });

    const avgScore = totalRecords > 0 ? Number((totalScoreSum / totalRecords).toFixed(2)) : 0;
    const goodRate = totalRecords > 0 ? Number(((goodCount / totalRecords) * 100).toFixed(1)) : 0;
    const fairRate = totalRecords > 0 ? Number(((fairCount / totalRecords) * 100).toFixed(1)) : 0;
    const passRate = totalRecords > 0 ? Number(((passCount / totalRecords) * 100).toFixed(1)) : 0;
    const failRate = totalRecords > 0 ? Number(((failCount / totalRecords) * 100).toFixed(1)) : 0;

    const classStatsMap: Record<string, any> = {};

    classes.forEach((c) => {
      classStatsMap[c.id] = {
        class_id: c.id,
        class_name: c.class_name,
        grade: c.grade,
        homeroom_teacher: c.homeroom_teacher,
        totalRecords: 0,
        totalScore: 0,
        avgScore: 0,
        studyAvg: 0,
        discAvg: 0,
        hygAvg: 0,
        attAvg: 0,
        goodCount: 0,
        fairCount: 0,
        passCount: 0,
        failCount: 0,
        goodRate: 0,
        failRate: 0,
      };
    });

    records.forEach((r) => {
      const item = classStatsMap[r.class_id];
      if (item) {
        item.totalRecords++;
        item.totalScore += r.total_score;
        item.studyAvg += r.study_score;
        item.discAvg += r.discipline_score;
        item.hygAvg += r.hygiene_score;
        item.attAvg += r.attendance_score;

        if (r.classification === 'Tốt') item.goodCount++;
        else if (r.classification === 'Khá') item.fairCount++;
        else if (r.classification === 'Đạt') item.passCount++;
        else item.failCount++;
      }
    });

    const classStatsList = Object.values(classStatsMap).map((item: any) => {
      const count = item.totalRecords;
      return {
        ...item,
        avgScore: count > 0 ? Number((item.totalScore / count).toFixed(2)) : 0,
        studyAvg: count > 0 ? Number((item.studyAvg / count).toFixed(2)) : 0,
        discAvg: count > 0 ? Number((item.discAvg / count).toFixed(2)) : 0,
        hygAvg: count > 0 ? Number((item.hygAvg / count).toFixed(2)) : 0,
        attAvg: count > 0 ? Number((item.attAvg / count).toFixed(2)) : 0,
        goodRate: count > 0 ? Number(((item.goodCount / count) * 100).toFixed(1)) : 0,
        failRate: count > 0 ? Number(((item.failCount / count) * 100).toFixed(1)) : 0,
      };
    });

    classStatsList.sort((a: any, b: any) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.goodRate !== a.goodRate) return b.goodRate - a.goodRate;
      if (b.discAvg !== a.discAvg) return b.discAvg - a.discAvg;
      if (b.studyAvg !== a.studyAvg) return b.studyAvg - a.studyAvg;
      return a.failRate - b.failRate;
    });

    const rankings = classStatsList.map((item: any, index: number) => ({
      rank: index + 1,
      ...item,
    }));

    const weeklyTrends: { week: number; avgScore: number; goodRate: number; failRate: number }[] = [];
    for (let w = 1; w <= 39; w++) {
      const weekRecs = this.data.lesson_records.filter((r) => r.week_number === w);
      if (weekRecs.length > 0) {
        const wScore = weekRecs.reduce((sum, r) => sum + r.total_score, 0) / weekRecs.length;
        const wGood = (weekRecs.filter((r) => r.classification === 'Tốt').length / weekRecs.length) * 100;
        const wFail = (weekRecs.filter((r) => r.classification === 'Chưa đạt').length / weekRecs.length) * 100;
        weeklyTrends.push({
          week: w,
          avgScore: Number(wScore.toFixed(2)),
          goodRate: Number(wGood.toFixed(1)),
          failRate: Number(wFail.toFixed(1)),
        });
      }
    }

    const radarData = [
      { subject: 'Học tập (max 3)', value: totalRecords > 0 ? Number((studySum / totalRecords).toFixed(2)) : 0, fullMark: 3 },
      { subject: 'Kỉ luật (max 3)', value: totalRecords > 0 ? Number((discSum / totalRecords).toFixed(2)) : 0, fullMark: 3 },
      { subject: 'Vệ sinh (max 2)', value: totalRecords > 0 ? Number((hygSum / totalRecords).toFixed(2)) : 0, fullMark: 2 },
      { subject: 'Chuyên cần (max 2)', value: totalRecords > 0 ? Number((attSum / totalRecords).toFixed(2)) : 0, fullMark: 2 },
    ];

    return {
      summary: {
        totalClasses: classes.length,
        totalRecords,
        avgScore,
        goodCount,
        fairCount,
        passCount,
        failCount,
        goodRate,
        fairRate,
        passRate,
        failRate,
      },
      top3: rankings.slice(0, 3),
      rankings,
      weeklyTrends,
      radarData,
    };
  }

  public getAlerts(): AlertItem[] {
    const alerts: AlertItem[] = [];
    const stats = this.getDashboardStats();

    if (stats.rankings.length > 0) {
      const bottom = stats.rankings[stats.rankings.length - 1];
      if (bottom.failRate >= 10 || bottom.avgScore < 7.5) {
        alerts.push({
          id: `alt-${bottom.class_id}`,
          class_id: bottom.class_id,
          class_name: bottom.class_name,
          issue: 'Tỷ lệ giờ Chưa đạt cao cần chấn chỉnh nề nếp',
          time: 'Tuần gần nhất',
          severity: 'HIGH',
          detail: `Lớp có tỷ lệ giờ Chưa đạt ${bottom.failRate}% và điểm TB ${bottom.avgScore}/10. Cán bộ Đoàn và GVCN cần lưu ý.`,
        });
      }

      const top = stats.rankings[0];
      alerts.push({
        id: `alt-praise-${top.class_id}`,
        class_id: top.class_id,
        class_name: top.class_name,
        issue: 'Dẫn đầu phong trào thi đua toàn trường',
        time: 'Tuần gần nhất',
        severity: 'LOW',
        detail: `Lớp xuất sắc đạt điểm trung bình ${top.avgScore}/10 với tỷ lệ giờ Tốt ${top.goodRate}%.`,
      });
    }

    return alerts;
  }
}

export const localDb = new LocalDatabase();
