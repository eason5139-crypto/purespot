"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Package,
  Plus,
  Trash2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Film,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { Button } from "@/components/ui/button";
import type { RevenueMetric, SalesHistoryPoint, AdminProductInput } from "@/lib/adminTypes";
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

export default function AdminPage() {
  const [metrics, setMetrics] = useState<RevenueMetric | null>(null);
  const [history, setHistory] = useState<SalesHistoryPoint[]>([]);
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "newProduct">("overview");

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

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, productsRes] = await Promise.all([
        fetch("/api/admin/analytics"),
        fetch("/api/admin/products"),
      ]);

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setMetrics(aData.metrics);
        setHistory(aData.history);
      }

      if (productsRes.ok) {
        const pData = await productsRes.json();
        setProducts(pData.products || []);
      }
    } catch {
      // 優雅錯誤處理
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAdminData();
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
        await fetchAdminData();
        setTimeout(() => setActiveTab("products"), 900);
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

  return (
    <div className="py-2">
      {/* 頂部標題與權限提示 */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="eyebrow flex items-center gap-1.5 text-cyan-400">
            <ShieldCheck size={14} />
            PURESPOT ENTERPRISE BACKOFFICE
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">後端營運管理系統</h1>
          <p className="mt-1 text-sm text-slate-400">
            即時監控營收動態、客單價、訂單轉化，並全面管理商城商品上架與影音素材。
          </p>
        </div>

        {/* 標籤頁切換按鈕 */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111827] p-1.5">
          <button
            onClick={() => setActiveTab("overview")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "overview"
                ? "bg-cyan-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            數據總覽
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "products"
                ? "bg-cyan-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            商品清單 ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("newProduct")}
            className={`flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === "newProduct"
                ? "bg-cyan-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Plus size={13} />
            新增商品
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-400">正在同步營運數據庫與商品檔案...</p>
        </div>
      ) : (
        <div className="mt-8">
          {/* TAB 1: 數據總覽 */}
          {activeTab === "overview" && metrics && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* 四大核心指標卡片 */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="panel relative overflow-hidden p-6 border-cyan-400/20 bg-gradient-to-br from-cyan-950/30 to-[#111827]">
                  <span className="text-xs text-cyan-300 font-medium">今日營業額</span>
                  <p className="mt-2 text-3xl font-bold font-mono text-white">{money(metrics.todayRevenueNt)}</p>
                  <p className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>今日訂單：{metrics.todayOrdersCount} 筆</span>
                    <span className="text-slate-400">{metrics.todayOrdersCount > 0 ? "即時結算" : "尚無訂單"}</span>
                  </p>
                </div>

                <div className="panel p-6 border-white/10">
                  <span className="text-xs text-slate-400 font-medium">近 7 日營業額（週營收）</span>
                  <p className="mt-2 text-3xl font-bold font-mono text-white">{money(metrics.weekRevenueNt)}</p>
                  <p className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>週訂單：{metrics.weekOrdersCount} 筆</span>
                    <span className="text-slate-400">{metrics.weekOrdersCount > 0 ? "累計統計" : "尚無訂單"}</span>
                  </p>
                </div>

                <div className="panel p-6 border-white/10">
                  <span className="text-xs text-slate-400 font-medium">本月營業額（月營收）</span>
                  <p className="mt-2 text-3xl font-bold font-mono text-white">{money(metrics.monthRevenueNt)}</p>
                  <p className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>本月累計：{metrics.monthOrdersCount} 筆</span>
                    <span className="text-slate-400">{metrics.monthOrdersCount > 0 ? "即時累計" : "本月起始"}</span>
                  </p>
                </div>

                <div className="panel relative overflow-hidden p-6 border-amber-400/20 bg-gradient-to-br from-amber-950/20 to-[#111827]">
                  <span className="text-xs text-amber-300 font-medium">平均客單價 (AOV)</span>
                  <p className="mt-2 text-3xl font-bold font-mono text-amber-200">
                    {money(metrics.averageOrderValueNt)}
                  </p>
                  <p className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>定期配營收佔比</span>
                    <span className="text-amber-400 font-mono font-semibold">{metrics.autoshipRatio}%</span>
                  </p>
                </div>
              </div>

              {/* 營業額趨勢圖表 (TradingView Lightweight Charts) */}
              <RevenueTrendChart data={history} />

              {/* 進階指標看板 */}
              <div className="grid gap-5 md:grid-cols-3">
                <div className="panel p-5">
                  <p className="text-xs text-slate-400">累計總營業額</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-white">{money(metrics.totalRevenueNt)}</p>
                  <p className="mt-2 text-xs text-slate-500">真實資料庫已結算訂單總額</p>
                </div>
                <div className="panel p-5">
                  <p className="text-xs text-slate-400">顧客回購率 (Repeat Rate)</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-emerald-400">{metrics.repeatPurchaseRate}%</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {metrics.repeatPurchaseRate > 0 ? "真實顧客回購統計" : "等待新顧客產生回購"}
                  </p>
                </div>
                <div className="panel p-5">
                  <p className="text-xs text-slate-400">在線商品總數 / 庫存警戒</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-cyan-300">
                    {products.length} 款 / 0 缺貨
                  </p>
                  <p className="mt-2 text-xs text-slate-500">資料庫即時在庫商品</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: 商品管理清單 */}
          {activeTab === "products" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">上架商品管理 ({products.length})</h2>
                <Button onClick={() => setActiveTab("newProduct")} className="gap-1.5" size="sm">
                  <Plus size={15} />
                  新增商品
                </Button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
                    <tr>
                      <th className="p-4">商品與影音預覽</th>
                      <th className="p-4">物種 / 分類</th>
                      <th className="p-4">規格</th>
                      <th className="p-4">售價</th>
                      <th className="p-4">庫存</th>
                      <th className="p-4">定期配</th>
                      <th className="p-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {products.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
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
                                    含影音
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-block rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300">
                            {p.type === "CAT" ? "貓咪" : "狗狗"} · {p.category}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 3: 新增商品表單 */}
          {activeTab === "newProduct" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
              <div className="panel p-8">
                <h2 className="text-2xl font-bold text-white">上架新商品與配置影音素材</h2>
                <p className="mt-1 text-sm text-slate-400">
                  填寫商品規格、檢驗指標、照片與宣傳影片 URL，送出後即時加入商城供顧客購買。
                </p>

                {submitMsg && (
                  <div
                    className={`mt-6 flex items-center gap-2 rounded-xl p-4 text-sm ${
                      submitMsg.type === "success"
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {submitMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {submitMsg.text}
                  </div>
                )}

                <form onSubmit={handleCreateProduct} className="mt-8 space-y-6">
                  {/* 基本資訊 */}
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="field-label">商品名稱 *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="例如：頂級無穀鹿肉全齡主食罐"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="field-label">副標題 / 重點特色 *</label>
                      <input
                        type="text"
                        required
                        value={formData.subtitle}
                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                        placeholder="例如：單一肉源・低敏護腸胃"
                        className="input"
                      />
                    </div>
                  </div>

                  {/* 分類與對象 */}
                  <div className="grid gap-5 md:grid-cols-3">
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

                  {/* 價格與庫存 */}
                  <div className="grid gap-5 md:grid-cols-3">
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

                  {/* 影音與圖片素材 */}
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="field-label flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-cyan-400" />
                        商品主圖 URL *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        placeholder="/images/salmon-cat.png 或外部圖片網址"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="field-label flex items-center gap-1.5">
                        <Film size={14} className="text-amber-400" />
                        商品開箱 / 餵食影片 URL（選填）
                      </label>
                      <input
                        type="url"
                        value={formData.videoUrl}
                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                        placeholder="https://... (MP4 或影片展示網址)"
                        className="input"
                      />
                    </div>
                  </div>

                  {/* 營養化驗保證值 (7C 內容透明度) */}
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

                  {/* 詳細介紹 */}
                  <div>
                    <label className="field-label">商品詳細介紹 *</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input min-h-[100px]"
                    />
                  </div>

                  {/* 按鈕群 */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setActiveTab("products")}
                      disabled={submitting}
                    >
                      取消
                    </Button>
                    <Button type="submit" disabled={submitting} className="min-w-[140px]">
                      {submitting ? "商品上架中..." : "確認上架商品"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
