"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { usePathname } from "next/navigation";
import { Search, Pause, Play } from "lucide-react";
import type { PublicAssistantSettings } from "@/lib/assistant";
import { useAuthStore } from "@/store/useAuthStore";
import "./little-p.css";
const AssistantPanel = dynamic(() => import("./AssistantPanel"), {
  ssr: false,
  loading: () => <div className="little-p-loading">小P正在打開搜尋本…</div>,
});

export function LittleP({
  initialSettings,
}: {
  initialSettings: PublicAssistantSettings | null;
}) {
  const path = usePathname(),
    reduce = useReducedMotion();
  const [settings, setSettings] = useState<PublicAssistantSettings | null>(
    initialSettings,
  );
  const userId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false),
    [paused, setPaused] = useState(false),
    [walking, setWalking] = useState(false),
    [direction, setDirection] = useState(1);
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 100 });
  const rail = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const x = useMotionValue(180);
  const home = path === "/";
  const loadSettings = useCallback(async () => {
    try {
      const r = await fetch("/api/assistant", { cache: "no-store" });
      if (r.ok) setSettings(await r.json());
    } catch {
      /* The rest of the site stays available. */
    }
  }, []);
  useEffect(() => {
    void loadSettings();
    const refresh = () => {
      if (!document.hidden) void loadSettings();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [loadSettings]);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!settings?.enabled || !rail.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controls: ReturnType<typeof animate> | undefined;
    const width = () => Math.max(0, (rail.current?.clientWidth ?? 0) - 154);
    const observer = new ResizeObserver(() => {
      x.set(Math.min(x.get(), width()));
    });
    observer.observe(rail.current);
    if (!home || reduce || !settings.roaming) x.set(Math.min(180, width()));
    async function roam() {
      if (
        !home ||
        open ||
        paused ||
        hovered ||
        focused ||
        reduce ||
        !settings?.roaming
      ) {
        setWalking(false);
        return;
      }
      if (x.get() === 0) x.set(width() * 0.34);
      const wait = () =>
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, settings.walkPauseSeconds * 1000);
        });
      await wait();
      while (!cancelled) {
        if (document.hidden) {
          await wait();
          continue;
        }
        const minimum = Math.min(220, width() * 0.38);
        const end =
            minimum + (width() - minimum) * (0.05 + Math.random() * 0.9),
          distance = Math.abs(end - x.get());
        setDirection(end > x.get() ? 1 : -1);
        setWalking(true);
        controls = animate(x, end, {
          duration: Math.max(2.2, distance / 48),
          ease: "linear",
        });
        await controls;
        if (cancelled) break;
        setWalking(false);
        await wait();
      }
    }
    void roam();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controls?.stop();
      observer.disconnect();
    };
  }, [
    home,
    open,
    paused,
    hovered,
    focused,
    reduce,
    settings?.enabled,
    settings?.roaming,
    settings?.walkPauseSeconds,
    x,
  ]);
  const place = useCallback(() => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const available = window.visualViewport?.height ?? window.innerHeight;
    setPosition({
      left: Math.max(
        12,
        Math.min(
          rect.left + 30,
          window.innerWidth - Math.min(426, window.innerWidth - 24) - 12,
        ),
      ),
      top: Math.max(8, Math.min(rect.bottom + 6, available - 260)),
    });
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (!open) return;
    place();
    function outside(e: PointerEvent) {
      if (
        popup.current?.contains(e.target as Node) ||
        trigger.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    function keyboard(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, [open, place, close]);
  if (!settings?.enabled || path.startsWith("/admin")) return null;
  return (
    <div className="little-p-rail" aria-label="小P站內搜尋">
      <div ref={rail} className="little-p-track page-shell">
        <span className="little-p-rail-note">
          <span className="little-p-dot" />
          商品、成分、功能，問問小P
        </span>
        <motion.button
          ref={trigger}
          type="button"
          style={{ x }}
          className="little-p-cat-button"
          aria-label="問問小P，開啟站內搜尋"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? "little-p-dialog" : undefined}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onClick={() => {
            setOpen((v) => !v);
            setWalking(false);
          }}
        >
          <span
            aria-hidden="true"
            className={`little-p-cat-art ${walking ? "is-walking" : "is-idle"}`}
            style={{ transform: walking ? `scaleX(${direction})` : undefined }}
          />
          <span className="little-p-cat-caption">
            <Search size={12} />
            問問小P
          </span>
        </motion.button>
        {home && settings.roaming && !reduce && (
          <button
            type="button"
            className="little-p-motion-toggle"
            aria-label={paused ? "讓小P繼續走動" : "讓小P休息一下"}
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
        )}
      </div>
      {open &&
        createPortal(
          <div
            ref={popup}
            className="little-p-popover"
            style={{
              left: position.left,
              top: position.top,
              maxHeight: `calc(100dvh - ${position.top + 12}px)`,
            }}
          >
            <AssistantPanel
              key={userId ?? "guest"}
              settings={settings}
              onClose={close}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
