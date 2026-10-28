"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ImagePlus, Package, Plus, RefreshCw, Save, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { adminProductInputSchema, type AdminProductInput } from "@/lib/adminTypes";
import { shopCategories } from "@/lib/productCategories";
import type { Product } from "@/lib/types";
import { petLabels, type PetType } from "@/lib/types";
import { money } from "@/lib/utils";

const emptyProduct: AdminProductInput = {
  name: "",
  subtitle: "",
  type: "CAT",
  kind: "FOOD",
  category: "主食乾糧",
  priceNt: 0,
  stock: 0,
  bagGrams: 1000,
  kcalPer100g: 380,
  proteinMin: 30,
  moistureMax: 10,
  ashMax: 8,
  image: "/images/salmon-cat.png",
  gallery: [],
  videoUrl: "",
  description: "",
  ingredients: [],
  allergens: [],
  lifeStages: ["ADULT"],
  autoshipEligible: true,
  isPublished: false,
  color: "amber",
};

const editorTabs = [
  { id: "basic", label: "基本資料" },
  { id: "media", label: "圖片影音" },
  { id: "nutrition", label: "營養與適配" },
  { id: "commerce", label: "售價與上架" },
] as const;
type EditorTab = typeof editorTabs[number]["id"];

function fromProduct(product: Product): AdminProductInput {
  return {
    name: product.name,
    subtitle: product.subtitle,
    type: product.type,
    kind: product.kind ?? "FOOD",
    category: product.category,
    priceNt: product.priceNt,
    stock: product.stock,
    bagGrams: product.bagGrams,
    kcalPer100g: product.kcalPer100g,
    proteinMin: product.proteinMin,
    moistureMax: product.moistureMax,
    ashMax: product.ashMax,
    image: product.image,
    gallery: product.gallery ?? [],
    videoUrl: product.videoUrl ?? "",
    description: product.description,
    ingredients: product.ingredients,
    allergens: product.allergens,
    lifeStages: product.lifeStages,
    autoshipEligible: product.autoshipEligible,
    isPublished: product.isPublished ?? true,
    color: product.color,
  };
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#f4e5d9]">{label}</span>
      <input
        className="input"
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | PetType | "DRAFT">("ALL");
  const [kindFilter, setKindFilter] = useState<"all" | "FOOD" | "SUPPLIES">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<EditorTab>("basic");
  const [form, setForm] = useState<AdminProductInput>(emptyProduct);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const data = (await response.json()) as { products?: Product[]; error?: string };
      if (!response.ok || !data.products) throw new Error(data.error || "無法讀取商品");
      setProducts(data.products);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "無法讀取商品");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => products.filter((product) => {
    const searchText = `${product.name} ${product.subtitle} ${product.category} ${product.ingredients.join(" ")}`.toLowerCase();
    return searchText.includes(query.toLowerCase()) &&
      (filter === "ALL" || (filter === "DRAFT" ? !product.isPublished : product.type === filter)) &&
      (kindFilter === "all" || (product.kind ?? "FOOD") === kindFilter) &&
      (categoryFilter === "all" || product.category === categoryFilter);
  }), [products, query, filter, kindFilter, categoryFilter]);
  const availableCategories = [...new Set(products.map((product) => product.category))];

  function update<K extends keyof AdminProductInput>(key: K, value: AdminProductInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setMessage("");
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyProduct, gallery: [], ingredients: [], allergens: [], lifeStages: ["ADULT"] });
    setTab("basic");
    setEditing(true);
    setError("");
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm(fromProduct(product));
    setTab("basic");
    setEditing(true);
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const validation = adminProductInputSchema.safeParse(form);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      const field = String(issue?.path[0] ?? "");
      const target: EditorTab = ["name", "subtitle", "type", "kind", "category", "description"].includes(field)
        ? "basic"
        : ["image", "gallery", "videoUrl"].includes(field)
          ? "media"
          : ["kcalPer100g", "proteinMin", "moistureMax", "ashMax", "ingredients", "allergens", "lifeStages"].includes(field)
            ? "nutrition" : "commerce";
      setTab(target);
      setError(`${editorTabs.find((item) => item.id === target)?.label}：${issue?.message ?? "請檢查欄位"}`);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "商品儲存失敗");
      await load();
      setEditing(false);
      setMessage(editingId ? "商品資訊已更新，前台重新整理後生效。" : "商品已建立，可在列表中繼續編輯。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "商品儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function unpublish(product: Product) {
    if (!window.confirm(`要將「${product.name}」下架嗎？商品資料仍會保留。`)) return;
    setError("");
    try {
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "下架失敗");
      await load();
      setMessage(`「${product.name}」已下架。`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "下架失敗");
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">商品與庫存</span>
          <h1 className="mt-2 text-3xl font-semibold text-[#fff7ec]">商品管理</h1>
          <p className="mt-2 text-sm text-[#bda595]">共 {products.length} 款商品 · {availableCategories.length} 個分類。可編輯照片、文案、營養資訊與上架狀態。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void load()} className="gap-2"><RefreshCw size={16} />重新整理</Button>
          <Button onClick={openNew} className="gap-2"><Plus size={16} />新增商品</Button>
        </div>
      </div>

      {error && <p role="alert" className="mb-5 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {message && <p role="status" className="mb-5 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}

      {editing ? (
        <form onSubmit={save} className="rounded-[1.75rem] border border-[#e9a06d]/20 bg-[#2a1b15] p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#fff7ec]">{editingId ? "編輯商品" : "新增商品"}</h2>
              <p className="mt-1 text-sm text-[#aa9385]">分頁填寫，最後按「儲存商品」。</p>
            </div>
            <button type="button" onClick={() => setEditing(false)} aria-label="關閉編輯器" className="rounded-xl p-2 text-[#c5aa98] hover:bg-white/5"><X size={20} /></button>
          </div>
          <div role="tablist" aria-label="商品資料分類" className="mt-7 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
            {editorTabs.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
                className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium ${tab === item.id ? "bg-[#f4a261] text-[#2b170f]" : "bg-white/5 text-[#c1aa9b] hover:bg-white/10"}`}>
                {item.label}
              </button>
            ))}
          </div>

          <div className="min-h-[340px] py-7">
            {tab === "basic" && (
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField label="商品名稱" required value={form.name} onChange={(value) => update("name", value)} />
                  <TextField label="副標題" required value={form.subtitle} onChange={(value) => update("subtitle", value)} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-sm font-medium text-[#f4e5d9]">適用動物</span><select className="input" value={form.type} onChange={(event) => { const type = event.target.value as PetType; setForm((previous) => ({ ...previous, type, autoshipEligible: (type === "CAT" || type === "DOG") && previous.kind === "FOOD" && previous.autoshipEligible })); }}>{(Object.entries(petLabels) as [PetType, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="block"><span className="mb-2 block text-sm font-medium text-[#f4e5d9]">商品類型</span><select className="input" value={form.kind} onChange={(event) => { const kind = event.target.value as "FOOD" | "SUPPLIES"; setForm((previous) => ({ ...previous, kind, autoshipEligible: kind === "FOOD" && (previous.type === "CAT" || previous.type === "DOG") && previous.autoshipEligible })); }}><option value="FOOD">食物與點心</option><option value="SUPPLIES">用品與玩具</option></select></label>
                </div><div className="grid gap-5 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-sm font-medium text-[#f4e5d9]">分類</span><input className="input" list="product-category-options" required value={form.category} onChange={(event) => update("category", event.target.value)} /><datalist id="product-category-options">{shopCategories.map(({ name }) => <option key={name} value={name} />)}</datalist><span className="mt-1 block text-xs text-[#a78c7c]">可選既有分類，也可輸入新分類名稱。</span></label>
                </div>
                <label className="block"><span className="mb-2 block text-sm font-medium text-[#f4e5d9]">商品詳細介紹</span><textarea className="input min-h-36" required value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
              </div>
            )}
            {tab === "media" && (
              <div className="grid gap-6">
                <MediaUploadField label="商品主圖" value={form.image} onChange={(url) => update("image", url)} />
                <div>
                  <h3 className="mb-3 text-sm font-medium text-[#f4e5d9]">商品相簿（最多 8 張）</h3>
                  <div className="mb-4 flex flex-wrap gap-3">
                    {form.gallery.map((url, index) => (
                      <div key={url + index} className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10">
                        <Image src={url} alt={`商品相簿第 ${index + 1} 張`} fill sizes="96px" className="object-cover" />
                        <button type="button" aria-label={`移除第 ${index + 1} 張照片`} onClick={() => update("gallery", form.gallery.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                  {form.gallery.length < 8 && <MediaUploadField label="新增相簿照片" value="" onChange={(url) => update("gallery", [...form.gallery, url])} />}
                </div>
                <TextField label="開箱影片網址（選填）" type="url" value={form.videoUrl ?? ""} onChange={(value) => update("videoUrl", value)} />
              </div>
            )}
            {tab === "nutrition" && (
              <div className="grid gap-5">
                {form.kind === "SUPPLIES" && <p className="text-sm text-[#d6bdaa]">用品無須填寫熱量及營養數值；可在基本資料寫明材質、尺寸與使用方式。</p>}
                {form.kind === "FOOD" && <>
                <div className="grid gap-5 sm:grid-cols-3">
                  <TextField label="每 100g 熱量（kcal）" type="number" value={form.kcalPer100g} onChange={(value) => update("kcalPer100g", Number(value))} />
                  <TextField label="最低粗蛋白（%）" type="number" value={form.proteinMin} onChange={(value) => update("proteinMin", Number(value))} />
                  <TextField label="最高水分（%）" type="number" value={form.moistureMax} onChange={(value) => update("moistureMax", Number(value))} />
                </div>
                <TextField label="最高粗灰分（%）" type="number" value={form.ashMax} onChange={(value) => update("ashMax", Number(value))} />
                <TextField label="主要成分（使用頓號分隔）" value={form.ingredients.join("、")} onChange={(value) => update("ingredients", value.split(/[、,，]/).map((s) => s.trim()).filter(Boolean))} />
                <TextField label="過敏原（使用頓號分隔，可留空）" value={form.allergens.join("、")} onChange={(value) => update("allergens", value.split(/[、,，]/).map((s) => s.trim()).filter(Boolean))} />
                </>}
                <fieldset><legend className="mb-2 text-sm font-medium text-[#f4e5d9]">適用生命階段</legend><div className="flex flex-wrap gap-4">{(["JUNIOR", "ADULT", "SENIOR"] as const).map((stage) => <label key={stage} className="flex items-center gap-2 text-sm text-[#d6bdaa]"><input type="checkbox" checked={form.lifeStages.includes(stage)} onChange={(event) => update("lifeStages", event.target.checked ? [...form.lifeStages, stage] : form.lifeStages.filter((value) => value !== stage))} />{stage === "JUNIOR" ? "幼年" : stage === "ADULT" ? "成年" : "熟齡"}</label>)}</div></fieldset>
              </div>
            )}
            {tab === "commerce" && (
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-3">
                  <TextField label="售價（NT$）" type="number" value={form.priceNt} onChange={(value) => update("priceNt", Number(value))} />
                  <TextField label="庫存（包）" type="number" value={form.stock} onChange={(value) => update("stock", Number(value))} />
                  <TextField label="包裝重量（g）" type="number" value={form.bagGrams} onChange={(value) => update("bagGrams", Number(value))} />
                </div>
                {form.kind === "FOOD" && (form.type === "CAT" || form.type === "DOG") && <label className="flex items-center gap-3 rounded-xl border border-white/10 p-4 text-sm text-[#e9d4c4]"><input type="checkbox" checked={form.autoshipEligible} onChange={(event) => update("autoshipEligible", event.target.checked)} />提供循環補貨</label>}
                <label className="flex items-center gap-3 rounded-xl border border-white/10 p-4 text-sm text-[#e9d4c4]"><input type="checkbox" checked={form.isPublished} onChange={(event) => update("isPublished", event.target.checked)} />在官網上架並可供選購</label>
                <p className="text-sm text-[#a78c7c]">先保存為草稿，確認圖片與規格後再上架。下架商品保留資料，可隨時重新發布。</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <p className="text-xs text-[#a78c7c]">圖片與文案儲存後，商城與商品頁將讀取更新資料。</p>
            <Button type="submit" disabled={saving} className="gap-2"><Save size={16} />{saving ? "儲存中…" : "儲存商品"}</Button>
          </div>
        </form>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9d8474]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋名稱、分類或成分" aria-label="搜尋商品" className="input pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              {([["ALL", "全部"], ["CAT", "貓咪"], ["DOG", "狗狗"], ["HAMSTER", "倉鼠"], ["RABBIT", "兔兔"], ["DRAFT", "草稿／下架"]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-11 rounded-xl px-4 text-sm ${filter === value ? "bg-[#f4a261] text-[#2b170f]" : "bg-white/5 text-[#c1aa9b]"}`}>{label}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-[#c1aa9b]">商品類型
              <select aria-label="篩選商品類型" value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)} className="min-h-11 rounded-xl border border-white/10 bg-[#2a1b15] px-3 text-sm text-[#f4e5d9]"><option value="all">全部</option><option value="FOOD">食物</option><option value="SUPPLIES">用品</option></select>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#c1aa9b]">商品分類
              <select aria-label="篩選商品分類" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-[#2a1b15] px-3 text-sm text-[#f4e5d9]">
                <option value="all">全部分類</option>
                {availableCategories.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          </div>
          {loading ? <p className="rounded-2xl border border-white/10 p-10 text-center text-[#a78c7c]">載入商品中…</p> : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center text-[#a78c7c]"><Package className="mx-auto mb-3" />目前沒有符合條件的商品</div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((product) => (
                <article key={product.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e9a06d]/15 bg-[#2a1b15] p-4">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[#1b120e]"><Image src={product.image} alt={product.name} fill sizes="80px" className="object-cover" /></div>
                  <div className="min-w-[190px] flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[#fff7ec]">{product.name}</h2><span className={`rounded-full px-2 py-0.5 text-xs ${product.isPublished ? "bg-emerald-400/10 text-emerald-200" : "bg-white/10 text-[#b79d8e]"}`}>{product.isPublished ? "上架中" : "草稿／下架"}</span></div>
                    <p className="mt-1 text-sm text-[#a78c7c]">{petLabels[product.type]} · {product.kind === "SUPPLIES" ? "用品" : "食物"} · {product.category} · {product.bagGrams}g</p>
                    <p className="mt-1 text-sm text-[#eeb98e]">{money(product.priceNt)} · 庫存 {product.stock}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.isPublished && <Link href={`/products/${product.slug}`} target="_blank" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm text-[#bda595] hover:bg-white/5"><ExternalLink size={14} />預覽</Link>}
                    <Button variant="secondary" size="sm" onClick={() => openEdit(product)}>編輯詳情</Button>
                    {product.isPublished && <Button variant="ghost" size="sm" onClick={() => void unpublish(product)}>下架</Button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
