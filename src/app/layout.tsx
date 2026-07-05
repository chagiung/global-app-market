"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Globe, Home, ShoppingBag, Megaphone, Settings } from "lucide-react";
import Link from "next/link";
import { LanguageProvider, useLanguage } from "../context/LanguageContext";
// 🚨 방금 만든 로그인 통신망 가져오기!
import { AuthProvider } from "../context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

function Header() {
  const { currentLang, setCurrentLang } = useLanguage();
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-4 py-3 flex justify-between items-center">
      <h1 className="text-xl font-bold text-blue-600">Tan Bang</h1>
      <div className="flex items-center gap-2">
        <Globe className="w-5 h-5 text-gray-500" />
        <select 
          value={currentLang}
          onChange={(e) => setCurrentLang(e.target.value)}
          className="bg-gray-100 border-none rounded-full px-3 py-1 text-sm font-medium focus:ring-2 outline-none cursor-pointer"
        >
          <option value="ko">한국어 🇰🇷</option>
          <option value="en">English 🇺🇸</option>
          <option value="vi">Tiếng Việt 🇻🇳</option>
        </select>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {/* 🚨 AuthProvider로 가장 바깥을 감싸서 앱 전체가 로그인 상태를 알게 합니다 */}
        <AuthProvider>
          <LanguageProvider>
            <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-xl">
              <Header />
              <main className="pb-20">{children}</main>
              <nav className="fixed bottom-0 max-w-md w-full bg-white border-t flex justify-around py-3 px-2 z-50">
                <Link href="/" className="flex flex-col items-center text-blue-600">
                  <Home className="w-6 h-6" />
                  <span className="text-[10px] mt-1 font-semibold">SNS 피드</span>
                </Link>
                <Link href="/market" className="flex flex-col items-center text-gray-400 hover:text-blue-600">
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-[10px] mt-1 font-semibold">중고거래</span>
                </Link>
                <Link href="/ads" className="flex flex-col items-center text-gray-400 hover:text-blue-600">
                  <Megaphone className="w-6 h-6" />
                  <span className="text-[10px] mt-1 font-semibold">광고/구인</span>
                </Link>
                <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-blue-600">
                  <Settings className="w-6 h-6" />
                  <span className="text-[10px] mt-1 font-semibold">설정</span>
                </Link>
              </nav>
            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}