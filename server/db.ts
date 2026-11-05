import fs from 'fs';
import path from 'path';

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
  const defaultSettings: SystemSettings = {
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

  const users: User[] = [
    {
      id: 'usr-admin',
      full_name: 'Nguyễn Thanh Tùng',
      email: 'Admin',
      phone: '0905100001',
      role: 'ADMIN',
      status: 'ACTIVE',
      password: 'admin', // initial admin password
      must_change_password: true,
      created_at: new Date('2026-08-01').toISOString(),
      updated_at: new Date('2026-08-01').toISOString(),
    },
    {
      id: 'usr-doan',
      full_name: 'Trần Hoài Nam (Bí thư Đoàn)',
      email: 'doantruong@phanboichau.edu.vn',
      phone: '0905123456',
      role: 'CAN_BO_DOAN',
      status: 'ACTIVE',
      password: '123456',
      must_change_password: false,
      created_at: new Date('2026-08-01').toISOString(),
      updated_at: new Date('2026-08-01').toISOString(),
    },
    {
      id: 'usr-lpht-12a1',
      full_name: 'Lê Ngọc Ánh (LPHT 12/1B)',
      email: 'lpht.12a1@phanboichau.edu.vn',
      phone: '0905112233',
      role: 'LPHT',
      class_id: '12/1B',
      status: 'ACTIVE',
      password: '123456',
      must_change_password: false,
      created_at: new Date('2026-08-15').toISOString(),
      updated_at: new Date('2026-08-15').toISOString(),
    },
    {
      id: 'usr-lpht-11a1',
      full_name: 'Phạm Minh Đức (LPHT 11/1B)',
      email: 'lpht.11a1@phanboichau.edu.vn',
      phone: '0905445566',
      role: 'LPHT',
      class_id: '11/1B',
      status: 'ACTIVE',
      password: '123456',
      must_change_password: false,
      created_at: new Date('2026-08-15').toISOString(),
      updated_at: new Date('2026-08-15').toISOString(),
    },
    {
      id: 'usr-lpht-10a1',
      full_name: 'Hoàng Thị Thảo (LPHT 10/1B)',
      email: 'lpht.10a1@phanboichau.edu.vn',
      phone: '0905778899',
      role: 'LPHT',
      class_id: '10/1B',
      status: 'ACTIVE',
      password: '123456',
      must_change_password: false,
      created_at: new Date('2026-08-15').toISOString(),
      updated_at: new Date('2026-08-15').toISOString(),
    },
  ];

  const classes: ClassItem[] = [
    // Khối 12
    { id: '12/1B', class_name: '12/1B', grade: 12, school_year: '2026-2027', homeroom_teacher: 'Cô Mai Thị Liên', lpht_user_id: 'usr-lpht-12a1', lpht_name: 'Lê Ngọc Ánh', student_count: 42, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '12/2B', class_name: '12/2B', grade: 12, school_year: '2026-2027', homeroom_teacher: 'Thầy Trần Quốc Tuấn', lpht_user_id: null, lpht_name: 'Võ Đình Khoa', student_count: 40, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '12/3B', class_name: '12/3B', grade: 12, school_year: '2026-2027', homeroom_teacher: 'Cô Nguyễn Thu Hà', lpht_user_id: null, lpht_name: 'Nguyễn Thị Bích', student_count: 41, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '12/4B', class_name: '12/4B', grade: 12, school_year: '2026-2027', homeroom_teacher: 'Thầy Lê Hoàng Long', lpht_user_id: null, lpht_name: 'Đặng Tuấn Anh', student_count: 39, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Khối 11
    { id: '11/1B', class_name: '11/1B', grade: 11, school_year: '2026-2027', homeroom_teacher: 'Thầy Phan Đăng Lưu', lpht_user_id: 'usr-lpht-11a1', lpht_name: 'Phạm Minh Đức', student_count: 44, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '11/2B', class_name: '11/2B', grade: 11, school_year: '2026-2027', homeroom_teacher: 'Cô Đỗ Quỳnh Nga', lpht_user_id: null, lpht_name: 'Bùi Hải Yến', student_count: 43, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '11/3B', class_name: '11/3B', grade: 11, school_year: '2026-2027', homeroom_teacher: 'Thầy Huỳnh Tấn Phát', lpht_user_id: null, lpht_name: 'Trần Gia Huy', student_count: 42, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '11/4B', class_name: '11/4B', grade: 11, school_year: '2026-2027', homeroom_teacher: 'Cô Vũ Bích Trâm', lpht_user_id: null, lpht_name: 'Lương Bảo Trâm', student_count: 41, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    // Khối 10
    { id: '10/1B', class_name: '10/1B', grade: 10, school_year: '2026-2027', homeroom_teacher: 'Cô Phạm Thị Thu', lpht_user_id: 'usr-lpht-10a1', lpht_name: 'Hoàng Thị Thảo', student_count: 45, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '10/2B', class_name: '10/2B', grade: 10, school_year: '2026-2027', homeroom_teacher: 'Thầy Ngô Đức Kế', lpht_user_id: null, lpht_name: 'Trần Văn Khánh', student_count: 45, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '10/3B', class_name: '10/3B', grade: 10, school_year: '2026-2027', homeroom_teacher: 'Cô Lê Thị Mỹ Linh', lpht_user_id: null, lpht_name: 'Đinh Thị Mai', student_count: 43, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '10/4B', class_name: '10/4B', grade: 10, school_year: '2026-2027', homeroom_teacher: 'Thầy Hoàng Văn Hải', lpht_user_id: null, lpht_name: 'Trần Bảo Ngọc', student_count: 44, status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  const subjects: SubjectItem[] = [
    { id: 'TOAN', subject_code: 'TOAN', subject_name: 'Toán học', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'VAN', subject_code: 'VAN', subject_name: 'Ngữ văn', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'ANH', subject_code: 'ANH', subject_name: 'Tiếng Anh', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'LY', subject_code: 'LY', subject_name: 'Vật lí', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'HOA', subject_code: 'HOA', subject_name: 'Hóa học', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'SINH', subject_code: 'SINH', subject_name: 'Sinh học', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'SU', subject_code: 'SU', subject_name: 'Lịch sử', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'DIA', subject_code: 'DIA', subject_name: 'Địa lí', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'GDCD', subject_code: 'GDCD', subject_name: 'GDCD / KTPL', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'TIN', subject_code: 'TIN', subject_name: 'Tin học', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'TD', subject_code: 'TD', subject_name: 'Giáo dục thể chất', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'GDQP', subject_code: 'GDQP', subject_name: 'GDQP - An ninh', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  const school_years: SchoolYear[] = [
    { id: 'sy-2026-2027', name: '2026-2027', start_date: '2026-09-01', end_date: '2027-05-31', status: 'ACTIVE' },
  ];

  // Chỉ tạo dữ liệu mẫu cho đúng 2 tuần (Tuần 1 và Tuần 2) năm học 2026-2027 cho 12 lớp
  const lesson_records: LessonRecord[] = [];
  const subjectIds = subjects.map((s) => s.id);
  const classIds = classes.map((c) => c.id);

  let recordCounter = 1;
  for (let w = 1; w <= 2; w++) {
    const sem = 1;
    // Tuần 1 bắt đầu từ Thứ Hai ngày 07/09/2026, Tuần 2 từ Thứ Hai ngày 14/09/2026
    const monday = new Date(2026, 8, 7 + (w - 1) * 7);

    for (const cid of classIds) {
      // 5 ngày trong tuần (Thứ 2 -> Thứ 6)
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + dayOffset);
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        // 4 tiết mỗi ngày (Tiết 1 đến Tiết 4)
        for (let p = 1; p <= 4; p++) {
          const charSum = cid.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const subId = subjectIds[(dayOffset * 4 + p + charSum) % subjectIds.length];

          let study = 3;
          let disc = 3;
          let hyg = 2;
          let att = 2;
          let note = 'Tiết học sôi nổi, lớp tương tác tích cực';

          const seed = (recordCounter * 19 + dayOffset * 7 + p) % 15;
          if (seed === 0) {
            study = 2.5;
            disc = 2.5;
            note = 'Một vài học sinh còn nói chuyện riêng';
          } else if (seed === 1) {
            disc = 2;
            note = 'Nhắc nhở 2 học sinh mất trật tự trong giờ';
          } else if (seed === 2) {
            hyg = 1.5;
            note = 'Vệ sinh cuối lớp chưa sạch, đã nhắc nhở trực nhật';
          } else if (seed === 3) {
            att = 1.5;
            note = 'Vắng 1 học sinh có phép';
          } else if (seed === 4) {
            study = 2.5;
            note = 'Kiểm tra miệng đạt yêu cầu, cần tích cực hơn';
          } else if (seed === 5) {
            study = 3;
            disc = 3;
            hyg = 2;
            att = 2;
            note = 'Lớp chú ý nghe giảng, phát biểu sôi nổi';
          } else if (seed === 6) {
            study = 2;
            disc = 2;
            note = 'Lớp chuẩn bị bài chưa đều, cần rút kinh nghiệm';
          } else {
            study = 3;
            disc = 3;
            hyg = 2;
            att = 2;
            note = 'Lớp học nghiêm túc, làm bài tập đầy đủ';
          }

          // Phân hóa thành tích nhẹ giữa các lớp để bảng xếp hạng phong phú
          if (cid === '12/1B') {
            study = 3;
            disc = 3;
            hyg = 2;
            att = 2;
            note = 'Lớp chuẩn bị bài xuất sắc, phát biểu hăng hái';
          } else if (cid === '11/4B' && w === 2 && dayOffset === 2) {
            disc = 1.5;
            study = 2;
            note = 'Nhắc nhở học sinh sử dụng điện thoại trong giờ';
          } else if (cid === '10/3B' && dayOffset === 4) {
            hyg = 1.5;
            note = 'Kê lại bàn ghế ngay ngắn sau giờ học';
          }

          const { total_score, classification } = computeScoreAndClassification(study, disc, hyg, att);

          lesson_records.push({
            id: `rec-${recordCounter++}`,
            school_year: '2026-2027',
            class_id: cid,
            date: dateStr,
            week_number: w,
            semester: sem,
            period: p,
            subject_id: subId,
            study_score: study,
            discipline_score: disc,
            hygiene_score: hyg,
            attendance_score: att,
            total_score,
            classification,
            note,
            created_by: 'system',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  return {
    users,
    classes,
    subjects,
    lesson_records,
    school_years,
    settings: defaultSettings,
  };
}

class Database {
  private data: DatabaseData;

  constructor() {
    this.data = this.loadData();
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
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmailOrPhone(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(
      (u) =>
        u.email.toLowerCase() === clean ||
        u.phone === identifier.trim() ||
        (clean === 'admin' && u.email.toLowerCase() === 'admin')
    );
  }

  public getClasses(): ClassItem[] {
    return this.data.classes;
  }

  public getClassById(id: string): ClassItem | undefined {
    return this.data.classes.find((c) => c.id === id);
  }

  public getSubjects(): SubjectItem[] {
    return this.data.subjects;
  }

  public getSubjectById(id: string): SubjectItem | undefined {
    return this.data.subjects.find((s) => s.id === id);
  }

  public getLessonRecords(): LessonRecord[] {
    return this.data.lesson_records;
  }

  public getLessonRecordById(id: string): LessonRecord | undefined {
    return this.data.lesson_records.find((r) => r.id === id);
  }

  public getSettings(): SystemSettings {
    return this.data.settings;
  }

  public getSchoolYears(): SchoolYear[] {
    return this.data.school_years;
  }

  // Mutations
  public updateSettings(settings: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return this.data.settings;
  }

  public addUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
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
      }
    }

    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const oldUser = this.data.users[index];
    const updatedUser: User = {
      ...oldUser,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.data.users[index] = updatedUser;

    // Update class assignment if LPHT
    if (updatedUser.role === 'LPHT' && updatedUser.class_id) {
      const cls = this.getClassById(updatedUser.class_id);
      if (cls) {
        cls.lpht_user_id = updatedUser.id;
        cls.lpht_name = updatedUser.full_name;
      }
    }

    this.save();
    return updatedUser;
  }

  public addClass(cls: Omit<ClassItem, 'created_at' | 'updated_at'>): ClassItem {
    const newClass: ClassItem = {
      ...cls,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.classes.push(newClass);
    this.save();
    return newClass;
  }

  public updateClass(id: string, updates: Partial<ClassItem>): ClassItem | null {
    const index = this.data.classes.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.data.classes[index] = {
      ...this.data.classes[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.classes[index];
  }

  public deleteClass(id: string): boolean {
    const initialLen = this.data.classes.length;
    this.data.classes = this.data.classes.filter((c) => c.id !== id);
    if (this.data.classes.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public addSubject(sub: Omit<SubjectItem, 'created_at' | 'updated_at'>): SubjectItem {
    const newSubject: SubjectItem = {
      ...sub,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.subjects.push(newSubject);
    this.save();
    return newSubject;
  }

  public updateSubject(id: string, updates: Partial<SubjectItem>): SubjectItem | null {
    const index = this.data.subjects.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.data.subjects[index] = {
      ...this.data.subjects[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.subjects[index];
  }

  public addLessonRecord(record: Omit<LessonRecord, 'id' | 'total_score' | 'classification' | 'created_at' | 'updated_at'>): LessonRecord {
    const { total_score, classification } = computeScoreAndClassification(
      record.study_score,
      record.discipline_score,
      record.hygiene_score,
      record.attendance_score
    );

    const newRecord: LessonRecord = {
      ...record,
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      total_score,
      classification,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.lesson_records.push(newRecord);
    this.save();
    return newRecord;
  }

  public updateLessonRecord(id: string, updates: Partial<LessonRecord>): LessonRecord | null {
    const index = this.data.lesson_records.findIndex((r) => r.id === id);
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
    return this.data.lesson_records[index];
  }

  public deleteLessonRecord(id: string): boolean {
    const initialLen = this.data.lesson_records.length;
    this.data.lesson_records = this.data.lesson_records.filter((r) => r.id !== id);
    if (this.data.lesson_records.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public clearLessonRecordsBySchoolYear(schoolYear?: string): number {
    const targetYear = (schoolYear || this.data.settings.current_school_year || '').trim();
    const initialLen = this.data.lesson_records.length;
    if (!targetYear || targetYear === 'ALL') {
      this.data.lesson_records = [];
    } else {
      this.data.lesson_records = this.data.lesson_records.filter((r) => r.school_year !== targetYear);
    }
    const deletedCount = initialLen - this.data.lesson_records.length;
    this.save();
    return deletedCount;
  }

  // Duplicate check: Class + Date + Period + Subject
  public findDuplicateRecord(class_id: string, date: string, period: number, subject_id: string, excludeId?: string): LessonRecord | undefined {
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
