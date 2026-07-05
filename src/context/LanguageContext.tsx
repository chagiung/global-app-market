"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// 1. 번역 통신망 생성
const LanguageContext = createContext<any>(null);

// 🚨 에러의 원인 해결! (여기서 { children } 중괄호가 빠지면 에러가 납니다)
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLang, setCurrentLang] = useState("ko");

  return (
    <LanguageContext.Provider value={{ currentLang, setCurrentLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

// 3. 다른 곳에서 쉽게 꺼내 쓸 수 있는 도구
export function useLanguage() {
  return useContext(LanguageContext);
}