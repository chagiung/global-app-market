"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import { db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Post { id: string; content: string; author: string; createdAt: any; imageUrl?: string; language: string; }

function PostCard({ post }: { post: Post }) {
  const { currentLang } = useLanguage();
  const [translatedContent, setTranslatedContent] = useState(post.content);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (post.language === currentLang) { setTranslatedContent(post.content); return; }
    const translate = async () => {
      setIsTranslating(true);
      try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(post.content)}&langpair=${post.language}|${currentLang}`);
        const data = await res.json();
        if (data.responseData.translatedText) setTranslatedContent(data.responseData.translatedText);
      } catch (e) {} finally { setIsTranslating(false); }
    };
    translate();
  }, [currentLang, post.content, post.language]);

  return (
    <article className="bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
          {post.author[0]}
        </div>
        <div>
          <h3 className="text-sm font-bold">{post.author}</h3>
          <p className="text-[11px] text-gray-400">{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : "방금 전"}</p>
        </div>
      </div>
      <p className="text-sm mb-3 text-gray-800 leading-relaxed whitespace-pre-wrap">
        {isTranslating ? <span className="text-gray-400">번역 중...</span> : translatedContent}
      </p>
      {post.imageUrl && (
        <div className="w-full bg-gray-100 rounded-xl mb-3 overflow-hidden border border-gray-100">
          <img src={post.imageUrl} alt="포스트 이미지" className="w-full object-cover max-h-80" />
        </div>
      )}
      <div className="flex items-center gap-6 text-gray-500 text-sm border-t border-gray-100 pt-3 mt-1">
        <button className="flex items-center gap-1.5 hover:text-red-500 transition"><Heart className="w-4 h-4" /> 좋아요</button>
        <button className="flex items-center gap-1.5 hover:text-blue-500 transition"><MessageCircle className="w-4 h-4" /> 댓글</button>
        <button className="flex items-center gap-1.5 hover:text-green-500 transition ml-auto"><Share2 className="w-4 h-4" /> 공유</button>
      </div>
    </article>
  );
}

export default function Home() {
  const { currentLang } = useLanguage();
  // 🚨 닉네임(userProfile)을 통신망에서 꺼내옵니다!
  const { user, userProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Post[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Post));
      setPosts(data);
    });
    return () => unsubscribe();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]; setImageFile(file); setImagePreview(URL.createObjectURL(file));
    }
  };
  const removeImage = () => {
    setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePostSubmit = async () => {
    if (!user) { setIsAuthModalOpen(true); return; }
    if (!content.trim() && !imageFile) { alert("내용을 입력하거나 사진을 첨부해주세요."); return; }
    setIsSubmitting(true);
    try {
      let uploadedImageUrl = ""; 
      if (imageFile) {
        const storageRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "posts"), {
        content,
        // 🚨 드디어! 내 진짜 닉네임이 저장됩니다.
        author: userProfile?.name || "유저",
        createdAt: serverTimestamp(),
        language: currentLang,
        imageUrl: uploadedImageUrl,
      });
      setContent(""); removeImage();
    } catch (error) { alert("게시물 업로드 실패"); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex flex-col gap-2 bg-gray-100 min-h-screen pb-20">
      <div className="bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0 overflow-hidden border border-gray-200">
            {userProfile?.imageUrl ? (
              <img src={userProfile.imageUrl} alt="내 프로필" className="w-full h-full object-cover" />
            ) : (
              userProfile?.name?.[0] || "나"
            )}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={content} onChange={(e) => setContent(e.target.value)} onClick={() => { if (!user) setIsAuthModalOpen(true); }}
              placeholder={user ? `${userProfile?.name || '회원'}님, 어떤 소식을 공유하고 싶나요?` : "로그인하고 소식을 남겨보세요!"}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition resize-none min-h-[80px]"
            />
            {imagePreview && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                <button onClick={removeImage} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mt-2 pl-12">
          <div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            <button onClick={() => { if (!user) setIsAuthModalOpen(true); else fileInputRef.current?.click(); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition"><ImageIcon className="w-4 h-4" /> 사진 첨부</button>
          </div>
          <button onClick={handlePostSubmit} disabled={isSubmitting} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition disabled:bg-gray-400"><Send className="w-4 h-4" /> {isSubmitting ? "게시 중..." : "게시"}</button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {posts.length === 0 ? <div className="p-10 text-center text-gray-400 text-sm bg-white">첫 번째 게시물의 주인공이 되어보세요!</div> : posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}