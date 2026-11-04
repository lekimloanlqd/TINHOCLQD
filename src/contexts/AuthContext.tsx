import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.ts';
import { api, setStoredToken, getStoredToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  isDoan: boolean;
  isLPHT: boolean;
  assignedClass: string | null;
  mustChangePassword: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  canEditClassbook: (classId: string) => boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  showChangePasswordModal: boolean;
  setShowChangePasswordModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);

  const refreshUser = async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
      if (data.user?.must_change_password) {
        setShowChangePasswordModal(true);
      }
    } catch (err) {
      console.error('Failed to get user session:', err);
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, pass: string) => {
    const res = await api.login(identifier, pass);
    setStoredToken(res.token);
    setUser(res.user);
    setShowLoginModal(false);
    if (res.user.must_change_password) {
      setShowChangePasswordModal(true);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const isGuest = !user;
  const isAdmin = user?.role === 'ADMIN';
  const isDoan = user?.role === 'CAN_BO_DOAN';
  const isLPHT = user?.role === 'LPHT';
  const assignedClass = user?.class_id || null;
  const mustChangePassword = !!user?.must_change_password;

  // Crucial RBAC logic (Section IX, X, XXXV)
  const canEditClassbook = (classId: string): boolean => {
    if (isGuest) return false;
    if (isAdmin || isDoan) return true;
    if (isLPHT) {
      return user?.class_id === classId;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        isAdmin,
        isDoan,
        isLPHT,
        assignedClass,
        mustChangePassword,
        login,
        logout,
        refreshUser,
        canEditClassbook,
        showLoginModal,
        setShowLoginModal,
        showChangePasswordModal,
        setShowChangePasswordModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
