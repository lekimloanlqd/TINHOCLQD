export type Role = 'ADMIN' | 'CAN_BO_DOAN' | 'LPHT';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  class_id?: string | null;
  status: 'ACTIVE' | 'LOCKED';
  password?: string;
  must_change_password?: boolean;
  password_masked?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClassItem {
  id: string;
  class_name: string;
  grade: number;
  school_year: string;
  homeroom_teacher: string;
  lpht_user_id?: string | null;
  lpht_name?: string | null;
  student_count: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface SubjectItem {
  id: string;
  subject_code: string;
  subject_name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface LessonRecord {
  id: string;
  school_year: string;
  class_id: string;
  date: string;
  week_number: number;
  semester: number;
  period: number;
  subject_id: string;
  study_score: number;
  discipline_score: number;
  hygiene_score: number;
  attendance_score: number;
  total_score: number;
  classification: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt';
  note: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClassRankingItem {
  rank: number;
  class_id: string;
  class_name: string;
  grade: number;
  homeroom_teacher: string;
  totalRecords: number;
  avgScore: number;
  studyAvg: number;
  discAvg: number;
  hygAvg: number;
  attAvg: number;
  goodCount: number;
  fairCount: number;
  passCount: number;
  failCount: number;
  goodRate: number;
  failRate: number;
}

export interface DashboardData {
  summary: {
    totalClasses: number;
    totalRecords: number;
    avgScore: number;
    goodCount: number;
    fairCount: number;
    passCount: number;
    failCount: number;
    goodRate: number;
    fairRate: number;
    passRate: number;
    failRate: number;
  };
  top3: ClassRankingItem[];
  rankings: ClassRankingItem[];
  weeklyTrends: { week: number; avgScore: number; goodRate: number; failRate: number }[];
  radarData: { subject: string; value: number; fullMark: number }[];
}

export interface AlertItem {
  id: string;
  class_id: string;
  class_name: string;
  issue: string;
  time: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detail: string;
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
    good_threshold: number;
    fair_threshold: number;
    pass_threshold: number;
  };
  ranking_rules: {
    primary: string;
    tiebreak_1: string;
    tiebreak_2: string;
    tiebreak_3: string;
    tiebreak_4: string;
  };
}

export type ActiveTab =
  | 'dashboard'
  | 'classbook'
  | 'classes'
  | 'subjects'
  | 'analytics'
  | 'rankings'
  | 'alerts'
  | 'ai_assistant'
  | 'reports'
  | 'import_export'
  | 'users'
  | 'settings';
