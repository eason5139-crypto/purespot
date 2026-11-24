"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Coins, PawPrint, Ticket } from "lucide-react";
import { ScratchCoverage, type ArcadeOutcome } from "@/lib/arcade";
import type { GamePhase } from "./LuckyWheel";

type Point = { x: number; y: number };
type Stroke = [Point, Point];
const REVEAL_AT = 0.42;

export function ScratchTicket({ roundId, phase, outcome, onReveal, onScratch }: {
  roundId: string; phase: GamePhase; outcome: ArcadeOutcome | null; onReveal: () => void; onScratch: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null), coverage = useRef(new ScratchCoverage());
  const paths = useRef<Stroke[]>([]), previous = useRef<Point | null>(null), pointerId = useRef<number | null>(null);
  const lastUpdate = useRef(0), erased = useRef(0), revealed = useRef(false);
  const [progress, setProgress] = useState(0);
  const latest = useRef({ onReveal, onScratch, ready: false }); latest.current = { onReveal, onScratch, ready: phase === "scratching" };
  const reveal = useCallback(() => {
    if (revealed.current || !latest.current.ready) return;
    revealed.current = true; setProgress(1); latest.current.onReveal();
  }, []);
  useEffect(() => { if (phase === "scratching" && erased.current >= REVEAL_AT) reveal(); }, [phase, reveal]);
  useEffect(() => {
    const el = canvas.current; if (!el) return;
    const ctx = el.getContext("2d"); if (!ctx) return;
    coverage.current = new ScratchCoverage(); paths.current = []; previous.current = null; erased.current = 0; revealed.current = false; setProgress(0);
    const draw = () => {
      const { width: w, height: h } = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#d9e8ee"); g.addColorStop(0.24, "#f3f7f5"); g.addColorStop(0.47, "#a7c4d3"); g.addColorStop(0.7, "#e6eef0"); g.addColorStop(1, "#95b2c6");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.strokeStyle = "#ffffff6b"; ctx.lineWidth = 0.65;
      for (let i = -h; i < w; i += 9) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); }
      ctx.strokeStyle = "#ffffffa6"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.strokeRect(10, 10, w - 20, h - 20); ctx.restore();
      // Draw the foil once. Erasing follows continuous paths without reading GPU pixels back.
      ctx.fillStyle = "#365d78"; ctx.textAlign = "center"; ctx.font = "700 17px 'Noto Sans TC', sans-serif"; ctx.fillText("刮開這一小片幸運", w / 2, h * 0.58);
      ctx.font = "12px 'Noto Sans TC', sans-serif"; ctx.fillStyle = "#54758b"; ctx.fillText("用手指，或滑鼠輕輕刮開", w / 2, h * 0.76);
      const cx = w / 2; ctx.fillStyle = "#eff5f3"; ctx.beginPath(); ctx.ellipse(cx, h * .27, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      for (const [dx, dy, r] of [[-11, -7, 4], [-4, -14, 4.5], [5, -14, 4.5], [12, -6, 4]]) { ctx.beginPath(); ctx.arc(cx + dx!, h * .27 + dy!, r!, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalCompositeOperation = "destination-out"; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = h * 0.24;
      for (const [a, b] of paths.current) { ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke(); }
    };
    const observer = new ResizeObserver(draw); observer.observe(el); draw();
    return () => { observer.disconnect(); };
  }, [roundId]);
  function scratch(clientX: number, clientY: number) {
    const el = canvas.current; if (!el || revealed.current || (phase !== "running" && phase !== "scratching")) return;
    const box = el.getBoundingClientRect(), b = { x: (clientX - box.left) / box.width, y: (clientY - box.top) / box.height }, a = previous.current ?? b;
    const ctx = el.getContext("2d"); if (!ctx) return;
    const dpr = el.width / box.width; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = box.height * .24; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(a.x * box.width, a.y * box.height); ctx.lineTo(b.x * box.width, b.y * box.height); ctx.stroke();
    if (a.x === b.x && a.y === b.y) { ctx.beginPath(); ctx.arc(b.x * box.width, b.y * box.height, box.height * .12, 0, Math.PI * 2); ctx.fill(); }
    paths.current.push([a, b]); previous.current = b;
    erased.current = coverage.current.stroke(a.x, a.y, b.x, b.y, .12, box.width / box.height);
    const now = performance.now(); if (now - lastUpdate.current > 80) { lastUpdate.current = now; setProgress(erased.current); latest.current.onScratch(); }
    if (erased.current >= REVEAL_AT) reveal();
  }
  function stopStroke() { previous.current = null; pointerId.current = null; setProgress(revealed.current ? 1 : erased.current); }
  const active = phase === "running" || phase === "scratching", done = phase === "result";
  return <div className="scratch-stage">
    <div className={`scratch-ticket ${active ? "is-active" : ""} ${done ? "is-revealed" : ""}`}>
      <header className="scratch-ticket-head"><div><span className="scratch-edition"><PawPrint size={15} />毛孩好運收藏卡</span><h3>把好運<br />刮出來。</h3><p>每一張，都有一點小驚喜。</p></div><Image src="/images/arcade/companions-v1.webp" alt="抱著金色爪印硬幣的貓咪與柴犬" width={360} height={360} priority draggable={false} /></header>
      <div className="ticket-perforation"><span /><span /></div>
      <div className="scratch-window" data-revealed={done}>
        <div className="scratch-underlay" aria-hidden={!done}>
          {outcome ? <>{outcome.kind === "POINTS" ? <Coins size={33} /> : <Ticket size={33} />}<strong>{outcome.kind === "POINTS" ? `+${outcome.value} 點` : `NT$${outcome.value}`}</strong><span>{outcome.kind === "POINTS" ? "好運點數，收到！" : "購物折價券，收到！"}</span></> : <><PawPrint size={34} /><strong>你的好運，準備中</strong></>}
        </div>
        <canvas ref={canvas} className="scratch-foil" role="button" tabIndex={active ? 0 : -1} aria-disabled={!active} aria-label="刮開獎卡；按 Enter 可直接揭曉" onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reveal(); } }}
          onPointerDown={e => { if (!active || pointerId.current !== null) return; pointerId.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); scratch(e.clientX, e.clientY); }}
          onPointerMove={e => { if (pointerId.current !== e.pointerId) return; const points = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]; for (const p of points.length ? points : [e.nativeEvent]) scratch(p.clientX, p.clientY); }}
          onPointerUp={e => { if (pointerId.current === e.pointerId) { stopStroke(); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } }}
          onPointerCancel={stopStroke} onLostPointerCapture={stopStroke} />
      </div>
      <footer className="scratch-ticket-foot"><span>{roundId === "preview" ? "選一張，開始今天的小幸運" : `No. ${roundId.slice(0, 8).toUpperCase()}`}</span><PawPrint size={15} /></footer>
    </div>
    <div className="scratch-tools"><span aria-live="polite">{done ? "已揭曉，獎勵已入帳" : active ? `已刮開 ${Math.min(100, Math.round(progress * 100))}%` : "買一張卡，再親手刮開"}</span><button type="button" disabled={phase !== "scratching"} onClick={reveal}>直接揭曉</button></div>
    <div className="scratch-progress" role="progressbar" aria-label="刮卡進度" aria-valuenow={done ? 100 : Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${done ? 100 : Math.min(100, progress / REVEAL_AT * 100)}%` }} /></div>
  </div>;
}
