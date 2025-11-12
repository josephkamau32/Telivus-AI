import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Translations, translations, getBrowserLanguage } from '@/lib/i18n';

export type { Language };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage, fallback to browser language
    const saved = localStorage.getItem('telivus-language') as Language;
    return saved || getBrowserLanguage();
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('telivus-language', lang);
    // Update document language attribute
    document.documentElement.lang = lang;
    // Update document direction (currently only LTR languages supported)
    document.documentElement.dir = 'ltr';
  };

  // Update document attributes when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr'; // Currently only LTR languages
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language],
    isRTL: false, // No RTL languages currently supported
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

// Hook for easy access to translations
export const useT = () => useTranslation().t;