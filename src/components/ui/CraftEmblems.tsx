"use client";

import { useId } from "react";
import type { PetType } from "@/lib/types";

/**
 * 挑選適性情境之立體微縮擬物圖件
 */
export function MoodCraftEmblem({
  variant,
  size = 44,
}: {
  variant: "picky" | "tummy" | "coat" | "energy";
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");

  if (variant === "picky") {
    // 炙燒原肉陶缽與黃銅匙
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0 drop-shadow-[0_2px_4px_rgba(95,55,30,0.18)]"
      >
        <defs>
          <radialGradient id={`${uid}-bowl`} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FAF3E8" />
            <stop offset="55%" stopColor="#DECABB" />
            <stop offset="100%" stopColor="#A68268" />
          </radialGradient>
          <linearGradient id={`${uid}-meat`} x1="12" y1="20" x2="36" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#B86246" />
            <stop offset="55%" stopColor="#8F452E" />
            <stop offset="100%" stopColor="#652E1D" />
          </linearGradient>
          <linearGradient id={`${uid}-brass`} x1="28" y1="8" x2="42" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5DC9C" />
            <stop offset="45%" stopColor="#C99B49" />
            <stop offset="100%" stopColor="#8A6322" />
          </linearGradient>
        </defs>
        {/* 香氣微韻曲線 */}
        <path
          d="M17 13C17 10.5 19.5 10.5 19.5 8M23.5 12C23.5 9.2 26 9.2 26 6.5"
          stroke="#B57B59"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* 黃銅試吃匙 */}
        <path
          d="M32.5 19.5L40.8 9.2C41.4 8.5 42.5 8.8 42.7 9.6C42.9 10.2 42.6 10.9 42.1 11.4L34.5 21.5"
          stroke={`url(#${uid}-brass)`}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* 炙燒鮮肉切片 */}
        <ellipse cx="22.5" cy="24.5" rx="11.5" ry="5.5" fill={`url(#${uid}-meat)`} />
        <path
          d="M15 24.5C18 22.8 21 26 24.5 23.5C27 21.8 29.5 24.8 31 24"
          stroke="#F4CBB8"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.65"
        />
        {/* 溫潤陶缽主體 */}
        <path
          d="M8.5 25C8.5 34 15 39 24 39C33 39 39.5 34 39.5 25H8.5Z"
          fill={`url(#${uid}-bowl)`}
          stroke="#7A5A43"
          strokeWidth="1.2"
        />
        <ellipse cx="24" cy="25" rx="15.5" ry="3.2" fill="none" stroke="#FFFDF9" strokeWidth="1.2" opacity="0.85" />
        {/* 底座圈足 */}
        <path d="M17.5 38.8L18.5 41.5H29.5L30.5 38.8" fill="#8C6A52" />
      </svg>
    );
  }

  if (variant === "tummy") {
    // 草本發酵琥珀安瓶與葉脈
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0 drop-shadow-[0_2px_4px_rgba(78,103,82,0.18)]"
      >
        <defs>
          <linearGradient id={`${uid}-amber`} x1="12" y1="14" x2="32" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E6B87A" />
            <stop offset="48%" stopColor="#B86B2B" />
            <stop offset="100%" stopColor="#6D3811" />
          </linearGradient>
          <linearGradient id={`${uid}-cork`} x1="18" y1="6" x2="26" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DFBA8F" />
            <stop offset="100%" stopColor="#9C7148" />
          </linearGradient>
          <linearGradient id={`${uid}-leaf`} x1="25" y1="22" x2="41" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8BB08A" />
            <stop offset="100%" stopColor="#3F5C42" />
          </linearGradient>
        </defs>
        {/* 軟木與黃銅頸環 */}
        <rect x="18" y="7" width="8" height="5" rx="1.5" fill={`url(#${uid}-cork)`} stroke="#6E4B2B" strokeWidth="1" />
        <rect x="16.5" y="11.5" width="11" height="3" rx="1" fill="#D4AC6A" stroke="#785828" strokeWidth="0.9" />
        {/* 琥珀避光藥瓶 */}
        <path
          d="M17.5 14.5H26.5L28 19C30 20.5 30.8 22.8 30.8 25.5V36.5C30.8 38.7 29 40.5 26.8 40.5H17.2C15 40.5 13.2 38.7 13.2 36.5V25.5C13.2 22.8 14 20.5 16 19L17.5 14.5Z"
          fill={`url(#${uid}-amber)`}
          stroke="#5A3012"
          strokeWidth="1.2"
        />
        {/* 玻璃高光折射 */}
        <path d="M16.2 22.5V35.5" stroke="#FFF4E0" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
        {/* 標籤貼紙與刻度 */}
        <rect x="16.5" y="25" width="11" height="8" rx="1.2" fill="#FAF4E8" stroke="#C8B498" strokeWidth="0.8" />
        <path d="M18.8 28H25.2M18.8 30.5H23.2" stroke="#7C634C" strokeWidth="1" strokeLinecap="round" />
        {/* 前景植萃葉片 */}
        <path
          d="M27.5 37.5C27.5 29.5 33.5 24 40.5 23.5C40 31.5 35.5 37 27.5 37.5Z"
          fill={`url(#${uid}-leaf)`}
          stroke="#2E4530"
          strokeWidth="1.1"
        />
        <path d="M28 37C31.5 33 35 28.5 39 25" stroke="#DDEBD9" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
      </svg>
    );
  }

  if (variant === "coat") {
    // 深海金珀魚油珠與櫸木梳
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0 drop-shadow-[0_2px_4px_rgba(140,95,40,0.2)]"
      >
        <defs>
          <linearGradient id={`${uid}-wood`} x1="10" y1="10" x2="36" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E6C39A" />
            <stop offset="60%" stopColor="#C18F5E" />
            <stop offset="100%" stopColor="#8A5A32" />
          </linearGradient>
          <radialGradient id={`${uid}-oil`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFF2BF" />
            <stop offset="45%" stopColor="#E6A43A" />
            <stop offset="100%" stopColor="#A65E14" />
          </radialGradient>
        </defs>
        {/* 溫潤櫸木梳背 */}
        <rect
          x="8"
          y="10"
          width="28"
          height="11"
          rx="5.5"
          fill={`url(#${uid}-wood)`}
          stroke="#6F4523"
          strokeWidth="1.2"
        />
        <path d="M13 13.5H31" stroke="#F7DFC2" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
        {/* 梳齒 */}
        {[12, 16, 20, 24, 28, 32].map((x) => (
          <path
            key={x}
            d={`M${x} 21V33.5`}
            stroke="#A57347"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        ))}
        {/* 剔透深海金珀魚油珠 */}
        <path
          d="M35.5 21C35.5 21 41.5 27.8 41.5 32.5C41.5 35.8 38.8 38.5 35.5 38.5C32.2 38.5 29.5 35.8 29.5 32.5C29.5 27.8 35.5 21 35.5 21Z"
          fill={`url(#${uid}-oil)`}
          stroke="#7A440C"
          strokeWidth="1.1"
        />
        <ellipse cx="33.5" cy="30.5" rx="1.6" ry="2.8" transform="rotate(-18 33.5 30.5)" fill="#FFFDF5" opacity="0.8" />
      </svg>
    );
  }

  // energy: 精工黃銅發條與高蛋白肉磚
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0 drop-shadow-[0_2px_4px_rgba(110,70,40,0.2)]"
    >
      <defs>
        <linearGradient id={`${uid}-cube`} x1="10" y1="18" x2="32" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B86B4B" />
          <stop offset="50%" stopColor="#8F4930" />
          <stop offset="100%" stopColor="#5D2D1C" />
        </linearGradient>
        <linearGradient id={`${uid}-gear`} x1="22" y1="7" x2="40" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8E2A6" />
          <stop offset="50%" stopColor="#CFA04E" />
          <stop offset="100%" stopColor="#896020" />
        </linearGradient>
      </defs>
      {/* 精工黃銅齒輪發條 */}
      <circle cx="32" cy="17" r="7.5" fill={`url(#${uid}-gear)`} stroke="#724F19" strokeWidth="1.2" />
      <circle cx="32" cy="17" r="3" fill="#FAF4E8" stroke="#724F19" strokeWidth="1" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <rect
          key={deg}
          x="30.8"
          y="7"
          width="2.4"
          height="3.2"
          rx="0.6"
          fill="#C99846"
          transform={`rotate(${deg} 32 17)`}
        />
      ))}
      {/* 立體烘焙鮮肉能量塊 */}
      <path d="M9 22L20 17L31 22L20 27L9 22Z" fill="#CE7E5B" stroke="#63301E" strokeWidth="1.1" />
      <path d="M9 22V34L20 39V27L9 22Z" fill={`url(#${uid}-cube)`} stroke="#63301E" strokeWidth="1.1" />
      <path d="M31 22V34L20 39V27L31 22Z" fill="#7A3C26" stroke="#63301E" strokeWidth="1.1" />
      <path d="M13 21.5L20 18.5L26 21.5" stroke="#FCE0CF" strokeWidth="1" opacity="0.65" />
    </svg>
  );
}

/**
 * 擬真火漆封蠟印章 SVG
 */
export function WaxSealStamp({
  text,
  subtext,
  size = 94,
}: {
  text: string;
  subtext?: string;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 110 110"
        fill="none"
        className="size-full drop-shadow-[0_6px_12px_rgba(115,34,22,0.32)]"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`${uid}-wax`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#D66249" />
            <stop offset="55%" stopColor="#AC3B27" />
            <stop offset="100%" stopColor="#722114" />
          </radialGradient>
          <radialGradient id={`${uid}-inner`} cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#9E3120" />
            <stop offset="100%" stopColor="#BE4631" />
          </radialGradient>
        </defs>
        {/* 不規則熔蠟外廓 */}
        <path
          d="M55 5C65 4 74 9 82 14C90 19 99 25 102 35C105 45 107 55 103 66C99 77 95 88 86 95C77 102 66 105 55 104C44 103 33 103 24 96C15 89 9 79 6 68C3 57 5 46 9 35C13 24 20 15 30 10C40 5 45 6 55 5Z"
          fill={`url(#${uid}-wax)`}
          stroke="#59180E"
          strokeWidth="1.5"
        />
        {/* 光暈邊緣 */}
        <path
          d="M25 18C38 9 60 8 78 16"
          stroke="#F5A695"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.45"
        />
        {/* 內圈壓痕 */}
        <circle cx="55" cy="55" r="36" fill={`url(#${uid}-inner)`} stroke="#691C10" strokeWidth="2.5" />
        <circle cx="55" cy="55" r="32.5" stroke="#EB9380" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.7" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center leading-tight text-[#FFF3EA]">
        {subtext && (
          <span className="text-[8px] font-bold tracking-[0.18em] text-[#FAD1C5] uppercase">
            {subtext}
          </span>
        )}
        <span className="mt-0.5 font-serif text-[11px] font-bold tracking-wider drop-shadow-[0_1px_1px_rgba(60,10,5,0.6)]">
          {text}
        </span>
      </div>
    </div>
  );
}

/**
 * 黃銅浮雕物種銘牌徽章
 */
export function SpeciesMedallion({
  type,
  size = "md",
}: {
  type: PetType;
  size?: "sm" | "md" | "lg";
}) {
  const uid = useId().replace(/:/g, "");
  const px = size === "sm" ? 28 : size === "lg" ? 64 : 44;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0 drop-shadow-[0_2px_5px_rgba(110,72,38,0.22)]"
    >
      <defs>
        <radialGradient id={`${uid}-plate`} cx="35%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#FAF0DC" />
          <stop offset="60%" stopColor="#DFC49B" />
          <stop offset="100%" stopColor="#A68255" />
        </radialGradient>
        <linearGradient id={`${uid}-emboss`} x1="18" y1="18" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C4E35" />
          <stop offset="100%" stopColor="#4A2C1B" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill={`url(#${uid}-plate)`} stroke="#8B6840" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="24.5" stroke="#FFF9ED" strokeWidth="1" opacity="0.7" />
      <circle cx="32" cy="32" r="23" stroke="#9A754A" strokeWidth="0.7" strokeDasharray="2 2" />

      {type === "CAT" && (
        <g fill={`url(#${uid}-emboss)`}>
          {/* 貓咪剪影浮雕 */}
          <path d="M21 19L26 26H38L43 19L45 31C45 39 39.5 45 32 45C24.5 45 19 39 19 31L21 19Z" />
          <circle cx="27.5" cy="32.5" r="1.5" fill="#FAF0DC" />
          <circle cx="36.5" cy="32.5" r="1.5" fill="#FAF0DC" />
          <path d="M30.5 36.5L32 38L33.5 36.5" stroke="#FAF0DC" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      )}
      {type === "DOG" && (
        <g fill={`url(#${uid}-emboss)`}>
          {/* 狗狗垂耳剪影浮雕 */}
          <path d="M21 24C17 24 15 31 17 36C18.5 36.5 20.5 34.5 21.5 31.5V35C21.5 41 26 45 32 45C38 45 42.5 41 42.5 35V31.5C43.5 34.5 45.5 36.5 47 36C49 31 47 24 43 24C41 21 36.5 20 32 20C27.5 20 23 21 21 24Z" />
          <circle cx="28" cy="30" r="1.5" fill="#FAF0DC" />
          <circle cx="36" cy="30" r="1.5" fill="#FAF0DC" />
          <ellipse cx="32" cy="35" rx="2.5" ry="1.8" fill="#FAF0DC" />
        </g>
      )}
      {type === "HAMSTER" && (
        <g fill={`url(#${uid}-emboss)`}>
          {/* 倉鼠圓頰剪影浮雕 */}
          <circle cx="23" cy="23" r="4.5" />
          <circle cx="41" cy="23" r="4.5" />
          <path d="M18 33C18 26 24 22 32 22C40 22 46 26 46 33C46 40 41 44 32 44C23 44 18 40 18 33Z" />
          <circle cx="27.5" cy="31" r="1.4" fill="#FAF0DC" />
          <circle cx="36.5" cy="31" r="1.4" fill="#FAF0DC" />
          <circle cx="32" cy="34.5" r="1.4" fill="#FAF0DC" />
        </g>
      )}
      {type === "RABBIT" && (
        <g fill={`url(#${uid}-emboss)`}>
          {/* 兔兔長耳剪影浮雕 */}
          <ellipse cx="26" cy="21" rx="3.4" ry="9.5" transform="rotate(-8 26 21)" />
          <ellipse cx="38" cy="21" rx="3.4" ry="9.5" transform="rotate(8 38 21)" />
          <ellipse cx="32" cy="36" rx="12" ry="9.5" />
          <circle cx="27.5" cy="34.5" r="1.4" fill="#FAF0DC" />
          <circle cx="36.5" cy="34.5" r="1.4" fill="#FAF0DC" />
          <circle cx="32" cy="38" r="1.3" fill="#FAF0DC" />
        </g>
      )}
    </svg>
  );
}

/**
 * 台灣壹圓紅銅硬幣 20mm 實寸刻度比例尺 SVG
 */
export function NtdCoinSvg({ size = 38 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className="shrink-0 drop-shadow-[0_2px_4px_rgba(120,75,35,0.28)]"
    >
      <defs>
        <radialGradient id={`${uid}-copper`} cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#F7DCBD" />
          <stop offset="50%" stopColor="#CF9660" />
          <stop offset="100%" stopColor="#8C5328" />
        </radialGradient>
      </defs>
      <circle cx="22" cy="22" r="20" fill={`url(#${uid}-copper)`} stroke="#6E3E1B" strokeWidth="1.4" />
      <circle cx="22" cy="22" r="17" stroke="#FAE7CF" strokeWidth="0.9" opacity="0.8" />
      <circle cx="22" cy="22" r="15.2" stroke="#784722" strokeWidth="0.7" strokeDasharray="1.5 2" />
      <text
        x="22"
        y="25"
        textAnchor="middle"
        fill="#542E12"
        fontSize="11.5"
        fontWeight="700"
        fontFamily="Georgia, serif"
      >
        壹圓
      </text>
      <text
        x="22"
        y="34"
        textAnchor="middle"
        fill="#6E3F1C"
        fontSize="5.5"
        fontFamily="monospace"
        fontWeight="700"
      >
        20mm
      </text>
    </svg>
  );
}

/**
 * 日台曲木三格便當盒微縮圖件
 */
export function BentoWoodBoxSvg({ size = 32 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="shrink-0 drop-shadow-[0_2px_4px_rgba(110,70,35,0.2)]"
    >
      <defs>
        <linearGradient id={`${uid}-tray`} x1="4" y1="8" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E9CDA7" />
          <stop offset="100%" stopColor="#B68756" />
        </linearGradient>
      </defs>
      <rect x="4" y="8" width="32" height="24" rx="5" fill={`url(#${uid}-tray)`} stroke="#7A502D" strokeWidth="1.4" />
      <rect x="7" y="11" width="13.5" height="18" rx="2.5" fill="#FFF9F0" stroke="#A67C52" strokeWidth="1" />
      <rect x="22.5" y="11" width="10.5" height="8" rx="2" fill="#F2E6D5" stroke="#A67C52" strokeWidth="1" />
      <rect x="22.5" y="21" width="10.5" height="8" rx="2" fill="#EAEBE2" stroke="#A67C52" strokeWidth="1" />
      <circle cx="13.75" cy="20" r="4" fill="#935941" opacity="0.85" />
    </svg>
  );
}

/**
 * 牛皮紙試食小包微縮圖件
 */
export function SampleSachetSvg({
  variant = "salmon",
  size = 36,
}: {
  variant?: "catnip" | "salmon" | "timothy";
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const accent =
    variant === "catnip" ? "#4E6752" : variant === "timothy" ? "#8A6D3B" : "#935941";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="shrink-0 drop-shadow-[0_2px_4px_rgba(95,60,30,0.18)]"
    >
      <defs>
        <linearGradient id={`${uid}-kraft`} x1="8" y1="5" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EFE0C9" />
          <stop offset="65%" stopColor="#D7BC96" />
          <stop offset="100%" stopColor="#B89467" />
        </linearGradient>
      </defs>
      <rect x="8" y="5" width="24" height="30" rx="3" fill={`url(#${uid}-kraft)`} stroke="#7E5D3B" strokeWidth="1.2" />
      <path d="M8 9.5H32" stroke="#8C6B47" strokeWidth="0.9" strokeDasharray="2 1.5" />
      <rect x="11.5" y="14" width="17" height="14" rx="2" fill="#FFFDF8" stroke="#C8B296" strokeWidth="0.8" />
      <circle cx="20" cy="21" r="4.2" fill={accent} opacity="0.9" />
      <circle cx="20" cy="21" r="1.6" fill="#FFFDF8" />
    </svg>
  );
}
