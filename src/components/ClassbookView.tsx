import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { LessonRecord, ClassItem, SubjectItem } from '../types.ts';
import {
  BookOpenCheck,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Lock,
  Calendar,
  Layers,
  Clock,
  Download,
  Database,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Helper to format date YYYY-MM-DD to dd/mm/yyyy
export const formatDateVN = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }
  const parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {}
  return str;
};

// Helper to get day of the week in Vietnamese ('Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Chủ nhật')
export const getDayOfWeekVN = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  try {
    let y = 0, m = 0, d = 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const parts = str.split('-');
      y = Number(parts[0]);
      m = Number(parts[1]) - 1;
      d = Number(parts[2]);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const parts = str.split('/');
      d = Number(parts[0]);
      m = Number(parts[1]) - 1;
      y = Number(parts[2]);
    } else {
      const dt = new Date(str);
      if (!isNaN(dt.getTime())) {
        const day = dt.getDay(); // 0: CN, 1: Hai, 2: Ba, ...
        const dayNames = ['Chủ nhật', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
        return dayNames[day];
      }
      return '';
    }
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) {
      const day = dt.getDay();
      const dayNames = ['Chủ nhật', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
      return dayNames[day];
    }
  } catch {}
  return '';
};

export const ClassbookView: React.FC = () => {
  const { user, isGuest, isAdmin, isDoan, isLPHT, canEditClassbook } = useAuth();

  const [records, setRecords] = useState<LessonRecord[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterWeek, setFilterWeek] = useState<string>('1');
  const [filterSemester, setFilterSemester] = useState<string>('1');
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Single Record Delete confirmation modal states
  const [recordToDelete, setRecordToDelete] = useState<LessonRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<boolean>(false);

  // Clear all year data modal states (Admin / Cán bộ Đoàn)
  const [showClearYearModal, setShowClearYearModal] = useState<boolean>(false);
  const [selectedClearYear, setSelectedClearYear] = useState<string>('2026-2027');
  const [clearConfirmationText, setClearConfirmationText] = useState<string>('');
  const [clearingYear, setClearingYear] = useState<boolean>(false);
  const [backingUp, setBackingUp] = useState<boolean>(false);

  // Form states
  const [formData, setFormData] = useState({
    class_id: '',
    date: new Date().toISOString().split('T')[0],
    week_number: 1,
    semester: 1,
    period: 1,
    subject_id: '',
    study_score: 3.0,
    discipline_score: 3.0,
    hygiene_score: 2.0,
    attendance_score: 2.0,
    note: '',
  });

  // Duplicate Warning Dialog state
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    duplicateId: string;
    message: string;
  }>({ show: false, duplicateId: '', message: '' });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recList, clsList, subList] = await Promise.all([
        api.getRecords({
          class_id: filterClass || undefined,
          week_number: filterWeek ? Number(filterWeek) : undefined,
          semester: filterSemester ? Number(filterSemester) : undefined,
          grade: filterGrade ? Number(filterGrade) : undefined,
          date: filterDate || undefined,
        }),
        api.getClasses(),
        api.getSubjects(),
      ]);
      setRecords(recList);
      setClasses(clsList);
      setSubjects(subList);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Không thể tải dữ liệu.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterClass, filterWeek, filterSemester, filterGrade, filterDate]);

  // Real-time computed score preview (Section XIV & XV)
  const computedTotal = Number(
    (
      Number(formData.study_score || 0) +
      Number(formData.discipline_score || 0) +
      Number(formData.hygiene_score || 0) +
      Number(formData.attendance_score || 0)
    ).toFixed(2)
  );

  const getComputedClassification = (score: number) => {
    if (score >= 9.0) return { text: 'Tốt', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 7.0) return { text: 'Khá', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (score >= 5.0) return { text: 'Đạt', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { text: 'Chưa đạt', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const computedClassif = getComputedClassification(computedTotal);

  const handleOpenCreate = () => {
    const defaultClass = isLPHT && user?.class_id ? user.class_id : (classes[0]?.id || '12/1B');
    setFormData({
      class_id: defaultClass,
      date: new Date().toISOString().split('T')[0],
      week_number: filterWeek ? Number(filterWeek) : 1,
      semester: filterSemester ? Number(filterSemester) : 1,
      period: 1,
      subject_id: subjects[0]?.id || 'TOAN',
      study_score: 3.0,
      discipline_score: 3.0,
      hygiene_score: 2.0,
      attendance_score: 2.0,
      note: '',
    });
    setModalMode('create');
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (rec: LessonRecord) => {
    setFormData({
      class_id: rec.class_id,
      date: rec.date,
      week_number: rec.week_number,
      semester: rec.semester,
      period: rec.period,
      subject_id: rec.subject_id,
      study_score: rec.study_score,
      discipline_score: rec.discipline_score,
      hygiene_score: rec.hygiene_score,
      attendance_score: rec.attendance_score,
      note: rec.note || '',
    });
    setEditingId(rec.id);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleOpenView = (rec: LessonRecord) => {
    setFormData({
      class_id: rec.class_id,
      date: rec.date,
      week_number: rec.week_number,
      semester: rec.semester,
      period: rec.period,
      subject_id: rec.subject_id,
      study_score: rec.study_score,
      discipline_score: rec.discipline_score,
      hygiene_score: rec.hygiene_score,
      attendance_score: rec.attendance_score,
      note: rec.note || '',
    });
    setEditingId(rec.id);
    setModalMode('view');
    setShowModal(true);
  };

  const handleDelete = (rec: LessonRecord) => {
    setRecordToDelete(rec);
  };

  const handleConfirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    try {
      setDeletingRecord(true);
      const res = await api.deleteRecord(recordToDelete.id);
      setFeedback({ type: 'success', message: res.message || 'Xóa tiết học thành công!' });
      setRecordToDelete(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Xóa tiết học thất bại.' });
    } finally {
      setDeletingRecord(false);
    }
  };

  const handleConfirmClearYear = async () => {
    try {
      setClearingYear(true);
      const res = await api.clearAllRecordsForYear(selectedClearYear);
      setFeedback({ type: 'success', message: res.message });
      setShowClearYearModal(false);
      setClearConfirmationText('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Xóa dữ liệu năm học thất bại.' });
    } finally {
      setClearingYear(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      setFeedback({ type: 'error', message: 'Không có dữ liệu tiết học để xuất Excel.' });
      return;
    }

    const getGrade = (classId: string): number => {
      const found = classes.find((c) => c.id === classId || c.class_name === classId);
      if (found && found.grade) return found.grade;
      const match = String(classId).match(/\d+/);
      if (match) {
        const g = parseInt(match[0], 10);
        if (g >= 10 && g <= 12) return g;
      }
      return 10;
    };

    const wb = XLSX.utils.book_new();
    const classNamePart = filterClass || (isLPHT && user?.class_id ? user.class_id : 'Toan_Truong');

    // Phân nhóm dữ liệu theo tuần (Mỗi tuần một Sheet)
    const weekMap = new Map<number, typeof filteredRecords>();
    filteredRecords.forEach((r) => {
      const wk = r.week_number || 1;
      if (!weekMap.has(wk)) {
        weekMap.set(wk, []);
      }
      weekMap.get(wk)!.push(r);
    });

    const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => a - b);
    sortedWeeks.forEach((wk) => {
      const weekRecords = weekMap.get(wk)!;
      // Sắp xếp: Lớp -> Ngày -> Tiết
      weekRecords.sort((a, b) => {
        if (a.class_id !== b.class_id) {
          return a.class_id.localeCompare(b.class_id, undefined, { numeric: true });
        }
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.period - b.period;
      });

      // Xuất chính xác 15 cột tương thích 100% với tệp Excel nhập dữ liệu
      const rows = weekRecords.map((r, i) => ({
        'STT': i + 1,
        'Năm học': r.school_year,
        'Khối': getGrade(r.class_id),
        'Lớp': r.class_id,
        'Thứ': getDayOfWeekVN(r.date),
        'Ngày': formatDateVN(r.date),
        'Tuần': r.week_number,
        'Học kỳ': r.semester,
        'Tiết': r.period,
        'Mã môn': r.subject_id,
        'Điểm Học tập (0-3)': r.study_score,
        'Điểm Kỉ luật (0-3)': r.discipline_score,
        'Điểm Vệ sinh (0-2)': r.hygiene_score,
        'Điểm Chuyên cần (0-2)': r.attendance_score,
        'Ghi chú': r.note || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 12 }, // Năm học
        { wch: 8 },  // Khối
        { wch: 10 }, // Lớp
        { wch: 10 }, // Thứ
        { wch: 14 }, // Ngày
        { wch: 8 },  // Tuần
        { wch: 10 }, // Học kỳ
        { wch: 8 },  // Tiết
        { wch: 12 }, // Mã môn
        { wch: 20 }, // Điểm Học tập (0-3)
        { wch: 20 }, // Điểm Kỉ luật (0-3)
        { wch: 20 }, // Điểm Vệ sinh (0-2)
        { wch: 22 }, // Điểm Chuyên cần (0-2)
        { wch: 30 }, // Ghi chú
      ];
      XLSX.utils.book_append_sheet(wb, ws, `Tuần ${wk}`);
    });

    const weekPart = filterWeek ? `Tuan_${filterWeek}` : 'Tat_Ca_Tuan';
    XLSX.writeFile(
      wb,
      `So_Dau_Bai_${classNamePart}_${weekPart}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    setFeedback({
      type: 'success',
      message: `Xuất tệp Sổ đầu bài thành công! Đã phân chia ${sortedWeeks.length} tuần thành ${sortedWeeks.length} Sheet tương ứng (gồm đúng 15 cột theo mẫu nhập liệu, ngày dd/mm/yyyy).`,
    });
  };

  // Sao lưu dữ liệu ra excel cho vai trò Admin và Cán bộ đoàn (16 cột chuẩn)
  const handleBackupExcel = async () => {
    try {
      setBackingUp(true);
      const allRecords = await api.getRecords();
      if (!allRecords || allRecords.length === 0) {
        setFeedback({ type: 'error', message: 'Không có dữ liệu Sổ đầu bài trong hệ thống để sao lưu.' });
        return;
      }

      const getSubjectName = (subId: string): string => {
        const found = subjects.find((s) => s.id === subId || s.subject_code === subId);
        return found ? found.subject_name : subId;
      };

      const formatCreator = (creator?: string | null): string => {
        if (!creator || creator === 'system') return 'Hệ thống';
        if (creator === 'usr-admin') return 'Nguyễn Thanh Tùng';
        if (creator === 'usr-doan') return 'Trần Hoài Nam (Bí thư Đoàn)';
        if (creator === 'usr-lpht-12a1') return 'Lê Ngọc Ánh (LPHT 12/1B)';
        if (creator === 'usr-lpht-11a1') return 'Phạm Minh Đức (LPHT 11/1B)';
        if (creator === 'usr-lpht-10a1') return 'Hoàng Thị Thảo (LPHT 10/1B)';
        return creator;
      };

      const wb = XLSX.utils.book_new();

      // Đúng 16 cột theo yêu cầu:
      // STT, Năm học, Lớp, Ngày, Tuần, Học kỳ, Tiết, Môn học, Học tập (0-3), Kỉ luật (0-3), Vệ sinh (0-2), Chuyên cần (0-2), Tổng điểm (10), Xếp loại, Ghi chú, Người nhập
      const createBackupRow = (r: LessonRecord, index: number) => ({
        'STT': index + 1,
        'Năm học': r.school_year,
        'Lớp': r.class_id,
        'Ngày': formatDateVN(r.date),
        'Tuần': r.week_number,
        'Học kỳ': r.semester,
        'Tiết': r.period,
        'Môn học': getSubjectName(r.subject_id),
        'Học tập (0-3)': r.study_score,
        'Kỉ luật (0-3)': r.discipline_score,
        'Vệ sinh (0-2)': r.hygiene_score,
        'Chuyên cần (0-2)': r.attendance_score,
        'Tổng điểm (10)': r.total_score,
        'Xếp loại': r.classification,
        'Ghi chú': r.note || '',
        'Người nhập': formatCreator(r.created_by),
      });

      const colWidths = [
        { wch: 6 },  // STT
        { wch: 12 }, // Năm học
        { wch: 10 }, // Lớp
        { wch: 14 }, // Ngày
        { wch: 8 },  // Tuần
        { wch: 10 }, // Học kỳ
        { wch: 8 },  // Tiết
        { wch: 22 }, // Môn học
        { wch: 16 }, // Học tập (0-3)
        { wch: 16 }, // Kỉ luật (0-3)
        { wch: 16 }, // Vệ sinh (0-2)
        { wch: 18 }, // Chuyên cần (0-2)
        { wch: 16 }, // Tổng điểm (10)
        { wch: 12 }, // Xếp loại
        { wch: 32 }, // Ghi chú
        { wch: 22 }, // Người nhập
      ];

      // Sheet 1: Sao lưu toàn bộ (Tất cả tuần sắp xếp: Tuần -> Ngày -> Tiết -> Lớp)
      const sortedAll = [...allRecords].sort((a, b) => {
        if (a.week_number !== b.week_number) return a.week_number - b.week_number;
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.period !== b.period) return a.period - b.period;
        return a.class_id.localeCompare(b.class_id, undefined, { numeric: true });
      });

      const wsAll = XLSX.utils.json_to_sheet(sortedAll.map(createBackupRow));
      wsAll['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, wsAll, 'Sao lưu toàn bộ');

      // Tách từng tuần thành các Sheet riêng biệt (Tuần 1, Tuần 2, ...)
      const weekMap = new Map<number, typeof allRecords>();
      allRecords.forEach((r) => {
        const wk = r.week_number || 1;
        if (!weekMap.has(wk)) weekMap.set(wk, []);
        weekMap.get(wk)!.push(r);
      });

      const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => a - b);
      sortedWeeks.forEach((wk) => {
        const weekRecords = weekMap.get(wk)!;
        weekRecords.sort((a, b) => {
          if (a.class_id !== b.class_id) {
            return a.class_id.localeCompare(b.class_id, undefined, { numeric: true });
          }
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.period - b.period;
        });

        const wsWeek = XLSX.utils.json_to_sheet(weekRecords.map(createBackupRow));
        wsWeek['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, wsWeek, `Tuần ${wk}`);
      });

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Sao_Luu_So_Dau_Bai_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setFeedback({
        type: 'success',
        message: `Sao lưu dữ liệu ra Excel thành công! Tệp gồm đúng 16 cột chuẩn với ${allRecords.length} tiết học (gồm Sheet 'Sao lưu toàn bộ' và ${sortedWeeks.length} Sheet theo từng tuần).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Lỗi khi sao lưu dữ liệu ra Excel: ' + (err.message || '') });
    } finally {
      setBackingUp(false);
    }
  };

  const handleSave = async (e: React.FormEvent, forceUpdate = false) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        try {
          await api.createRecord({ ...formData, force_update: forceUpdate });
          setShowModal(false);
          setDuplicateWarning({ show: false, duplicateId: '', message: '' });
          setFeedback({ type: 'success', message: 'Đã thêm tiết học vào Sổ đầu bài!' });
          loadData();
        } catch (err: any) {
          // Check if 409 duplicate warning returned
          if (err.message && err.message.includes('trùng lặp')) {
            setDuplicateWarning({
              show: true,
              duplicateId: '',
              message: err.message,
            });
          } else {
            throw err;
          }
        }
      } else if (modalMode === 'edit' && editingId) {
        await api.updateRecord(editingId, formData);
        setShowModal(false);
        setFeedback({ type: 'success', message: 'Đã cập nhật tiết học thành công!' });
        loadData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi lưu dữ liệu.' });
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const subName = subjects.find((s) => s.id === r.subject_id)?.subject_name || '';
    return (
      r.class_id.toLowerCase().includes(term) ||
      r.subject_id.toLowerCase().includes(term) ||
      subName.toLowerCase().includes(term) ||
      (r.note && r.note.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-blue-600" />
            SỔ ĐẦU BÀI ĐIỆN TỬ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Theo dõi, ghi nhận và tính điểm thi đua 4 tiêu chí cho từng tiết học
          </p>
        </div>

        {/* Action button: Respects Section X & XI */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="btn-export-excel-classbook"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 hover:text-emerald-800 text-xs sm:text-sm font-semibold rounded-xl border border-emerald-200 shadow-xs transition-all cursor-pointer"
            title="Xuất danh sách tiết học ra tệp Excel (.xlsx) với định dạng ngày dd/mm/yyyy"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {(isAdmin || isDoan) && (
            <button
              id="btn-backup-excel-classbook"
              onClick={handleBackupExcel}
              disabled={backingUp}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 hover:text-indigo-800 text-xs sm:text-sm font-semibold rounded-xl border border-indigo-200 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Sao lưu toàn bộ dữ liệu Sổ đầu bài ra Excel (16 cột chuẩn: STT, Năm học, Lớp, Ngày, Tuần, Học kỳ, Tiết, Môn học, Học tập, Kỉ luật, Vệ sinh, Chuyên cần, Tổng điểm, Xếp loại, Ghi chú, Người nhập)"
            >
              <Database className="w-4 h-4 text-indigo-600" />
              <span>{backingUp ? 'Đang sao lưu...' : 'Sao lưu dữ liệu ra excel'}</span>
            </button>
          )}

          {(isAdmin || isDoan) && (
            <button
              id="btn-open-clear-all-modal"
              onClick={() => {
                setClearConfirmationText('');
                setShowClearYearModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 hover:text-rose-800 text-xs sm:text-sm font-semibold rounded-xl border border-rose-200 shadow-xs transition-all cursor-pointer"
              title="Xóa toàn bộ dữ liệu Sổ đầu bài của một năm học"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Xóa tất cả SĐB năm học</span>
            </button>
          )}

          {isGuest ? (
            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Chỉ xem (Đăng nhập để nhập điểm)</span>
            </div>
          ) : (
            <button
              id="btn-add-record"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm tiết học</span>
              {isLPHT && (
                <span className="text-[11px] bg-blue-500/80 px-2 py-0.5 rounded-md">
                  Lớp {user?.class_id}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Class Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Lớp:</label>
          <select
            id="filter-classbook-class"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tất cả lớp ({classes.length})</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name} (Khối {c.grade})
              </option>
            ))}
          </select>
        </div>

        {/* Week Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tuần học:</label>
          <select
            id="filter-classbook-week"
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tất cả 39 tuần</option>
            {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Tuần {w} {w <= 19 ? '(HK1)' : '(HK2)'}
              </option>
            ))}
          </select>
        </div>

        {/* Semester Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Học kỳ:</label>
          <select
            id="filter-classbook-semester"
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Cả năm</option>
            <option value="1">Học kỳ 1 (Tuần 1-19)</option>
            <option value="2">Học kỳ 2 (Tuần 20-39)</option>
          </select>
        </div>

        {/* Grade Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Khối:</label>
          <select
            id="filter-classbook-grade"
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tất cả khối</option>
            <option value="12">Khối 12</option>
            <option value="11">Khối 11</option>
            <option value="10">Khối 10</option>
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Ngày học:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-medium text-slate-800 focus:outline-hidden"
          />
        </div>

        {/* Search */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tìm kiếm:</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Môn, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Sổ đầu bài Table: Section XIII (13 columns + auto calculated) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700">
            DANH SÁCH TIẾT HỌC ({filteredRecords.length} tiết)
          </div>
          {isLPHT && (
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Quyền của bạn: Được cập nhật lớp <strong>{user?.class_id}</strong>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3">STT</th>
                <th className="py-3 px-3">Lớp</th>
                <th className="py-3 px-3">Ngày</th>
                <th className="py-3 px-2 text-center">Tiết</th>
                <th className="py-3 px-3">Môn học</th>
                <th className="py-3 px-2 text-center" title="Thang điểm 0-3">Học tập (3)</th>
                <th className="py-3 px-2 text-center" title="Thang điểm 0-3">Kỉ luật (3)</th>
                <th className="py-3 px-2 text-center" title="Thang điểm 0-2">Vệ sinh (2)</th>
                <th className="py-3 px-2 text-center" title="Thang điểm 0-2">Chuyên cần (2)</th>
                <th className="py-3 px-3 text-center bg-blue-50/50 font-bold text-blue-900">Tổng điểm (10)</th>
                <th className="py-3 px-3 text-center font-bold">Xếp loại</th>
                <th className="py-3 px-3">Ghi chú</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    Đang tải dữ liệu Sổ đầu bài...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    Không tìm thấy tiết học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const subjectName = subjects.find((s) => s.id === rec.subject_id)?.subject_name || rec.subject_id;
                  const canEdit = canEditClassbook(rec.class_id);

                  const badgeClass =
                    rec.classification === 'Tốt'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : rec.classification === 'Khá'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : rec.classification === 'Đạt'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200 font-bold';

                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLPHT && rec.class_id === user?.class_id ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-slate-400 text-center">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {rec.class_id}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                        <span className="font-semibold text-slate-900">{formatDateVN(rec.date)}</span>{' '}
                        <span className="text-[10px] text-slate-400 font-normal">(T{rec.week_number})</span>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-slate-800">
                        {rec.period}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {subjectName}
                      </td>
                      <td className="py-3 px-2 text-center font-medium">{rec.study_score}</td>
                      <td className="py-3 px-2 text-center font-medium">{rec.discipline_score}</td>
                      <td className="py-3 px-2 text-center font-medium">{rec.hygiene_score}</td>
                      <td className="py-3 px-2 text-center font-medium">{rec.attendance_score}</td>
                      <td className="py-3 px-3 text-center font-extrabold text-blue-700 bg-blue-50/30">
                        {rec.total_score}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}>
                          {rec.classification}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={rec.note}>
                        {rec.note || '-'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View detail button: always accessible */}
                          <button
                            id={`btn-view-${rec.id}`}
                            onClick={() => handleOpenView(rec)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit / Delete Buttons: Respecting Section X & XI */}
                          {canEdit ? (
                            <>
                              <button
                                id={`btn-edit-${rec.id}`}
                                onClick={() => handleOpenEdit(rec)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa tiết học"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-delete-${rec.id}`}
                                onClick={() => handleDelete(rec)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa tiết học"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            isLPHT && (
                              <span
                                className="p-1 text-slate-300 cursor-not-allowed"
                                title="Bạn chỉ có quyền cập nhật Sổ đầu bài của lớp được phân công."
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT / VIEW MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-blue-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-5 h-5" />
                <h3 className="font-bold text-base">
                  {modalMode === 'create'
                    ? 'THÊM TIẾT HỌC MỚI VÀO SỔ ĐẦU BÀI'
                    : modalMode === 'edit'
                    ? 'CẬP NHẬT TIẾT HỌC SỔ ĐẦU BÀI'
                    : 'CHI TIẾT TIẾT HỌC'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSave(e, false)} className="p-6 space-y-4">
              {/* Row 1: Class, Date, Week */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lớp <span className="text-rose-500">*</span>
                  </label>
                  {isLPHT ? (
                    // LPHT cannot change class (RLS Section X)
                    <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>{user?.class_id}</span>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ) : (
                    <select
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-semibold"
                      required
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.class_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tuần học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={39}
                    value={formData.week_number}
                    onChange={(e) => setFormData({ ...formData, week_number: Number(e.target.value) })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Period and Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tiết học (1 - 5) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: Number(e.target.value) })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                      <option key={p} value={p}>
                        Tiết {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Môn học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-semibold"
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name} ({s.subject_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4 Emulation Criteria Inputs (Section XV) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>CHẤM ĐIỂM 4 TIÊU CHÍ THI ĐUA</span>
                  <span className="text-[11px] text-slate-500 font-normal">Tối đa 10 điểm</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Học tập (0-3đ)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={3}
                      value={formData.study_score}
                      onChange={(e) => setFormData({ ...formData, study_score: Number(e.target.value) })}
                      disabled={modalMode === 'view'}
                      className="w-full px-2 py-1.5 text-xs text-center font-bold border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Kỉ luật (0-3đ)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={3}
                      value={formData.discipline_score}
                      onChange={(e) => setFormData({ ...formData, discipline_score: Number(e.target.value) })}
                      disabled={modalMode === 'view'}
                      className="w-full px-2 py-1.5 text-xs text-center font-bold border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Vệ sinh (0-2đ)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={2}
                      value={formData.hygiene_score}
                      onChange={(e) => setFormData({ ...formData, hygiene_score: Number(e.target.value) })}
                      disabled={modalMode === 'view'}
                      className="w-full px-2 py-1.5 text-xs text-center font-bold border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Chuyên cần (0-2đ)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={2}
                      value={formData.attendance_score}
                      onChange={(e) => setFormData({ ...formData, attendance_score: Number(e.target.value) })}
                      disabled={modalMode === 'view'}
                      className="w-full px-2 py-1.5 text-xs text-center font-bold border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Auto Calculated Result Box (Section XIV) */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500">Tổng điểm tự động:</span>
                    <span className="ml-2 text-base font-extrabold text-blue-700">
                      {computedTotal} / 10
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500">Xếp loại:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${computedClassif.color}`}>
                      {computedClassif.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú của giáo viên / LPHT
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  disabled={modalMode === 'view'}
                  placeholder="Lớp học tập nghiêm túc, phát biểu sôi nổi..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {modalMode === 'view' ? 'Đóng' : 'Hủy'}
                </button>

                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                  >
                    {modalMode === 'create' ? 'Lưu vào Sổ đầu bài' : 'Cập nhật tiết học'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUPLICATE WARNING DIALOG (Section XIX) */}
      {duplicateWarning.show && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">CẢNH BÁO TIẾT HỌC TRÙNG LẶP</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {duplicateWarning.message}
            </p>
            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicateWarning({ show: false, duplicateId: '', message: '' })}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy thao tác
              </button>
              <button
                type="button"
                onClick={(e) => handleSave(e, true)}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
              >
                Ghi đè / Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE RECORD DELETE CONFIRMATION MODAL */}
      {recordToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="font-bold text-base text-slate-900">XÁC NHẬN XÓA TIẾT HỌC</h3>
              </div>
              <button
                onClick={() => setRecordToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Lớp học:</span>
                <span className="font-bold text-slate-900">{recordToDelete.class_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Ngày học:</span>
                <span className="font-semibold text-slate-900">
                  {formatDateVN(recordToDelete.date)} (Tuần {recordToDelete.week_number})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Tiết & Môn:</span>
                <span className="font-semibold text-slate-900">
                  Tiết {recordToDelete.period} -{' '}
                  {subjects.find((s) => s.id === recordToDelete.subject_id)?.subject_name || recordToDelete.subject_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Tổng điểm & Xếp loại:</span>
                <span className="font-bold text-blue-700">
                  {recordToDelete.total_score}/10đ ({recordToDelete.classification})
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-600 font-medium leading-relaxed">
              Bạn có chắc chắn muốn xóa tiết học này khỏi Sổ đầu bài? Dữ liệu thi đua của lớp sẽ được tự động tính toán lại ngay sau khi xóa.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={deletingRecord}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-delete-record"
                type="button"
                onClick={handleConfirmDeleteRecord}
                disabled={deletingRecord}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingRecord ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL RECORDS FOR SCHOOL YEAR MODAL (Admin & Cán bộ Đoàn) */}
      {showClearYearModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">XÓA TOÀN BỘ SỔ ĐẦU BÀI NĂM HỌC</h3>
                  <p className="text-[11px] text-slate-500">Dành riêng cho Quản trị viên và Cán bộ Đoàn trường</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowClearYearModal(false);
                  setClearConfirmationText('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chọn năm học cần xóa toàn bộ dữ liệu:
                </label>
                <select
                  id="select-clear-school-year"
                  value={selectedClearYear}
                  onChange={(e) => setSelectedClearYear(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500 font-bold text-slate-800 bg-slate-50"
                >
                  <option value="2026-2027">Năm học 2026-2027 (Hiện tại)</option>
                  <option value="2027-2028">Năm học 2027-2028</option>
                  <option value="ALL">Toàn bộ các năm học (Xóa sạch hệ thống)</option>
                </select>
              </div>

              <div className="bg-rose-50 border border-rose-200/80 p-3.5 rounded-xl space-y-2 text-rose-900">
                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>CẢNH BÁO NGUY HIỂM</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Hành động này sẽ <strong>xóa vĩnh viễn toàn bộ các tiết học</strong> trong Sổ đầu bài của năm học{' '}
                  <strong className="underline text-rose-700">{selectedClearYear}</strong>. Bảng xếp hạng và thống kê thi đua của năm học này sẽ được đặt lại từ đầu.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Để xác nhận, vui lòng nhập chữ <strong className="text-rose-600 font-mono">XÓA HẾT</strong> vào ô dưới:
                </label>
                <input
                  id="input-clear-confirmation"
                  type="text"
                  value={clearConfirmationText}
                  onChange={(e) => setClearConfirmationText(e.target.value)}
                  placeholder="Nhập XÓA HẾT để kích hoạt nút xóa"
                  className="w-full px-3 py-2 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 font-mono font-bold text-rose-700 uppercase"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearYearModal(false);
                  setClearConfirmationText('');
                }}
                disabled={clearingYear}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-clear-year"
                type="button"
                onClick={handleConfirmClearYear}
                disabled={
                  clearingYear ||
                  (clearConfirmationText.trim().toUpperCase() !== 'XÓA HẾT' &&
                    clearConfirmationText.trim().toUpperCase() !== 'XOA HET')
                }
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearingYear ? 'Đang xóa toàn bộ...' : 'Xác nhận xóa toàn bộ dữ liệu'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
