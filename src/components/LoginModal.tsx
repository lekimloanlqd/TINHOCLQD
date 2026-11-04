import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { X, Lock, User, Shield, Users, GraduationCap, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { showLoginModal, setShowLoginModal, login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!showLoginModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Vui lòng nhập tài khoản và mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (accId: string, accPass: string) => {
    setIdentifier(accId);
    setPassword(accPass);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">ĐĂNG NHẬP HỆ THỐNG</h3>
            <p className="text-xs text-blue-100 mt-0.5">SMART CLASSBOOK AI - THPT Phan Bội Châu</p>
          </div>
          <button
            onClick={() => setShowLoginModal(false)}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tài khoản / Email / Số điện thoại
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Admin hoặc doantruong@... hoặc SĐT"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Tài khoản mẫu theo quy định:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => handleQuickFill('Admin', 'admin')}
                className="p-2 border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 rounded-lg text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> ADMIN
                  </span>
                  <span className="text-[10px] text-slate-400">admin</span>
                </div>
                <div className="text-[11px] text-slate-600 truncate">Admin / admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('doantruong@phanboichau.edu.vn', '123456')}
                className="p-2 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-lg text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                    <Users className="w-3 h-3" /> CÁN BỘ ĐOÀN
                  </span>
                  <span className="text-[10px] text-slate-400">123456</span>
                </div>
                <div className="text-[11px] text-slate-600 truncate">doantruong@...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('lpht.12a1@phanboichau.edu.vn', '123456')}
                className="p-2 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 rounded-lg text-left transition-colors cursor-pointer group sm:col-span-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> LPHT 12/1B
                  </span>
                  <span className="text-[10px] text-slate-400">123456</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  lpht.12a1@phanboichau.edu.vn (Toàn trường xem, chỉ sửa 12/1B)
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
