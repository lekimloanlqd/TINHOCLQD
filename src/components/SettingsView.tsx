import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext.tsx';
import { SystemSettings } from '../types.ts';
import { Settings, Save, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings: globalSettings, updateSettings } = useSettings();
  const [settings, setSettings] = useState<SystemSettings | null>(globalSettings);
  const [loading, setLoading] = useState(!globalSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (globalSettings) {
      setSettings(globalSettings);
      setLoading(false);
    }
  }, [globalSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      setFeedback(null);
      const updated = await updateSettings(settings);
      setSettings(updated);
      setFeedback({ type: 'success', message: 'Cập nhật cấu hình hệ thống thành công!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Lỗi khi lưu cấu hình.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
        Đang tải cấu hình hệ thống...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            CÀI ĐẶT HỆ THỐNG (ADMIN ONLY)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Cấu hình thời gian năm học, thang điểm tiêu chí và quy định thi đua Đoàn trường
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs sm:text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">
            1. THÔNG TIN ĐƠN VỊ & NIÊN KHÓA
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên trường</label>
              <input
                type="text"
                value={settings.school_name}
                onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tỉnh / Thành phố</label>
              <input
                type="text"
                value={settings.city}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Năm học hiện tại <span className="text-blue-600 text-xs font-normal">(Hiển thị mục Năm học ở Menu)</span>
              </label>
              <input
                id="input-current-school-year"
                type="text"
                value={settings.current_school_year}
                onChange={(e) => setSettings({ ...settings, current_school_year: e.target.value })}
                placeholder="2026-2027"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-mono font-bold text-blue-900 bg-blue-50/30"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tuần học hiện tại</label>
              <select
                id="select-current-week"
                value={settings.current_week}
                onChange={(e) => setSettings({ ...settings, current_week: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-bold"
              >
                {Array.from({ length: 39 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {w <= 19 ? '(Học kỳ 1)' : '(Học kỳ 2)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Khẩu hiệu / Slogan thi đua <span className="text-slate-400 text-xs font-normal">(Hiển thị dưới mục Năm học ở Menu)</span>
              </label>
              <input
                id="input-slogan"
                type="text"
                value={settings.slogan || 'Biến dữ liệu Sổ đầu bài thành thông tin thi đua thông minh.'}
                onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Scoring Rules */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">
            2. THANG ĐIỂM 4 TIÊU CHÍ & NGƯỠNG XẾP LOẠI
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Học tập (max)</label>
              <input
                type="number"
                step="0.1"
                value={settings.scoring_rules.study_max}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scoring_rules: { ...settings.scoring_rules, study_max: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-center font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kỉ luật (max)</label>
              <input
                type="number"
                step="0.1"
                value={settings.scoring_rules.discipline_max}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scoring_rules: { ...settings.scoring_rules, discipline_max: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-center font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vệ sinh (max)</label>
              <input
                type="number"
                step="0.1"
                value={settings.scoring_rules.hygiene_max}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scoring_rules: { ...settings.scoring_rules, hygiene_max: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-center font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chuyên cần (max)</label>
              <input
                type="number"
                step="0.1"
                value={settings.scoring_rules.attendance_max}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scoring_rules: { ...settings.scoring_rules, attendance_max: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-center font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-emerald-700 mb-1">Ngưỡng Tốt (&gt;=)</label>
              <input
                type="number"
                step="0.1"
                value={settings.scoring_rules.good_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scoring_rules: { ...settings.scoring_rules, good_threshold: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-center font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-blue-700 mb-1">Ngưỡng Khá (&gt;=)</label>
              <input
                type="number"
                step="0.1"
                value={settings.scoring_rules.fair_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scoring_rules: { ...settings.scoring_rules, fair_threshold: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-center font-bold text-blue-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-amber-700 mb-1">Ngưỡng Đạt (&gt;=)</label>
              <input
                type="number"
                step="0.1"
                value={settings.scoring_rules.pass_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scoring_rules: { ...settings.scoring_rules, pass_threshold: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-center font-bold text-amber-700"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình hệ thống'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
