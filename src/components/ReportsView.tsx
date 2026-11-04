import React, { useState } from 'react';
import { api } from '../services/api.ts';
import { FileText, Sparkles, Printer, Copy, Check, Download, RefreshCw, Calendar } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [scope, setScope] = useState<'week' | 'month' | 'semester' | 'school'>('week');
  const [weekNumber, setWeekNumber] = useState<number>(5);
  const [semester, setSemester] = useState<number>(1);
  const [grade, setGrade] = useState<string>('');

  const [reportContent, setReportContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const res = await api.generateAIReport({
        scope,
        weekNumber: scope === 'week' ? weekNumber : undefined,
        semester,
        grade: grade ? Number(grade) : undefined,
      });
      setReportContent(res.text);
    } catch (err: any) {
      setReportContent('Tính năng AI hiện chưa khả dụng. Các chức năng quản lý và thống kê dữ liệu vẫn hoạt động bình thường.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!reportContent) return;
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            BÁO CÁO THI ĐUA ĐOÀN TRƯỜNG
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Tạo văn bản báo cáo tổng kết thi đua tự động với Gemini AI cho tuần, tháng hoặc học kỳ
          </p>
        </div>

        {reportContent && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all border border-slate-200 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In báo cáo</span>
            </button>
          </div>
        )}
      </div>

      {/* Report Generator Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="text-xs font-bold text-slate-700">CẤU HÌNH PHẠM VI BÁO CÁO:</div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Phạm vi tổng hợp:
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
            >
              <option value="week">Báo cáo theo Tuần</option>
              <option value="semester">Báo cáo theo Học kỳ</option>
              <option value="school">Báo cáo Toàn trường</option>
            </select>
          </div>

          {scope === 'week' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Chọn tuần:
              </label>
              <select
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
              >
                {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Học kỳ:</label>
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
            >
              <option value={1}>Học kỳ 1</option>
              <option value={2}>Học kỳ 2</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Khối lớp:</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
            >
              <option value="">Tất cả các khối</option>
              <option value="12">Khối 12</option>
              <option value="11">Khối 11</option>
              <option value="10">Khối 10</option>
            </select>
          </div>
        </div>

        <button
          id="btn-create-ai-report"
          onClick={handleGenerateReport}
          disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{loading ? 'Gemini đang tổng hợp dữ liệu...' : 'Soạn thảo báo cáo với AI'}</span>
        </button>
      </div>

      {/* Rendered Formal Report Document */}
      {reportContent && (
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-md printable-report">
          {/* Formal School Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
            <div className="text-center font-bold text-xs uppercase text-slate-800 space-y-0.5">
              <div>THÀNH ĐOÀN TP ĐÀ NẴNG</div>
              <div className="underline">ĐOÀN TRƯỜNG THPT PHAN BỘI CHÂU</div>
              <div className="text-[10px] font-normal lowercase italic text-slate-500">
                số: .....-BC/ĐTN
              </div>
            </div>

            <div className="text-center font-bold text-xs uppercase text-slate-800 space-y-0.5">
              <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="underline">Độc lập - Tự do - Hạnh phúc</div>
              <div className="text-[10px] font-normal italic text-slate-500">
                Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </div>
            </div>
          </div>

          {/* Report Body */}
          <div className="prose max-w-none text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-serif">
            {reportContent}
          </div>

          {/* Signature Block */}
          <div className="mt-12 pt-6 flex justify-between text-xs font-serif">
            <div className="text-left">
              <p className="font-bold">Nơi nhận:</p>
              <p className="text-[11px] text-slate-600">- Ban Giám hiệu (b/c);</p>
              <p className="text-[11px] text-slate-600">- GVCN các lớp;</p>
              <p className="text-[11px] text-slate-600">- Lưu VP Đoàn.</p>
            </div>

            <div className="text-center">
              <p className="font-bold uppercase">TM. BAN CHẤP HÀNH ĐOÀN TRƯỜNG</p>
              <p className="italic text-slate-500 mb-16">BÍ THƯ</p>
              <p className="font-bold uppercase">(Ký, đóng dấu)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
