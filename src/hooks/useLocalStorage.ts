import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key \"${key}\":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key \"${key}\":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

export interface HealthReport {
  id: string;
  timestamp: string;
  userInfo: {
    feelings: string;
    symptoms: string[];
    age: number;
  };
  report: string;
}

export function useHealthReports() {
  const [reports, setReports] = useLocalStorage<HealthReport[]>('medisense_reports', []);

  const addReport = (report: Omit<HealthReport, 'id'>) => {
    const newReport: HealthReport = {
      ...report,
      id: Date.now().toString(),
    };
    
    setReports(prevReports => {
      const updatedReports = [newReport, ...prevReports];
      // Keep only the last 10 reports
      return updatedReports.slice(0, 10);
    });

    return newReport.id;
  };

  const getReport = (id: string): HealthReport | undefined => {
    return reports.find(report => report.id === id);
  };

  const clearReports = () => {
    setReports([]);
  };

  return {
    reports,
    addReport,
    getReport,
    clearReports,
  };
}
