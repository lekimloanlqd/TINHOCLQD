import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { DashboardData } from '../types.ts';
import {
  Sparkles,
  Trophy,
  GraduationCap,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
  Medal,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

export const DashboardView: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState<string>('');
  const [week, setWeek] = useState<string>('1');
  const [semester, setSemester] = useState<string>('1');

  // AI Insight state
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats({
        grade: grade ? Number(grade) : undefined,
        week_number: week ? Number(week) : undefined,
        semester: semester ? Number(semester) : undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [grade, week, semester]);

  const handleFetchInsight = async () => {
    try {
      setLoadingInsight(true);
      const res = await api.getAIInsight({
        week_number: week ? Number(week) : undefined,
        grade: grade ? Number(grade) : undefined,
      });
      setAiInsight(res.text);
    } catch (err: any) {
      setAiInsight('Tính năng AI hiện chưa khả dụng. Các chức năng quản lý và thống kê dữ liệu vẫn hoạt động bình thường.');
    } finally {
      setLoadingInsight(false);
    }
  };

  const COLORS = {
    tot: '#10B981', // Emerald
    kha: '#3B82F6', // Blue
    dat: '#F59E0B', // Amber
    chuadat: '#EF4444', // Red
  };

  const pieData = data
    ? [
        { name: 'Tốt (>=9đ)', value: data.summary.goodCount, color: COLORS.tot },
        { name: 'Khá (7-8.9đ)', value: data.summary.fairCount, color: COLORS.kha },
        { name: 'Đạt (5-6.9đ)', value: data.summary.passCount, color: COLORS.dat },
        { name: 'Chưa đạt (<5đ)', value: data.summary.failCount, color: COLORS.chuadat },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            DASHBOARD THI ĐUA LỚP HỌC
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Dữ liệu tổng hợp và phân tích tự động từ Sổ đầu bài điện tử
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-600">Khối:</span>
            <select
              id="filter-grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="">Tất cả khối</option>
              <option value="12">Khối 12</option>
              <option value="11">Khối 11</option>
              <option value="10">Khối 10</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-600">Tuần:</span>
            <select
              id="filter-week"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="">Tất cả 39 tuần</option>
              {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Tuần {w} {w <= 19 ? '(HK1)' : '(HK2)'}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Classes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng số lớp</span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {data?.summary.totalClasses || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lớp đang hoạt động</p>
        </div>

        {/* Total Periods */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng tiết học</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {data?.summary.totalRecords || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Đã nhập Sổ đầu bài</p>
        </div>

        {/* Average Score */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Điểm trung bình</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {data?.summary.avgScore || 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 10 điểm</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ((data?.summary.avgScore || 0) / 10) * 100)}%` }}
            />
          </div>
        </div>

        {/* Good Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tỷ lệ Tốt</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
            {data?.summary.goodRate || 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {data?.summary.goodCount || 0} tiết xếp loại Tốt
          </p>
        </div>

        {/* Fail Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Chưa đạt</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600">
            {data?.summary.failRate || 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {data?.summary.failCount || 0} tiết cần khắc phục
          </p>
        </div>
      </div>

      {/* Top 3 Podium & Smart Insight section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 Podium */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                TOP 3 DẪN ĐẦU {week ? `TUẦN ${week}` : 'HỌC KỲ'}
              </h3>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Vinh danh
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2">
            {/* Rank 2 - Silver */}
            {data?.top3[1] ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-sm mb-1 border-2 border-white">
                  🥈 2
                </div>
                <div className="text-xs font-bold text-slate-800 text-center truncate max-w-full">
                  {data.top3[1].class_name}
                </div>
                <div className="text-[11px] text-blue-600 font-semibold">{data.top3[1].avgScore}đ</div>
                <div className="w-full bg-slate-200 h-20 rounded-t-xl mt-2 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                  Hạng 2
                </div>
              </div>
            ) : (
              <div className="h-20" />
            )}

            {/* Rank 1 - Gold */}
            {data?.top3[0] ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-sm shadow-md mb-1 border-2 border-amber-200 animate-bounce duration-1000">
                  👑 1
                </div>
                <div className="text-sm font-extrabold text-slate-900 text-center truncate max-w-full">
                  {data.top3[0].class_name}
                </div>
                <div className="text-xs text-amber-600 font-bold">{data.top3[0].avgScore}đ</div>
                <div className="w-full bg-amber-400 h-28 rounded-t-xl mt-2 flex items-center justify-center text-xs text-amber-950 font-extrabold shadow-sm">
                  Dẫn đầu
                </div>
              </div>
            ) : (
              <div className="h-28" />
            )}

            {/* Rank 3 - Bronze */}
            {data?.top3[2] ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-700/80 text-white flex items-center justify-center font-bold text-xs shadow-sm mb-1 border-2 border-white">
                  🥉 3
                </div>
                <div className="text-xs font-bold text-slate-800 text-center truncate max-w-full">
                  {data.top3[2].class_name}
                </div>
                <div className="text-[11px] text-blue-600 font-semibold">{data.top3[2].avgScore}đ</div>
                <div className="w-full bg-amber-700/30 h-16 rounded-t-xl mt-2 flex items-center justify-center text-[10px] text-amber-900 font-bold">
                  Hạng 3
                </div>
              </div>
            ) : (
              <div className="h-16" />
            )}
          </div>

          <div className="text-[11px] text-slate-500 text-center mt-3 pt-2 border-t border-slate-100">
            Xếp hạng dựa trên: Điểm trung bình → Tỷ lệ Tốt → Điểm Kỉ luật
          </div>
        </div>

        {/* Smart Insight AI Panel */}
        <div className="lg:col-span-2 bg-linear-to-br from-indigo-50/80 via-white to-blue-50/80 p-5 rounded-2xl border border-indigo-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    🤖 SMART INSIGHT (AI PHÂN TÍCH THI ĐUA)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Gemini AI đánh giá số liệu thực tế, chỉ ra xu hướng và đề xuất giải pháp
                  </p>
                </div>
              </div>

              <button
                id="btn-generate-insight"
                onClick={handleFetchInsight}
                disabled={loadingInsight}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {loadingInsight ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{aiInsight ? 'Cập nhật phân tích' : 'Chạy phân tích AI'}</span>
              </button>
            </div>

            <div className="bg-white/90 backdrop-blur-xs border border-indigo-100/70 p-4 rounded-xl min-h-[160px] text-xs sm:text-sm text-slate-700 leading-relaxed overflow-y-auto max-h-[220px]">
              {loadingInsight ? (
                <div className="flex flex-col items-center justify-center py-8 text-indigo-600 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-medium">Gemini đang phân tích dữ liệu thi đua...</span>
                </div>
              ) : aiInsight ? (
                <div className="whitespace-pre-line prose-sm">{aiInsight}</div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2 text-center">
                  <Sparkles className="w-8 h-8 text-indigo-300" />
                  <p className="text-xs max-w-md">
                    Nhấn nút <strong className="text-indigo-600">"Chạy phân tích AI"</strong> để hệ thống sử dụng Gemini phân tích dữ liệu thi đua tuần {week || 'này'} của các lớp.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Dữ liệu tính toán trước bằng code trước khi gửi AI</span>
            <span className="font-semibold text-indigo-600">Powered by Gemini AI</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Line Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
            XU HƯỚNG ĐIỂM TRUNG BÌNH CÁC TUẦN
          </h3>
          <p className="text-xs text-slate-500 mb-4">Diễn biến điểm số thi đua theo 39 tuần học</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.weeklyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tickFormatter={(v) => `T${v}`} stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => [`${val} điểm`, 'Điểm TB']}
                  labelFormatter={(l) => `Tuần ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Điểm trung bình"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2563eb' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Comparison between classes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
            SO SÁNH ĐIỂM THI ĐUA CÁC LỚP
          </h3>
          <p className="text-xs text-slate-500 mb-4">Điểm trung bình lớp theo bộ lọc hiện tại</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.rankings || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="class_name" stroke="#94a3b8" fontSize={10} interval={0} angle={-30} textAnchor="end" />
                <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(val: any) => [`${val} điểm`, 'Điểm TB']} />
                <Bar dataKey="avgScore" name="Điểm TB" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Classification Share */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
            TỶ LỆ XẾP LOẠI TIẾT HỌC
          </h3>
          <p className="text-xs text-slate-500 mb-4">Phân bố tỷ lệ Tốt, Khá, Đạt, Chưa đạt</p>
          <div className="h-64 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: any) => `${(name || '').split(' ')[0]}: ${((percent || 0) * 100).toFixed(0)}%`}
                    fontSize={11}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any, name: any) => [`${val} tiết`, name]} />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Chưa có dữ liệu tiết học</div>
            )}
          </div>
        </div>

        {/* Radar Chart: 4 Emulation Criteria */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-1">
            ĐÁNH GIÁ 4 TIÊU CHÍ THI ĐUA
          </h3>
          <p className="text-xs text-slate-500 mb-4">Học tập (3đ), Kỉ luật (3đ), Vệ sinh (2đ), Chuyên cần (2đ)</p>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius={80} data={data?.radarData || []}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" fontSize={11} stroke="#64748b" />
                <PolarRadiusAxis angle={30} domain={[0, 3]} stroke="#cbd5e1" fontSize={10} />
                <Radar name="Điểm đạt được" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                <Tooltip formatter={(val: any) => [`${val} điểm`, 'Điểm TB']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
