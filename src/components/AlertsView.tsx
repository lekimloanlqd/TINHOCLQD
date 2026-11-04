import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { AlertItem } from '../types.ts';
import { AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, Clock, Filter, AlertOctagon } from 'lucide-react';

export const AlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts();
      setAlerts(res);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filtered = alerts.filter((a) => {
    if (filterSeverity && a.severity !== filterSeverity) return false;
    return true;
  });

  const getSeverityBadge = (sev: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (sev === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertOctagon className="w-3 h-3 text-rose-600" />
          Nghiêm trọng (Cao)
        </span>
      );
    }
    if (sev === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Cần lưu ý (Vừa)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
        <ShieldAlert className="w-3 h-3 text-blue-600" />
        Theo dõi thêm
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            CẢNH BÁO THI ĐUA THÔNG MINH
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Tự động phát hiện bất thường: giảm điểm 3 tuần liên tiếp, điểm kỉ luật thấp, nhiều tiết Chưa đạt
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
          title="Quét lại cảnh báo"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Severity */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 text-xs">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="font-semibold text-slate-600">Lọc theo mức độ:</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterSeverity('')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterSeverity === '' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({alerts.length})
          </button>
          <button
            onClick={() => setFilterSeverity('HIGH')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterSeverity === 'HIGH' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Nghiêm trọng ({alerts.filter((a) => a.severity === 'HIGH').length})
          </button>
          <button
            onClick={() => setFilterSeverity('MEDIUM')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              filterSeverity === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cần lưu ý ({alerts.filter((a) => a.severity === 'MEDIUM').length})
          </button>
        </div>
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
            Đang phân tích bất thường dữ liệu thi đua...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <h3 className="font-bold text-slate-800 text-sm">Không có cảnh báo nghiêm trọng nào</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Tất cả các lớp đều duy trì nề nếp ổn định và không phát sinh suy giảm điểm liên tục.
            </p>
          </div>
        ) : (
          filtered.map((alt) => (
            <div
              key={alt.id}
              className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all ${
                alt.severity === 'HIGH'
                  ? 'bg-rose-50/40 border-rose-200/90'
                  : 'bg-amber-50/40 border-amber-200/90'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                    LỚP {alt.class_name}
                  </span>
                  {getSeverityBadge(alt.severity)}
                </div>

                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {alt.time}
                </span>
              </div>

              <h4 className="font-bold text-slate-800 text-xs sm:text-sm mb-1">
                {alt.issue}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {alt.detail}
              </p>

              <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 italic">
                  Khuyến nghị: Đoàn trường liên hệ GVCN và LPHT lớp {alt.class_name} để chấn chỉnh kịp thời.
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
