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
    image: "/images/chicken-dog.png",
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
      image: "/images/chicken-dog.png",
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
    image: "/images/chicken-dog.png",
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
      image: "/images/chicken-dog.png",
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
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "這項商品目前不適合所選毛孩，請先切換毛孩資料。",
      );
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
      image: activePet.type === "CAT" ? "/images/salmon-cat.png" : "/images/chicken-dog.png",
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
        image: activePet.type === "CAT" ? "/images/salmon-cat.png" : "/images/chicken-dog.png",
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8ded3] pb-6">
        <div>
          <span className="eyebrow flex items-center gap-1.5 text-[#935941]">
            <Sparkles size={14} />
            PET UGC SOCIAL COMMERCE · 原生毛孩社交電商
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#302b26]">
            毛孩日常與真實飼餵圈
          </h1>
          <p className="mt-1 text-sm text-[#675e53]">
            點擊照片小白點標籤即可一鍵買同款；分享真實好物賺取「肉肉幣」折抵商城！
          </p>
        </div>

        {/* 肉肉幣錢包與發文按鈕 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-[#e8ded3] bg-white p-3 shadow-sm">
            <span className="text-xl">🪙</span>
            <div>
              <p className="text-[10px] uppercase font-semibold text-[#8a5a14]">我的肉肉幣</p>
              <p className="font-mono text-base font-bold text-[#935941]">
                {meatCoins} <span className="text-xs font-normal text-[#8a7f75]">枚 (可折 NT${meatCoins})</span>
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsPostModalOpen(true)}
            className="gap-1.5"
          >
            <Camera size={16} />
            發布生活日記 (+50幣)
          </Button>
        </div>
      </div>

      {/* 5大分流標籤列 */}
      <div className="my-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#e8ded3] bg-white p-1.5 shadow-sm">
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
                  ? "bg-[#935941] text-white font-semibold shadow-sm"
                  : "text-[#675e53] hover:text-[#302b26] hover:bg-[#f5ede3]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#8a7f75]">
          全站共累積 <strong>28,490</strong> 篇飼主認證生活好物分享
        </span>
      </div>

      {/* 專屬同好圈推薦卡片列 */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#8a7f75] uppercase tracking-wider flex items-center gap-1.5">
            <Users size={13} className="text-[#935941]" />
            專屬細分同好圈 (點擊加入即時交流)
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CIRCLES.map((c) => (
            <div
              key={c.id}
              className="panel group cursor-pointer p-4 transition-all bg-white hover:border-[#935941]/50 hover:shadow-md"
              onClick={() => toast.success(`已加入「${c.name}」！`)}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{c.icon}</span>
                <span className="rounded-full bg-[#f5ede3] px-2.5 py-0.5 text-[10px] font-mono text-[#935941] font-semibold">
                  {c.members} 成員
                </span>
              </div>
              <h2 className="mt-2 text-sm font-semibold text-[#302b26] group-hover:text-[#935941] transition-colors">
                {c.name}
              </h2>
              <p className="mt-1 text-xs text-[#8a7f75] line-clamp-1">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* UGC 動態瀑布流 */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="panel overflow-hidden bg-white flex flex-col justify-between shadow-sm"
          >
            {/* 貼文作者與毛孩主頁 Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#e8ded3]">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#f5ede3] text-[#935941] font-bold text-sm shadow-sm">
                  {post.authorAvatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-[#302b26]">{post.petName}</p>
                    <span className="rounded-md bg-[#eef0e8] border border-[#68856b]/30 px-1.5 py-0.2 text-[10px] text-[#425847] font-medium">
                      {post.breed} · {post.age}
                    </span>
                  </div>
                  <p className="text-xs text-[#8a7f75]">{post.author}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[#935941] hover:text-[#794632] hover:bg-[#f5ede3]"
                onClick={() => toast.success(`已關注 ${post.petName}！`)}
              >
                + 關注
              </Button>
            </div>

            {/* 貼文照片與生活標籤 */}
            <div className="relative aspect-square w-full overflow-hidden bg-[#ebe5da]">
              <Image
                src={post.image}
                alt={post.content}
                fill
                className="object-contain p-4 transition-transform duration-500 hover:scale-105"
              />

              {/* 脈動白色互動標籤 */}
              {post.shoppableProduct && post.tagPosition && (
                <button
                  type="button"
                  aria-label={`查看 ${post.shoppableProduct.name}`}
                  className="absolute z-10 cursor-pointer"
                  style={{
                    left: `${post.tagPosition.xPercent}%`,
                    top: `${post.tagPosition.yPercent}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={() => setActiveProductModal(post.shoppableProduct ?? null)}
                >
                  <div className="relative group">
                    <span className="absolute -inset-1.5 animate-ping rounded-full bg-[#935941]/30" />
                    <div className="relative flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-3 py-1.5 text-xs text-[#302b26] shadow-lg border border-[#e8ded3] hover:scale-105 transition-transform">
                      <span className="size-2 rounded-full bg-[#935941]" />
                      <span className="font-medium truncate max-w-[140px]">
                        {post.shoppableProduct.name}
                      </span>
                      <span className="font-mono text-[#935941] font-bold">
                        ${post.shoppableProduct.priceNt}
                      </span>
                      <ShoppingBag size={12} className="text-[#8a5a14]" />
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* 貼文互動按鈕與內文 */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#8a7f75] mb-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                        post.isLiked ? "text-rose-600 font-semibold" : "hover:text-[#302b26]"
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
                      className="hover:text-[#302b26] transition-colors"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => toast.success("已加入好物收藏！")}
                    className="hover:text-[#302b26] transition-colors"
                  >
                    <Bookmark size={16} />
                  </button>
                </div>

                <p className="text-sm text-[#4e443a] leading-relaxed">{post.content}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-[#f5ede3] px-2 py-0.5 text-[11px] text-[#935941] hover:bg-[#ede5da] cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 留言列表與輸入框 */}
              <div className="mt-4 border-t border-[#e8ded3] pt-3">
                <div className="space-y-1.5 max-h-24 overflow-y-auto mb-2 text-xs">
                  {post.comments.map((cm) => (
                    <p key={cm.id} className="text-[#675e53]">
                      <strong className="text-[#302b26] mr-1">{cm.author}:</strong>
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

      {/* 生活標籤彈出商品卡片 */}
      <AnimatePresence>
        {activeProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`${activeProductModal.name} 商品資訊`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-[#e8ded3] bg-[#faf7f2] p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setActiveProductModal(null)}
                aria-label="關閉商品資訊"
                className="absolute right-4 top-4 text-[#8a7f75] hover:text-[#302b26]"
              >
                ✕
              </button>

              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#ebe5da] mb-4 border border-[#e8ded3]">
                <Image
                  src={activeProductModal.image}
                  alt={activeProductModal.name}
                  fill
                  className="object-contain p-2"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-[#8a5a14]">
                {activeProductModal.reviewsCount > 0 ? (
                  <>
                    <span>★ {activeProductModal.rating}</span>
                    <span className="text-[#8a7f75]">({activeProductModal.reviewsCount} 則飼主評價)</span>
                  </>
                ) : (
                  <span className="text-[#8a7f75]">暫無評價（等待首位飼主分享）</span>
                )}
              </div>

              <h2 className="mt-1 text-lg font-bold text-[#302b26]">{activeProductModal.name}</h2>
              <p className="mt-1 font-mono text-2xl font-bold text-[#935941]">
                {money(activeProductModal.priceNt)}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {activeProductModal.tags.map((t) => (
                  <span key={t} className="rounded-md bg-white border border-[#e8ded3] px-2 py-0.5 text-xs text-[#675e53]">
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
                  <Users size={14} className="text-[#935941]" />
                  加入家庭清單
                </Button>
                <Button
                  className="text-xs gap-1.5"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-[#e8ded3] bg-[#faf7f2] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#e8ded3] pb-4">
                <div className="flex items-center gap-2">
                  <Camera className="text-[#935941]" size={18} />
                  <h2 className="text-lg font-bold text-[#302b26]">發布毛孩生活日記</h2>
                </div>
                <button
                  onClick={() => setIsPostModalOpen(false)}
                  className="text-[#8a7f75] hover:text-[#302b26]"
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

                <div className="rounded-xl border border-[#e2a84c]/30 bg-[#fdf6ea] p-3 text-xs text-[#8a5a14] flex items-center gap-2">
                  <Coins size={16} className="shrink-0 text-[#8a5a14]" />
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
