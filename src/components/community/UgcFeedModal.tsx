"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  ShieldCheck,
  TriangleAlert,
  Heart,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ugcPosts, getProduct } from "@/lib/catalog";
import { money } from "@/lib/utils";
import { matchProduct } from "@/lib/matching";
import { useActivePet } from "@/store/usePetContextStore";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
export function UgcFeedModal() {
  const id = useUiStore((s) => s.ugcPostId);
  const close = useUiStore((s) => s.openUgc);
  const calc = useUiStore((s) => s.openCalculator);
  const add = useCartStore((s) => s.addItem);
  const pet = useActivePet();
  const video = useRef<HTMLVideoElement>(null);
  const post = ugcPosts.find((p) => p.id === id);
  const product = getProduct(post?.productId ?? "");
  useEffect(() => {
    const element = video.current;
    return () => {
      if (element) {
        element.pause();
        element.removeAttribute("src");
        element.load();
      }
    };
  }, [id]);
  if (!post || !product) return null;
  const fit = matchProduct(product, pet);
  function addItem() {
    if (!product) return;
    try {
      add({
        productId: product.id,
        petId: pet.id,
        quantity: 1,
        mode: "ONCE",
        intervalDays: null,
      });
      toast.success("同款商品已加入購物車，繼續享受毛孩日常");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "無法加入商品");
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close(null);
      }}
    >
      <DialogContent side="right" className="!max-w-5xl !p-0">
        <div className="grid min-h-full lg:grid-cols-[1.15fr_1fr]">
          <div className="bg-[#090d16]">
            <div className="relative aspect-square">
              {post.media.kind === "video" ? (
                <video
                  ref={video}
                  src={post.media.src}
                  poster={post.image}
                  controls
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                >
                  <track
                    kind="captions"
                    src={post.media.captionSrc}
                    srcLang="zh-TW"
                    label="繁體中文字幕"
                    default
                  />
                </video>
              ) : (
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  sizes="(max-width:1024px) 100vw,50vw"
                  className="object-cover"
                />
              )}
            </div>
            <div className="p-6">
              <span className="text-xs text-amber-300">
                開箱情境示範 · AI 生成圖片
              </span>
              <DialogTitle className="mt-3 text-2xl font-semibold leading-relaxed">
                {post.title}
              </DialogTitle>
              <DialogDescription className="mt-3 text-sm leading-7 text-slate-400">
                {post.text}
              </DialogDescription>
              <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
                <span className="flex size-10 items-center justify-center rounded-full bg-amber-400/10 text-amber-300">
                  <Heart size={18} />
                </span>
                <div>
                  <p className="text-sm">{post.author}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {post.breed} · {post.age} · {post.weight}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-center p-6 sm:p-8"
          >
            <span className="eyebrow mb-5">讓喜歡，成為日常</span>
            <h3 className="text-xl font-semibold">帶走毛孩同款</h3>
            <Image
              src={product.image}
              alt="同款商品概念包裝示意"
              width={300}
              height={300}
              className="mx-auto my-5 aspect-square w-full max-w-64 rounded-2xl object-cover"
            />
            <h4 className="text-xl font-semibold">{product.name}</h4>
            <p className="mt-2 text-sm text-slate-400">
              {product.bagGrams / 1000} 公斤 · {product.subtitle}
            </p>
            <p className="my-5 font-mono text-3xl">{money(product.priceNt)}</p>
            <div
              className={`mb-5 flex items-center gap-2 rounded-xl border p-3 text-sm ${fit.safe ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300" : "border-amber-400/20 bg-amber-400/5 text-amber-300"}`}
            >
              {fit.safe ? (
                <ShieldCheck size={17} />
              ) : (
                <TriangleAlert size={17} />
              )}
              {fit.label}
            </div>
            <Button size="lg" onClick={addItem} disabled={!fit.safe}>
              <ShoppingBag />
              把同款加入購物車
            </Button>
            <Button
              variant="secondary"
              className="mt-3"
              disabled={!fit.safe}
              onClick={() => {
                close(null);
                calc(product.id);
              }}
            >
              <Calculator />
              先幫{pet.name}算份量
            </Button>
            <p className="mt-4 text-center text-xs text-slate-500">
              不離開日常靈感，也能完成選購。
            </p>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
