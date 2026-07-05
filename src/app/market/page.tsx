"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Plus, X, Image as ImageIcon, Trash2, Edit3, ChevronLeft } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
// 🚨 로그인 상태 및 프로필 정보 가져오기
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../../components/AuthModal";
import { db, storage } from "../../firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface MarketItem { id: string; title: string; price: string; content: string; author: string; createdAt: any; imageUrl?: string; language: string; }

function MarketItemCard({ item, onClick }: { item: MarketItem; onClick: () => void }) {
  const { currentLang } = useLanguage();
  const [translatedTitle, setTranslatedTitle] = useState(item.title);

  useEffect(() => {
    if (item.language === currentLang) { setTranslatedTitle(item.title); return; }
    const translate = async () => {
      try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(item.title)}&langpair=${item.language}|${currentLang}`);
        const data = await res.json();
        if (data.responseData.translatedText) setTranslatedTitle(data.responseData.translatedText);
      } catch (e) {}
    };
    translate();
  }, [currentLang, item.title, item.language]);

  return (
    <article onClick={onClick} className="flex gap-4 p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer">
      <div className="w-28 h-28 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
        {item.imageUrl ? <img src={item.imageUrl} alt="img" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-gray-300" />}
      </div>
      <div className="flex flex-col justify-center flex-1">
        <h2 className="text-base font-medium text-gray-900 mb-1 line-clamp-1">{translatedTitle}</h2>
        <p className="text-xs text-gray-500 mb-2">{item.author} • {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleString() : "방금 전"}</p>
        <p className="text-lg font-bold text-gray-900">{item.price}</p>
        <div className="flex justify-end mt-auto"><button className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition"><Heart className="w-5 h-5" /></button></div>
      </div>
    </article>
  );
}

export default function MarketPage() {
  const { currentLang } = useLanguage();
  const { user, userProfile } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [items, setItems] = useState<MarketItem[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null); 
  const [editingId, setEditingId] = useState<string | null>(null); 
  
  const [title, setTitle] = useState(""); const [price, setPrice] = useState(""); const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null); const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); const fileInputRef = useRef<HTMLInputElement>(null);
  const [detailTitle, setDetailTitle] = useState(""); const [detailContent, setDetailContent] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "market"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: MarketItem[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as MarketItem));
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    if (selectedItem.language === currentLang) { setDetailTitle(selectedItem.title); setDetailContent(selectedItem.content); return; }
    const translateDetail = async () => {
      setIsTranslating(true);
      try {
        const resTitle = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(selectedItem.title)}&langpair=${selectedItem.language}|${currentLang}`);
        const dataTitle = await resTitle.json();
        if (dataTitle.responseData.translatedText) setDetailTitle(dataTitle.responseData.translatedText);
        const resContent = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(selectedItem.content)}&langpair=${selectedItem.language}|${currentLang}`);
        const dataContent = await resContent.json();
        if (dataContent.responseData.translatedText) setDetailContent(dataContent.responseData.translatedText);
      } catch (e) {} finally { setIsTranslating(false); }
    };
    translateDetail();
  }, [selectedItem, currentLang]);

  const resetForm = () => { setTitle(""); setPrice(""); setContent(""); setImageFile(null); setImagePreview(null); setEditingId(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const handleWriteButtonClick = () => { if (!user) setIsAuthModalOpen(true); else { resetForm(); setIsWriting(true); } };

  const handlePost = async () => {
    if (!title || !price) { alert("제목과 가격은 필수입니다!"); return; }
    setIsSubmitting(true);
    try {
      let uploadedImageUrl = imagePreview || ""; 
      if (imageFile) {
        const storageRef = ref(storage, `market/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(storageRef);
      }
      if (editingId) {
        await updateDoc(doc(db, "market", editingId), { title, price, content, imageUrl: uploadedImageUrl, language: currentLang });
        alert("성공적으로 수정되었습니다!");
      } else {
        await addDoc(collection(db, "market"), {
          title, price, content, 
          // 🚨 내 프로필 이름이 작성자로 기록됩니다!
          author: userProfile?.name || "동네주민",
          createdAt: serverTimestamp(), language: currentLang, imageUrl: uploadedImageUrl,
        });
      }
      resetForm(); setIsWriting(false); setSelectedItem(null);
    } catch (error) { alert("오류가 발생했습니다."); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => { if (confirm("정말 이 글을 삭제하시겠습니까?")) { await deleteDoc(doc(db, "market", id)); setSelectedItem(null); } };
  const handleEditMode = (item: MarketItem) => { setTitle(item.title); setPrice(item.price); setContent(item.content); setImagePreview(item.imageUrl || null); setEditingId(item.id); setIsWriting(true); };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; setImageFile(file); setImagePreview(URL.createObjectURL(file)); } };

  if (isWriting) {
    return (
      <div className="bg-white min-h-screen pb-20 p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{editingId ? "내 물건 수정하기" : "내 물건 팔기"}</h2>
          <button onClick={() => { setIsWriting(false); resetForm(); }} className="text-gray-500 hover:text-red-500 transition"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50"><ImageIcon className="w-6 h-6 mb-1" /><span className="text-[10px]">사진</span></button>
            {imagePreview && (
              <div className="relative w-20 h-20 mt-2 rounded-lg overflow-hidden border"><img src={imagePreview} alt="preview" className="w-full h-full object-cover" /><button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full"><X className="w-3 h-3" /></button></div>
            )}
          </div>
          <input type="text" placeholder="글 제목" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-b border-gray-200 py-3 outline-none focus:border-orange-500" />
          <input type="text" placeholder="가격 (원)" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border-b border-gray-200 py-3 outline-none focus:border-orange-500" />
          <textarea placeholder="자세히 적어주세요." value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-40 border-b border-gray-200 py-3 outline-none focus:border-orange-500 resize-none"></textarea>
          <button onClick={handlePost} disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg mt-4 disabled:bg-gray-400">{isSubmitting ? "저장 중..." : (editingId ? "수정 완료" : "작성 완료")}</button>
        </div>
      </div>
    );
  }

  if (selectedItem) {
    return (
      <div className="bg-white min-h-screen pb-20">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-4 py-3 border-b flex justify-between items-center">
          <button onClick={() => setSelectedItem(null)} className="text-gray-900"><ChevronLeft className="w-6 h-6" /></button>
          {user && (
            <div className="flex gap-3">
              <button onClick={() => handleEditMode(selectedItem)} className="text-blue-500"><Edit3 className="w-5 h-5" /></button>
              <button onClick={() => handleDelete(selectedItem.id)} className="text-red-500"><Trash2 className="w-5 h-5" /></button>
            </div>
          )}
        </div>
        {selectedItem.imageUrl ? <div className="w-full h-72 bg-gray-100"><img src={selectedItem.imageUrl} alt="img" className="w-full h-full object-cover" /></div> : <div className="w-full h-40 bg-gray-100 flex items-center justify-center"><ImageIcon className="w-10 h-10 text-gray-300" /></div>}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex justify-center items-center font-bold text-blue-600">{selectedItem.author[0]}</div>
            <div>
              <p className="font-bold text-sm">{selectedItem.author}</p>
              <p className="text-xs text-gray-400">{selectedItem.createdAt ? new Date(selectedItem.createdAt.toDate()).toLocaleString() : "방금 전"}</p>
            </div>
          </div>
          {isTranslating ? <p className="text-gray-400 text-sm py-10 text-center">번역 중입니다... ⏳</p> : (
            <><h1 className="text-xl font-bold mb-2">{detailTitle}</h1><p className="text-lg font-bold text-gray-900 mb-6">{selectedItem.price}</p><p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{detailContent}</p></>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="flex flex-col">
        {items.length === 0 ? <div className="p-12 text-center text-gray-400 text-sm">아직 등록된 상품이 없습니다.</div> : items.map((item) => <MarketItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
      </div>
      <button onClick={handleWriteButtonClick} className="fixed bottom-24 right-4 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 z-40"><Plus className="w-8 h-8" /></button>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}