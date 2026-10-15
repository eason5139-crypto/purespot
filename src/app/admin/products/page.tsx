"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Package,
  Plus,
  Trash2,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { AdminProductInput } from "@/lib/adminTypes";
import { money } from "@/lib/utils";

interface ManagedProduct {
  id: string;
  name: string;
  subtitle: string;
  type: "CAT" | "DOG";
  category: string;
  priceNt: number;
  stock: number;
  image: string;
  videoUrl?: string;
  bagGrams: number;
  autoshipEligible: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<"ALL" | "CAT" | "DOG">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 新增商品表單狀態
  const [formData, setFormData] = useState<AdminProductInput>({
    name: "",
    subtitle: "",
    type: "CAT",
    category: "主食凍乾",
    priceNt: 850,
    stock: 50,
    bagGrams: 500,
    kcalPer100g: 420,
    proteinMin: 45,
    moistureMax: 8,
    ashMax: 7,
    image: "/images/salmon-cat.png",
    videoUrl: "",
    description: "嚴選在地天然食材，保留完整優質動物蛋白與豐富營養微量元素。",
    ingredients: ["新鮮去骨雞肉", "深海鮭魚油", "牛磺酸", "天然維生素E"],
    allergens: ["雞肉"],
    lifeStages: ["ADULT"],
    autoshipEligible: true,
    color: "cyan",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      // 容錯展示
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`確定要刪除商品「${name}」嗎？`)) return;
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      alert("刪除失敗，請檢查網路連線");
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitMsg({ type: "success", text: "✅ 商品新增成功！已即時加入商城庫存。" });
        await fetchProducts();
        setTimeout(() => {
          setIsModalOpen(false);
          setSubmitMsg(null);
        }, 1000);
      } else {
        const err = await res.json();
        setSubmitMsg({ type: "error", text: err.error || "新增失敗，請檢查欄位" });
      }
    } catch {
      setSubmitMsg({ type: "error", text: "連線異常，請稍後再試" });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.includes(search) || p.subtitle.includes(search) || p.category.includes(search);
    const matchSpecies = speciesFilter === "ALL" || p.type === speciesFilter;
    return matchSearch && matchSpecies;
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="eyebrow">管理端</span>
          <h1 className="mt-2 text-2xl font-bold text-white">商品管理</h1>
          <p className="mt-1 text-sm text-slate-400">
            維護全系列貓狗主糧、保健配方，設定 7C 營養檢驗保證值與多媒體素材。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => void fetchProducts()}
          >
            <RefreshCw size={14} />
            重新載入
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={15} />
            新增商品
          </Button>
        </div>
      </div>

      {/* 搜尋與物種篩選 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜尋商品名稱、分類、特色..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2 min-h-0"
          />
        </div>
        <div className="flex gap-2">
          {(["ALL", "CAT", "DOG"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSpeciesFilter(s)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                speciesFilter === s
                  ? "bg-cyan-500 text-slate-950 font-semibold"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {s === "ALL" ? "全部物種" : s === "CAT" ? "貓咪專用" : "狗狗專用"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-400">正在同步商品目錄...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
              <tr>
                <th className="p-4">商品與影音</th>
                <th className="p-4">物種 / 分類</th>
                <th className="p-4">規格</th>
                <th className="p-4">售價</th>
                <th className="p-4">庫存</th>
                <th className="p-4">定期配</th>
                <th className="p-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-black/40 border border-white/10">
                        <Image src={p.image} alt={p.name} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{p.subtitle}</span>
                          {p.videoUrl && (
                            <span className="flex items-center gap-1 text-cyan-400">
                              <Film size={11} />
                              含開箱影音
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-block rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300">
                      {p.type === "CAT" ? "🐱 貓咪" : "🐶 狗狗"} · {p.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-300">{p.bagGrams}g</td>
                  <td className="p-4 font-mono font-semibold text-cyan-300">{money(p.priceNt)}</td>
                  <td className="p-4 font-mono text-slate-300">{p.stock} 包</td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.autoshipEligible
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {p.autoshipEligible ? "享 9 折" : "單次購"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <Trash2 size={15} />
                      刪除
                    </Button>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-sm">
                    找不到符合條件的商品
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增商品彈出視窗 */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1523] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">上架新商品與配置素材</h2>
                  <p className="text-xs text-slate-400 mt-0.5">填寫規格、營養分析保證值與圖片網址</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {submitMsg && (
                <div
                  className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm ${
                    submitMsg.type === "success"
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {submitMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {submitMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateProduct} className="mt-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="field-label">商品名稱 *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如：原肉凍乾鹿肉主食糧"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="field-label">副標題 / 特色 *</label>
                    <input
                      type="text"
                      required
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="例如：單一肉源 · 低敏溫和護腸胃"
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="field-label">目標物種 *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as "CAT" | "DOG" })}
                      className="input"
                    >
                      <option value="CAT">貓咪專屬</option>
                      <option value="DOG">狗狗專屬</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">商品分類 *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input"
                    >
                      <option value="主食乾糧">主食乾糧</option>
                      <option value="主食凍乾">主食凍乾</option>
                      <option value="原肉主食罐">原肉主食罐</option>
                      <option value="機能保健">機能保健</option>
                      <option value="日常清潔">日常清潔</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">規格公克數 (g) *</label>
                    <input
                      type="number"
                      required
                      value={formData.bagGrams}
                      onChange={(e) => setFormData({ ...formData, bagGrams: Number(e.target.value) })}
                      className="input font-mono"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="field-label">定價 (NT$) *</label>
                    <input
                      type="number"
                      required
                      value={formData.priceNt}
                      onChange={(e) => setFormData({ ...formData, priceNt: Number(e.target.value) })}
                      className="input font-mono"
                    />
                  </div>
                  <div>
                    <label className="field-label">初始庫存量 (包) *</label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="input font-mono"
                    />
                  </div>
                  <div>
                    <label className="field-label">每 100g 熱量 (kcal)</label>
                    <input
                      type="number"
                      value={formData.kcalPer100g}
                      onChange={(e) => setFormData({ ...formData, kcalPer100g: Number(e.target.value) })}
                      className="input font-mono"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="field-label flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-cyan-400" />
                      主圖 URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="/images/salmon-cat.png"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="field-label flex items-center gap-1.5">
                      <Film size={14} className="text-amber-400" />
                      開箱影片 URL（選填）
                    </label>
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      placeholder="https://..."
                      className="input"
                    />
                  </div>
                </div>

                {/* 營養化驗保證值 */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                    營養分析保證值（7C 內容透明度指標）
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-xs text-slate-400">最低粗蛋白質 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.proteinMin}
                        onChange={(e) => setFormData({ ...formData, proteinMin: Number(e.target.value) })}
                        className="input font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">最高水分 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.moistureMax}
                        onChange={(e) => setFormData({ ...formData, moistureMax: Number(e.target.value) })}
                        className="input font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">最高粗灰分 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.ashMax}
                        onChange={(e) => setFormData({ ...formData, ashMax: Number(e.target.value) })}
                        className="input font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="field-label">商品介紹說明 *</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "商品上架中..." : "確認上架商品"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
