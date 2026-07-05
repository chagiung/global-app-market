"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import { db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Comment { id: string; author: string; authorImg: string; text: string; createdAt: number; }
interface Post { id: string; content: string; author: string; createdAt: any; imageUrl?: string; language: string; likes?: string[]; comments?: Comment[]; }

function PostCard({ post, onAuthRequired }: { post: Post; onAuthRequired: () => void }) {
  const { currentLang } = useLanguage();
  const { user, userProfile } = useAuth(); 
  const [translatedContent, setTranslatedContent] = useState(post.content);
  const [isTranslating, setIsTranslating] = useState(false);

  const isLiked = user ? post.likes?.includes(user.uid) : false;
  const likesCount = post.likes?.length || 0;
  
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentsCount = post.comments?.length || 0;

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

  const toggleLike = async () => {
    if (!user) { onAuthRequired(); return; }
    const postRef = doc(db, "posts", post.id);
    try {
      if (isLiked) await updateDoc(postRef, { likes: arrayRemove(user.uid) });
      else await updateDoc(postRef, { likes: arrayUnion(user.uid) });
    } catch (error) { console.error("좋아요 실패:", error); }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { onAuthRequired(); return; }
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const postRef = doc(db, "posts", post.id);
      const newComment = { id: Date.now().toString(), author: userProfile?.name || "유저", authorImg: userProfile?.imageUrl || "", text: commentText, createdAt: Date.now() };
      await updateDoc(postRef, { comments: arrayUnion(newComment) });
      setCommentText(""); 
    } catch (error) { alert("댓글 작성 실패."); } finally { setIsSubmittingComment(false); }
  };

  // ⭐️ 스마트 공유하기 기능!
  const handleShare = async () => {
    const shareData = {
      title: `${post.author}님의 게시물 - GlobalApp`,
      text: post.content,
      url: window.location.origin, // 내 웹사이트 주소
    };

    // 스마트폰이나 최신 브라우저에서 '공유 창' 띄우기
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log("공유가 취소되었거나 지원하지 않습니다.", error);
      }
    } else {
      // PC 등에서 공유 창을 지원하지 않으면 클립보드에 복사해 줍니다.
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\n구경가기: ${shareData.url}`);
        alert("게시물 내용과 주소가 복사되었습니다! 카카오톡이나 원하는 곳에 붙여넣기 하세요. 📋");
      } catch (error) {
        alert("공유하기를 지원하지 않는 기기입니다.");
      }
    }
  };

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
        <button onClick={toggleLike} className={`flex items-center gap-1.5 transition ${isLiked ? 'text-red-500 font-medium' : 'hover:text-red-500'}`}>
          <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} /> 
          좋아요 {likesCount > 0 && <span>{likesCount}</span>}
        </button>

        <button onClick={() => setShowComments(!showComments)} className={`flex items-center gap-1.5 transition ${showComments ? 'text-blue-500' : 'hover:text-blue-500'}`}>
          <MessageCircle className={`w-4 h-4 ${showComments ? 'fill-blue-100' : ''}`} /> 
          댓글 {commentsCount > 0 && <span>{commentsCount}</span>}
        </button>
        
        {/* 🚨 공유하기 버튼 장착 */}
        <button onClick={handleShare} className="flex items-center gap-1.5 hover:text-green-500 transition ml-auto">
          <Share2 className="w-4 h-4" /> 공유
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {post.comments && post.comments.length > 0 ? (
            <div className="flex flex-col gap-3 mb-2">
              {post.comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-100">
                    {c.authorImg ? <img src={c.authorImg} alt="img" className="w-full h-full object-cover" /> : c.author[0]}
                  </div>
                  <div className="flex flex-col bg-gray-50 rounded-2xl px-3 py-2 flex-1 border border-gray-100">
                    <span className="text-xs font-bold text-gray-900">{c.author}</span>
                    <span className="text-xs text-gray-700 leading-snug mt-0.5">{c.text}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center mb-2">첫 댓글을 남겨보세요!</div>
          )}

          <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-blue-600 font-bold text-xs">
              {userProfile?.imageUrl ? <img src={userProfile.imageUrl} alt="img" className="w-full h-full object-cover" /> : (userProfile?.name?.[0] || user?.email?.[0]?.toUpperCase() || "나")}
            </div>
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder={user ? "댓글을 입력하세요..." : "로그인 후 댓글을 남길 수 있습니다."} onClick={() => { if(!user) onAuthRequired(); }} className="flex-1 bg-gray-100 border border-transparent rounded-full px-4 py-2 text-sm outline-none focus:bg-white focus:border-blue-300 transition" />
            <button type="submit" disabled={isSubmittingComment || !commentText.trim()} className="text-blue-600 disabled:text-gray-300 p-1.5 transition-transform active:scale-95"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const { currentLang } = useLanguage();
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
  const removeImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

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
        content, author: userProfile?.name || "유저", createdAt: serverTimestamp(), language: currentLang, imageUrl: uploadedImageUrl, likes: [], comments: [], 
      });
      setContent(""); removeImage();
    } catch (error) { alert("게시물 업로드 실패"); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex flex-col gap-2 bg-gray-100 min-h-screen pb-20">
      <div className="bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0 overflow-hidden border border-gray-200">
            {userProfile?.imageUrl ? <img src={userProfile.imageUrl} alt="내 프로필" className="w-full h-full object-cover" /> : (userProfile?.name?.[0] || "나")}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea value={content} onChange={(e) => setContent(e.target.value)} onClick={() => { if (!user) setIsAuthModalOpen(true); }} placeholder={user ? `${userProfile?.name || '회원'}님, 어떤 소식을 공유하고 싶나요?` : "로그인하고 소식을 남겨보세요!"} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition resize-none min-h-[80px]" />
            {imagePreview && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200"><img src={imagePreview} alt="preview" className="w-full h-full object-cover" /><button onClick={removeImage} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X className="w-3 h-3" /></button></div>
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
        {posts.length === 0 ? <div className="p-10 text-center text-gray-400 text-sm bg-white">첫 번째 게시물의 주인공이 되어보세요!</div> : posts.map((post) => <PostCard key={post.id} post={post} onAuthRequired={() => setIsAuthModalOpen(true)} />)}
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}