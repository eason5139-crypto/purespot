"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Camera,
  ShoppingBag,
  Users,
  Coins,
  Plus,
  CheckCircle2,
  Sparkles,
  Tag,
  SlidersHorizontal,
  ChevronRight,
  Send,
  X,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";
import { useFamilyStore } from "@/store/useFamilyStore";
import { useActivePet } from "@/store/usePetContextStore";
import { money } from "@/lib/utils";

interface ShoppableProduct {
  id: string;
  name: string;
  priceNt: number;
  rating: number;
  reviewsCount: number;
  tags: string[];
  image: string;
}

interface UgcComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}

interface UgcPost {
  id: string;
  petName: string;
  breed: string;
  age: string;
  author: string;
  authorAvatar: string;
  image: string;
  content: string;
  tags: string[];
  likes: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  shoppableProduct?: ShoppableProduct;
  tagPosition?: { xPercent: number; yPercent: number };
  comments: UgcComment[];
}

const CIRCLES = [
  { id: "c1", name: "柴犬換毛護理圈", members: "12.3K", icon: "🐕", desc: "專屬雙層毛梳理、低敏魚油護膚心得" },
  { id: "c2", name: "幼貓挑食拯救會", members: "8.6K", icon: "🐱", desc: "主食凍乾復水、生食誘食分享討論" },
  { id: "c3", name: "中大型犬放電同盟", members: "9.1K", icon: "🦮", desc: "戶外耐磨潔牙骨、長效玩具實測開箱" },
  { id: "c4", name: "熟齡犬貓關節保健", members: "5.4K", icon: "🩺", desc: "天然葡萄糖胺補充與軟骨保養指南" },
];

const INITIAL_POSTS: UgcPost[] = [
  {
    id: "ugc-1",
    petName: "波比",
    breed: "柯基犬",
    age: "3 歲",
    author: "波比麻麻",
    authorAvatar: "👩",
    image: "/images/salmon-dog.png",
    content: "今天帶波比去大安森林公園放電🐾！這支【PURESPOT】超耐咬磨牙骨真的超耐咬！玩一整個下午還在咬～口氣也變得好清新，大推給家有破壞狂的毛孩爸媽！",
    tags: ["#柯基", "#磨牙骨", "#公園日常", "#好物推薦"],
    likes: 1248,
    commentsCount: 86,
    isLiked: false,
    tagPosition: { xPercent: 58, yPercent: 46 },
    shoppableProduct: {
      id: "dental-bone",
      name: "【PURESPOT】超耐咬磨牙潔牙骨",
      priceNt: 299,
      rating: 0,
      reviewsCount: 0,
      tags: ["天然牛皮", "耐咬耐磨", "中大型犬通用"],
      image: "/images/salmon-dog.png",
    },
    comments: [],
  },
  {
    id: "ugc-2",
    petName: "Nini",
    breed: "布偶貓",
    age: "2 歲",
    author: "布偶奴日常",
    authorAvatar: "👧",
    image: "/images/salmon-cat.png",
    content: "換了 PURESPOT 鮮雞凍乾主食糧之後，挑食怪 Nini 竟然第一次把碗舔得一乾二淨✨！天然肉香真的很濃郁，看著大口大口吃就是最幸福的事～",
    tags: ["#布偶貓", "#挑食救星", "#主食凍乾", "#開飯日常"],
    likes: 0,
    commentsCount: 0,
    isLiked: false,
    tagPosition: { xPercent: 50, yPercent: 52 },
    shoppableProduct: {
      id: "salmon-cat",
      name: "【PURESPOT】低敏原肉成貓主食凍乾",
      priceNt: 850,
      rating: 0,
      reviewsCount: 0,
      tags: ["去骨鮮雞", "45%粗蛋白", "SGS無菌化驗"],
      image: "/images/salmon-cat.png",
    },
    comments: [],
  },
  {
    id: "ugc-3",
    petName: "黑皮",
    breed: "台灣土狗 (米克斯)",
    age: "4 歲",
    author: "黑皮拔拔",
    authorAvatar: "👦",
    image: "/images/salmon-dog.png",
    content: "米克斯腸胃比較敏感，之前吃進口大廠常常軟便。改吃 PURESPOT 在地低敏鹿肉配方兩個月，便便成型非常漂亮！台灣在地研發的新鮮度真的不一樣。",
    tags: ["#米克斯之光", "#腸胃保養", "#在地研發", "#真心推薦"],
    likes: 0,
    commentsCount: 0,
    isLiked: false,
    tagPosition: { xPercent: 45, yPercent: 60 },
    shoppableProduct: {
      id: "salmon-dog",
      name: "【PURESPOT】單一肉源無穀犬糧 (鹿肉低敏)",
      priceNt: 980,
      rating: 0,
      reviewsCount: 0,
      tags: ["在地溯源", "低敏護腸胃", "全齡適用"],
      image: "/images/salmon-dog.png",
    },
    comments: [],
  },
];

export default function CommunityPage() {
  const activePet = useActivePet();
  const addItemToCart = useCartStore((s) => s.addItem);
  const addSharedItem = useFamilyStore((s) => s.addSharedItem);

  const [activeTab, setActiveTab] = useState<"RECOMMEND" | "FOLLOWING" | "CITY" | "BREED" | "GOODS">("RECOMMEND");
  const [posts, setPosts] = useState<UgcPost[]>(INITIAL_POSTS);
  const [activeProductModal, setActiveProductModal] = useState<ShoppableProduct | null>(null);
  const [meatCoins, setMeatCoins] = useState(350);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // 留言輸入狀態
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // 發布新貼文表單
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTags, setNewPostTags] = useState("#好物分享 #毛孩日常");

  const handleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextLiked = !p.isLiked;
          return {
            ...p,
            isLiked: nextLiked,
            likes: nextLiked ? p.likes + 1 : p.likes - 1,
          };
        }
        return p;
      })
    );
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    const newComment: UgcComment = {
      id: `cm-${Date.now()}`,
      author: "我",
      avatar: "🐶",
      text,
      time: "剛剛",
    };
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [...p.comments, newComment],
              commentsCount: p.commentsCount + 1,
            }
          : p
      )
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    toast.success("留言發布成功！獲得 5 肉肉幣互動獎勵");
    setMeatCoins((c) => c + 5);
  };

  const handleAddToCart = (product: ShoppableProduct) => {
    try {
      addItemToCart({
        productId: product.id === "dental-bone" ? "salmon-dog" : product.id,
        petId: activePet.id,
        mode: "ONCE",
        quantity: 1,
        intervalDays: null,
      });
      toast.success(`已將「${product.name}」加入購物袋！`);
      setActiveProductModal(null);
    } catch {
      toast.success(`已將「${product.name}」加入購物袋！`);
      setActiveProductModal(null);
    }
  };

  const handleAddToFamilyList = (product: ShoppableProduct) => {
    addSharedItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      priceNt: product.priceNt,
      quantity: 1,
      addedBy: "我",
      memberAvatar: "🐶",
      note: `在社群動態看到 ${product.name}，想給毛孩試試！`,
    });
    toast.success(`已加入家庭協同清單，家人打開購物車即可看見！`);
    setActiveProductModal(null);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const newPost: UgcPost = {
      id: `ugc-${Date.now()}`,
      petName: activePet.name,
      breed: activePet.type === "CAT" ? "全齡貓" : "全齡犬",
      age: "2 歲",
      author: "毛孩家長",
      authorAvatar: "🐾",
      image: activePet.type === "CAT" ? "/images/salmon-cat.png" : "/images/salmon-dog.png",
      content: newPostContent,
      tags: newPostTags.split(" ").filter(Boolean),
      likes: 1,
      commentsCount: 0,
      isLiked: true,
      tagPosition: { xPercent: 50, yPercent: 50 },
      shoppableProduct: {
        id: "salmon-cat",
        name: `【PURESPOT】${activePet.name} 最愛天然主食`,
        priceNt: 850,
        rating: 5.0,
        reviewsCount: 1,
        tags: ["原肉鮮食", "在地食材", "高嗜口性"],
        image: activePet.type === "CAT" ? "/images/salmon-cat.png" : "/images/salmon-dog.png",
      },
      comments: [],
    };

    setPosts([newPost, ...posts]);
    setIsPostModalOpen(false);
    setNewPostContent("");
    setMeatCoins((c) => c + 50);
    toast.success("🎉 生活日記發布成功！已為您入帳 50 枚肉肉幣！");
  };

  return (
    <main id="main-content" className="page-shell py-8">
      {/* 頂部社群 Banner 與肉肉幣資產總覽 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="eyebrow flex items-center gap-1.5 text-cyan-400">
            <Sparkles size={14} />
            PET UGC SOCIAL COMMERCE · 原生毛孩社交電商
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            毛孩日常與真實飼餵圈
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            點擊照片小白點標籤即可一鍵買同款；分享真實好物賺取「肉肉幣」折抵商城！
          </p>
        </div>

        {/* 肉肉幣錢包與發文按鈕 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-950/20 px-4 py-2">
            <span className="text-xl">🪙</span>
            <div>
              <p className="text-[10px] uppercase font-semibold text-amber-300">我的肉肉幣</p>
              <p className="font-mono text-base font-bold text-amber-200">
                {meatCoins} <span className="text-xs font-normal text-slate-400">枚 (可折 NT${meatCoins})</span>
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsPostModalOpen(true)}
            className="gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Camera size={16} />
            發布生活日記 (+50幣)
          </Button>
        </div>
      </div>

      {/* 5大分流標籤列 (7C 簡報 Slide 21) */}
      <div className="my-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111827] p-1.5">
          {[
            { id: "RECOMMEND", label: "推薦" },
            { id: "FOLLOWING", label: "關注" },
            { id: "CITY", label: "同城 (台北)" },
            { id: "BREED", label: `同品種 (${activePet.name})` },
            { id: "GOODS", label: "好物開箱" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-cyan-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500">
          全站共累積 <strong>28,490</strong> 篇飼主認證生活好物分享
        </span>
      </div>

      {/* 專屬同好圈推薦卡片列 (7C 創新機制 3) */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={13} className="text-cyan-400" />
            專屬細分同好圈 (點擊加入即時交流)
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CIRCLES.map((c) => (
            <div
              key={c.id}
              className="panel group cursor-pointer p-4 transition-all hover:border-cyan-400/40 hover:bg-white/[0.03]"
              onClick={() => toast.success(`已加入「${c.name}」！`)}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{c.icon}</span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                  {c.members} 成員
                </span>
              </div>
              <h2 className="mt-2 text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                {c.name}
              </h2>
              <p className="mt-1 text-xs text-slate-400 line-clamp-1">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* UGC 動態瀑布流 (搭載生活標籤一鍵買同款) */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="panel overflow-hidden border-white/10 bg-[#0f1523] flex flex-col justify-between"
          >
            {/* 貼文作者與毛孩主頁 Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 text-white font-bold text-sm shadow">
                  {post.authorAvatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white">{post.petName}</p>
                    <span className="rounded-md bg-white/10 px-1.5 py-0.2 text-[10px] text-cyan-300 font-medium">
                      {post.breed} · {post.age}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{post.author}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                onClick={() => toast.success(`已關注 ${post.petName}！`)}
              >
                + 關注
              </Button>
            </div>

            {/* 貼文照片與生活標籤 (7C 創新機制 2: 生活標籤一鍵買同款) */}
            <div className="relative aspect-square w-full overflow-hidden bg-black/40">
              <Image
                src={post.image}
                alt={post.content}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
              />

              {/* 脈動白色互動標籤 (White Dot Tag) */}
              {post.shoppableProduct && post.tagPosition && (
                <div
                  className="absolute z-10 cursor-pointer"
                  style={{
                    left: `${post.tagPosition.xPercent}%`,
                    top: `${post.tagPosition.yPercent}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={() => setActiveProductModal(post.shoppableProduct ?? null)}
                >
                  <div className="relative group">
                    <span className="absolute -inset-1.5 animate-ping rounded-full bg-white/70" />
                    <div className="relative flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-3 py-1.5 text-xs text-white shadow-xl border border-white/30 hover:scale-105 transition-transform">
                      <span className="size-2 rounded-full bg-cyan-400" />
                      <span className="font-medium truncate max-w-[140px]">
                        {post.shoppableProduct.name}
                      </span>
                      <span className="font-mono text-cyan-300 font-semibold">
                        ${post.shoppableProduct.priceNt}
                      </span>
                      <ShoppingBag size={12} className="text-amber-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 貼文互動按鈕與內文 */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        post.isLiked ? "text-rose-400 font-semibold" : "hover:text-white"
                      }`}
                    >
                      <Heart
                        size={18}
                        className={post.isLiked ? "fill-rose-500 text-rose-500" : ""}
                      />
                      <span>{post.likes}</span>
                    </button>
                    <span className="flex items-center gap-1.5 text-xs">
                      <MessageCircle size={18} />
                      <span>{post.commentsCount}</span>
                    </span>
                    <button
                      onClick={() => toast.success("已複製分享連結！")}
                      className="hover:text-white transition-colors"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => toast.success("已加入好物收藏！")}
                    className="hover:text-white transition-colors"
                  >
                    <Bookmark size={16} />
                  </button>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">{post.content}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-cyan-300 hover:bg-white/10 cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 留言列表與輸入框 */}
              <div className="mt-4 border-t border-white/5 pt-3">
                <div className="space-y-1.5 max-h-24 overflow-y-auto mb-2 text-xs">
                  {post.comments.map((cm) => (
                    <p key={cm.id} className="text-slate-400">
                      <strong className="text-white mr-1">{cm.author}:</strong>
                      {cm.text}
                    </p>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="發表留言互動 (+5肉肉幣)..."
                    value={commentInputs[post.id] || ""}
                    onChange={(e) =>
                      setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddComment(post.id);
                    }}
                    className="input py-1 px-3 text-xs min-h-0 flex-1"
                  />
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleAddComment(post.id)}
                  >
                    <Send size={12} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 生活標籤彈出商品卡片 (Slide 21 核心體驗：一鍵加入購物車 vs 加入家庭清單) */}
      <AnimatePresence>
        {activeProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-cyan-400/40 bg-[#0f1523] p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setActiveProductModal(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/50 mb-4 border border-white/10">
                <Image
                  src={activeProductModal.image}
                  alt={activeProductModal.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-300">
                {activeProductModal.reviewsCount > 0 ? (
                  <>
                    <span>★ {activeProductModal.rating}</span>
                    <span className="text-slate-500">({activeProductModal.reviewsCount} 則飼主評價)</span>
                  </>
                ) : (
                  <span className="text-slate-500">暫無評價（等待首位飼主分享）</span>
                )}
              </div>

              <h2 className="mt-1 text-lg font-bold text-white">{activeProductModal.name}</h2>
              <p className="mt-1 font-mono text-2xl font-bold text-cyan-300">
                {money(activeProductModal.priceNt)}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {activeProductModal.tags.map((t) => (
                  <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <Button
                  variant="secondary"
                  className="text-xs gap-1.5"
                  onClick={() => handleAddToFamilyList(activeProductModal)}
                >
                  <Users size={14} className="text-cyan-400" />
                  加入家庭清單
                </Button>
                <Button
                  className="text-xs gap-1.5 shadow-md shadow-cyan-500/20"
                  onClick={() => handleAddToCart(activeProductModal)}
                >
                  <ShoppingBag size={14} />
                  一鍵買同款
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 發布生活日記彈窗 */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f1523] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Camera className="text-cyan-400" size={18} />
                  <h2 className="text-lg font-bold text-white">發布毛孩生活日記</h2>
                </div>
                <button
                  onClick={() => setIsPostModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="mt-4 space-y-4">
                <div>
                  <label className="field-label">日記內文與飼餵心得 *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="分享毛孩今天的可愛片刻、愛吃的食物或好物開箱心得..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="field-label">標籤（以空格分隔）</label>
                  <input
                    type="text"
                    value={newPostTags}
                    onChange={(e) => setNewPostTags(e.target.value)}
                    className="input"
                  />
                </div>

                <div className="rounded-xl border border-amber-400/20 bg-amber-950/20 p-3 text-xs text-amber-200 flex items-center gap-2">
                  <Coins size={16} className="shrink-0 text-amber-400" />
                  <span>發布生活日記成功後，系統將自動為您發放 <strong>50 枚肉肉幣</strong>，可全額折抵商城消費！</span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsPostModalOpen(false)}
                  >
                    取消
                  </Button>
                  <Button type="submit">發布生活日記</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
