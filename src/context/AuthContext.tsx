"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

interface UserProfile {
  name: string;
  imageUrl: string;
}

// ⭐️ 닉네임과 프로필 사진(userProfile)을 앱 전체에 공유하도록 추가했습니다!
const AuthContext = createContext<{ user: User | null; userProfile: UserProfile | null; loading: boolean }>({ 
  user: null, userProfile: null, loading: true 
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 내 고유 아이디로 저장된 닉네임 데이터를 실시간으로 가져옵니다!
        const unsubProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) setUserProfile(docSnap.data() as UserProfile);
          else setUserProfile(null);
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }