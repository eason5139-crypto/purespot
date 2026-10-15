"use client";
import { motion } from "framer-motion";
import {
  Shield,
  MapPin,
  FlaskConical,
  Leaf,
  CheckCircle2,
  FileText,
  ExternalLink,
  Award,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/catalog";

const certifications = [
  {
    org: "SGS Taiwan",
    type: "重金屬檢驗",
    items: ["鉛 (Pb)", "鎘 (Cd)", "汞 (Hg)", "砷 (As)"],
    result: "全項合格",
    color: "emerald",
  },
  {
    org: "SGS Taiwan",
    type: "農藥殘留檢驗",
    items: ["有機磷類", "有機氯類", "除蟲菊精類", "氨基甲酸酯類"],
    result: "未檢出",
    color: "cyan",
  },
  {
    org: "財團法人全國認證基金會 (TAF)",
    type: "微生物檢驗",
    items: ["大腸桿菌群", "沙門氏菌", "金黃色葡萄球菌", "黴菌"],
    result: "全項合格",
    color: "violet",
  },
];

const origins = [
  { ingredient: "鮭魚原料", origin: "北海道直送野生鮭魚", flag: "🇯🇵", region: "日本 · 北海道" },
  { ingredient: "雞肉原料", origin: "台灣嘉義在地放牧雞", flag: "🇹🇼", region: "台灣 · 嘉義" },
  { ingredient: "鴨肉原料", origin: "台灣宜蘭有機鴨場", flag: "🇹🇼", region: "台灣 · 宜蘭" },
  { ingredient: "地瓜纖維", origin: "台灣雲林有機農場", flag: "🇹🇼", region: "台灣 · 雲林" },
  { ingredient: "豌豆蛋白", origin: "加拿大認證非基改豌豆", flag: "🇨🇦", region: "加拿大 · 曼尼托巴省" },
  { ingredient: "魚油提取", origin: "挪威深海小型魚類榨取", flag: "🇳🇴", region: "挪威 · 北海" },
];

const colorMap: Record<string, string> = {
  emerald: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
  cyan: "border-cyan-400/20 bg-cyan-400/5 text-cyan-300",
  violet: "border-violet-400/20 bg-violet-400/5 text-violet-300",
};

export function TransparencyPage() {
  return (
    <main id="main-content" className="page-shell py-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <span className="eyebrow flex items-center gap-1.5">
          <Shield size={13} />
          7C 透明度報告
        </span>
        <h1 className="mt-3 text-4xl font-bold text-white">成分透明，讓愛有據可查</h1>
        <p className="mt-4 text-slate-400 max-w-2xl leading-7">
          PURESPOT 承諾對每一款主食的原料來源、製造過程與檢驗結果完全公開。
          以下所有資訊均為實際批次數據，您可隨時查閱或要求索取原始報告。
        </p>
      </motion.div>

      {/* 第三方認證 */}
      <section className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <FlaskConical size={18} className="text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">第三方獨立檢驗認證</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {certifications.map((cert, i) => (
            <motion.div
              key={cert.type}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="panel p-6"
            >
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${colorMap[cert.color]}`}>
                <CheckCircle2 size={12} />
                {cert.result}
              </div>
              <h3 className="mt-4 font-semibold text-white">{cert.type}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{cert.org}</p>
              <ul className="mt-4 space-y-1.5">
                {cert.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-4 w-full gap-1.5 text-xs text-slate-400">
                <FileText size={12} />
                下載完整報告 (PDF)
                <ExternalLink size={11} />
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 產地溯源 */}
      <section className="mt-16">
        <div className="flex items-center gap-2 mb-6">
          <MapPin size={18} className="text-emerald-400" />
          <h2 className="text-xl font-semibold text-white">原料產地溯源</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {origins.map((o, i) => (
            <motion.div
              key={o.ingredient}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="panel p-5 flex items-start gap-4"
            >
              <span className="text-3xl shrink-0">{o.flag}</span>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">{o.ingredient}</p>
                <p className="mt-1 text-sm font-medium text-white">{o.origin}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <Globe size={11} />
                  {o.region}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 全商品營養保證值對照表 */}
      <section className="mt-16">
        <div className="flex items-center gap-2 mb-6">
          <Award size={18} className="text-amber-400" />
          <h2 className="text-xl font-semibold text-white">全商品營養保證值對照表</h2>
          <span className="ml-2 text-xs text-slate-500">（每 100g 乾物基準）</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs text-slate-400">
              <tr>
                <th className="p-4">商品名稱</th>
                <th className="p-4">物種</th>
                <th className="p-4">分類</th>
                <th className="p-4 text-right">最低粗蛋白(%)</th>
                <th className="p-4 text-right">最高水分(%)</th>
                <th className="p-4 text-right">最高粗灰分(%)</th>
                <th className="p-4 text-right">熱量(kcal)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-white">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.subtitle}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-300">
                      {p.type === "CAT" ? "🐱 貓" : "🐶 狗"}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-400">{p.category}</td>
                  <td className="p-4 text-right font-mono text-cyan-300">{p.proteinMin}%</td>
                  <td className="p-4 text-right font-mono text-slate-300">{p.moistureMax}%</td>
                  <td className="p-4 text-right font-mono text-slate-300">{p.ashMax}%</td>
                  <td className="p-4 text-right font-mono text-amber-300">{p.kcalPer100g}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 批次查詢說明 */}
      <section className="mt-12 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-6">
        <div className="flex items-start gap-4">
          <Shield size={22} className="text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-cyan-300">批次履歷查詢</h3>
            <p className="mt-2 text-sm text-cyan-100/70 leading-7">
              您可透過商品包裝上的批次號碼（格式：PS-YYYYMMDD）至本頁查詢該批次的原料來源、製造日期、
              化驗結果與保存期限。每批次的 SGS 檢驗報告均可申請電子版查閱。
            </p>
            <p className="mt-3 text-xs text-slate-500">
              如需索取特定批次完整檢驗報告，請聯絡 quality@purespot.tw
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 text-center">
        <Button asChild>
          <Link href="/shop">回到精品商城選購</Link>
        </Button>
      </div>
    </main>
  );
}
