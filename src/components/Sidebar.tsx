import React from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useSettings } from '../contexts/SettingsContext.tsx';
import { ActiveTab } from '../types.ts';
import {
  LayoutDashboard,
  BookOpenCheck,
  GraduationCap,
  BookMarked,
  BarChart3,
  Trophy,
  AlertTriangle,
  Bot,
  FileSpreadsheet,
  FileText,
  UserCheck,
  Settings,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, isOpen, onClose }) => {
  const { isGuest, isAdmin, isDoan, isLPHT, user } = useAuth();
  const { settings } = useSettings();

  const rawSchoolYear = settings?.current_school_year || '2026-2027';
  const displaySchoolYear = rawSchoolYear.trim().toLowerCase().startsWith('năm học')
    ? rawSchoolYear
    : `Năm học ${rawSchoolYear.replace(/\s*-\s*/, ' - ')}`;
  const displaySlogan = settings?.slogan || 'Biến dữ liệu Sổ đầu bài thành thông tin thi đua thông minh.';

  interface NavItem {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    visible: boolean;
    badge?: string;
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'DASHBOARD',
      icon: <LayoutDashboard className="w-5 h-5" />,
      visible: true,
    },
    {
      id: 'classbook',
      label: 'SỔ ĐẦU BÀI',
      icon: <BookOpenCheck className="w-5 h-5" />,
      visible: true,
      badge: isLPHT ? `${user?.class_id || ''}` : undefined,
    },
    {
      id: 'classes',
      label: isAdmin || isDoan ? 'QUẢN LÝ LỚP' : 'THÔNG TIN LỚP',
      icon: <GraduationCap className="w-5 h-5" />,
      visible: true,
    },
    {
      id: 'subjects',
      label: isAdmin || isDoan ? 'QUẢN LÝ MÔN HỌC' : 'THÔNG TIN MÔN HỌC',
      icon: <BookMarked className="w-5 h-5" />,
      visible: true,
    },
    {
      id: 'analytics',
      label: 'PHÂN TÍCH THI ĐUA',
      icon: <BarChart3 className="w-5 h-5" />,
      visible: true,
    },
    {
      id: 'rankings',
      label: 'XẾP HẠNG THI ĐUA',
      icon: <Trophy className="w-5 h-5 text-amber-500" />,
      visible: true,
    },
    {
      id: 'alerts',
      label: 'CẢNH BÁO THÔNG MINH',
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      visible: !isGuest, // Admin, Cán bộ Đoàn, LPHT
    },
    {
      id: 'ai_assistant',
      label: 'AI ASSISTANT',
      icon: <Bot className="w-5 h-5 text-indigo-500" />,
      visible: true,
      badge: 'Gemini',
    },
    {
      id: 'reports',
      label: 'BÁO CÁO THI ĐUA',
      icon: <FileText className="w-5 h-5" />,
      visible: true,
    },
    {
      id: 'import_export',
      label: 'IMPORT / EXPORT EXCEL',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
      visible: !isGuest, // Authenticated users
    },
    {
      id: 'users',
      label: 'QUẢN LÝ NGƯỜI DÙNG',
      icon: <UserCheck className="w-5 h-5" />,
      visible: isAdmin, // ADMIN ONLY (Section VI & XXXI)
    },
    {
      id: 'settings',
      label: 'CÀI ĐẶT HỆ THỐNG',
      icon: <Settings className="w-5 h-5" />,
      visible: isAdmin, // ADMIN ONLY (Section VI & XXXVI)
    },
  ];

  const handleItemClick = (id: ActiveTab) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header in sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Đoàn THPT Phan Bội Châu</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* School branding info in sidebar */}
        <div className="p-4 mx-3 mt-3 bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100/80 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span id="sidebar-current-school-year" className="text-xs font-semibold text-blue-900">
              {displaySchoolYear}
            </span>
          </div>
          <p id="sidebar-slogan" className="text-[11px] text-slate-600 mt-1 line-clamp-2">
            “{displaySlogan}”
          </p>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 text-center">
          <p className="font-medium text-slate-700">Hệ thống Thi đua Học sinh</p>
          <p className="text-[10px] text-slate-400">THPT Phan Bội Châu • TP Đà Nẵng</p>
        </div>
      </aside>
    </>
  );
};
