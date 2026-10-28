import type { Metadata } from "next";
import Link from "next/link";
import { PawPrint, ShieldCheck, Sparkles } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "後台安全登入",
  description: "PURESPOT 營運後台管理員登入",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requested = (await searchParams).next;
  const nextPath = requested?.startsWith("/admin") ? requested : "/admin";

  return (
    <main
      id="main-content"
      className="relative isolate min-h-screen overflow-hidden bg-[#1a100c] px-5 py-16"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,#7d4b322e,transparent_32%),radial-gradient(circle_at_82%_76%,#d9805224,transparent_28%)]" />
      <PawPrint className="absolute left-[8%] top-[16%] size-24 rotate-[-18deg] text-[#f4a261]/5" />
      <PawPrint className="absolute bottom-[12%] right-[7%] size-36 rotate-[22deg] text-[#f4a261]/5" />

      <div className="relative mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
        <section className="max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-sm font-semibold tracking-[.18em] text-[#ffe8d6]"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#f4a261]/15 text-[#ffc38e]">
              <PawPrint size={22} />
            </span>
            PURESPOT
          </Link>
          <div className="mt-12 inline-flex items-center gap-2 text-xs font-medium tracking-[.16em] text-[#e9aa78]">
            <Sparkles size={15} />
            OPERATIONS WITH CARE
          </div>
          <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#fff7ec] sm:text-6xl">
            把每一份照顧，
            <span className="font-serif italic text-[#f4a261]">整理得更好。</span>
          </h2>
          <p className="mt-6 max-w-lg text-base leading-8 text-[#bea699]">
            從訂單、庫存到會員服務，讓營運團隊在清楚、安定的工作空間裡照顧每一個家庭。
          </p>
          <div className="mt-9 flex items-center gap-3 text-sm text-[#a88c7d]">
            <ShieldCheck size={18} className="text-[#e9aa78]" />
            加密工作階段 · 後台與管理 API 雙重保護
          </div>
        </section>

        <div className="flex justify-center lg:justify-end">
          <AdminLoginForm nextPath={nextPath} />
        </div>
      </div>
    </main>
  );
}
