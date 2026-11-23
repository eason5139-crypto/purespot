"use client";
import { useEffect, useState } from "react";
import useSound from "use-sound";
import { motion, useReducedMotion } from "framer-motion";
import { PawPrint, Volume2, VolumeX } from "lucide-react";
import { celebrate } from "@/lib/celebrate";
export function useArcadeFeedback() {
  const [enabled, setEnabled] = useState(false),
    [volume, setVolume] = useState(0.3),
    [wins, setWins] = useState(0);
  const [click, { stop: stopClick }] = useSound("/audio/tap.wav", {
    volume,
    soundEnabled: enabled,
    interrupt: true,
  });
  const [spin, { stop: stopSpin }] = useSound("/audio/spin.wav", {
    volume: volume * 0.5,
    soundEnabled: enabled,
    interrupt: true,
  });
  const [success, { stop: stopSuccess }] = useSound("/audio/reward.wav", {
    volume,
    soundEnabled: enabled,
    interrupt: true,
  });
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem("purespot-sound") === "on");
    } catch {}
  }, []);
  useEffect(() => {
    const stop = () => {
      if (document.hidden) {
        stopClick();
        stopSpin();
        stopSuccess();
      }
    };
    document.addEventListener("visibilitychange", stop);
    return () => {
      document.removeEventListener("visibilitychange", stop);
      stopClick();
      stopSpin();
      stopSuccess();
    };
  }, [stopClick, stopSpin, stopSuccess]);
  return {
    enabled,
    volume,
    wins,
    click: () => click(),
    spin: () => {
      click();
      spin();
    },
    win: () => {
      stopSpin();
      success();
      setWins((n) => n + 1);
      void celebrate();
    },
    stop: stopSpin,
    controls: (
      <div className="arcade-sound-controls">
        <button
          type="button"
          aria-label={enabled ? "關閉遊戲音效" : "開啟遊戲音效"}
          aria-pressed={enabled}
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            try {
              localStorage.setItem("purespot-sound", next ? "on" : "off");
            } catch {}
          }}
        >
          {enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}音效
          {enabled ? "開" : "關"}
        </button>
        {enabled && (
          <label>
            音量
            <input
              aria-label="遊戲音量"
              type="range"
              min={0}
              max={0.6}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
        )}
      </div>
    ),
  };
}
export function PawCompanion({ wins = 0 }: { wins?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="paw-companion" aria-hidden="true">
      <motion.div
        key={wins}
        animate={
          reduce
            ? {}
            : wins
              ? { y: [0, -12, 0, -5, 0], rotate: [0, 8, -5, 0] }
              : { y: [0, -5, 0] }
        }
        transition={
          wins
            ? { duration: 0.9 }
            : { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <PawPrint size={62} strokeWidth={1.25} />
      </motion.div>
      <span />
    </div>
  );
}
