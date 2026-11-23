"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, LockKeyhole } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { SurveyRunner } from "./SurveyRunner";
import type { Survey } from "@/lib/surveys";
import { celebrate } from "@/lib/celebrate";
export function SurveyPage({ id }: { id: string }) {
  const user = useAuthStore((s) => s.user),
    authLoading = useAuthStore((s) => s.loading),
    openAuth = useUiStore((s) => s.setAuthOpen);
  const [data, setData] = useState<{
      survey: Survey;
      open: boolean;
      completed: boolean;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!user) {
      setData(null);
      return;
    }
    let active = true;
    void fetch(`/api/surveys/${id}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, user?.id]);
  return (
    <main id="main-content" className="survey-page">
      <div className="page-shell py-10">
        <Link href="/" className="member-text-link">
          回首頁
        </Link>
        <div className="survey-layout mt-6">
          <aside className="survey-cover">
            <Image
              src={data?.survey.image || "/images/campaigns/survey-v3.webp"}
              alt="毛孩日常問卷"
              fill
              sizes="(max-width:900px) 100vw,40vw"
              className="object-cover"
            />
            <div>
              <Gift size={25} />
              <h1>{data?.survey.title ?? "想聽聽，你和毛孩的日常。"}</h1>
              <p>
                {data?.survey.description ??
                  "登入後開始填答，完成指定問卷可領點數或購物券。獎勵與使用規則會在填答前顯示。"}
              </p>
            </div>
          </aside>
          <section className="survey-content">
            {authLoading ? (
              <p>正在載入會員資料…</p>
            ) : !user ? (
              <div className="survey-finish">
                <LockKeyhole size={38} />
                <h2>登入，留住你的回饋。</h2>
                <p>填答前請先登入，完成後獎勵會存進同一個帳戶。</p>
                <button
                  className="member-primary"
                  onClick={() => openAuth(true)}
                >
                  登入後開始
                  <ArrowRight size={17} />
                </button>
              </div>
            ) : error ? (
              <p role="alert">{error}</p>
            ) : !data ? (
              <p>正在載入問卷…</p>
            ) : data.completed ? (
              <div className="survey-finish">
                <Gift size={42} />
                <h2>你已經完成這份問卷。</h2>
                <p>獎勵已記錄，同一份問卷每位會員限領一次。</p>
                <Link href="/account?tab=tickets" className="member-primary">
                  回會員中心
                  <ArrowRight size={17} />
                </Link>
              </div>
            ) : !data.open ? (
              <div className="survey-finish">
                <h2>這份問卷目前未開放。</h2>
                <Link href="/">回首頁看看其他活動</Link>
              </div>
            ) : (
              <>
                <div className="survey-reward">
                  <Gift size={18} />
                  {data.survey.reward.kind === "POINTS"
                    ? `完成回饋 ${data.survey.reward.points} 點`
                    : `完成回饋 ${data.survey.reward.title}，滿 ${data.survey.reward.minSpendNt} 元使用，有效 ${data.survey.reward.validDays} 天`}
                  <span>每位會員限一次</span>
                </div>
                <SurveyRunner
                  survey={data.survey}
                  onSubmit={async (answers) => {
                    const r = await fetch(`/api/surveys/${id}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        version: data.survey.version,
                        answers,
                      }),
                    });
                    const d = await r.json();
                    if (!r.ok) throw Error(d.error || "送出失敗");
                    void celebrate();
                  }}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
