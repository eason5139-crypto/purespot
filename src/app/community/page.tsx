"use client";
import Image from "next/image";
import { Heart, Camera } from "lucide-react";
import { ugcPosts } from "@/lib/catalog";
import { useUiStore } from "@/store/useUiStore";
export default function CommunityPage() {
  const open = useUiStore((s) => s.openUgc);
  return (
    <main id="main-content" className="page-shell py-10">
      <div className="mb-8">
        <span className="eyebrow">平凡日常，也值得珍藏</span>
        <h1 className="mt-3 text-3xl font-semibold">今天，也被毛孩療癒了。</h1>
        <p className="mt-3 text-slate-400">
          看看開飯的小片刻，找到下一份餐桌靈感。
        </p>
      </div>
      <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
        {ugcPosts.map((post, index) => (
          <button
            key={post.id}
            onClick={() => open(post.id)}
            className="group mb-6 w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-[#111827] text-left transition-colors hover:border-cyan-400/40"
          >
            <div
              className={`relative ${index % 2 ? "aspect-square" : "aspect-[3/4]"}`}
            >
              <Image
                src={post.image}
                alt={post.title}
                fill
                sizes="(max-width:768px) 100vw,33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-slate-950/60 px-3 py-1.5 text-xs">
                <Camera size={12} />
                照片開箱
              </span>
            </div>
            <div className="p-5">
              <p className="text-xs text-amber-300">情境示範 · AI 生成圖片</p>
              <h2 className="mb-3 mt-2 text-lg font-medium">{post.title}</h2>
              <p className="text-xs text-slate-400">
                {post.breed} · {post.age} · {post.weight}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-slate-400">{post.author}</span>
                <Heart size={16} className="text-amber-300" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
