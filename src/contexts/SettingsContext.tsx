import React, { createContext, useContext, useState, useEffect } from 'react';
import { SystemSettings } from '../types.ts';
import { api } from '../services/api.ts';

interface SettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<SystemSettings | null>;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<SystemSettings>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSettings = async (): Promise<SystemSettings | null> => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      return data;
    } catch (err) {
      console.error('Failed to load system settings:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
    return updated;
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
