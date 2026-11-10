import fs from 'fs';
import path from 'path';
import { initialData } from '../src/data/initialData.ts';
import {
  isSupabaseConfigured,
  loadAllFromSupabase,
  autoSeedSupabaseIfEmpty,
  syncClassToSupabase,
  deleteClassFromSupabase,
  syncSubjectToSupabase,
  deleteSubjectFromSupabase,
  syncRecordToSupabase,
  deleteRecordFromSupabase,
  clearRecordsFromSupabase,
  syncSettingsToSupabase,
  syncUserToSupabase,
  deleteUserFromSupabase,
  batchSyncRecordsToSupabase,
} from './supabase.ts';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'CAN_BO_DOAN' | 'LPHT';
  class_id?: string | null;
  status: 'ACTIVE' | 'LOCKED';
  password: string; // stored hashed or plain for demo
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassItem {
  id: string;
  class_name: string;
  grade: number; // 10, 11, 12
  school_year: string;
  homeroom_teacher: string; // GVCN
  lpht_user_id?: string | null;
  lpht_name?: string | null;
  student_count: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface SubjectItem {
  id: string;
  subject_code: string;
  subject_name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface LessonRecord {
  id: string;
  school_year: string;
  class_id: string;
  date: string; // YYYY-MM-DD
  week_number: number; // 1-39
  semester: number; // 1 or 2
  period: number; // 1-5
  subject_id: string;
  study_score: number; // 0-3
  discipline_score: number; // 0-3
  hygiene_score: number; // 0-2
  attendance_score: number; // 0-2
  total_score: number; // sum 0-10
  classification: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SystemSettings {
  school_name: string;
  city: string;
  sub_title: string;
  slogan: string;
  current_school_year: string;
  current_week: number;
  current_semester: number;
  scoring_rules: {
    study_max: number;
    discipline_max: number;
    hygiene_max: number;
    attendance_max: number;
    good_threshold: number; // 9
    fair_threshold: number; // 7
    pass_threshold: number; // 5
  };
  ranking_rules: {
    primary: 'avg_score_desc';
    tiebreak_1: 'good_rate_desc';
    tiebreak_2: 'discipline_avg_desc';
    tiebreak_3: 'study_avg_desc';
    tiebreak_4: 'fail_rate_asc';
  };
}

export interface DatabaseData {
  users: User[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  lesson_records: LessonRecord[];
  school_years: SchoolYear[];
  settings: SystemSettings;
}

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BASE_DATA_DIR = path.join(process.cwd(), 'data');
const DATA_DIR = IS_VERCEL ? '/tmp/data' : BASE_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Calculate total score and classification strictly by business rules (Section XV)
export function computeScoreAndClassification(
  study: number,
  discipline: number,
  hygiene: number,
  attendance: number
): { total_score: number; classification: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' } {
  // Validate bounds
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

export function getSemesterFromWeek(week: number): number {
  return week <= 19 ? 1 : 2;
}

export function getInitialData(): DatabaseData {
  return JSON.parse(JSON.stringify(initialData));
}

class Database {
  private data: DatabaseData;
  private lastMtime: number = 0;

  constructor() {
    this.data = this.loadData();
    if (isSupabaseConfigured()) {
      this.initSupabaseSync();
    }
  }

  private async initSupabaseSync(): Promise<void> {
    try {
      const cloudData = await loadAllFromSupabase();
      if (cloudData && cloudData.classes.length > 0) {
        this.data = cloudData;
        console.log(`✅ Loaded ${cloudData.classes.length} classes & ${cloudData.lesson_records.length} records from Supabase Cloud Database.`);
      } else {
        await autoSeedSupabaseIfEmpty(this.data);
      }
    } catch (err) {
      console.error('Supabase initial sync error:', err);
    }
  }

  public async refreshFromCloud(): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const cloudData = await loadAllFromSupabase();
      if (cloudData && cloudData.classes.length > 0) {
        this.data = cloudData;
        return true;
      }
    } catch (e) {
      console.warn('refreshFromCloud failed:', e);
    }
    return false;
  }

  public getStorageType(): 'supabase' | 'file' {
    return isSupabaseConfigured() ? 'supabase' : 'file';
  }

  public checkAndReload(): void {
    try {
      if (fs.existsSync(DB_FILE)) {
        const stat = fs.statSync(DB_FILE);
        if (stat.mtimeMs > this.lastMtime) {
          const fresh = this.loadData();
          this.data = fresh;
        }
      }
    } catch (e) {
      console.warn('checkAndReload failed:', e);
    }
  }

  private loadData(): DatabaseData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.classes && parsed.lesson_records) {
          try {
            this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
          } catch (_) {}
          return parsed;
        }
      }

      // If running on Vercel and DB_FILE in /tmp doesn't exist, check BASE_DATA_DIR
      const baseFile = path.join(BASE_DATA_DIR, 'database.json');
      if (fs.existsSync(baseFile)) {
        const raw = fs.readFileSync(baseFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.classes && parsed.lesson_records) {
          this.saveDataDirect(parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading database, seeding initial data:', err);
    }

    const init = getInitialData();
    this.saveDataDirect(init);
    return init;
  }

  private saveDataDirect(data: DatabaseData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      try {
        this.lastMtime = fs.statSync(DB_FILE).mtimeMs;
      } catch (_) {}
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  public save(): void {
    this.saveDataDirect(this.data);
  }

  public resetToInitialData(): DatabaseData {
    const init = getInitialData();
    this.data = init;
    this.saveDataDirect(init);
    return init;
  }

  // Getters
  public getUsers(): User[] {
    this.checkAndReload();
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    this.checkAndReload();
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmailOrPhone(identifier: string): User | undefined {
    this.checkAndReload();
    if (!identifier || typeof identifier !== 'string') return undefined;
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(
      (u) =>
        (u.email && typeof u.email === 'string' && u.email.toLowerCase() === clean) ||
        (u.phone && typeof u.phone === 'string' && u.phone.trim() === identifier.trim()) ||
        (clean === 'admin' && ((u.email && u.email.toLowerCase() === 'admin') || u.role === 'ADMIN'))
    );
  }

  public getClasses(): ClassItem[] {
    this.checkAndReload();
    return this.data.classes;
  }

  public getClassById(id: string): ClassItem | undefined {
    this.checkAndReload();
    const clean = (id || '').trim().toLowerCase();
    return this.data.classes.find((c) => c.id.toLowerCase() === clean || c.class_name.toLowerCase() === clean);
  }

  public getSubjects(): SubjectItem[] {
    this.checkAndReload();
    return this.data.subjects;
  }

  public getSubjectById(id: string): SubjectItem | undefined {
    this.checkAndReload();
    const clean = (id || '').trim().toUpperCase();
    return this.data.subjects.find((s) => s.id.toUpperCase() === clean || s.subject_code.toUpperCase() === clean);
  }

  public getLessonRecords(): LessonRecord[] {
    this.checkAndReload();
    return this.data.lesson_records;
  }

  public getLessonRecordById(id: string): LessonRecord | undefined {
    this.checkAndReload();
    const clean = (id || '').trim().toLowerCase();
    return this.data.lesson_records.find((r) => r.id.toLowerCase() === clean);
  }

  public getSettings(): SystemSettings {
    this.checkAndReload();
    return this.data.settings;
  }

  public getSchoolYears(): SchoolYear[] {
    this.checkAndReload();
    return this.data.school_years;
  }

  // Mutations
  public updateSettings(settings: Partial<SystemSettings>): SystemSettings {
    this.checkAndReload();
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    syncSettingsToSupabase(this.data.settings).catch((e) => console.warn('Supabase syncSettings error:', e));
    return this.data.settings;
  }

  public addUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    this.checkAndReload();
    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.users.push(newUser);

    // If user is LPHT and assigned to a class, update class's lpht
    if (newUser.role === 'LPHT' && newUser.class_id) {
      const cls = this.getClassById(newUser.class_id);
      if (cls) {
        cls.lpht_user_id = newUser.id;
        cls.lpht_name = newUser.full_name;
        syncClassToSupabase(cls).catch(() => {});
      }
    }

    this.save();
    syncUserToSupabase(newUser).catch((e) => console.warn('Supabase syncUser error:', e));
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    this.checkAndReload();
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const oldUser = this.data.users[index];
    const sanitizedUpdates: any = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        sanitizedUpdates[k] = v;
      }
    }

    const updatedUser: User = {
      ...oldUser,
      ...sanitizedUpdates,
      updated_at: new Date().toISOString(),
    };
    this.data.users[index] = updatedUser;

    // Update class assignment if LPHT
    if (updatedUser.role === 'LPHT' && updatedUser.class_id) {
      const cls = this.getClassById(updatedUser.class_id);
      if (cls) {
        cls.lpht_user_id = updatedUser.id;
        cls.lpht_name = updatedUser.full_name;
        syncClassToSupabase(cls).catch(() => {});
      }
    }

    this.save();
    syncUserToSupabase(updatedUser).catch((e) => console.warn('Supabase syncUser error:', e));
    return updatedUser;
  }

  public deleteUser(id: string): boolean {
    this.checkAndReload();
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return false;

    const removed = this.data.users.splice(index, 1)[0];
    this.save();
    deleteUserFromSupabase(id).catch((e) => console.warn('Supabase deleteUser error:', e));
    return true;
  }

  public addClass(cls: Omit<ClassItem, 'created_at' | 'updated_at'>): ClassItem {
    this.checkAndReload();
    const existingIndex = this.data.classes.findIndex((c) => c.id.toLowerCase() === cls.id.toLowerCase());
    if (existingIndex >= 0) {
      this.data.classes[existingIndex] = {
        ...this.data.classes[existingIndex],
        ...cls,
        updated_at: new Date().toISOString(),
      };
      this.save();
      syncClassToSupabase(this.data.classes[existingIndex]).catch((e) => console.warn('Supabase syncClass error:', e));
      return this.data.classes[existingIndex];
    }
    const newClass: ClassItem = {
      ...cls,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.classes.push(newClass);
    this.save();
    syncClassToSupabase(newClass).catch((e) => console.warn('Supabase syncClass error:', e));
    return newClass;
  }

  public updateClass(id: string, updates: Partial<ClassItem>): ClassItem | null {
    this.checkAndReload();
    const clean = id.trim().toLowerCase();
    const index = this.data.classes.findIndex((c) => c.id.toLowerCase() === clean || c.class_name.toLowerCase() === clean);
    if (index === -1) return null;
    this.data.classes[index] = {
      ...this.data.classes[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    syncClassToSupabase(this.data.classes[index]).catch((e) => console.warn('Supabase syncClass error:', e));
    return this.data.classes[index];
  }

  public deleteClass(id: string): boolean {
    this.checkAndReload();
    const clean = id.trim().toLowerCase();
    const initialLen = this.data.classes.length;
    this.data.classes = this.data.classes.filter((c) => c.id.toLowerCase() !== clean && c.class_name.toLowerCase() !== clean);
    if (this.data.classes.length !== initialLen) {
      this.save();
      deleteClassFromSupabase(clean).catch(() => {});
      deleteClassFromSupabase(id).catch(() => {});
      return true;
    }
    return false;
  }

  public addSubject(sub: Omit<SubjectItem, 'created_at' | 'updated_at'>): SubjectItem {
    this.checkAndReload();
    const newSubject: SubjectItem = {
      ...sub,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.subjects.push(newSubject);
    this.save();
    syncSubjectToSupabase(newSubject).catch((e) => console.warn('Supabase syncSubject error:', e));
    return newSubject;
  }

  public updateSubject(id: string, updates: Partial<SubjectItem>): SubjectItem | null {
    this.checkAndReload();
    const clean = id.trim().toUpperCase();
    const index = this.data.subjects.findIndex((s) => s.id.toUpperCase() === clean || s.subject_code.toUpperCase() === clean);
    if (index === -1) return null;
    this.data.subjects[index] = {
      ...this.data.subjects[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    syncSubjectToSupabase(this.data.subjects[index]).catch((e) => console.warn('Supabase syncSubject error:', e));
    return this.data.subjects[index];
  }

  public deleteSubject(id: string): boolean {
    this.checkAndReload();
    const clean = id.trim().toUpperCase();
    const sub = this.data.subjects.find((s) => s.id.toUpperCase() === clean || s.subject_code.toUpperCase() === clean);
    if (sub) {
      sub.status = 'INACTIVE';
      sub.updated_at = new Date().toISOString();
      this.save();
      syncSubjectToSupabase(sub).catch(() => {});
      return true;
    }
    return false;
  }

  public addLessonRecord(record: Omit<LessonRecord, 'id' | 'total_score' | 'classification' | 'created_at' | 'updated_at'> & { id?: string }): LessonRecord {
    this.checkAndReload();
    const { total_score, classification } = computeScoreAndClassification(
      record.study_score,
      record.discipline_score,
      record.hygiene_score,
      record.attendance_score
    );

    // If client provided a unique id, preserve it for parity
    const chosenId = (record.id && !this.data.lesson_records.some((r) => r.id === record.id))
      ? record.id
      : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newRecord: LessonRecord = {
      ...record,
      id: chosenId,
      total_score,
      classification,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.lesson_records.push(newRecord);
    this.save();
    syncRecordToSupabase(newRecord).catch((e) => console.warn('Supabase syncRecord error:', e));
    return newRecord;
  }

  public updateLessonRecord(id: string, updates: Partial<LessonRecord>): LessonRecord | null {
    this.checkAndReload();
    const clean = id.trim().toLowerCase();
    const index = this.data.lesson_records.findIndex((r) => r.id.toLowerCase() === clean);
    if (index === -1) return null;

    const current = this.data.lesson_records[index];
    const study = updates.study_score !== undefined ? updates.study_score : current.study_score;
    const disc = updates.discipline_score !== undefined ? updates.discipline_score : current.discipline_score;
    const hyg = updates.hygiene_score !== undefined ? updates.hygiene_score : current.hygiene_score;
    const att = updates.attendance_score !== undefined ? updates.attendance_score : current.attendance_score;

    const { total_score, classification } = computeScoreAndClassification(study, disc, hyg, att);

    this.data.lesson_records[index] = {
      ...current,
      ...updates,
      study_score: study,
      discipline_score: disc,
      hygiene_score: hyg,
      attendance_score: att,
      total_score,
      classification,
      updated_at: new Date().toISOString(),
    };

    this.save();
    syncRecordToSupabase(this.data.lesson_records[index]).catch((e) => console.warn('Supabase syncRecord error:', e));
    return this.data.lesson_records[index];
  }

  public deleteLessonRecord(id: string): boolean {
    this.checkAndReload();
    const clean = id.trim().toLowerCase();
    const initialLen = this.data.lesson_records.length;
    this.data.lesson_records = this.data.lesson_records.filter((r) => r.id.toLowerCase() !== clean);
    if (this.data.lesson_records.length !== initialLen) {
      this.save();
      deleteRecordFromSupabase(clean).catch(() => {});
      return true;
    }
    return false;
  }

  public clearLessonRecordsBySchoolYear(schoolYear?: string): number {
    this.checkAndReload();
    const targetYear = (schoolYear || this.data.settings.current_school_year || '').trim();
    const initialLen = this.data.lesson_records.length;
    if (!targetYear || targetYear === 'ALL') {
      this.data.lesson_records = [];
    } else {
      this.data.lesson_records = this.data.lesson_records.filter((r) => r.school_year !== targetYear);
    }
    const deletedCount = initialLen - this.data.lesson_records.length;
    this.save();
    clearRecordsFromSupabase(targetYear).catch(() => {});
    return deletedCount;
  }

  // Duplicate check: Class + Date + Period + Subject
  public findDuplicateRecord(class_id: string, date: string, period: number, subject_id: string, excludeId?: string): LessonRecord | undefined {
    this.checkAndReload();
    return this.data.lesson_records.find(
      (r) =>
        r.class_id === class_id &&
        r.date === date &&
        r.period === period &&
        r.subject_id === subject_id &&
        r.id !== excludeId
    );
  }
}

export const db = new Database();
