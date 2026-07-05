"use client";

import { useState, useEffect, useRef } from "react";
import { User, Bell, LogOut, UserMinus, ChevronRight, Camera, X, ChevronLeft, LogIn } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
// 🚨 로그인 상태 통신망 가져오기!
import { useAuth } from "../../context/AuthContext";
import { db, storage, auth } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";

export default function SettingsPage() {
  const { currentLang } = useLanguage();
  
  // ⭐️ 현재 유저가 로그인했는지, 게스트인지 실시간으로 확인합니다.
  const { user, loading } = useAuth(); 
  
  const [pushEnabled, setPushEnabled] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);

  // 빈 값으로 시작 (로그인한 진짜 유저의 정보를 넣기 위해)
  const [userName, setUserName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState(""); 
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 유저 정보가 있을 때만 진짜 프로필 데이터를 불러옵니다.
  useEffect(() => {
    if (!user) return; // 게스트면 실행 안 함
    
    const fetchMyProfile = async () => {
      try {
        // 공통 폴더가 아닌 '내 고유 아이디(user.uid)' 이름으로 저장된 문서를 찾습니다.
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.name) setUserName(data.name);
          if (data.imageUrl) setProfileImageUrl(data.imageUrl);
        } else {
          setUserName("새로운 여행자"); // 처음 가입한 사람
        }
      } catch (error) {
        console.error("프로필 불러오기 실패:", error);
      }
    };
    fetchMyProfile();
  }, [user]);

  // 사진 임시 선택
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 2. 프로필 저장 (내 고유 아이디 공간에 저장)
  const handleSaveProfile = async () => {
    if (!user) return;
    if (!userName.trim()) { alert("이름을 입력해주세요!"); return; }
    
    setIsSaving(true);
    try {
      let finalImageUrl = profileImageUrl; 
      if (imageFile) {
        const storageRef = ref(storage, `profiles/${user.uid}_${Date.now()}`);
        await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      }
      
      await setDoc(doc(db, "users", user.uid), {
        name: userName,
        imageUrl: finalImageUrl,
      }, { merge: true }); 

      setProfileImageUrl(finalImageUrl); 
      setImageFile(null);
      setImagePreview(null);
      setIsEditingProfile(false); 
      alert("프로필이 성공적으로 업데이트되었습니다! 🎉");
    } catch (error) {
      alert("프로필 업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. 로그아웃 기능 (진짜 작동함)
  const handleLogout = async () => {
    try {
      await signOut(auth); 
      alert("안전하게 로그아웃 되었습니다! 👋");
      // 로그아웃 되는 순간 user 값이 null이 되며 자동으로 '게스트 화면'으로 싹 바뀝니다!
    } catch (error) {
      alert("로그아웃 중 문제가 발생했습니다.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pb-20">로딩 중...</div>;

  // ==========================================
  // 화면 A: 유저가 없는(로그아웃 된) '게스트 상태' 일 때
  // ==========================================
  if (!user) {
    return (
      <div className="bg-gray-50 min-h-screen pb-20 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <User className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">게스트 모드</h2>
        <p className="text-sm text-gray-500 text-center mb-8">
          로그인하고 프로필 설정, 알림 등 <br/>모든 기능을 이용해보세요!
        </p>
        <button 
          onClick={() => alert("다음 단계에서 로그인/회원가입 화면을 만들게요!")}
          className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" />
          로그인 / 회원가입 하기
        </button>
      </div>
    );
  }

  // ==========================================
  // 화면 B: 프로필 수정 모드 (유저가 로그인 했을 때)
  // ==========================================
  if (isEditingProfile) {
    return (
      <div className="bg-white min-h-screen pb-20">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-4 py-3 border-b flex justify-between items-center">
          <button onClick={() => { setIsEditingProfile(false); setImagePreview(null); setImageFile(null); }} className="text-gray-900 flex items-center gap-1">
            <ChevronLeft className="w-6 h-6" /><span className="text-sm font-medium">취소</span>
          </button>
          <h2 className="text-base font-bold">프로필 수정</h2>
          <button onClick={handleSaveProfile} disabled={isSaving} className="text-blue-600 font-bold text-sm disabled:text-gray-400">
            {isSaving ? "저장 중..." : "완료"}
          </button>
        </div>

        <div className="flex flex-col items-center p-6">
          <div onClick={() => fileInputRef.current?.click()} className="relative mb-6 cursor-pointer hover:opacity-80 transition group">
            <div className="w-28 h-28 bg-gradient-to-tr from-gray-200 to-gray-300 rounded-full flex items-center justify-center overflow-hidden shadow-md border border-gray-100">
              {imagePreview ? <img src={imagePreview} alt="새 프로필" className="w-full h-full object-cover" /> 
                : profileImageUrl ? <img src={profileImageUrl} alt="기존 프로필" className="w-full h-full object-cover" /> 
                : <User className="w-12 h-12 text-gray-400" />}
            </div>
            <div className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-full shadow-md border-2 border-white">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
          </div>

          <div className="w-full max-w-sm">
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">이름 (닉네임)</label>
            <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-blue-500 transition mb-4" />
            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">이메일 (수정 불가)</label>
            <input type="text" value={user?.email || ""} disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-500 cursor-not-allowed" />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 화면 C: 설정 메인 화면 (로그인 완료된 상태)
  // ==========================================
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-white p-6 border-b border-gray-100 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full flex items-center justify-center overflow-hidden shadow-md">
            {profileImageUrl ? <img src={profileImageUrl} alt="프로필" className="w-full h-full object-cover" />
              : <span className="text-white text-3xl font-bold">{userName[0] || user?.email?.[0]?.toUpperCase()}</span>}
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
        <p className="text-sm text-gray-500">{user?.email}</p>
        <button onClick={() => setIsEditingProfile(true)} className="mt-4 px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-full transition">
          프로필 수정
        </button>
      </div>

      <div className="p-4">
        <h3 className="text-xs font-bold text-gray-400 mb-2 ml-2 uppercase tracking-wider">계정 관리</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => setIsEditingProfile(true)} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-lg text-gray-600"><User className="w-5 h-5" /></div>
              <span className="font-medium text-gray-900">내 정보 관리</span>
            </div><ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          
          {/* 진짜 로그아웃 버튼! */}
          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-lg text-gray-600"><LogOut className="w-5 h-5" /></div>
              <span className="font-medium text-gray-900">로그아웃</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}