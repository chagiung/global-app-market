"use client";

import { useState } from "react";
import { X, Mail, Lock, User } from "lucide-react";
import { auth, db } from "../firebase";
// 파이어베이스 이메일 회원가입(createUser...) 및 로그인(signIn...) 도구 가져오기
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  // 모드 상태: true면 로그인, false면 회원가입
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // 입력 폼 상태
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState(""); // 회원가입 시 사용할 이름
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("이메일과 비밀번호를 모두 입력해주세요!");
      return;
    }
    if (!isLoginMode && !nickname) {
      alert("닉네임을 입력해주세요!");
      return;
    }

    setIsLoading(true);
    try {
      if (isLoginMode) {
        // 1. 파이어베이스 이메일 로그인 실행
        await signInWithEmailAndPassword(auth, email, password);
        alert("성공적으로 로그인되었습니다! 🎉");
      } else {
        // 2. 파이어베이스 이메일 회원가입 실행
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 회원가입 성공 시 users 폴더에 내 고유 아이디(UID)로 닉네임 정보 저장
        await setDoc(doc(db, "users", user.uid), {
          name: nickname,
          imageUrl: "",
        });
        alert("회원가입이 완료되었습니다! 반갑습니다. 🚀");
      }
      onClose(); // 성공 시 팝업창 닫기
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/email-already-in-use") alert("이미 사용 중인 이메일입니다.");
      else if (error.code === "auth/weak-password") alert("비밀번호는 6자리 이상이어야 합니다.");
      else if (error.code === "auth/invalid-credential") alert("이메일 또는 비밀번호가 틀렸습니다.");
      else alert("인증 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      {/* 바깥 어두운 배경 클릭 시 닫히지 않게 안전하게 모바일 크기로 고정 */}
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative p-6">
        
        {/* 우측 상단 닫기 버튼 */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6 mt-2">
          <h2 className="text-2xl font-bold text-gray-900">
            {isLoginMode ? "GlobalApp 로그인" : "새 계정 만들기"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isLoginMode ? "로그인하고 전 세계 사람들과 소통해보세요!" : "간단한 정보만 입력하고 시작하세요."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 회원가입 모드일 때만 닉네임 입력칸 보여주기 */}
          {!isLoginMode && (
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="닉네임 (이름)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 transition"
              />
            </div>
          )}

          {/* 이메일 입력칸 */}
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* 비밀번호 입력칸 */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="password"
              placeholder="비밀번호 (6자리 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl mt-2 transition text-sm disabled:bg-gray-400 shadow-md"
          >
            {isLoading ? "처리 중..." : isLoginMode ? "로그인" : "회원가입 완료"}
          </button>
        </form>

        {/* 로그인/회원가입 전환 버튼 */}
        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setEmail(""); setPassword(""); setNickname("");
            }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            {isLoginMode ? "아직 계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
          </button>
        </div>

      </div>
    </div>
  );
}