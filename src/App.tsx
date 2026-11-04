import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { SettingsProvider } from './contexts/SettingsContext.tsx';
import { ActiveTab } from './types.ts';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ClassbookView } from './components/ClassbookView.tsx';
import { ClassesView } from './components/ClassesView.tsx';
import { SubjectsView } from './components/SubjectsView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { RankingsView } from './components/RankingsView.tsx';
import { AlertsView } from './components/AlertsView.tsx';
import { AIAssistantView } from './components/AIAssistantView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { ImportExportView } from './components/ImportExportView.tsx';
import { UsersView } from './components/UsersView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { ChangePasswordModal } from './components/ChangePasswordModal.tsx';

const AppContent: React.FC = () => {
  const { loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <h2 className="text-sm font-bold text-slate-800">SMART CLASSBOOK AI</h2>
        <p className="text-xs text-slate-500 mt-1">Đang khởi tạo hệ thống thi đua...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'classbook':
        return <ClassbookView />;
      case 'classes':
        return <ClassesView />;
      case 'subjects':
        return <SubjectsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'rankings':
        return <RankingsView />;
      case 'alerts':
        return <AlertsView />;
      case 'ai_assistant':
        return <AIAssistantView />;
      case 'reports':
        return <ReportsView />;
      case 'import_export':
        return <ImportExportView />;
      case 'users':
        return isAdmin ? <UsersView /> : <DashboardView />;
      case 'settings':
        return isAdmin ? <SettingsView /> : <DashboardView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 font-sans">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>

      <LoginModal />
      <ChangePasswordModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}
