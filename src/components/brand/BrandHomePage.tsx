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
    color: "from-[#fbf8f3] to-[#f4ece1]",
    border: "border-[#e8ded3]",
    img: "/images/salmon-cat.png",
  },
  {
    type: "DOG",
    label: "狗狗系列",
    emoji: "🐶",
    desc: "高蛋白天然乾糧・全齡主食罐・關節機能配方",
    color: "from-[#fbf8f3] to-[#f4ece1]",
    border: "border-[#e8ded3]",
    img: "/images/chicken-dog.png",
  },
];

const iconColor: Record<string, string> = {
  cyan: "text-[#5B93C5] bg-[#5B93C5]/10",
  emerald: "text-[#315F86] bg-[#315F86]/10",
  violet: "text-[#7a6452] bg-[#7a6452]/10",
  green: "text-[#5b7b63] bg-[#5b7b63]/10",
  amber: "text-[#a36341] bg-[#a36341]/10",
  blue: "text-[#586c75] bg-[#586c75]/10",
  rose: "text-[#5B93C5] bg-[#5B93C5]/10",
};

export function BrandHomePage() {
  const openCalc = useUiStore((s) => s.openCalculator);

  return (
    <main id="main-content" className="bg-[#f8f5ef] text-[#302b26]">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,#5B93C512,transparent_32%),radial-gradient(circle_at_82%_76%,#e8ded380,transparent_28%)]" />

        <div className="relative page-shell py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d9cfc3] bg-[#fbf8f3] px-4 py-1.5 text-xs font-semibold text-[#5B93C5] mb-6">
                  <Sparkles size={12} />
                  台灣唯一 7C 透明成分寵物主食品牌
                </span>
                <h1 className="text-5xl font-bold leading-tight tracking-tight text-[#302b26] lg:text-6xl xl:text-7xl">
                  懂牠，<br />
                  <span className="text-[#5B93C5]">
                    從每一口開始
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-[#675e53] max-w-lg">
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
                <Button asChild size="lg" className="gap-2 text-base px-6 bg-[#5B93C5] text-white hover:bg-[#376F9F]">
                  <Link href="/shop">
                    立即選購主食
                    <ArrowRight size={18} />
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2 text-base border border-[#d9cfc3] bg-[#fbf8f3] text-[#4e443a] hover:bg-[#ede5da]"
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
                className="mt-10 flex items-center gap-6 text-sm text-[#7e7266]"
              >
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#315F86]" />
                  SGS 第三方檢驗
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#5B93C5]" />
                  台灣在地溯源
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#7a6452]" />
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
              <div className="relative h-[520px] rounded-3xl overflow-hidden border border-[#e8ded3] bg-[#ede5da]">
                <Image
                  src="/images/cat-life.png"
                  alt="貓咪正在享用 PURESPOT 天然主食"
                  fill
                  priority
                  className="object-cover object-center"
                />
                {/* Overlay card */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="rounded-2xl border border-[#e8ded3] bg-white/95 backdrop-blur-xl p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-[#8a7f75]">AI 今日推薦</p>
                        <p className="mt-0.5 font-semibold text-[#302b26]">深海鮭魚主食凍乾</p>
                        <p className="text-xs font-semibold text-[#5B93C5]">每日建議：32g · NT$29/日</p>
                      </div>
                      <Button size="sm" asChild className="bg-[#5B93C5] text-white hover:bg-[#376F9F]">
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
      <section className="border-y border-[#e8ded3] bg-white/50 py-8">
        <div className="page-shell">
          <p className="text-center text-xs text-[#8a7f75] uppercase tracking-widest mb-6 font-semibold">媒體報導</p>
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {mediaLogos.map((name) => (
              <span key={name} className="text-[#675e53] font-medium text-sm hover:text-[#302b26] transition-colors">
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
            <h2 className="mt-3 text-4xl font-bold text-[#302b26]">7C 透明承諾</h2>
            <p className="mt-4 text-[#675e53] max-w-xl mx-auto">
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
                <h3 className="mt-4 font-semibold text-[#302b26] text-sm">{v.title}</h3>
                <p className="mt-2 text-xs leading-6 text-[#675e53]">{v.desc}</p>
              </motion.div>
            ))}
            {/* CTA card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="panel p-6 border-[#e8ded3] bg-[#fbf8f3] flex flex-col justify-between"
            >
              <div>
                <span className="text-xs text-[#5B93C5] uppercase tracking-widest font-semibold">查看完整報告</span>
                <h3 className="mt-3 text-lg font-bold text-[#302b26]">7C 成分<br />透明度報告</h3>
                <p className="mt-2 text-xs text-[#675e53] leading-6">含產地地圖、第三方檢驗結果與完整成分對照表。</p>
              </div>
              <Button asChild className="mt-6 w-full gap-1.5 bg-[#5B93C5] text-white hover:bg-[#376F9F]">
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
      <section className="py-20 bg-white/40 border-y border-[#e8ded3]">
        <div className="page-shell">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="eyebrow">精選系列</span>
            <h2 className="mt-3 text-4xl font-bold text-[#302b26]">為你的毛孩量身配糧</h2>
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
                  <h3 className="mt-4 text-2xl font-bold text-[#302b26]">{series.label}</h3>
                  <p className="mt-2 text-[#675e53] text-sm">{series.desc}</p>
                  <Button asChild className="mt-6 gap-2 bg-[#5B93C5] text-white hover:bg-[#376F9F]">
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
      <section className="py-24 bg-[#f4eee6]">
        <div className="page-shell text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-[#302b26]">今天，開始給牠<br />真正知道的食物</h2>
            <p className="mt-4 text-[#675e53] max-w-md mx-auto">
              輸入毛孩資料，讓 AI 推薦最適合的主食，計算每日份量，一鍵加入定期配計畫。
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="gap-2 text-base px-8 bg-[#5B93C5] text-white hover:bg-[#376F9F]">
                <Link href="/shop">
                  立即選購
                  <ArrowRight size={18} />
                </Link>
              </Button>
              <Button variant="secondary" size="lg" asChild className="gap-2 text-base border border-[#d9cfc3] bg-[#fbf8f3] text-[#4e443a] hover:bg-[#ede5da]">
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
