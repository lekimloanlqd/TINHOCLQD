import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseData, ClassItem, SubjectItem, LessonRecord, SystemSettings, User } from './db.ts';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('✅ Supabase Client initialized successfully with URL:', supabaseUrl);
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err);
  }
} else {
  console.info('ℹ️ Supabase credentials not found in env. Running on local file storage.');
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseClient);
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!supabaseClient) {
    return { success: false, message: 'Supabase credentials not configured in environment variables.' };
  }
  try {
    const { error } = await supabaseClient.from('classes').select('id', { count: 'exact', head: true });
    if (error) {
      // If table doesn't exist yet, notify clearly
      return { success: false, message: `Lỗi kết nối Supabase: ${error.message} (Mã: ${error.code})` };
    }
    return { success: true, message: 'Kết nối Supabase thành công! Dữ liệu được lưu trữ trên đám mây.' };
  } catch (err: any) {
    return { success: false, message: `Lỗi kết nối: ${err.message}` };
  }
}

/**
 * Load all tables from Supabase into memory. Returns null if Supabase is not configured or fails.
 */
export async function loadAllFromSupabase(): Promise<DatabaseData | null> {
  if (!supabaseClient) return null;

  try {
    const [classesRes, subjectsRes, recordsRes, usersRes, settingsRes] = await Promise.all([
      supabaseClient.from('classes').select('*'),
      supabaseClient.from('subjects').select('*'),
      supabaseClient.from('lesson_records').select('*'),
      supabaseClient.from('users').select('*'),
      supabaseClient.from('settings').select('*').limit(1).maybeSingle(),
    ]);

    if (classesRes.error || subjectsRes.error || recordsRes.error || usersRes.error) {
      console.warn('⚠️ Supabase tables read error:', {
        classes: classesRes.error?.message,
        subjects: subjectsRes.error?.message,
        records: recordsRes.error?.message,
        users: usersRes.error?.message,
      });
      return null;
    }

    // Parse classes
    const classes: ClassItem[] = (classesRes.data || []).map((c: any) => ({
      id: c.id,
      class_name: c.class_name || c.id,
      grade: Number(c.grade) || 10,
      school_year: c.school_year || '2026-2027',
      homeroom_teacher: c.homeroom_teacher || '',
      lpht_user_id: c.lpht_user_id || null,
      lpht_name: c.lpht_name || null,
      student_count: Number(c.student_count) || 40,
      status: c.status || 'ACTIVE',
      created_at: c.created_at || new Date().toISOString(),
      updated_at: c.updated_at || new Date().toISOString(),
    }));

    // Parse subjects
    const subjects: SubjectItem[] = (subjectsRes.data || []).map((s: any) => ({
      id: s.id,
      subject_code: s.subject_code || s.id,
      subject_name: s.subject_name || s.id,
      status: s.status || 'ACTIVE',
      created_at: s.created_at || new Date().toISOString(),
      updated_at: s.updated_at || new Date().toISOString(),
    }));

    // Parse records
    const lesson_records: LessonRecord[] = (recordsRes.data || []).map((r: any) => ({
      id: r.id,
      school_year: r.school_year || '2026-2027',
      class_id: r.class_id,
      date: r.date,
      week_number: Number(r.week_number) || 1,
      semester: Number(r.semester) || 1,
      period: Number(r.period) || 1,
      subject_id: r.subject_id,
      study_score: Number(r.study_score) || 0,
      discipline_score: Number(r.discipline_score) || 0,
      hygiene_score: Number(r.hygiene_score) || 0,
      attendance_score: Number(r.attendance_score) || 0,
      total_score: Number(r.total_score) || 0,
      classification: r.classification || 'Đạt',
      note: r.note || '',
      created_by: r.created_by || 'system',
      created_at: r.created_at || new Date().toISOString(),
      updated_at: r.updated_at || new Date().toISOString(),
    }));

    // Parse users
    const users: User[] = (usersRes.data || []).map((u: any) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      class_id: u.class_id || null,
      status: u.status || 'ACTIVE',
      password: u.password || '123456',
      must_change_password: Boolean(u.must_change_password),
      created_at: u.created_at || new Date().toISOString(),
      updated_at: u.updated_at || new Date().toISOString(),
    }));

    // Parse settings
    let settings: SystemSettings;
    if (settingsRes.data) {
      const s = settingsRes.data;
      settings = {
        school_name: s.school_name || 'Trường THPT Phan Bội Châu',
        city: s.city || 'TP Đà Nẵng',
        sub_title: s.sub_title || 'Đoàn TNCS Hồ Chí Minh - Ban Chấp Hành Đoàn Trường',
        slogan: s.slogan || 'Biến dữ liệu Sổ đầu bài thành thông tin thi đua thông minh.',
        current_school_year: s.current_school_year || '2026-2027',
        current_week: Number(s.current_week) || 1,
        current_semester: Number(s.current_semester) || 1,
        scoring_rules: s.scoring_rules || {
          study_max: 3,
          discipline_max: 3,
          hygiene_max: 2,
          attendance_max: 2,
          good_threshold: 9,
          fair_threshold: 7,
          pass_threshold: 5,
        },
        ranking_rules: s.ranking_rules || {
          primary: 'avg_score_desc',
          tiebreak_1: 'good_rate_desc',
          tiebreak_2: 'discipline_avg_desc',
          tiebreak_3: 'study_avg_desc',
          tiebreak_4: 'fail_rate_asc',
        },
      };
    } else {
      settings = {
        school_name: 'Trường THPT Phan Bội Châu',
        city: 'TP Đà Nẵng',
        sub_title: 'Đoàn TNCS Hồ Chí Minh - Ban Chấp Hành Đoàn Trường',
        slogan: 'Biến dữ liệu Sổ đầu bài thành thông tin thi đua thông minh.',
        current_school_year: '2026-2027',
        current_week: 1,
        current_semester: 1,
        scoring_rules: {
          study_max: 3,
          discipline_max: 3,
          hygiene_max: 2,
          attendance_max: 2,
          good_threshold: 9,
          fair_threshold: 7,
          pass_threshold: 5,
        },
        ranking_rules: {
          primary: 'avg_score_desc',
          tiebreak_1: 'good_rate_desc',
          tiebreak_2: 'discipline_avg_desc',
          tiebreak_3: 'study_avg_desc',
          tiebreak_4: 'fail_rate_asc',
        },
      };
    }

    return {
      classes,
      subjects,
      lesson_records,
      users,
      school_years: [{ id: 'sy-2026-2027', name: '2026-2027', start_date: '2026-09-01', end_date: '2027-05-31', status: 'ACTIVE' }],
      settings,
    };
  } catch (err) {
    console.error('❌ Failed to load data from Supabase:', err);
    return null;
  }
}

/**
 * If Supabase is empty, seed it with the canonical data
 */
export async function autoSeedSupabaseIfEmpty(seedData: DatabaseData): Promise<void> {
  if (!supabaseClient) return;

  try {
    const { count, error } = await supabaseClient.from('classes').select('id', { count: 'exact', head: true });
    if (error) {
      console.warn('⚠️ Supabase table check failed (tables may need to be created):', error.message);
      return;
    }

    if (count === 0 || count === null) {
      console.log('🌱 Seeding initial data to Supabase Cloud Database...');

      // 1. Classes
      if (seedData.classes.length > 0) {
        await supabaseClient.from('classes').upsert(seedData.classes);
      }

      // 2. Subjects
      if (seedData.subjects.length > 0) {
        await supabaseClient.from('subjects').upsert(seedData.subjects);
      }

      // 3. Users
      if (seedData.users.length > 0) {
        await supabaseClient.from('users').upsert(seedData.users);
      }

      // 4. Settings
      await supabaseClient.from('settings').upsert({
        id: 'default',
        school_name: seedData.settings.school_name,
        city: seedData.settings.city,
        sub_title: seedData.settings.sub_title,
        slogan: seedData.settings.slogan,
        current_school_year: seedData.settings.current_school_year,
        current_week: seedData.settings.current_week,
        current_semester: seedData.settings.current_semester,
        scoring_rules: seedData.settings.scoring_rules,
        ranking_rules: seedData.settings.ranking_rules,
        updated_at: new Date().toISOString(),
      });

      // 5. Lesson records (batch in chunks of 100 to avoid payload size limits)
      const records = seedData.lesson_records;
      const CHUNK_SIZE = 100;
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        await supabaseClient.from('lesson_records').upsert(chunk);
      }

      console.log(`✅ Supabase successfully seeded with ${seedData.classes.length} classes and ${seedData.lesson_records.length} records.`);
    }
  } catch (err) {
    console.error('❌ Failed to auto-seed Supabase:', err);
  }
}

// Mutations helpers
export async function syncClassToSupabase(cls: ClassItem): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('classes').upsert(cls);
    if (error) console.error('Supabase upsert class error:', error);
    return !error;
  } catch (err) {
    console.error('Supabase upsert class exception:', err);
    return false;
  }
}

export async function deleteClassFromSupabase(id: string): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('classes').delete().eq('id', id);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function syncSubjectToSupabase(sub: SubjectItem): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('subjects').upsert(sub);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function deleteSubjectFromSupabase(id: string): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('subjects').delete().eq('id', id);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function syncRecordToSupabase(record: LessonRecord): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('lesson_records').upsert(record);
    if (error) console.error('Supabase upsert record error:', error);
    return !error;
  } catch (err) {
    console.error('Supabase upsert record exception:', err);
    return false;
  }
}

export async function deleteRecordFromSupabase(id: string): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('lesson_records').delete().eq('id', id);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function clearRecordsFromSupabase(schoolYear?: string): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    let query = supabaseClient.from('lesson_records').delete();
    if (schoolYear && schoolYear !== 'ALL') {
      query = query.eq('school_year', schoolYear);
    } else {
      query = query.neq('id', '___non_existent___');
    }
    const { error } = await query;
    return !error;
  } catch (err) {
    return false;
  }
}

export async function batchSyncRecordsToSupabase(records: LessonRecord[]): Promise<boolean> {
  if (!supabaseClient || records.length === 0) return false;
  try {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const { error } = await supabaseClient.from('lesson_records').upsert(chunk);
      if (error) {
        console.error('Supabase batch upsert error:', error);
        return false;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function syncSettingsToSupabase(settings: SystemSettings): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('settings').upsert({
      id: 'default',
      school_name: settings.school_name,
      city: settings.city,
      sub_title: settings.sub_title,
      slogan: settings.slogan,
      current_school_year: settings.current_school_year,
      current_week: settings.current_week,
      current_semester: settings.current_semester,
      scoring_rules: settings.scoring_rules,
      ranking_rules: settings.ranking_rules,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    return false;
  }
}

export async function syncUserToSupabase(user: User): Promise<boolean> {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from('users').upsert(user);
    return !error;
  } catch (err) {
    return false;
  }
}
