"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Shield,
  MapPin,
  FlaskConical,
  Leaf,
  HeartHandshake,
  Award,
  Sparkles,
  ArrowRight,
  Play,
  Star,
  ChevronRight,
  Repeat2,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/useUiStore";

const coreValues = [
  {
    icon: Shield,
    color: "cyan",
    title: "成分透明（Clarity）",
    desc: "每一款主食完整公開原料清單、來源地與化驗保證值，沒有模糊帶過的項目。",
  },
  {
    icon: MapPin,
    color: "emerald",
    title: "產地溯源（Chain）",
    desc: "台灣在地嚴選農場直送原料，每批食材皆可追蹤至飼育農戶，讓您知道每口食物從哪裡來。",
  },
  {
    icon: FlaskConical,
    color: "violet",
    title: "第三方檢驗（Certified）",
    desc: "所有批次出廠前完成 SGS 重金屬、農藥殘留與微生物的獨立機構化驗，報告公開查詢。",
  },
  {
    icon: Leaf,
    color: "green",
    title: "天然配方（Clean）",
    desc: "無人工防腐劑、無人工色素、無填充穀物。配方由寵物營養師設計，依生命週期調整比例。",
  },
  {
    icon: HeartHandshake,
    color: "amber",
    title: "個性化配糧（Customized）",
    desc: "輸入毛孩的年齡、體重、品種與過敏原，系統自動推薦最適合的主食組合並試算每日份量。",
  },
  {
    icon: Repeat2,
    color: "blue",
    title: "循環訂閱制（Continuous）",
    desc: "智慧定期配系統依照毛孩的消耗量自動安排出貨，告別斷糧焦慮，定期配享 9 折專屬優惠。",
  },
  {
    icon: Award,
    color: "rose",
    title: "社群共創（Community）",
    desc: "每一位飼主的真實開箱體驗與健康回饋，都成為下一款配方改進的數據來源。",
  },
];

const testimonials = [
  {
    name: "Miko 的家人",
    breed: "英國短毛貓 · 4 歲",
    quote: "換了 PURESPOT 之後毛球變少，毛色光澤很明顯。最重要的是知道每一口吃的是什麼。",
    rating: 5,
  },
  {
    name: "阿旺爸",
    breed: "黃金獵犬 · 2 歲",
    quote: "看到成分表都看得懂，不用猜原料。定期配讓我完全忘記補糧這件事，省很多心力。",
    rating: 5,
  },
  {
    name: "橘子媽媽",
    breed: "橘貓 · 7 歲",
    quote: "老貓換糧很難，但 PURESPOT 的健康儀表板讓我追蹤體重趨勢，兩週就看到改善。",
    rating: 5,
  },
];

const mediaLogos = [
  "今周刊", "商業周刊", "ELLE", "寵物圈圈", "毛孩時代",
];

const productSeries = [
  {
    type: "CAT",
    label: "貓咪系列",
    emoji: "🐱",
    desc: "無穀主食凍乾・原肉主食罐・機能保健補充",
    color: "from-cyan-950/60 to-violet-950/40",
    border: "border-cyan-400/20",
    img: "/images/salmon-cat.png",
  },
  {
    type: "DOG",
    label: "狗狗系列",
    emoji: "🐶",
    desc: "高蛋白天然乾糧・全齡主食罐・關節機能配方",
    color: "from-amber-950/60 to-orange-950/40",
    border: "border-amber-400/20",
    img: "/images/chicken-dog.png",
  },
];

const iconColor: Record<string, string> = {
  cyan: "text-cyan-400 bg-cyan-400/10",
  emerald: "text-emerald-400 bg-emerald-400/10",
  violet: "text-violet-400 bg-violet-400/10",
  green: "text-green-400 bg-green-400/10",
  amber: "text-amber-400 bg-amber-400/10",
  blue: "text-blue-400 bg-blue-400/10",
  rose: "text-rose-400 bg-rose-400/10",
};

export function BrandHomePage() {
  const openCalc = useUiStore((s) => s.openCalculator);

  return (
    <main id="main-content">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#090D16] via-[#0a1628] to-[#090D16]" />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

        <div className="relative page-shell py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs text-cyan-300 mb-6">
                  <Sparkles size={12} />
                  台灣唯一 7C 透明成分寵物主食品牌
                </span>
                <h1 className="text-5xl font-bold leading-tight tracking-tight text-white lg:text-6xl xl:text-7xl">
                  懂牠，<br />
                  <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    從每一口開始
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-400 max-w-lg">
                  我們相信，知道吃什麼、從哪裡來、怎麼製作，才是真正對毛孩負責。
                  PURESPOT 以 7C 透明標準，讓每一份餐食都能被驗證、被信任。
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-10 flex flex-wrap gap-4"
              >
                <Button asChild size="lg" className="gap-2 text-base px-6">
                  <Link href="/shop">
                    立即選購主食
                    <ArrowRight size={18} />
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2 text-base"
                  onClick={() => openCalc(null)}
                >
                  <Calculator size={18} />
                  計算每日份量
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-10 flex items-center gap-6 text-sm text-slate-500"
              >
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  SGS 第三方檢驗
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-cyan-400" />
                  台灣在地溯源
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-violet-400" />
                  定期配享 9 折
                </span>
              </motion.div>
            </div>

            {/* Hero visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="relative hidden lg:block"
            >
              <div className="relative h-[520px] rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#111827] to-[#0a0f1c]">
                <Image
                  src="/images/cat-life.png"
                  alt="貓咪正在享用 PURESPOT 天然主食"
                  fill
                  priority
                  className="object-cover object-center"
                />
                {/* Overlay card */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="rounded-2xl border border-white/10 bg-[#090D16]/80 backdrop-blur-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">AI 今日推薦</p>
                        <p className="mt-0.5 font-semibold text-white">深海鮭魚主食凍乾</p>
                        <p className="text-xs text-cyan-300">每日建議：32g · NT$29/日</p>
                      </div>
                      <Button size="sm" asChild>
                        <Link href="/shop">選購</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 媒體露出 ── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-8">
        <div className="page-shell">
          <p className="text-center text-xs text-slate-600 uppercase tracking-widest mb-6">媒體報導</p>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {mediaLogos.map((name) => (
              <span key={name} className="text-slate-500 font-medium text-sm hover:text-slate-300 transition-colors">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7C 核心理念 ── */}
      <section className="py-24">
        <div className="page-shell">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="eyebrow">我們的信念</span>
            <h2 className="mt-3 text-4xl font-bold text-white">7C 透明承諾</h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              七個維度的透明標準，構成 PURESPOT 每一份主食的品質基礎。
              不是口號，每一項都可以被驗證。
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {coreValues.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`panel p-6 ${i === 0 ? "lg:col-span-1" : ""}`}
              >
                <span className={`inline-flex size-10 items-center justify-center rounded-xl ${iconColor[v.color]}`}>
                  <v.icon size={20} />
                </span>
                <h3 className="mt-4 font-semibold text-white text-sm">{v.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-400">{v.desc}</p>
              </motion.div>
            ))}
            {/* CTA card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="panel p-6 bg-gradient-to-br from-cyan-950/40 to-[#111827] border-cyan-400/20 flex flex-col justify-between"
            >
              <div>
                <span className="text-xs text-cyan-400 uppercase tracking-widest font-medium">查看完整報告</span>
                <h3 className="mt-3 text-lg font-bold text-white">7C 成分<br />透明度報告</h3>
                <p className="mt-2 text-xs text-slate-400 leading-6">含產地地圖、第三方檢驗結果與完整成分對照表。</p>
              </div>
              <Button asChild className="mt-6 w-full gap-1.5">
                <Link href="/transparency">
                  查看報告
                  <ChevronRight size={14} />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 產品系列 ── */}
      <section className="py-20 bg-white/[0.015]">
        <div className="page-shell">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="eyebrow">精選系列</span>
            <h2 className="mt-3 text-4xl font-bold text-white">為你的毛孩量身配糧</h2>
          </motion.div>
          <div className="grid gap-6 lg:grid-cols-2">
            {productSeries.map((series, i) => (
              <motion.div
                key={series.type}
                initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className={`relative overflow-hidden rounded-3xl border ${series.border} bg-gradient-to-br ${series.color} p-8 group`}
              >
                <div className="relative z-10">
                  <span className="text-4xl">{series.emoji}</span>
                  <h3 className="mt-4 text-2xl font-bold text-white">{series.label}</h3>
                  <p className="mt-2 text-slate-400 text-sm">{series.desc}</p>
                  <Button asChild className="mt-6 gap-2">
                    <Link href={`/shop?type=${series.type}`}>
                      瀏覽系列
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                </div>
                <div className="absolute right-0 bottom-0 w-48 h-48 opacity-20 group-hover:opacity-30 transition-opacity">
                  <Image src={series.img} alt={series.label} fill className="object-contain object-right-bottom" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ── 底部 CTA ── */}
      <section className="py-24 bg-gradient-to-b from-transparent to-cyan-950/10">
        <div className="page-shell text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white">今天，開始給牠<br />真正知道的食物</h2>
            <p className="mt-4 text-slate-400 max-w-md mx-auto">
              輸入毛孩資料，讓 AI 推薦最適合的主食，計算每日份量，一鍵加入定期配計畫。
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="gap-2 text-base px-8">
                <Link href="/shop">
                  立即選購
                  <ArrowRight size={18} />
                </Link>
              </Button>
              <Button variant="secondary" size="lg" asChild className="gap-2 text-base">
                <Link href="/transparency">
                  <FlaskConical size={18} />
                  查看透明度報告
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
