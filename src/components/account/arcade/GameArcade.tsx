"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Coins, Gift, Headset, LoaderCircle, PawPrint, RefreshCw, RotateCw, Ticket, Zap } from "lucide-react";
import { DEFAULT_ARCADE_CONFIG, WHEEL_KEYS, type WheelKey } from "@/lib/pointsArcadeConfig";
import type { ArcadeGame, ArcadeOutcome, ArcadePlayInput, ArcadeState } from "@/lib/arcade";
import { LuckyWheel, type GamePhase } from "./LuckyWheel";
import { CapsuleMachine } from "./CapsuleMachine";
import { ScratchTicket } from "./ScratchTicket";
import { GameCelebration } from "./GameCelebration";
import { useGameSound } from "./useGameSound";
import "./arcade.css";

const games = [
  { key: "wheel", name: "幸運轉盤", hint: "轉出毛孩的好禮" },
  { key: "capsule", name: "毛孩扭蛋機", hint: "轉一下，驚喜出球" },
  { key: "scratch", name: "幸運刮刮卡", hint: "親手刮開小幸運" },
] as const;
const titles = { wheel: "好運，轉到你這邊。", capsule: "今天，會掉出什麼？", scratch: "一點期待，親手揭曉。" };
const format = (n: number) => n.toLocaleString("zh-TW");
function AnimatedPoints({ value }: { value: number | null }) {
  const el = useRef<HTMLSpanElement>(null), number = useMotionValue(value ?? 0);
  useEffect(() => {
    if (value === null) return;
    const off = number.on("change", n => { if (el.current) el.current.textContent = format(Math.round(n)); });
    const a = animate(number, value, { duration: 0.35, ease: "easeOut" });
    return () => { off(); a.stop(); };
  }, [value, number]);
  return <span ref={el} aria-hidden="true">{value === null ? "—" : format(value)}</span>;
}
function MiniGame({ game }: { game: ArcadeGame }) { return <span className={`mini-game mini-${game}`} aria-hidden="true"><i /><b /><em /></span>; }

export function GameArcade({ userId, onExit }: { userId: string; onExit: () => void }) {
  const [state, setState] = useState<ArcadeState | null>(null), [game, setGame] = useState<ArcadeGame>("wheel"), [wheelKey, setWheelKey] = useState<WheelKey>("CAT");
  const [phase, setPhase] = useState<GamePhase>("idle"), [outcome, setOutcome] = useState<ArcadeOutcome | null>(null), [error, setError] = useState("");
  const [fast, setFast] = useState(true), [pending, setPending] = useState<ArcadePlayInput | null>(null), [syncing, setSyncing] = useState(false), [celebration, setCelebration] = useState<string | null>(null);
  const mounted = useRef(true), lock = useRef(false), controller = useRef<AbortController | null>(null), lastSettled = useRef<string | null>(null);
  const tabId = useId(), sound = useGameSound(), [historyRef] = useAutoAnimate<HTMLDivElement>({ duration: 220 });
  const storageKey = `purespot-arcade-round:${userId}`;
  const config = state?.config ?? DEFAULT_ARCADE_CONFIG, wheel = config.wheels[wheelKey];
  const pool = game === "wheel" ? wheel : game === "capsule" ? config.fukubiki : config.scratch;
  const cost = pool.costPoints;
  const busy = phase === "running" || phase === "settling" || phase === "scratching" || phase === "uncertain";
  const used = game === "capsule" ? state?.limits.capsuleUsed ?? 0 : state?.limits.scratchUsed ?? 0;
  const limit = "dailyLimit" in pool ? pool.dailyLimit : null;
  const available = !!state && state.points >= cost && (limit === null || used < limit);
  const maxPoints = Math.max(...pool.prizes.map(p => "points" in p ? p.points : p.kind === "POINTS" ? p.value : 0));
  const totalWeight = pool.prizes.reduce((n, p) => n + p.weight, 0);
  const refresh = useCallback(async (sync = false, signal?: AbortSignal) => {
    const r = await fetch(`/api/account/arcade${sync ? "?sync=1" : ""}`, { cache: "no-store", signal });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "點數暫時讀不到，請再試一次");
    if (mounted.current) setState(data as ArcadeState);
    return data as ArcadeState;
  }, []);
  useEffect(() => {
    mounted.current = true; const abort = new AbortController();
    setState(null); setError(""); lock.current = false;
    void refresh(false, abort.signal).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as ArcadePlayInput | null;
      if (saved && /^[0-9a-f-]{36}$/i.test(saved.requestId) && games.some(g => g.key === saved.game)) {
        setPending(saved); setGame(saved.game); setWheelKey(saved.wheelKey ?? "CAT"); setPhase("uncertain"); lock.current = true;
      }
    } catch {}
    return () => { mounted.current = false; abort.abort(); controller.current?.abort(); };
  }, [refresh, storageKey]);
  useEffect(() => {
    if (game !== "capsule" || phase !== "running") return;
    sound.cue("mix"); const interval = setInterval(() => { if (!document.hidden) sound.cue("mix"); }, 800);
    return () => { clearInterval(interval); sound.silence(); };
  }, [game, phase, sound.cue, sound.silence]);

  const finish = useCallback(() => {
    if (!outcome || lastSettled.current === outcome.requestId || !mounted.current) return;
    lastSettled.current = outcome.requestId; lock.current = false; setPhase("result");
    setState(current => current ? { ...current, history: [outcome, ...current.history.filter(h => h.requestId !== outcome.requestId)].slice(0, 6) } : current);
    sound.silence(); sound.cue(outcome.value ? "win" : "open"); if (outcome.value > 0) setCelebration(outcome.requestId);
  }, [outcome, sound.cue, sound.silence]);
  async function sendRound(input: ArcadePlayInput, retry = false) {
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 20000);
    try {
      const response = await fetch("/api/account/arcade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: abort.signal });
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500) {
          sessionStorage.removeItem(storageKey); setPending(null); lock.current = false; setPhase("idle");
          void refresh().catch(() => {});
          throw Object.assign(new Error(data.error || "這回合沒有完成，請確認點數與次數"), { definitive: true });
        }
        throw new Error(data.error || "暫時無法確認結果");
      }
      if (!mounted.current) return;
      const result = data.result as ArcadeOutcome;
      sessionStorage.removeItem(storageKey); setPending(null); setOutcome(result);
      setState(current => current ? { ...current, points: result.newBalance, limits: { ...current.limits,
        ...(result.game === "capsule" ? { capsuleUsed: result.usedToday ?? current.limits.capsuleUsed } : {}),
        ...(result.game === "scratch" ? { scratchUsed: result.usedToday ?? current.limits.scratchUsed } : {}),
      } } : current);
      setPhase(input.game === "scratch" ? "scratching" : "settling");
      if (retry) void refresh().catch(() => {});
    } catch (e) {
      if (!mounted.current) return;
      sound.silence(); sound.cue("error");
      if (e instanceof Error && "definitive" in e) setError(e.message);
      else { setPhase("uncertain"); setError("連線沒有回覆。按「確認這一回合」取回結果，系統會沿用這次紀錄。"); }
    } finally { clearTimeout(timeout); if (controller.current === abort) controller.current = null; }
  }
  function play() {
    if (lock.current || !available || syncing || !state) return;
    lock.current = true; setError(""); setOutcome(null); setCelebration(null);
    const input: ArcadePlayInput = { requestId: crypto.randomUUID(), game, revision: state.revision, ...(game === "wheel" ? { wheelKey } : {}) };
    setPending(input); setPhase("running"); sound.cue("tap");
    try { sessionStorage.setItem(storageKey, JSON.stringify(input)); } catch {}
    void sendRound(input);
  }
  const roundId = pending?.requestId ?? outcome?.requestId ?? "preview";
  function select(next: ArcadeGame) {
    if (busy) return; sound.cue("tap"); setGame(next); setPhase("idle"); setOutcome(null); setError(""); setCelebration(null);
  }
  async function syncPoints() {
    if (busy || syncing) return; setSyncing(true); setError("");
    try { await refresh(true); } catch (e) { setError(e instanceof Error ? e.message : "請稍後再更新點數"); } finally { if (mounted.current) setSyncing(false); }
  }
  const showResult = phase === "result" && outcome;
  const status = phase === "running" ? game === "scratch" ? "正在開卡，你可以先刮開銀色區域。" : game === "capsule" ? "彩球攪拌中，正在確認本回合結果…" : "轉盤已啟動，正在確認本回合結果…" : phase === "settling" ? game === "capsule" ? "扭蛋出球，準備打開！" : "好運快停下來了！" : phase === "scratching" ? "刮開銀色區域，或按「直接揭曉」。" : showResult ? `本回合獲得：${outcome.label}` : "先看看獎項，再挑一個喜歡的遊戲。";

  return <main id="main-content" className="game-app">
    <div className="game-app-inner">
      <header className="game-topbar"><button className="game-back" type="button" onClick={onExit}><ArrowLeft size={18} /><span>我的帳戶</span></button><div className="game-top-controls">{sound.controls}<label className="game-fast"><input type="checkbox" checked={fast} disabled={busy} onChange={e => setFast(e.target.checked)} /><Zap size={15} />快速開獎</label></div></header>
      <div className="game-heading"><div><span className="game-brand"><PawPrint size={17} />PURESPOT</span><h1>毛孩遊戲室<span className="game-title-dot">.</span></h1></div><div className="game-wallet" aria-label={state ? `可用點數 ${state.points} 點` : "正在讀取點數"}><span className="wallet-coin"><PawPrint size={23} /></span><div><span>我的點數</span><strong><AnimatedPoints value={state?.points ?? null} /><small>點</small></strong></div><button type="button" aria-label="更新點數" disabled={busy || syncing} onClick={() => void syncPoints()}><RefreshCw size={15} className={syncing ? "animate-spin" : ""} /></button></div></div>
      <nav className="game-tabs" role="tablist" aria-label="選擇遊戲">{games.map(g => <button key={g.key} id={`${tabId}-${g.key}`} role="tab" type="button" aria-selected={game === g.key} aria-controls={`${tabId}-panel`} disabled={busy || syncing} onClick={() => select(g.key)}>
        {game === g.key && <motion.span className="game-tab-background" layoutId={`${tabId}-selection`} transition={{ type: "spring", stiffness: 450, damping: 35 }} />}<MiniGame game={g.key} /><span className="game-tab-label"><strong>{g.name}</strong><small>{g.hint}</small></span><ArrowRight size={17} /></button>)}</nav>

      {error && <div className="game-error" role="alert"><span>{error}</span>{!state && <button type="button" onClick={() => void refresh().then(() => setError("")).catch(e => setError(e.message))}>重新讀取</button>}</div>}
      {phase === "uncertain" && pending && <div className="game-recovery"><Ticket size={21} /><div><strong>保留了你剛才的回合</strong><p>先確認這張紀錄，再開始下一回合。</p></div><button type="button" onClick={() => { setError(""); setPhase("running"); void sendRound(pending, true); }}>確認這一回合</button></div>}

      <div className="game-layout">
        <section className={`game-arena arena-${game}`} id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${game}`} data-game={game} data-phase={phase}>
          <div className="arena-title"><div><h2>{titles[game]}</h2><p>{game === "wheel" ? "選一個獎池，讓毛孩陪你轉。" : game === "capsule" ? "轉動把手，看看哪顆好運會找上你。" : "銀色的下面，藏著今天的小禮物。"}</p></div>{game !== "wheel" && <span className="game-daily">今日剩餘 <b>{state ? Math.max(0, limit! - used) : "—"}</b> 次</span>}</div>
          {game === "wheel" && <div className="wheel-pools" role="group" aria-label="轉盤獎池">{WHEEL_KEYS.map(key => <button key={key} type="button" aria-pressed={wheelKey === key} disabled={busy || syncing} onClick={() => { sound.cue("tap"); setWheelKey(key); setOutcome(null); setPhase("idle"); }}>{key === "CAT" ? "貓咪" : key === "DOG" ? "狗狗" : "小寵"}</button>)}</div>}
          <AnimatePresence mode="wait" initial={false}><motion.div key={game} className="game-scene" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .16 }}>
            {game === "wheel" && <LuckyWheel wheel={wheel} phase={phase} outcome={outcome} fast={fast} disabled={busy || !available || syncing} onPlay={play} onSettled={finish} onTick={() => sound.cue("tick")} />}
            {game === "capsule" && <CapsuleMachine phase={phase} outcome={outcome} cost={cost} disabled={busy || !available || syncing} onPlay={play} onSettled={finish} onDrop={() => sound.cue("open")} />}
            {game === "scratch" && <ScratchTicket roundId={roundId} phase={phase} outcome={outcome} onReveal={finish} onScratch={() => sound.cue("scratch")} />}
          </motion.div></AnimatePresence>
          <div className="game-action-row"><button type="button" className="game-play-button" disabled={busy || !available || syncing} onClick={play}>{phase === "running" || phase === "settling" ? <><LoaderCircle size={20} className="animate-spin" />{game === "wheel" ? "好運轉動中" : game === "capsule" ? "扭蛋出球中" : "正在開卡"}</> : phase === "scratching" ? <><PawPrint size={20} />刮開上方銀色區域</> : !state ? <><LoaderCircle size={19} className="animate-spin" />讀取點數中</> : limit !== null && used >= limit ? "今天玩滿了，明天見" : state.points < cost ? `還差 ${format(cost - state.points)} 點` : <>{phase === "result" ? <RotateCw size={19} /> : <PawPrint size={20} />}{phase === "result" ? "再玩一次" : game === "wheel" ? "轉動幸運轉盤" : game === "capsule" ? "轉出我的扭蛋" : "選一張幸運卡"}<span>{cost} 點</span></>}</button><span className="game-cost-note">每次使用 {cost} 點{limit ? ` · 每日 ${limit} 次` : " · 每回合獨立抽獎"}</span></div>
          <p className="game-status" role="status" aria-label="遊戲狀態">{status}</p>
          {!busy && state && !available && state.points < cost && <Link className="game-earn-link" href="/account?tab=tasks">去簽到與任務賺點數 <ArrowRight size={14} /></Link>}
        </section>

        <aside className="game-side">
          <div className={`game-result-panel ${showResult ? "has-result" : ""}`}>
            <AnimatePresence mode="wait" initial={false}>{showResult ? <motion.div key={outcome.requestId} className="game-result-content" initial={{ opacity: 0, y: 14, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
              <span className="game-received"><Check size={14} />本回合獎勵已入帳</span><div className={`result-medallion ${outcome.kind === "POINTS" ? "is-coin" : "is-ticket"}`}>{outcome.kind === "POINTS" ? <PawPrint size={43} /> : <Ticket size={43} />}</div><h3>{outcome.kind === "POINTS" ? `+${format(outcome.value)}` : `NT$${format(outcome.value)}`}<small>{outcome.kind === "POINTS" ? "點" : "購物券"}</small></h3><p>{outcome.label}</p><div className="game-round-summary"><span>本回合投入<strong>{outcome.costPoints} 點</strong></span><span>{outcome.kind === "POINTS" ? "本回合點數增減" : "獎勵去向"}<strong>{outcome.kind === "POINTS" ? `${outcome.value - outcome.costPoints > 0 ? "+" : ""}${outcome.value - outcome.costPoints} 點` : "我的票券"}</strong></span></div>{outcome.code && <Link className="game-ticket-link" href="/account?tab=tickets">到我的票券使用 <ArrowRight size={16} /></Link>}
            </motion.div> : <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-intro"><span className="game-intro-label"><PawPrint size={14} />毛孩的好運小基地</span><Image src="/images/arcade/companions-v1.webp" alt="貓咪與柴犬陪你玩遊戲" width={330} height={330} priority draggable={false} /><h3>{busy ? "你的驚喜，正在路上。" : "今天的快樂，從這裡開始。"}</h3><p>{phase === "scratching" ? "刮開卡片，看看毛孩幫你藏了什麼。" : "點數或購物好禮，抽中的獎勵會直接留在你的帳戶。"}</p><div className="game-pool-highlight"><Gift size={20} /><span>本獎池點數獎最高<strong>{format(maxPoints)} 點</strong></span></div></motion.div>}</AnimatePresence>
          </div>
          <div className="game-history"><div className="game-section-label"><h3>我的最近好運</h3><span>最近 6 回合</span></div><div ref={historyRef}>{state?.history.length ? state.history.map(h => <div className="game-history-row" key={h.requestId}><span className={`history-icon ${h.kind === "POINTS" ? "is-coin" : ""}`}>{h.kind === "POINTS" ? <Coins size={17} /> : <Ticket size={17} />}</span><div><strong>{h.label}</strong><span>{h.title} · {new Date(h.createdAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", timeZone: "Asia/Taipei" })}</span></div><b>{h.kind === "POINTS" ? `+${h.value}` : `$${h.value}`}</b></div>) : <p className="game-history-empty">第一份好運，留個位置等你。</p>}</div></div>
        </aside>
      </div>
      <details className="game-rules"><summary><span><Ticket size={17} />獎項、機率與玩法</span><ChevronDown size={17} /></summary><div className="game-rules-body"><p>每回合由系統依下列機率獨立抽出一個獎項，畫面格子大小不代表中獎機率。點數自動入帳；票券可在「我的票券」查看與使用。每日次數以臺灣時間午夜重新計算。</p><div className="game-prizes">{pool.prizes.map(p => <div key={p.id}><span>{"label" in p ? p.label : `${p.rank}・${p.points} 點`}</span><strong>{(p.weight / totalWeight * 100).toFixed(2)}%</strong></div>)}</div></div></details>
      <footer className="game-footer"><Link href="/account?tab=tasks"><Coins size={16} />簽到與任務</Link><Link href="/account?tab=tickets"><Ticket size={16} />我的票券</Link><Link href="/rewards"><Gift size={16} />點數商店</Link><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("purespot:open-support"))}><Headset size={16} />需要協助</button></footer>
    </div><GameCelebration round={celebration} />
  </main>;
}
