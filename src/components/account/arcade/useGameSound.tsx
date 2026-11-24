"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import useSound from "use-sound";
import { Volume2, VolumeX } from "lucide-react";

const sprite = { tap: [0, 90], tick: [140, 55], mix: [240, 780], drop: [1100, 240], open: [1400, 260], win: [1760, 880], scratch: [2740, 150], error: [3000, 220] } satisfies Record<string, [number, number]>;
type Cue = keyof typeof sprite;
export function useGameSound() {
  const [enabled, setEnabled] = useState(false), [volume, setVolume] = useState(0.35);
  const [play, { stop }] = useSound("/audio/arcade-sprite-v2.wav", { sprite, volume, soundEnabled: enabled });
  const current = useRef({ play, stop, enabled });
  current.current = { play, stop, enabled };
  const lastScratch = useRef(0);
  useEffect(() => {
    try { setEnabled(localStorage.getItem("purespot-sound") === "on"); const v = Number(localStorage.getItem("purespot-game-volume")); if (v > 0 && v <= 0.65) setVolume(v); } catch {}
  }, []);
  useEffect(() => {
    const quiet = () => { if (document.hidden) current.current.stop(); };
    document.addEventListener("visibilitychange", quiet);
    return () => { document.removeEventListener("visibilitychange", quiet); current.current.stop(); };
  }, []);
  const cue = useCallback((name: Cue) => {
    if (!current.current.enabled || document.hidden) return;
    if (name === "scratch") { const now = performance.now(); if (now - lastScratch.current < 115) return; lastScratch.current = now; }
    current.current.play({ id: name });
  }, []);
  const silence = useCallback(() => current.current.stop(), []);
  return {
    cue, silence,
    controls: <div className="game-audio">
      <button type="button" aria-label={enabled ? "關閉遊戲音效" : "開啟遊戲音效"} aria-pressed={enabled} onClick={() => {
        const next = !enabled; setEnabled(next);
        try { localStorage.setItem("purespot-sound", next ? "on" : "off"); } catch {}
        if (next) play({ id: "tap", forceSoundEnabled: true }); else stop();
      }}>{enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}<span>音效{enabled ? "開" : "關"}</span></button>
      {enabled && <label><span className="sr-only">遊戲音量</span><input aria-label="遊戲音量" type="range" min="0.05" max="0.65" step="0.05" value={volume} onChange={e => { const n = Number(e.target.value); setVolume(n); try { localStorage.setItem("purespot-game-volume", String(n)); } catch {} }} /></label>}
    </div>,
  };
}
