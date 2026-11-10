-- ==============================================================================
-- SMART CLASSBOOK AI - SUPABASE DATABASE SCHEMA
-- Trường THPT Phan Bội Châu (TP Đà Nẵng)
-- ==============================================================================

-- 1. BẢNG LỚP HỌC (classes)
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY,
    class_name TEXT NOT NULL,
    grade INTEGER NOT NULL,
    school_year TEXT NOT NULL DEFAULT '2026-2027',
    homeroom_teacher TEXT DEFAULT '',
    lpht_user_id TEXT,
    lpht_name TEXT,
    student_count INTEGER DEFAULT 40,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG MÔN HỌC (subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG NGƯỜI DÙNG & PHÂN QUYỀN (users)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'LPHT', -- 'ADMIN' | 'CAN_BO_DOAN' | 'LPHT'
    class_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'LOCKED'
    password TEXT NOT NULL DEFAULT '123456',
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG CẤU HÌNH HỆ THỐNG (settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    school_name TEXT NOT NULL DEFAULT 'Trường THPT Phan Bội Châu',
    city TEXT NOT NULL DEFAULT 'TP Đà Nẵng',
    sub_title TEXT NOT NULL DEFAULT 'Đoàn TNCS Hồ Chí Minh - Ban Chấp Hành Đoàn Trường',
    slogan TEXT NOT NULL DEFAULT 'Biến dữ liệu Sổ đầu bài thành thông tin thi đua thông minh.',
    current_school_year TEXT NOT NULL DEFAULT '2026-2027',
    current_week INTEGER NOT NULL DEFAULT 1,
    current_semester INTEGER NOT NULL DEFAULT 1,
    scoring_rules JSONB NOT NULL DEFAULT '{"study_max": 3, "discipline_max": 3, "hygiene_max": 2, "attendance_max": 2, "good_threshold": 9, "fair_threshold": 7, "pass_threshold": 5}'::jsonb,
    ranking_rules JSONB NOT NULL DEFAULT '{"primary": "avg_score_desc", "tiebreak_1": "good_rate_desc", "tiebreak_2": "discipline_avg_desc", "tiebreak_3": "study_avg_desc", "tiebreak_4": "fail_rate_asc"}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG SỔ ĐẦU BÀI / TIẾT HỌC (lesson_records)
CREATE TABLE IF NOT EXISTS public.lesson_records (
    id TEXT PRIMARY KEY,
    school_year TEXT NOT NULL DEFAULT '2026-2027',
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    date DATE NOT NULL,
    week_number INTEGER NOT NULL,
    semester INTEGER NOT NULL DEFAULT 1,
    period INTEGER NOT NULL,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    study_score NUMERIC(4,2) NOT NULL DEFAULT 0,
    discipline_score NUMERIC(4,2) NOT NULL DEFAULT 0,
    hygiene_score NUMERIC(4,2) NOT NULL DEFAULT 0,
    attendance_score NUMERIC(4,2) NOT NULL DEFAULT 0,
    total_score NUMERIC(4,2) NOT NULL DEFAULT 0,
    classification TEXT NOT NULL DEFAULT 'Đạt', -- 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt'
    note TEXT DEFAULT '',
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES CHO TRUY VẤN NHANH & BÁO CÁO THI ĐUA
CREATE INDEX IF NOT EXISTS idx_records_class_week ON public.lesson_records(class_id, week_number);
CREATE INDEX IF NOT EXISTS idx_records_date ON public.lesson_records(date);
CREATE INDEX IF NOT EXISTS idx_records_school_year ON public.lesson_records(school_year);

-- TẮT HOẶC MỞ RLS CHO PHÉP WEB APP TRUY VẤN AN TOÀN QUA SERVICE ROLE HOẶC ANON
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_records ENABLE ROW LEVEL SECURITY;

-- POLICIES: Cho phép ứng dụng đọc và ghi (Authentication & RLS được xử lý tại Express Backend & Auth Service)
CREATE POLICY "Allow public read classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Allow public all classes" ON public.classes FOR ALL USING (true);

CREATE POLICY "Allow public read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Allow public all subjects" ON public.subjects FOR ALL USING (true);

CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public all users" ON public.users FOR ALL USING (true);

CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public all settings" ON public.settings FOR ALL USING (true);

CREATE POLICY "Allow public read records" ON public.lesson_records FOR SELECT USING (true);
CREATE POLICY "Allow public all records" ON public.lesson_records FOR ALL USING (true);
