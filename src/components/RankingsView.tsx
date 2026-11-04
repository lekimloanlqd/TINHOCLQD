import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { DashboardData, ClassRankingItem } from '../types.ts';
import { Trophy, Medal, Award, Filter, RefreshCw, Printer, FileSpreadsheet, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';

export const RankingsView: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState<string>('1');
  const [semester, setSemester] = useState<string>('1');
  const [grade, setGrade] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats({
        week_number: week ? Number(week) : undefined,
        semester: semester ? Number(semester) : undefined,
        grade: grade ? Number(grade) : undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [week, semester, grade]);

  const exportExcel = () => {
    if (!data || data.rankings.length === 0) return;
    const rows = data.rankings.map((r) => ({
      'Xếp hạng': r.rank,
      'Lớp': r.class_name,
      'Khối': r.grade,
      'GVCN': r.homeroom_teacher,
      'Tổng số tiết': r.totalRecords,
      'Điểm TB (thang 10)': r.avgScore,
      'Học tập TB': r.studyAvg,
      'Kỉ luật TB': r.discAvg,
      'Vệ sinh TB': r.hygAvg,
      'Chuyên cần TB': r.attAvg,
      'Tỷ lệ Tốt (%)': `${r.goodRate}%`,
      'Tỷ lệ Chưa đạt (%)': `${r.failRate}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bang_Xep_Hang');
    XLSX.writeFile(wb, `Bang_Xep_Hang_Thi_Dua_${week ? `Tuan_${week}` : 'Hoc_Ky'}.xlsx`);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
          👑 Hạng 1 (Vàng)
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-800 border border-slate-300">
          🥈 Hạng 2 (Bạc)
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-700/20 text-amber-900 border border-amber-600/30">
          🥉 Hạng 3 (Đồng)
        </span>
      );
    }
    return <span className="font-bold text-slate-500">#{rank}</span>;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            BẢNG XẾP HẠNG THI ĐUA CÁC LỚP
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Áp dụng chuẩn quy tắc thi đua 5 bước của Đoàn trường THPT Phan Bội Châu
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all border border-slate-200 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In bảng điểm</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <span className="font-semibold text-slate-600">Khối:</span>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="">Tất cả khối</option>
            <option value="12">Khối 12</option>
            <option value="11">Khối 11</option>
            <option value="10">Khối 10</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <span className="font-semibold text-slate-600">Tuần:</span>
          <select
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="">Cả học kỳ</option>
            {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Tuần {w}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <span className="font-semibold text-slate-600">Học kỳ:</span>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="1">Học kỳ 1</option>
            <option value="2">Học kỳ 2</option>
          </select>
        </div>

        <button
          onClick={loadData}
          className="p-2 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors ml-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Rules Notice (Section XVI) */}
      <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
        <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Quy tắc phân định thứ hạng tự động (Đoàn trường): </span>
          <span className="text-amber-800">
            1. Điểm TB giảm dần → 2. % Tiết Tốt cao hơn → 3. Điểm Kỉ luật TB cao hơn → 4. Điểm Học tập TB cao hơn → 5. % Tiết Chưa đạt thấp hơn.
          </span>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 text-center">Hạng</th>
                <th className="py-3 px-4">Lớp</th>
                <th className="py-3 px-3">Khối</th>
                <th className="py-3 px-3">GV Chủ nhiệm</th>
                <th className="py-3 px-3 text-center">Số tiết</th>
                <th className="py-3 px-4 text-center bg-blue-50/50 font-bold text-blue-900">Điểm TB (10đ)</th>
                <th className="py-3 px-3 text-center" title="Thang điểm 3">Học tập TB</th>
                <th className="py-3 px-3 text-center" title="Thang điểm 3">Kỉ luật TB</th>
                <th className="py-3 px-3 text-center" title="Thang điểm 2">Vệ sinh TB</th>
                <th className="py-3 px-3 text-center" title="Thang điểm 2">Chuyên cần TB</th>
                <th className="py-3 px-3 text-center text-emerald-700 font-bold">% Tốt</th>
                <th className="py-3 px-3 text-center text-rose-700 font-bold">% Chưa đạt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Đang tính toán thứ hạng thi đua...
                  </td>
                </tr>
              ) : !data || data.rankings.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Không có dữ liệu cho thời gian được chọn.
                  </td>
                </tr>
              ) : (
                data.rankings.map((r) => (
                  <tr
                    key={r.class_id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      r.rank === 1 ? 'bg-amber-50/30 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getRankBadge(r.rank)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {r.class_name}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">Khối {r.grade}</td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      {r.homeroom_teacher || '-'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                      {r.totalRecords}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-blue-700 text-sm bg-blue-50/20">
                      {r.avgScore}
                    </td>
                    <td className="py-3.5 px-3 text-center font-semibold">{r.studyAvg}</td>
                    <td className="py-3.5 px-3 text-center font-semibold">{r.discAvg}</td>
                    <td className="py-3.5 px-3 text-center font-semibold">{r.hygAvg}</td>
                    <td className="py-3.5 px-3 text-center font-semibold">{r.attAvg}</td>
                    <td className="py-3.5 px-3 text-center text-emerald-600 font-bold">
                      {r.goodRate}%
                    </td>
                    <td className="py-3.5 px-3 text-center text-rose-600 font-bold">
                      {r.failRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
