"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Scale, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCompareStore } from "@/store/useCompareStore";
import { petLabels, type Product } from "@/lib/types";
import { money, packageSize } from "@/lib/utils";

export function ProductComparison({ products }: { products: Product[] }) {
  const ids = useCompareStore((state) => state.ids);
  const open = useCompareStore((state) => state.open);
  const setOpen = useCompareStore((state) => state.setOpen);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);
  const selected = ids.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
  if (!selected.length) return null;

  const details = [
    { label: "售價", value: (product: Product) => money(product.priceNt) },
    { label: "適用動物", value: (product: Product) => petLabels[product.type] },
    { label: "分類", value: (product: Product) => product.category },
    { label: "商品類型", value: (product: Product) => product.kind === "SUPPLIES" ? "用品與玩具" : "食物與點心" },
    { label: "規格重量", value: (product: Product) => packageSize(product.bagGrams) },
    { label: "熱量", value: (product: Product) => product.kind !== "SUPPLIES" && product.kcalPer100g > 0 ? `${product.kcalPer100g} kcal / 100g` : "請參考商品資料" },
  ];

  return <>
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl items-center gap-3 border border-[#d4bda9] bg-[#fffaf3]/95 p-3 shadow-[0_18px_45px_-18px_#3b342e] backdrop-blur-md sm:bottom-6 sm:p-4" role="status">
      <Scale size={20} className="shrink-0 text-[#a35f44]" />
      <span className="min-w-0 flex-1 text-sm font-medium text-[#43372e]">已選 {selected.length} / 3 款商品</span>
      <button type="button" onClick={clear} className="min-h-10 px-2 text-xs text-[#846f5e] hover:text-[#9b563b]">清空</button>
      <button type="button" onClick={() => setOpen(true)} className="min-h-10 bg-[#935941] px-4 text-sm font-semibold text-white hover:bg-[#794632]">並排比較</button>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="!max-w-5xl !border-[#d8c9b8] !bg-[#f8f4ed] !text-[#302b26]">
        <DialogTitle className="editorial-title pr-12 text-3xl">選物比較</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-[#75695e]">把價格、適用動物與規格放在一起看。商品資訊為展示資料，正式資訊請以實品為準。</DialogDescription>
        <div className="mt-7 overflow-x-auto">
          <div className="grid min-w-[620px] gap-px bg-[#d5c7b8]" style={{ gridTemplateColumns: `150px repeat(${selected.length}, minmax(150px, 1fr))` }}>
            <div className="bg-[#eee7db] p-4 text-xs font-semibold tracking-widest text-[#735d4c]">PURESPOT / SELECT</div>
            {selected.map((product) => <div key={product.id} className="bg-[#fffdf8] p-3"><div className="relative aspect-[1.4] bg-[#eee8df]"><Image src={product.image} alt={product.name} fill sizes="180px" className="object-contain p-2" /></div><strong className="mt-3 block text-sm">{product.name}</strong><div className="mt-2 flex items-center justify-between gap-1"><Link href={`/products/${product.slug}`} onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-xs text-[#995c42] underline underline-offset-2">商品詳情 <ArrowUpRight size={13} /></Link><button type="button" aria-label={`移除${product.name}`} onClick={() => remove(product.id)} className="rounded-full p-1 text-[#8e8073] hover:bg-[#eee2d7]"><X size={15} /></button></div></div>)}
            {details.map((row) => <div key={row.label} className="contents"><div className="bg-[#eee7db] p-4 text-xs font-semibold text-[#705d4f]">{row.label}</div>{selected.map((product) => <div key={`${row.label}-${product.id}`} className="bg-[#fffdf8] p-4 text-sm text-[#433a32]">{row.value(product)}</div>)}</div>)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
