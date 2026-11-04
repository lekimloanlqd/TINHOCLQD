import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { BookOpen, LogIn, LogOut, KeyRound, Eye, Menu, Shield, GraduationCap, Users } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, isGuest, isAdmin, isDoan, isLPHT, logout, setShowLoginModal, setShowChangePasswordModal } = useAuth();

  const getRoleBadge = () => {
    if (isAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <Shield className="w-3 h-3 text-rose-600" />
          ADMIN
        </span>
      );
    }
    if (isDoan) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <Users className="w-3 h-3 text-blue-600" />
          CÁN BỘ ĐOÀN
        </span>
      );
    }
    if (isLPHT) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <GraduationCap className="w-3 h-3 text-emerald-600" />
          LPHT ({user?.class_id || 'Chưa gán'})
        </span>
      );
    }
    return null;
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              id="btn-toggle-sidebar"
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-hidden"
              title="Menu điều hướng"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                    SMART CLASSBOOK AI
                  </h1>
                </div>
                <p className="hidden sm:block text-xs text-slate-500 leading-tight">
                  Đoàn trường THPT Phan Bội Châu TP Đà Nẵng
                </p>
              </div>
            </div>
          </div>

          {/* Right: Auth State adhering strictly to Section IV */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isGuest ? (
              // When unauthenticated: Show read-only mode badge + Login button
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                  <Eye className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span className="font-semibold">👁 Chế độ xem thông tin</span>
                  <span className="hidden md:inline text-amber-600">(Read-Only)</span>
                </div>

                <button
                  id="btn-header-login"
                  onClick={() => setShowLoginModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all focus:outline-hidden cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>ĐĂNG NHẬP</span>
                </button>
              </div>
            ) : (
              // When authenticated: Show Full name, Role badge, Assigned Class, Change password, Logout
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    {user?.full_name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getRoleBadge()}
                  </div>
                </div>

                {/* Mobile role pill */}
                <div className="sm:hidden">
                  {getRoleBadge()}
                </div>

                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                <button
                  id="btn-change-password"
                  onClick={() => setShowChangePasswordModal(true)}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors title='Đổi mật khẩu'"
                  title="Đổi mật khẩu"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                <button
                  id="btn-logout"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 hover:border-rose-200 cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
