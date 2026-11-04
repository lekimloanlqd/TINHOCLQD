import React, { useState } from 'react';
import { api } from '../services/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { FileSpreadsheet, Upload, Download, AlertCircle, CheckCircle2, RefreshCw, X, FileCheck, Database } from 'lucide-react';
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

// Helper to parse date from Excel (dd/mm/yyyy, yyyy-mm-dd or serial) to YYYY-MM-DD
export const parseDateToISO = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'number') {
    // Excel serial number
    const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const str = String(dateVal).trim();
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
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
        const day = dt.getDay(); // 0: CN, 1: Hai, ...
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

export const ImportExportView: React.FC = () => {
  const { user, isAdmin, isDoan, isLPHT } = useAuth();

  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update' | 'cancel'>('update');
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; stats?: any } | null>(null);

  // Template Excel generator (Section XVIII)
  const downloadTemplate = () => {
    const defaultClass = isLPHT && user?.class_id ? user.class_id : '12/1B';
    const sampleData = [
      {
        'STT': 1,
        'Năm học': '2026-2027',
        'Khối': 12,
        'Lớp': defaultClass,
        'Thứ': 'Hai',
        'Ngày': '07/09/2026',
        'Tuần': 1,
        'Học kỳ': 1,
        'Tiết': 1,
        'Mã môn': 'TOAN',
        'Điểm Học tập (0-3)': 3.0,
        'Điểm Kỉ luật (0-3)': 3.0,
        'Điểm Vệ sinh (0-2)': 2.0,
        'Điểm Chuyên cần (0-2)': 2.0,
        'Ghi chú': 'Lớp học tập chăm chỉ',
      },
      {
        'STT': 2,
        'Năm học': '2026-2027',
        'Khối': 12,
        'Lớp': defaultClass,
        'Thứ': 'Hai',
        'Ngày': '07/09/2026',
        'Tuần': 1,
        'Học kỳ': 1,
        'Tiết': 2,
        'Mã môn': 'VAN',
        'Điểm Học tập (0-3)': 2.8,
        'Điểm Kỉ luật (0-3)': 3.0,
        'Điểm Vệ sinh (0-2)': 2.0,
        'Điểm Chuyên cần (0-2)': 2.0,
        'Ghi chú': 'Phát biểu sôi nổi',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_So_Dau_Bai');
    XLSX.writeFile(wb, 'Mau_Nhap_So_Dau_Bai_THPT_PhanBoiChau.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Read rows from ALL sheets (supporting multi-sheet week files)
        let rawData: any[] = [];
        wb.SheetNames.forEach((name) => {
          const ws = wb.Sheets[name];
          const sheetData: any[] = XLSX.utils.sheet_to_json(ws);
          if (Array.isArray(sheetData) && sheetData.length > 0) {
            rawData = rawData.concat(sheetData);
          }
        });

        // Normalize rows to match backend batch import
        const mapped = rawData.map((row) => ({
          school_year: row['Năm học'] || '2026-2027',
          class_id: String(row['Lớp'] || '').trim(),
          date: parseDateToISO(row['Ngày']),
          week_number: Number(row['Tuần'] || 1),
          semester: Number(row['Học kỳ'] || 1),
          period: Number(row['Tiết'] || 1),
          subject_id: String(row['Mã môn'] || '').trim().toUpperCase(),
          study_score: Number(row['Điểm Học tập (0-3)'] ?? row['Học tập'] ?? 0),
          discipline_score: Number(row['Điểm Kỉ luật (0-3)'] ?? row['Kỉ luật'] ?? 0),
          hygiene_score: Number(row['Điểm Vệ sinh (0-2)'] ?? row['Vệ sinh'] ?? 0),
          attendance_score: Number(row['Điểm Chuyên cần (0-2)'] ?? row['Chuyên cần'] ?? 0),
          note: String(row['Ghi chú'] || ''),
        }));

        setPreviewRows(mapped);
      } catch (err: any) {
        setFeedback({ type: 'error', message: 'Không thể đọc tệp Excel: ' + err.message });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteImport = async () => {
    if (previewRows.length === 0) return;
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.batchImportRecords(previewRows, duplicateAction);
      setFeedback({
        type: 'success',
        message: res.message,
        stats: res.stats,
      });
      setPreviewRows([]);
      setFileName('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi nhập dữ liệu Excel.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const records = await api.getRecords(
        isLPHT && user?.class_id ? { class_id: user.class_id } : undefined
      );

      if (!records || records.length === 0) {
        setFeedback({ type: 'error', message: 'Không có dữ liệu Sổ đầu bài để xuất Excel.' });
        return;
      }

      const wb = XLSX.utils.book_new();

      // Phân nhóm dữ liệu theo tuần (Mỗi tuần một Sheet)
      const weekMap = new Map<number, typeof records>();
      records.forEach((r) => {
        const wk = r.week_number || 1;
        if (!weekMap.has(wk)) {
          weekMap.set(wk, []);
        }
        weekMap.get(wk)!.push(r);
      });

      // Sắp xếp các tuần tăng dần (Tuần 1, Tuần 2, ...)
      const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => a - b);

      sortedWeeks.forEach((wk) => {
        const weekRecords = weekMap.get(wk)!;
        // Sắp xếp các dòng trong tuần: Lớp -> Ngày -> Tiết
        weekRecords.sort((a, b) => {
          if (a.class_id !== b.class_id) {
            return a.class_id.localeCompare(b.class_id, undefined, { numeric: true });
          }
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          return a.period - b.period;
        });

        const rows = weekRecords.map((r, i) => {
          const match = String(r.class_id).match(/\d+/);
          const grade = match ? parseInt(match[0], 10) : 10;
          return {
            'STT': i + 1,
            'Năm học': r.school_year,
            'Khối': grade,
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
          };
        });

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

      const fileName = `So_Dau_Bai_Toan_Truong_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setFeedback({
        type: 'success',
        message: `Xuất tệp Excel thành công! Đã phân chia ${sortedWeeks.length} tuần thành ${sortedWeeks.length} Sheet tương ứng (gồm đúng 15 cột theo mẫu nhập liệu, ngày dd/mm/yyyy).`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Xuất dữ liệu thất bại: ' + err.message });
    }
  };

  // Sao lưu dữ liệu ra excel cho vai trò Admin và Cán bộ đoàn (16 cột chuẩn)
  const handleBackupExcel = async () => {
    try {
      setBackingUp(true);
      const [allRecords, subjects] = await Promise.all([
        api.getRecords(),
        api.getSubjects(),
      ]);

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
      const createBackupRow = (r: any, index: number) => ({
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

      // Sheet 1: Sao lưu toàn bộ (Sắp xếp: Tuần -> Ngày -> Tiết -> Lớp)
      const sortedAll = [...allRecords].sort((a, b) => {
        if (a.week_number !== b.week_number) return a.week_number - b.week_number;
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.period !== b.period) return a.period - b.period;
        return a.class_id.localeCompare(b.class_id, undefined, { numeric: true });
      });

      const wsAll = XLSX.utils.json_to_sheet(sortedAll.map(createBackupRow));
      wsAll['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, wsAll, 'Sao lưu toàn bộ');

      // Tách từng tuần thành từng Sheet riêng biệt (Tuần 1, Tuần 2, ...)
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            IMPORT / EXPORT EXCEL SỔ ĐẦU BÀI
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Hỗ trợ nhập dữ liệu hàng loạt từ Excel và xuất báo cáo dữ liệu định dạng .xlsx
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(isAdmin || isDoan) && (
            <button
              id="btn-backup-excel-importexport"
              onClick={handleBackupExcel}
              disabled={backingUp}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Sao lưu toàn bộ dữ liệu ra Excel (16 cột chuẩn cho Admin & Cán bộ Đoàn)"
            >
              <Database className="w-4 h-4" />
              <span>{backingUp ? 'Đang sao lưu...' : 'Sao lưu dữ liệu ra excel'}</span>
            </button>
          )}

          <button
            onClick={handleExportAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất toàn bộ Sổ đầu bài ra Excel</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between text-xs sm:text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{feedback.message}</p>
              {feedback.stats && (
                <p className="text-xs text-emerald-700 mt-1">
                  Thêm mới: {feedback.stats.insertedCount} • Cập nhật: {feedback.stats.updatedCount} • Bỏ qua: {feedback.stats.skippedCount}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Step 1: Download template */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-2">
              <Download className="w-4 h-4" />
              <span>BƯỚC 1: TẢI TỆP EXCEL MẪU CHUẨN</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Tải tệp mẫu đã được định dạng đầy đủ 13 cột và các tiêu chí thang điểm chuẩn (Học tập 0-3, Kỉ luật 0-3, Vệ sinh 0-2, Chuyên cần 0-2).
            </p>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Tải tệp mẫu Excel (.xlsx)</span>
          </button>
        </div>

        {/* Step 2: Upload Excel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-2">
              <Upload className="w-4 h-4" />
              <span>BƯỚC 2: TẢI LÊN TỆP EXCEL ĐÃ ĐIỀN</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Chọn tệp Excel đã nhập dữ liệu tiết học. Hệ thống sẽ kiểm tra tính hợp lệ và hiển thị bản xem trước.
            </p>
          </div>

          <label className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{fileName ? `Đã chọn: ${fileName}` : 'Chọn tệp Excel từ máy'}</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Preview Section */}
      {previewRows.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                XEM TRƯỚC DỮ LIỆU SẮP NHẬP ({previewRows.length} bản ghi)
              </h3>
            </div>

            {/* Duplicate Action Strategy (Section XIX) */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Khi phát hiện trùng lặp:</span>
              <select
                value={duplicateAction}
                onChange={(e) => setDuplicateAction(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium"
              >
                <option value="update">Cập nhật bản ghi cũ</option>
                <option value="skip">Bỏ qua bản ghi trùng</option>
                <option value="cancel">Hủy toàn bộ thao tác</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Lớp</th>
                  <th className="py-2 px-3">Ngày</th>
                  <th className="py-2 px-2 text-center">Tiết</th>
                  <th className="py-2 px-3">Môn</th>
                  <th className="py-2 px-2 text-center">Học tập</th>
                  <th className="py-2 px-2 text-center">Kỉ luật</th>
                  <th className="py-2 px-2 text-center">Vệ sinh</th>
                  <th className="py-2 px-2 text-center">Chuyên cần</th>
                  <th className="py-2 px-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-bold">{r.class_id}</td>
                    <td className="py-2 px-3 font-medium text-slate-700">{formatDateVN(r.date)}</td>
                    <td className="py-2 px-2 text-center font-bold">{r.period}</td>
                    <td className="py-2 px-3 font-medium">{r.subject_id}</td>
                    <td className="py-2 px-2 text-center">{r.study_score}</td>
                    <td className="py-2 px-2 text-center">{r.discipline_score}</td>
                    <td className="py-2 px-2 text-center">{r.hygiene_score}</td>
                    <td className="py-2 px-2 text-center">{r.attendance_score}</td>
                    <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{r.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setPreviewRows([]);
                setFileName('');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Hủy
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Đang nhập dữ liệu...' : 'Xác nhận nhập vào Sổ đầu bài'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
