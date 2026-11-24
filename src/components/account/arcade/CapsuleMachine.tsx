"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { PawPrint } from "lucide-react";
import type { ArcadeOutcome } from "@/lib/arcade";
import type { GamePhase } from "./LuckyWheel";

const ballColors = ["#edc465", "#88b8d5", "#a8cfb9", "#d5a79a", "#aaa4cf"];
export const capsuleColors: Record<NonNullable<ArcadeOutcome["ball"]>, string> = { GOLD: "#e9ba55", CLAY: "#d69d8c", JADE: "#87bda9", WOOD: "#96afd3", SAND: "#b4a2cd" };
type Ball = { x: number; y: number; vx: number; vy: number; r: number; texture: number; rotation: number; spin: number };

function CapsuleBalls({ active, reduce }: { active: boolean; reduce: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const balls = useRef<Ball[]>([]), textures = useRef<HTMLCanvasElement[]>([]);
  useEffect(() => {
    const el = canvas.current; if (!el) return;
    const ctx = el.getContext("2d", { alpha: true }); if (!ctx) return;
    if (!balls.current.length) balls.current = Array.from({ length: 18 }, (_, i) => ({ x: 70 + (i % 5) * 47 + Math.sin(i * 4) * 9, y: 237 - Math.floor(i / 5) * 38 + Math.cos(i * 2) * 5, vx: (i % 2 ? 1 : -1) * (2 + i % 3), vy: -2 - i % 4, r: 22 + i % 3, texture: (i * 3 + Math.floor(i / 5)) % 5, rotation: i * 0.97, spin: (i % 3 - 1) * 0.04 }));
    if (!textures.current.length) textures.current = ballColors.map(color => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d")!;
      const gradient = g.createRadialGradient(42, 34, 2, 65, 65, 60);
      gradient.addColorStop(0, "#fff9e6"); gradient.addColorStop(0.18, color); gradient.addColorStop(0.7, color); gradient.addColorStop(1, "#34536f");
      g.fillStyle = gradient; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.arc(64, 64, 57, 0, Math.PI * 2); g.clip();
      g.fillStyle = "#f5f3ec80"; g.fillRect(0, 66, 128, 62); g.strokeStyle = "#fff9ebc0"; g.lineWidth = 3; g.beginPath(); g.ellipse(64, 65, 59, 12, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#ffffff9c"; g.beginPath(); g.ellipse(42, 33, 18, 9, -0.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#ffffff60"; g.lineWidth = 2; g.beginPath(); g.arc(64, 64, 53, 3.2, 4.8); g.stroke(); g.restore();
      return c;
    });
    let frame = 0, previous = performance.now();
    const resize = () => { const box = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); el.width = Math.round(box.width * dpr); el.height = Math.round(box.height * dpr); draw(); };
    function draw() {
      if (!ctx || !el) return;
      ctx.setTransform(el.width / 340, 0, 0, el.height / 290, 0, 0); ctx.clearRect(0, 0, 340, 290);
      for (const b of balls.current) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rotation); ctx.drawImage(textures.current[b.texture]!, -b.r, -b.r, b.r * 2, b.r * 2); ctx.restore(); }
    }
    const step = (now: number) => {
      if (document.hidden) { frame = 0; return; }
      const dt = Math.min(2, (now - previous) / 16.67); previous = now;
      const items = balls.current;
      for (const b of items) {
        b.vx += Math.sin(now / 290 + b.texture) * 0.19 * dt; b.vy += 0.22 * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.rotation += b.spin * dt + b.vx * 0.008;
        const dx = b.x - 170, dy = b.y - 143, rx = 148 - b.r, ry = 136 - b.r;
        const distance = Math.hypot(dx / rx, dy / ry);
        if (distance > 1) {
          b.x = 170 + dx / distance; b.y = 143 + dy / distance;
          const nx = dx / rx / rx, ny = dy / ry / ry, norm = Math.hypot(nx, ny), ux = nx / norm, uy = ny / norm, dot = b.vx * ux + b.vy * uy;
          if (dot > 0) { b.vx -= 1.75 * dot * ux; b.vy -= 1.75 * dot * uy; }
          if (b.y > 200) b.vy = -5.5 - b.texture * 0.7;
        }
        b.vx = Math.max(-7, Math.min(7, b.vx)); b.vy = Math.max(-8, Math.min(8, b.vy));
      }
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!, b = items[j]!, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.1, min = a.r + b.r - 2;
        if (d >= min) continue;
        const nx = dx / d, ny = dy / d, overlap = (min - d) * 0.5;
        a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
        const impact = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (impact > 0) { a.vx -= impact * nx * 0.85; a.vy -= impact * ny * 0.85; b.vx += impact * nx * 0.85; b.vy += impact * ny * 0.85; }
      }
      draw(); frame = requestAnimationFrame(step);
    };
    const visible = () => { if (!document.hidden && active && !reduce && !frame) { previous = performance.now(); frame = requestAnimationFrame(step); } };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    if (active && !reduce) frame = requestAnimationFrame(step);
    document.addEventListener("visibilitychange", visible);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", visible); };
  }, [active, reduce]);
  return <canvas ref={canvas} className="capsule-balls" aria-label={active ? "彩球正在玻璃球艙內滾動" : "玻璃球艙中的彩色扭蛋"} />;
}

export function CapsuleMachine({ phase, outcome, cost, disabled, onPlay, onSettled, onDrop }: {
  phase: GamePhase; outcome: ArcadeOutcome | null; cost: number; disabled: boolean;
  onPlay: () => void; onSettled: () => void; onDrop: () => void;
}) {
  const reduce = useReducedMotion(), [opened, setOpened] = useState(false);
  const callbacks = useRef({ onSettled, onDrop }); callbacks.current = { onSettled, onDrop };
  useEffect(() => {
    if (phase === "running") setOpened(false);
    if (phase !== "settling" || outcome?.game !== "capsule") return;
    const drop = setTimeout(() => { setOpened(true); callbacks.current.onDrop(); }, reduce ? 0 : 540);
    const done = setTimeout(() => callbacks.current.onSettled(), reduce ? 0 : 1050);
    return () => { clearTimeout(drop); clearTimeout(done); };
  }, [phase, outcome?.requestId, reduce]);
  const color = capsuleColors[outcome?.ball ?? "GOLD"];
  return <div className="capsule-stage" data-phase={phase} data-open={opened}>
    <div className="machine-ground" />
    <div className="capsule-machine">
      <div className="machine-cap"><i /><span>毛孩扭蛋</span><i /></div>
      <div className="machine-globe">
        <div className="machine-inner-light" /><CapsuleBalls active={phase === "running"} reduce={!!reduce} />
        <div className="globe-shine" /><div className="globe-rim" />
        <span className="globe-emblem"><PawPrint size={31} /><small>GOOD LUCK</small></span>
      </div>
      <div className="machine-body">
        <div className="machine-plaque"><PawPrint size={13} />PURESPOT</div>
        <div className="machine-coin-slot"><span />{cost} POINTS</div>
        <button type="button" className="machine-crank" onClick={onPlay} disabled={disabled} aria-label={`轉動扭蛋把手，使用 ${cost} 點`}><span /><i /></button>
        <div className="machine-chute"><div /></div>
        <div className="machine-screws"><i /><i /></div>
      </div>
      <div className="machine-base" />
      {(phase === "settling" || phase === "result") && outcome?.game === "capsule" && <div className="prize-capsule" style={{ "--capsule-color": color } as React.CSSProperties} aria-hidden="true">
        <div className="capsule-half top" /><div className="capsule-reward"><PawPrint size={22} /><b>+{outcome.value}</b></div><div className="capsule-half bottom" />
      </div>}
    </div>
  </div>;
}
