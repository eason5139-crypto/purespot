"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, PawPrint, ShoppingBag } from "lucide-react";
import {
  FLY_EVENT,
  PAW_EVENT,
  triggerCartBump,
  type FlyToCartPayload,
  type PawBurstPayload,
} from "@/lib/flyToCart";

interface ActiveFlight extends FlyToCartPayload {
  targetX: number;
  targetY: number;
}

const BURST_ANGLES = [-75, -40, -10, 20, 55, 85];

export function FlyToCartLayer() {
  const [flights, setFlights] = useState<ActiveFlight[]>([]);
  const [bursts, setBursts] = useState<PawBurstPayload[]>([]);

  useEffect(() => {
    const onFly = (event: Event) => {
      const detail = (event as CustomEvent<FlyToCartPayload>).detail;
      if (!detail) return;

      const cartBtn = document.getElementById("navbar-cart-button");
      const cartRect = cartBtn?.getBoundingClientRect();
      const targetX = cartRect ? cartRect.left + cartRect.width / 2 : window.innerWidth - 60;
      const targetY = cartRect ? cartRect.top + cartRect.height / 2 : 36;

      const flight: ActiveFlight = {
        ...detail,
        targetX,
        targetY,
      };

      setFlights((prev) => [...prev.slice(-6), flight]);

      window.setTimeout(() => {
        triggerCartBump(detail.label);
      }, 560);

      window.setTimeout(() => {
        setFlights((prev) => prev.filter((item) => item.id !== flight.id));
      }, 720);
    };

    const onPaw = (event: Event) => {
      const detail = (event as CustomEvent<PawBurstPayload>).detail;
      if (!detail) return;
      setBursts((prev) => [...prev.slice(-5), detail]);
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((item) => item.id !== detail.id));
      }, 850);
    };

    window.addEventListener(FLY_EVENT, onFly);
    window.addEventListener(PAW_EVENT, onPaw);
    return () => {
      window.removeEventListener(FLY_EVENT, onFly);
      window.removeEventListener(PAW_EVENT, onPaw);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      <AnimatePresence>
        {flights.map((flight) => {
          const midX = (flight.startX + flight.targetX) / 2;
          const peakY = Math.min(flight.startY, flight.targetY) - 135;

          return (
            <motion.div
              key={flight.id}
              initial={{
                x: flight.startX - 28,
                y: flight.startY - 28,
                scale: 0.55,
                rotate: -12,
                opacity: 1,
              }}
              animate={{
                x: [flight.startX - 28, midX - 28, flight.targetX - 20],
                y: [flight.startY - 28, peakY, flight.targetY - 20],
                scale: [0.75, 1.18, 0.28],
                rotate: [-10, 14, -22],
                opacity: [1, 1, 0.2],
              }}
              transition={{
                duration: 0.62,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="fixed left-0 top-0 flex size-14 items-center justify-center rounded-2xl border-2 border-[#935941] bg-[#fffaf2] shadow-[0_12px_28px_rgba(147,89,65,0.35)]"
            >
              {flight.image ? (
                <div className="relative size-11 overflow-hidden rounded-xl bg-[#f4ece1]">
                  <Image
                    src={flight.image}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain p-1"
                  />
                </div>
              ) : (
                <ShoppingBag size={22} className="text-[#935941]" />
              )}
              <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-[#935941] text-[10px] font-bold text-white shadow">
                +1
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {bursts.map((burst) => (
          <div
            key={burst.id}
            style={{ left: burst.x, top: burst.y }}
            className="fixed -translate-x-1/2 -translate-y-1/2"
          >
            {BURST_ANGLES.map((angle, idx) => {
              const rad = (angle * Math.PI) / 180;
              const dx = Math.sin(rad) * (42 + (idx % 2) * 18);
              const dy = -Math.cos(rad) * (46 + (idx % 3) * 14);
              const isPaw = idx % 2 === 0;
              return (
                <motion.span
                  key={angle}
                  initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                  animate={{
                    x: dx,
                    y: dy,
                    scale: [0.5, 1.15, 0.7],
                    opacity: [1, 1, 0],
                    rotate: angle * 1.2,
                  }}
                  transition={{ duration: 0.75, ease: "easeOut" }}
                  className={`absolute left-0 top-0 flex size-6 items-center justify-center rounded-full shadow-sm ${
                    isPaw
                      ? "bg-[#fff3e6] text-[#935941]"
                      : "bg-[#fce8e6] text-[#c85a48]"
                  }`}
                >
                  {isPaw ? (
                    <PawPrint size={13} />
                  ) : (
                    <Heart size={12} fill="currentColor" />
                  )}
                </motion.span>
              );
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

