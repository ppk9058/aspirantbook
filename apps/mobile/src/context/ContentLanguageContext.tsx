import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { Storage } from "../lib/storage";

export type ContentLanguage = "EN" | "HI";

export interface ContentLanguageContextValue {
  language: ContentLanguage;
  setLanguage: (lang: ContentLanguage) => void;
  toggleLanguage: () => void;
  isLoaded: boolean;
}

const ContentLanguageContext = createContext<ContentLanguageContextValue | undefined>(undefined);

export function ContentLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<ContentLanguage>("EN");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void Storage.getContentLanguage().then((saved) => {
      if (!active) return;
      if (saved === "HI" || saved === "EN") {
        setLanguageState(saved);
      }
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((lang: ContentLanguage) => {
    setLanguageState(lang);
    void Storage.setContentLanguage(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: ContentLanguage = prev === "EN" ? "HI" : "EN";
      void Storage.setContentLanguage(next);
      return next;
    });
  }, []);

  const value = useMemo<ContentLanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      isLoaded,
    }),
    [language, setLanguage, toggleLanguage, isLoaded]
  );

  return (
    <ContentLanguageContext.Provider value={value}>
      {children}
    </ContentLanguageContext.Provider>
  );
}

export function useContentLanguage(): ContentLanguageContextValue {
  const context = useContext(ContentLanguageContext);
  if (!context) {
    return {
      language: "EN",
      setLanguage: () => {},
      toggleLanguage: () => {},
      isLoaded: true,
    };
  }
  return context;
}
