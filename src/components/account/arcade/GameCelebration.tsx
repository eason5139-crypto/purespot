"use client";
import { useEffect, useRef } from "react";
import type { CreateTypes } from "canvas-confetti";

export function GameCelebration({ round }: { round: string | null }) {
  const canvas = useRef<HTMLCanvasElement>(null), fire = useRef<CreateTypes | null>(null), last = useRef<string | null>(null);
  useEffect(() => {
    if (!round) { fire.current?.reset(); return; }
    if (round === last.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    last.current = round;
    let alive = true;
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (!alive || !canvas.current) return;
      fire.current ??= confetti.create(canvas.current, { resize: true, useWorker: true, disableForReducedMotion: true });
      const paw = confetti.shapeFromPath({ path: "M6 13C1 11 1 6 4 6C7 6 8 11 6 13ZM12 10C9 11 7 4 10 2C14 0 16 9 12 10ZM18 11C15 10 17 3 20 4C24 5 21 13 18 11ZM23 16C20 16 21 9 24 10C28 11 26 17 23 16ZM7 19C8 13 14 10 18 14C22 18 22 23 17 23C14 22 12 24 8 23C6 23 5 21 7 19Z" });
      void fire.current({ particleCount: 48, spread: 68, startVelocity: 25, ticks: 130, gravity: 1.15, scalar: 0.8, origin: { x: 0.53, y: 0.48 }, colors: ["#f5bf58", "#6aabd1", "#b3d9cb", "#f0b9a3"], shapes: [paw, "circle"] });
    }).catch(() => { /* Celebration is optional; the committed reward is already visible. */ });
    return () => { alive = false; };
  }, [round]);
  useEffect(() => () => { fire.current?.reset(); }, []);
  return <canvas className="game-confetti" ref={canvas} aria-hidden="true" />;
}
