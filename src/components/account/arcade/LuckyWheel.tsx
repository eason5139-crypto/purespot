"use client";
import { useEffect, useId, useRef } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { PawPrint } from "lucide-react";
import { DEFAULT_ARCADE_CONFIG, type WheelConfig } from "@/lib/pointsArcadeConfig";
import type { ArcadeOutcome } from "@/lib/arcade";
import { wheelLanding } from "@/lib/arcade";

export type GamePhase = "idle" | "running" | "settling" | "scratching" | "result" | "uncertain";
const colors = [["#fff5d9", "#e9bc69"], ["#e2f0ff", "#7ca9d6"], ["#e0f1e9", "#8ebda8"], ["#f7e8e1", "#d8a28b"], ["#e5e6f7", "#a9a4d1"], ["#e4f1f3", "#8dbec8"], ["#fff1d8", "#e6ba78"], ["#e3edfb", "#92b4d7"], ["#e4f2e8", "#94b5a5"], ["#efe7f4", "#baa0cc"]];
const polar = (r: number, a: number): [number, number] => [250 + r * Math.sin(a * Math.PI / 180), 250 - r * Math.cos(a * Math.PI / 180)];
const tint = (hex: string, white: number) => `#${[1, 3, 5].map(offset => Math.round(parseInt(hex.slice(offset, offset + 2), 16) * (1 - white) + 255 * white).toString(16).padStart(2, "0")).join("")}`;

export function PrizeMark({ kind, x = 0, y = 0, scale = 1 }: { kind: string; x?: number; y?: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {kind === "POINTS" ? <><ellipse cx="0" cy="3" rx="19" ry="20" fill="#b77a22" /><circle r="19" fill="url(#game-coin)" stroke="#fff3b2" strokeWidth="2" /><circle r="13" fill="none" stroke="#cb932e" /><path d="m0-9 2.7 5.5 6.1.9-4.4 4.3 1 6.1L0 4-5.4 7l1-6.3-4.4-4.3 6.1-.9Z" fill="#b47b27" /></> : kind === "PRODUCT_VOUCHER" ? <><path d="M-18-8H18V18H-18Z" fill="#f8f6ef" stroke="#5183a8" strokeWidth="2" /><path d="M-21-13H21V-4H-21Z" fill="#82b3d1" /><path d="M-3-13V18H3V-13" fill="#315b7c" /><path d="M0-14C-25-32-21-7 0-14C25-32 21-7 0-14" fill="none" stroke="#416c8b" strokeWidth="3" strokeLinecap="round" /></> : <><path d="M-23-13H23V-5C14-5 14 5 23 5V13H-23V5C-14 5-14-5-23-5Z" fill="#fdf9ee" stroke="#a46e52" strokeWidth="2" /><path d="M10-10V10" stroke="#cfa993" strokeDasharray="3 3" /><path d="m-7-7 2 4 4 .5-3 3 .8 4.5-3.8-2-4 2 .8-4.5-3-3 4.2-.5Z" fill="#bd8a4c" /></>}
  </g>;
}

export function LuckyWheel({ wheel, phase, outcome, fast, disabled, onPlay, onSettled, onTick }: {
  wheel: WheelConfig; phase: GamePhase; outcome: ArcadeOutcome | null; fast: boolean; disabled: boolean;
  onPlay: () => void; onSettled: () => void; onTick: () => void;
}) {
  const reduce = useReducedMotion(), id = useId().replace(/:/g, "");
  const rotation = useMotionValue(0), pointer = useMotionValue(0);
  const control = useRef<{ stop: () => void } | null>(null);
  const callbacks = useRef({ onSettled, onTick }); callbacks.current = { onSettled, onTick };
  const lastTick = useRef(0), lastSector = useRef(0);
  useMotionValueEvent(rotation, "change", value => {
    const sector = Math.floor(value / (360 / wheel.prizes.length)), now = performance.now();
    if (sector !== lastSector.current && now - lastTick.current > 75 && !reduce) {
      lastSector.current = sector; lastTick.current = now; callbacks.current.onTick();
      pointer.set(-14); void animate(pointer, 0, { duration: 0.12 });
    }
  });
  useEffect(() => {
    control.current?.stop();
    let alive = true;
    if (phase === "running" && !reduce) {
      const start = rotation.get();
      control.current = animate(rotation, [start, start + 360], { duration: 0.6, ease: "linear", repeat: Infinity });
    }
    if (phase === "settling" && outcome?.game === "wheel") {
      if (reduce) { rotation.set(wheelLanding(rotation.get(), outcome.prizeIndex, wheel.prizes.length, 0)); callbacks.current.onSettled(); }
      else {
        const animation = animate(rotation, wheelLanding(rotation.get(), outcome.prizeIndex, wheel.prizes.length, fast ? 1 : 3), { duration: fast ? 1.05 : 2.1, ease: [0.12, 0.75, 0.16, 1] });
        control.current = animation;
        void animation.then(() => { if (alive) callbacks.current.onSettled(); });
      }
    }
    return () => { alive = false; control.current?.stop(); };
  }, [phase, outcome?.requestId, reduce, fast, rotation, wheel.prizes.length]);
  const busy = phase === "running" || phase === "settling";
  const count = wheel.prizes.length, step = 360 / count;
  return <div className={`lucky-wheel-scene ${busy ? "is-spinning" : ""}`} data-phase={phase}>
    <div className="wheel-stage-shadow" /><div className="wheel-pedestal"><span>PURESPOT</span></div>
    <div className="wheel-shell">
      <svg className="wheel-rim" viewBox="0 0 500 500" aria-hidden="true">
        <defs><linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#649bbd" /><stop offset="0.45" stopColor="#1c4565" /><stop offset="1" stopColor="#0b253e" /></linearGradient><radialGradient id={`${id}-bulb`}><stop stopColor="#fffde5" /><stop offset="0.65" stopColor="#ffe1a0" /><stop offset="1" stopColor="#be8d46" /></radialGradient></defs>
        <circle cx="250" cy="254" r="246" fill="#102c43" /><circle cx="250" cy="247" r="243" fill={`url(#${id}-rim)`} stroke="#b2d4df" strokeWidth="2" /><circle cx="250" cy="247" r="219" fill="#e5c892" stroke="#e9e2ca" strokeWidth="3" />
        {Array.from({ length: 32 }, (_, i) => { const [x, y] = polar(232, i * 11.25); return <circle key={i} cx={x} cy={y - 3} r="5.8" fill={`url(#${id}-bulb)`} className="wheel-bulb" style={{ animationDelay: `${i * -0.055}s` }} />; })}
      </svg>
      <motion.div className="wheel-disc" style={{ rotate: rotation }} aria-hidden="true"><svg viewBox="0 0 500 500" width="100%" height="100%">
        <defs><radialGradient id="game-coin" cx="0.32" cy="0.26"><stop stopColor="#fff5be" /><stop offset="0.55" stopColor="#f2ca66" /><stop offset="1" stopColor="#d59833" /></radialGradient>
          {wheel.prizes.map((p, i) => {
            const original = DEFAULT_ARCADE_CONFIG.wheels[wheel.key].prizes.find(item => item.id === p.id);
            const palette = original?.color === p.color ? colors[i]! : [tint(p.color, .8), tint(p.color, .45)];
            return <linearGradient id={`${id}-prize-${i}`} key={p.id} x1="0" y1="0" x2="1" y2="1"><stop stopColor={palette[0]} /><stop offset="1" stopColor={palette[1]} /></linearGradient>;
          })}
        </defs>
        {wheel.prizes.map((p, i) => {
          const [sx, sy] = polar(215, i * step), [ex, ey] = polar(215, (i + 1) * step);
          return <g key={p.id}><path d={`M250 250 L${sx} ${sy} A215 215 0 ${step > 180 ? 1 : 0} 1 ${ex} ${ey} Z`} fill={`url(#${id}-prize-${i})`} stroke="#fff9ed" strokeWidth="2" />
            <g transform={`translate(250 250) rotate(${i * step + step / 2}) translate(0 -151)`}>
              <PrizeMark kind={p.kind} y={-17} scale={0.83} />
              <text y="25" textAnchor="middle" fill="#16394f" fontSize="21" fontWeight="850">{p.kind === "POINTS" ? `+${p.value}` : `$${p.value}`}</text>
              <text y="45" textAnchor="middle" fill="#314d5d" fontSize="11" fontWeight="650">{p.kind === "POINTS" ? "點數" : p.kind === "PRODUCT_VOUCHER" ? "商品兌換券" : "購物折價券"}</text>
            </g></g>;
        })}
        <circle cx="250" cy="250" r="213" fill="none" stroke="#ffffff80" strokeWidth="4" />
      </svg></motion.div>
      <motion.div className="wheel-pointer" style={{ rotate: pointer }}><span /></motion.div>
      <button className="wheel-hub" type="button" disabled={disabled} onClick={onPlay} aria-label={`轉動${wheel.title}，使用 ${wheel.costPoints} 點`}>
        <PawPrint size={25} strokeWidth={1.8} /><strong>{busy ? "轉動中" : "轉一下"}</strong><small>{wheel.costPoints} 點／次</small>
      </button>
    </div>
  </div>;
}
