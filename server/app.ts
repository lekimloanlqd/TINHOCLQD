import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, computeScoreAndClassification, User, LessonRecord } from './db.ts';
import { generateAIContent } from './gemini.ts';

// In-memory token storage for active sessions
const sessions = new Map<string, { userId: string; createdAt: number }>();

function generateToken(userId: string): string {
  const token = `tok_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

function getUserFromReq(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  let session = sessions.get(token);
  if (!session) {
    // If token has valid format tok_{userId}_{timestamp}_{random}, recover session
    if (token.startsWith('tok_')) {
      const parts = token.split('_');
      if (parts.length >= 2) {
        const userId = parts[1];
        const user = db.getUserById(userId);
        if (user && user.status !== 'LOCKED') {
          sessions.set(token, { userId, createdAt: Date.now() });
          return user;
        }
      }
    }
    return null;
  }

  const user = db.getUserById(session.userId);
  if (!user || user.status === 'LOCKED') return null;
  return user;
}

// Middleware for requiring authenticated user
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện thao tác này.' });
  }
  (req as any).user = user;
  next();
}

// Middleware for Admin only
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as User;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Chỉ Quản trị viên (ADMIN) mới có quyền thực hiện thao tác này.' });
  }
  next();
}

// Middleware for Admin or Cán bộ Đoàn
function requireAdminOrDoan(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as User;
  if (!user || (user.role !== 'ADMIN' && user.role !== 'CAN_BO_DOAN')) {
    return res.status(403).json({ error: 'Chỉ Quản trị viên hoặc Cán bộ Đoàn mới có quyền thực hiện thao tác này.' });
  }
  next();
}

export function createApp() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Normalize incoming URLs so server handles both /api/... and direct rewritten paths
  app.use((req, _res, next) => {
    if (!req.url.startsWith('/api') && (
      req.url.startsWith('/auth') ||
      req.url.startsWith('/records') ||
      req.url.startsWith('/classes') ||
      req.url.startsWith('/subjects') ||
      req.url.startsWith('/settings') ||
      req.url.startsWith('/users') ||
      req.url.startsWith('/stats') ||
      req.url.startsWith('/ai')
    )) {
      req.url = '/api' + req.url;
    }
    next();
  });

  // --- 1. AUTH ROUTES ---
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập/email/SĐT và mật khẩu.' });
    }

    const user = db.getUserByEmailOrPhone(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại trong hệ thống.' });
    }

    if (user.status === 'LOCKED') {
      return res.status(403).json({ error: 'Tài khoản này đã bị khóa. Vui lòng liên hệ Admin.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác.' });
    }

    const token = generateToken(user.id);
    const { password: _, ...userSafe } = user;
    return res.json({ token, user: userSafe });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getUserFromReq(req);
    if (!user) {
      return res.json({ user: null });
    }
    const { password: _, ...userSafe } = user;
    return res.json({ user: userSafe });
  });

  app.post('/api/auth/change-password', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.' });
    }

    if (user.password !== currentPassword) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 4 ký tự.' });
    }

    const updated = db.updateUser(user.id, {
      password: newPassword,
      must_change_password: false,
    });

    if (!updated) {
      return res.status(500).json({ error: 'Không thể cập nhật mật khẩu.' });
    }

    const { password: _, ...userSafe } = updated;
    return res.json({ success: true, message: 'Đổi mật khẩu thành công!', user: userSafe });
  });

  // --- 2. SETTINGS ROUTES ---
  app.get('/api/settings', (req, res) => {
    res.json(db.getSettings());
  });

  app.put('/api/settings', requireAuth, requireAdmin, (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  });

  // --- 3. CLASSES ROUTES ---
  app.get('/api/classes', (req, res) => {
    res.json(db.getClasses());
  });

  app.post('/api/classes', requireAuth, requireAdminOrDoan, (req, res) => {
    const { class_name, grade, homeroom_teacher, student_count, status } = req.body;
    if (!class_name || !grade) {
      return res.status(400).json({ error: 'Tên lớp và khối là bắt buộc.' });
    }
    const existing = db.getClassById(class_name);
    if (existing) {
      return res.status(400).json({ error: `Lớp ${class_name} đã tồn tại.` });
    }
    const newClass = db.addClass({
      id: class_name,
      class_name,
      grade: Number(grade),
      school_year: db.getSettings().current_school_year,
      homeroom_teacher: homeroom_teacher || '',
      student_count: Number(student_count) || 40,
      status: status || 'ACTIVE',
    });
    res.status(201).json(newClass);
  });

  app.put('/api/classes/:id', requireAuth, requireAdminOrDoan, (req, res) => {
    const { id } = req.params;
    const updated = db.updateClass(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy lớp học.' });
    res.json(updated);
  });

  app.delete('/api/classes/:id', requireAuth, requireAdminOrDoan, (req, res) => {
    const { id } = req.params;
    // Check if class has lesson records
    const records = db.getLessonRecords().filter((r) => r.class_id === id);
    if (records.length > 0) {
      // Soft-disable instead of hard delete to preserve history
      db.updateClass(id, { status: 'INACTIVE' });
      return res.json({ message: 'Lớp đã có dữ liệu Sổ đầu bài nên được chuyển sang trạng thái Vô hiệu hóa (lưu trữ).' });
    }
    db.deleteClass(id);
    res.json({ message: 'Xóa lớp thành công.' });
  });

  // --- 4. SUBJECTS ROUTES ---
  app.get('/api/subjects', (req, res) => {
    res.json(db.getSubjects());
  });

  app.post('/api/subjects', requireAuth, requireAdminOrDoan, (req, res) => {
    const { subject_code, subject_name, status } = req.body;
    if (!subject_code || !subject_name) {
      return res.status(400).json({ error: 'Mã môn và tên môn là bắt buộc.' });
    }
    const newSub = db.addSubject({
      id: subject_code.toUpperCase(),
      subject_code: subject_code.toUpperCase(),
      subject_name,
      status: status || 'ACTIVE',
    });
    res.status(201).json(newSub);
  });

  app.put('/api/subjects/:id', requireAuth, requireAdminOrDoan, (req, res) => {
    const { id } = req.params;
    const updated = db.updateSubject(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy môn học.' });
    res.json(updated);
  });

  app.delete('/api/subjects/:id', requireAuth, requireAdminOrDoan, (req, res) => {
    const { id } = req.params;
    const hasRecords = db.getLessonRecords().some((r) => r.subject_id === id);
    if (hasRecords) {
      db.updateSubject(id, { status: 'INACTIVE' });
      return res.json({ message: 'Môn học đã phát sinh điểm trong Sổ đầu bài nên được chuyển sang trạng thái Vô hiệu hóa.' });
    }
    const sub = db.getSubjects().find((s) => s.id === id);
    if (sub) {
      db.updateSubject(id, { status: 'INACTIVE' });
    }
    res.json({ message: 'Đã vô hiệu hóa môn học.' });
  });

  // --- 5. LESSON RECORDS (SỔ ĐẦU BÀI) WITH DATABASE RLS ---
  // Read access: Everyone can read all records (Section III & VIII)
  app.get('/api/records', (req, res) => {
    const { class_id, week_number, semester, grade, date } = req.query;
    let records = db.getLessonRecords();

    if (class_id) {
      records = records.filter((r) => r.class_id === class_id);
    }
    if (week_number) {
      records = records.filter((r) => r.week_number === Number(week_number));
    }
    if (semester) {
      records = records.filter((r) => r.semester === Number(semester));
    }
    if (date) {
      records = records.filter((r) => r.date === date);
    }
    if (grade) {
      const classes = db.getClasses().filter((c) => c.grade === Number(grade)).map((c) => c.id);
      records = records.filter((r) => classes.includes(r.class_id));
    }

    // Sort by date desc, period asc
    records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.period - b.period;
    });

    res.json(records);
  });

  // INSERT Lesson Record (with RLS check)
  app.post('/api/records', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const { class_id, date, week_number, semester, period, subject_id, study_score, discipline_score, hygiene_score, attendance_score, note, force_update } = req.body;

    if (!class_id || !date || !period || !subject_id) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin: Lớp, Ngày, Tiết, Môn học.' });
    }

    // --- RLS CHECK: LPHT can ONLY insert for their assigned class ---
    if (user.role === 'LPHT') {
      if (user.class_id !== class_id) {
        return res.status(403).json({
          error: `Bạn là Lớp phó học tập lớp ${user.class_id || 'chưa gán'}. Bạn chỉ có quyền cập nhật Sổ đầu bài của lớp được phân công.`,
        });
      }
    }

    // Duplicate detection: Class + Date + Period + Subject (Section XIX)
    const duplicate = db.findDuplicateRecord(class_id, date, Number(period), subject_id);
    if (duplicate && !force_update) {
      return res.status(409).json({
        isDuplicate: true,
        duplicateId: duplicate.id,
        message: `Đã tồn tại tiết học trùng lặp (Lớp ${class_id}, Ngày ${date}, Tiết ${period}, Môn ${subject_id}). Bạn muốn Cập nhật hay Bỏ qua?`,
      });
    }

    const currentYear = db.getSettings().current_school_year;
    const weekNum = Number(week_number) || 1;
    const sem = Number(semester) || (weekNum <= 19 ? 1 : 2);

    if (duplicate && force_update) {
      const updated = db.updateLessonRecord(duplicate.id, {
        study_score: Number(study_score),
        discipline_score: Number(discipline_score),
        hygiene_score: Number(hygiene_score),
        attendance_score: Number(attendance_score),
        note: note || '',
      });
      return res.json(updated);
    }

    const created = db.addLessonRecord({
      ...(req.body.id ? { id: req.body.id } : {}),
      school_year: currentYear,
      class_id,
      date,
      week_number: weekNum,
      semester: sem,
      period: Number(period),
      subject_id,
      study_score: Number(study_score),
      discipline_score: Number(discipline_score),
      hygiene_score: Number(hygiene_score),
      attendance_score: Number(attendance_score),
      note: note || '',
      created_by: user.full_name,
    });

    res.status(201).json(created);
  });

  // UPDATE Lesson Record (with RLS check)
  app.put('/api/records/:id', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const rawId = req.params.id;
    const id = decodeURIComponent(rawId).trim();
    let existing = db.getLessonRecordById(id);
    if (!existing) {
      existing = db.getLessonRecords().find((r) => r.id.toLowerCase() === id.toLowerCase());
    }
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy tiết học trong Sổ đầu bài.' });
    }

    // --- RLS CHECK: LPHT can ONLY update records belonging to their assigned class ---
    if (user.role === 'LPHT') {
      if (user.class_id !== existing.class_id) {
        return res.status(403).json({
          error: `Bạn chỉ có quyền cập nhật Sổ đầu bài của lớp được phân công (${user.class_id}).`,
        });
      }
    }

    const updated = db.updateLessonRecord(existing.id, req.body);
    res.json(updated);
  });

  // DELETE ALL Lesson Records for a School Year (Admin / Cán bộ Đoàn only)
  app.delete('/api/records/all/clear-year', requireAuth, requireAdminOrDoan, (req, res) => {
    const schoolYear = (req.query.school_year as string) || (req.body?.school_year as string) || db.getSettings().current_school_year;
    const deletedCount = db.clearLessonRecordsBySchoolYear(schoolYear);
    res.json({
      success: true,
      message: `Đã xóa toàn bộ ${deletedCount} tiết học của năm học ${schoolYear} thành công.`,
      deletedCount,
      school_year: schoolYear,
    });
  });

  // DELETE Lesson Record (with RLS check)
  app.delete('/api/records/:id', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const rawId = req.params.id;
    const id = decodeURIComponent(rawId).trim();
    
    let existing = db.getLessonRecordById(id);
    if (!existing) {
      existing = db.getLessonRecords().find((r) => r.id.toLowerCase() === id.toLowerCase());
    }

    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy tiết học cần xóa.' });
    }

    // --- RLS CHECK: LPHT can ONLY delete records of their assigned class ---
    if (user.role === 'LPHT') {
      if (user.class_id !== existing.class_id) {
        return res.status(403).json({
          error: `Bạn chỉ có quyền xóa Sổ đầu bài của lớp được phân công (${user.class_id}).`,
        });
      }
    }

    db.deleteLessonRecord(existing.id);
    res.json({ success: true, message: 'Xóa tiết học thành công!' });
  });

  // Helper to normalize dates from Excel (dd/mm/yyyy to yyyy-mm-dd)
  function normalizeDateStr(dateVal: any): string {
    if (!dateVal) return '';
    const str = String(dateVal).trim();
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return str;
  }

  // Batch import for Excel (Section XVIII & XIX)
  app.post('/api/records/batch-import', requireAuth, (req, res) => {
    const user = (req as any).user as User;
    const { records, onDuplicateAction } = req.body; // onDuplicateAction: 'skip' | 'update' | 'cancel'

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Danh sách dữ liệu import trống.' });
    }

    // Normalize date on all records
    for (const row of records) {
      if (row.date) {
        row.date = normalizeDateStr(row.date);
      }
    }

    const validationErrors: string[] = [];
    const classes = db.getClasses().map((c) => c.id);
    const subjects = db.getSubjects().map((s) => s.id);

    // Validate rows
    records.forEach((row: any, idx: number) => {
      const line = idx + 1;
      if (!row.class_id) validationErrors.push(`Dòng ${line}: Chưa có thông tin lớp.`);
      else if (!classes.includes(row.class_id)) validationErrors.push(`Dòng ${line}: Lớp ${row.class_id} không tồn tại trong hệ thống.`);

      // LPHT can only import for assigned class
      if (user.role === 'LPHT' && row.class_id !== user.class_id) {
        validationErrors.push(`Dòng ${line}: Bạn không có quyền nhập dữ liệu cho lớp ${row.class_id} (chỉ được nhập lớp ${user.class_id}).`);
      }

      if (!row.date) validationErrors.push(`Dòng ${line}: Chưa có ngày học.`);
      if (!row.period || row.period < 1 || row.period > 10) validationErrors.push(`Dòng ${line}: Tiết học phải từ 1 đến 10.`);
      if (!row.subject_id) validationErrors.push(`Dòng ${line}: Chưa có môn học.`);

      const study = Number(row.study_score);
      if (isNaN(study) || study < 0 || study > 3) validationErrors.push(`Dòng ${line}: Điểm Học tập (${row.study_score}) phải nằm trong khoảng 0–3.`);

      const disc = Number(row.discipline_score);
      if (isNaN(disc) || disc < 0 || disc > 3) validationErrors.push(`Dòng ${line}: Điểm Kỉ luật (${row.discipline_score}) phải nằm trong khoảng 0–3.`);

      const hyg = Number(row.hygiene_score);
      if (isNaN(hyg) || hyg < 0 || hyg > 2) validationErrors.push(`Dòng ${line}: Điểm Vệ sinh (${row.hygiene_score}) phải nằm trong khoảng 0–2.`);

      const att = Number(row.attendance_score);
      if (isNaN(att) || att < 0 || att > 2) validationErrors.push(`Dòng ${line}: Điểm Chuyên cần (${row.attendance_score}) phải nằm trong khoảng 0–2.`);
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Tệp Excel có lỗi dữ liệu. Vui lòng kiểm tra và sửa lại.',
        validationErrors,
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of records) {
      const dup = db.findDuplicateRecord(row.class_id, row.date, Number(row.period), row.subject_id);
      if (dup) {
        if (onDuplicateAction === 'skip') {
          skippedCount++;
          continue;
        } else if (onDuplicateAction === 'update') {
          db.updateLessonRecord(dup.id, {
            study_score: Number(row.study_score),
            discipline_score: Number(row.discipline_score),
            hygiene_score: Number(row.hygiene_score),
            attendance_score: Number(row.attendance_score),
            note: row.note || '',
          });
          updatedCount++;
          continue;
        } else {
          // cancel on conflict
          return res.status(409).json({
            error: `Phát hiện dữ liệu trùng lặp tại lớp ${row.class_id}, ngày ${row.date}, tiết ${row.period}. Thao tác import đã được hủy.`,
          });
        }
      }

      const weekNum = Number(row.week_number) || 1;
      const sem = Number(row.semester) || (weekNum <= 19 ? 1 : 2);
      db.addLessonRecord({
        school_year: row.school_year || db.getSettings().current_school_year,
        class_id: row.class_id,
        date: row.date,
        week_number: weekNum,
        semester: sem,
        period: Number(row.period),
        subject_id: row.subject_id,
        study_score: Number(row.study_score),
        discipline_score: Number(row.discipline_score),
        hygiene_score: Number(row.hygiene_score),
        attendance_score: Number(row.attendance_score),
        note: row.note || '',
        created_by: user.full_name,
      });
      insertedCount++;
    }

    res.json({
      success: true,
      message: `Nhập Excel thành công! Đã thêm mới: ${insertedCount}, cập nhật: ${updatedCount}, bỏ qua: ${skippedCount} bản ghi.`,
      stats: { insertedCount, updatedCount, skippedCount },
    });
  });

  // --- 6. USERS MANAGEMENT (ADMIN ONLY) ---
  app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
    const users = db.getUsers().map((u) => {
      const { password, ...safe } = u;
      return { ...safe, password_masked: '••••••••' };
    });
    res.json(users);
  });

  app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
    const { full_name, email, phone, role, class_id, password } = req.body;
    if (!full_name || !email || !role) {
      return res.status(400).json({ error: 'Họ tên, email/tên đăng nhập và vai trò là bắt buộc.' });
    }

    const existing = db.getUserByEmailOrPhone(email);
    if (existing) {
      return res.status(400).json({ error: 'Tài khoản này đã tồn tại.' });
    }

    const newUser = db.addUser({
      full_name,
      email,
      phone: phone || '',
      role,
      class_id: role === 'LPHT' ? class_id : null,
      status: 'ACTIVE',
      password: password || '123456',
      must_change_password: false,
    });

    const { password: _, ...userSafe } = newUser;
    res.status(201).json(userSafe);
  });

  app.put('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone, role, class_id, status } = req.body;
    const updated = db.updateUser(id, {
      full_name,
      email,
      phone,
      role,
      class_id: role === 'LPHT' ? class_id : null,
      status,
    });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    const { password: _, ...userSafe } = updated;
    res.json(userSafe);
  });

  app.post('/api/users/:id/reset-password', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const newPass = req.body.newPassword || '123456';
    const updated = db.updateUser(id, { password: newPass, must_change_password: true });
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    res.json({ message: `Đã đặt lại mật khẩu thành công cho ${updated.full_name}. Mật khẩu mới: ${newPass}` });
  });

  // --- 7. DYNAMIC STATS & RANKING ENGINE ---
  app.get('/api/stats/dashboard', (req, res) => {
    const { week_number, semester, grade, school_year } = req.query;
    let records = db.getLessonRecords();
    let classes = db.getClasses().filter((c) => c.status === 'ACTIVE');

    if (grade) {
      classes = classes.filter((c) => c.grade === Number(grade));
      const classIds = classes.map((c) => c.id);
      records = records.filter((r) => classIds.includes(r.class_id));
    }
    if (week_number) {
      records = records.filter((r) => r.week_number === Number(week_number));
    }
    if (semester) {
      records = records.filter((r) => r.semester === Number(semester));
    }
    if (school_year) {
      records = records.filter((r) => r.school_year === school_year);
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

    // Per-class stats for rankings (Section XVI)
    const classStatsMap: Record<string, {
      class_id: string;
      class_name: string;
      grade: number;
      homeroom_teacher: string;
      totalRecords: number;
      totalScore: number;
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
    }> = {};

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

    const classStatsList = Object.values(classStatsMap).map((item) => {
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

    // Sort strictly by Section XVI:
    // 1. Điểm trung bình giảm dần
    // 2. Nếu bằng nhau -> % Tốt cao hơn
    // 3. Nếu tiếp tục bằng -> Điểm Kỉ luật TB cao hơn
    // 4. Nếu tiếp tục bằng -> Điểm Học tập TB cao hơn
    // 5. Nếu tiếp tục bằng -> % Chưa đạt thấp hơn
    classStatsList.sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.goodRate !== a.goodRate) return b.goodRate - a.goodRate;
      if (b.discAvg !== a.discAvg) return b.discAvg - a.discAvg;
      if (b.studyAvg !== a.studyAvg) return b.studyAvg - a.studyAvg;
      return a.failRate - b.failRate;
    });

    const rankings = classStatsList.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    // Weekly trend data (Weeks 1 to 5 or up to max week recorded)
    const weeklyTrends: { week: number; avgScore: number; goodRate: number; failRate: number }[] = [];
    for (let w = 1; w <= 39; w++) {
      const weekRecs = db.getLessonRecords().filter((r) => r.week_number === w);
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

    // Radar Criteria Distribution
    const radarData = [
      { subject: 'Học tập (max 3)', value: totalRecords > 0 ? Number((studySum / totalRecords).toFixed(2)) : 0, fullMark: 3 },
      { subject: 'Kỉ luật (max 3)', value: totalRecords > 0 ? Number((discSum / totalRecords).toFixed(2)) : 0, fullMark: 3 },
      { subject: 'Vệ sinh (max 2)', value: totalRecords > 0 ? Number((hygSum / totalRecords).toFixed(2)) : 0, fullMark: 2 },
      { subject: 'Chuyên cần (max 2)', value: totalRecords > 0 ? Number((attSum / totalRecords).toFixed(2)) : 0, fullMark: 2 },
    ];

    res.json({
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
    });
  });

  // Smart Alerts detection (Section XXIII)
  app.get('/api/stats/alerts', (req, res) => {
    const classes = db.getClasses().filter((c) => c.status === 'ACTIVE');
    const allRecords = db.getLessonRecords();
    const alerts: {
      id: string;
      class_id: string;
      class_name: string;
      issue: string;
      time: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      detail: string;
    }[] = [];

    classes.forEach((c) => {
      // Check last 3 weeks scores
      const weekScores: { week: number; avg: number; failCount: number; discAvg: number }[] = [];
      for (let w = 1; w <= 39; w++) {
        const recs = allRecords.filter((r) => r.class_id === c.id && r.week_number === w);
        if (recs.length > 0) {
          const avg = recs.reduce((s, r) => s + r.total_score, 0) / recs.length;
          const disc = recs.reduce((s, r) => s + r.discipline_score, 0) / recs.length;
          const fails = recs.filter((r) => r.classification === 'Chưa đạt').length;
          weekScores.push({ week: w, avg, failCount: fails, discAvg: disc });
        }
      }

      // Check consecutive drops
      if (weekScores.length >= 3) {
        const last3 = weekScores.slice(-3);
        if (last3[2].avg < last3[1].avg && last3[1].avg < last3[0].avg) {
          alerts.push({
            id: `alt-drop-${c.id}`,
            class_id: c.id,
            class_name: c.class_name,
            issue: 'Điểm số giảm liên tục trong 3 tuần gần nhất',
            time: `Tuần ${last3[0].week} → Tuần ${last3[2].week}`,
            severity: 'HIGH',
            detail: `Điểm trung bình giảm từ ${last3[0].avg.toFixed(2)} xuống ${last3[1].avg.toFixed(2)} và hiện tại là ${last3[2].avg.toFixed(2)}`,
          });
        }
      }

      // Check recent failures
      const recentRecs = allRecords.filter((r) => r.class_id === c.id && r.week_number >= 4);
      const failCount = recentRecs.filter((r) => r.classification === 'Chưa đạt').length;
      if (failCount >= 2) {
        alerts.push({
          id: `alt-fail-${c.id}`,
          class_id: c.id,
          class_name: c.class_name,
          issue: 'Nhiều tiết xếp loại Chưa đạt',
          time: 'Gần đây',
          severity: 'HIGH',
          detail: `Có ${failCount} tiết bị xếp loại Chưa đạt trong các tuần gần nhất. Cần chấn chỉnh nề nếp.`,
        });
      }

      // Check discipline drop
      if (weekScores.length >= 2) {
        const last2 = weekScores.slice(-2);
        if (last2[1].discAvg < 2.0) {
          alerts.push({
            id: `alt-disc-${c.id}`,
            class_id: c.id,
            class_name: c.class_name,
            issue: 'Điểm Kỉ luật dưới mức tiêu chuẩn',
            time: `Tuần ${last2[1].week}`,
            severity: 'MEDIUM',
            detail: `Điểm kỉ luật trung bình tuần qua chỉ đạt ${last2[1].discAvg.toFixed(2)}/3.0. Phát sinh nhiều nhắc nhở trong giờ học.`,
          });
        }
      }
    });

    res.json(alerts);
  });

  // --- 8. AI SMART INSIGHT & ASSISTANT & REPORTS (GEMINI) ---
  app.post('/api/ai/insight', async (req, res) => {
    const { week_number, grade } = req.body;
    let records = db.getLessonRecords();
    let classes = db.getClasses().filter((c) => c.status === 'ACTIVE');

    if (grade) {
      classes = classes.filter((c) => c.grade === Number(grade));
      const ids = classes.map((c) => c.id);
      records = records.filter((r) => ids.includes(r.class_id));
    }
    if (week_number) {
      records = records.filter((r) => r.week_number === Number(week_number));
    }

    if (records.length === 0) {
      return res.json({
        text: 'Chưa đủ dữ liệu để đưa ra kết luận phân tích cho khoảng thời gian được chọn.',
        error: false,
      });
    }

    // Pre-calculate exact business numbers before sending to AI (Section XXV)
    const totalCount = records.length;
    const avg = (records.reduce((s, r) => s + r.total_score, 0) / totalCount).toFixed(2);
    const goodPercent = ((records.filter((r) => r.classification === 'Tốt').length / totalCount) * 100).toFixed(1);
    const failPercent = ((records.filter((r) => r.classification === 'Chưa đạt').length / totalCount) * 100).toFixed(1);
    const discAvg = (records.reduce((s, r) => s + r.discipline_score, 0) / totalCount).toFixed(2);
    const studyAvg = (records.reduce((s, r) => s + r.study_score, 0) / totalCount).toFixed(2);

    const prompt = `
Dữ liệu thi đua thực tế của Trường THPT Phan Bội Châu (TP Đà Nẵng):
- Phạm vi: ${week_number ? `Tuần ${week_number}` : 'Toàn trường'}, Khối: ${grade || 'Toàn khối'}
- Tổng số tiết ghi nhận: ${totalCount} tiết
- Điểm trung bình toàn trường/khối: ${avg}/10
- Tỷ lệ tiết Tốt: ${goodPercent}%
- Tỷ lệ tiết Chưa đạt: ${failPercent}%
- Điểm Kỉ luật trung bình: ${discAvg}/3.0
- Điểm Học tập trung bình: ${studyAvg}/3.0

Hãy cung cấp bản Smart Insight ngắn gọn, sắc sảo dành cho Đoàn trường theo cấu trúc:
1. Nhận xét tổng quan
2. Điểm nổi bật
3. Xu hướng
4. Vấn đề cần lưu ý
5. Đề xuất cải thiện
Lưu ý: Giữ văn phong sư phạm, khuyến khích tinh thần thi đua, bám sát các số liệu đã tính trên.`;

    const result = await generateAIContent(prompt);
    res.json(result);
  });

  app.post('/api/ai/ask', async (req, res) => {
    const { question, currentWeek } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Vui lòng nhập câu hỏi.' });
    }

    const allRecords = db.getLessonRecords();
    const classes = db.getClasses().filter((c) => c.status === 'ACTIVE');
    const settings = db.getSettings();

    // Prepare live factual summary so AI does not hallucinate
    const week = Number(currentWeek) || settings.current_week;
    const weekRecs = allRecords.filter((r) => r.week_number === week);

    // Compute top and bottom for this week
    const classScoreMap: Record<string, { total: number; count: number; fails: number }> = {};
    weekRecs.forEach((r) => {
      if (!classScoreMap[r.class_id]) classScoreMap[r.class_id] = { total: 0, count: 0, fails: 0 };
      classScoreMap[r.class_id].total += r.total_score;
      classScoreMap[r.class_id].count += 1;
      if (r.classification === 'Chưa đạt') classScoreMap[r.class_id].fails += 1;
    });

    const rankingSummaries = Object.keys(classScoreMap).map((cid) => {
      const item = classScoreMap[cid];
      return {
        class_id: cid,
        avg: item.count > 0 ? (item.total / item.count).toFixed(2) : '0',
        fails: item.fails,
      };
    }).sort((a, b) => Number(b.avg) - Number(a.avg));

    const factualContext = `
Thông tin thực tế hệ thống SMART CLASSBOOK AI - THPT Phan Bội Châu (TP Đà Nẵng):
- Năm học: ${settings.current_school_year}, Tuần hiện tại: Tuần ${week}
- Danh sách lớp (${classes.length} lớp): ${classes.map((c) => c.class_name).join(', ')}
- Xếp hạng điểm trung bình tuần ${week}:
${rankingSummaries.slice(0, 10).map((r, i) => `  ${i + 1}. Lớp ${r.class_id}: ${r.avg} điểm (Số tiết Chưa đạt: ${r.fails})`).join('\n')}
${rankingSummaries.length > 5 ? `- Lớp đứng cuối tuần ${week}: Lớp ${rankingSummaries[rankingSummaries.length - 1].class_id} (${rankingSummaries[rankingSummaries.length - 1].avg} điểm)` : ''}
`;

    const prompt = `
Dưới đây là cơ sở dữ liệu thực tế:
${factualContext}

Câu hỏi của người dùng: "${question}"

Yêu cầu đối với trợ lý AI:
- Trả lời bằng tiếng Việt lịch sự, súc tích, hoàn toàn dựa trên số liệu thực tế được cung cấp ở trên.
- KHÔNG tự bịa số liệu.
- Nếu câu hỏi yêu cầu so sánh hoặc thông tin không có trong số liệu, hãy nói rõ: "Chưa đủ dữ liệu để đưa ra kết luận."`;

    const result = await generateAIContent(prompt);
    res.json(result);
  });

  app.post('/api/ai/report', async (req, res) => {
    const { scope, weekNumber, semester, grade } = req.body; // scope: 'week' | 'month' | 'semester' | 'school'
    let records = db.getLessonRecords();
    const classes = db.getClasses().filter((c) => c.status === 'ACTIVE');
    const settings = db.getSettings();

    if (grade) {
      const ids = classes.filter((c: any) => c.grade === Number(grade)).map((c: any) => c.id);
      records = records.filter((r: LessonRecord) => ids.includes(r.class_id));
    }
    if (scope === 'week' && weekNumber) {
      records = records.filter((r: LessonRecord) => r.week_number === Number(weekNumber));
    } else if (semester) {
      records = records.filter((r: LessonRecord) => r.semester === Number(semester));
    }

    if (records.length === 0) {
      return res.json({
        text: 'Chưa đủ dữ liệu để xuất báo cáo thi đua cho khoảng thời gian này.',
        error: false,
      });
    }

    const totalCount = records.length;
    const avg = (records.reduce((s: number, r: LessonRecord) => s + r.total_score, 0) / totalCount).toFixed(2);
    const goodCount = records.filter((r: LessonRecord) => r.classification === 'Tốt').length;
    const goodPercent = ((goodCount / totalCount) * 100).toFixed(1);
    const failCount = records.filter((r: LessonRecord) => r.classification === 'Chưa đạt').length;
    const failPercent = ((failCount / totalCount) * 100).toFixed(1);

    const prompt = `
Soạn thảo văn bản: "BÁO CÁO TỔNG HỢP THI ĐUA LỚP"
Đơn vị phát hành: ĐOÀN TRƯỜNG THPT PHAN BỘI CHÂU - TP ĐÀ NẴNG
Năm học: ${settings.current_school_year}
Thời gian/Phạm vi: ${scope === 'week' ? `Tuần ${weekNumber}` : scope === 'semester' ? `Học kỳ ${semester}` : 'Toàn trường'}

Số liệu thực tế:
- Tổng số tiết ghi sổ đầu bài: ${totalCount} tiết
- Điểm trung bình toàn đợt: ${avg}/10
- Tỷ lệ tiết Tốt: ${goodPercent}% (${goodCount} tiết)
- Tỷ lệ tiết Chưa đạt: ${failPercent}% (${failCount} tiết)

Hãy tạo một báo cáo chuẩn chỉnh văn phong Đoàn trường gồm các mục:
I. TÌNH HÌNH CHUNG
II. CÁC LỚP NỔI BẬT & KHEN THƯỞNG
III. PHÂN TÍCH 4 TIÊU CHÍ (Học tập, Kỉ luật, Vệ sinh, Chuyên cần)
IV. CÁC VẤN ĐỀ CẦN LƯU Ý & NHẮC NHỞ
V. ĐỀ XUẤT & BIỆN PHÁP THỰC HIỆN TUẦN TỚI
VI. KẾT LUẬN`;

    const result = await generateAIContent(prompt);
    res.json(result);
  });
  return app;
}

export const app = createApp();
export default app;
