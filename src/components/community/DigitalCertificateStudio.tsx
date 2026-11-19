"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Camera,
  Copy,
  Download,
  Eraser,
  FileCheck2,
  PenTool,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  ShieldCheck,
  Sparkles,
  Stamp,
} from "lucide-react";
import { toast } from "sonner";
import type { ActivePet } from "@/lib/types";
import { petLabels } from "@/lib/types";
import { SpeciesMedallion, WaxSealStamp } from "@/components/ui/CraftEmblems";
import { triggerPawBurst } from "@/lib/flyToCart";

const HONOR_TITLES = [
  "街坊安穩伴食首席代表",
  "挑嘴食安品質評鑑委員",
  "巷口散策晨間固定班底",
  "聞香瞬移清盤滿分紀錄保持人",
  "海島四季毛質豐盈模範里民",
] as const;

const HONOR_STAMPS = [
  "準時開飯認證",
  "純淨原肉適配",
  "清盤滿分核定",
  "街坊友善模範",
] as const;

const PLEDGE_PRESETS = [
  "茲證明本里民每日皆享有產地透明、無人工誘食劑之純淨鮮肉主食，並由家人細心陪伴度過四時三餐。",
  "經核定已完成個人過敏原避忌建檔與每日熱量精算，特頒此狀以茲紀念日台生活工藝伴食之約。",
  "願每一口慢焙原肉與午後陽光，都能化作長久安穩的健康陪伴，特立此街坊榮譽里民認證書。",
] as const;

interface DigitalCertificateStudioProps {
  activePet: ActivePet;
  onUseInDiary: (payload: {
    petName: string;
    title: string;
    stamp: string;
    serialNo: string;
  }) => void;
}

export function DigitalCertificateStudio({
  activePet,
  onUseInDiary,
}: DigitalCertificateStudioProps) {
  const [layout, setLayout] = useState<"landscape" | "portrait">("landscape");
  const [petName, setPetName] = useState(activePet.name);
  const [breedText, setBreedText] = useState(
    activePet.breed || petLabels[activePet.type],
  );
  const [weightText, setWeightText] = useState(`${activePet.weightKg} 公斤`);
  const [allergyText, setAllergyText] = useState(
    activePet.allergies.length > 0
      ? `已核定避開：${activePet.allergies.join("、")}`
      : "全肉源適配・無已知過敏原",
  );
  const [honorTitle, setHonorTitle] = useState<string>(HONOR_TITLES[0]!);
  const [sealText, setSealText] = useState<string>(HONOR_STAMPS[0]!);
  const [pledgeText, setPledgeText] = useState<string>(PLEDGE_PRESETS[0]!);
  const [ownerName, setOwnerName] = useState("摯愛家人 親署");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    activePet.avatarUrl || null,
  );
  const [stampTrigger, setStampTrigger] = useState(0);
  const [downloading, setDownloading] = useState(false);

  // 手寫簽名板狀態
  const [signMode, setSignMode] = useState<"type" | "draw">("type");
  const signCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  useEffect(() => {
    setPetName(activePet.name);
    setBreedText(activePet.breed || petLabels[activePet.type]);
    setWeightText(`${activePet.weightKg} 公斤`);
    setAllergyText(
      activePet.allergies.length > 0
        ? `已核定避開：${activePet.allergies.join("、")}`
        : "全肉源適配・無已知過敏原",
    );
    setPhotoDataUrl(activePet.avatarUrl || null);
  }, [activePet]);

  const ageLabel =
    activePet.ageMonths >= 12
      ? `${Math.floor(activePet.ageMonths / 12)} 歲 ${activePet.ageMonths % 12} 個月`
      : `${activePet.ageMonths} 個月`;

  const serialNo = `TW-${activePet.type.slice(0, 3)}-2026-${String(
    (petName.charCodeAt(0) || 88) * 10 + Math.round(activePet.weightKg * 10),
  ).padStart(4, "0")}`;

  const issueDate = "2026.11.19";

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("圖片大小請勿超過 8MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoDataUrl(reader.result);
        toast.success("已載入毛孩專屬肖像照片");
      }
    };
    reader.readAsDataURL(file);
  }

  // 手寫簽名板事件
  function getCanvasPoint(
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e, canvas);
    ctx.strokeStyle = "#3b281c";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
    setHasDrawnSignature(true);
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pt = getCanvasPoint(e, canvas);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }

  function endDraw() {
    setIsDrawing(false);
  }

  function clearSignature() {
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  }

  // 高解析度 Canvas 數位證書繪製與 PNG 匯出
  async function handleDownloadCertificate(
    e: React.MouseEvent<HTMLButtonElement>,
  ) {
    triggerPawBurst(e.currentTarget);
    setDownloading(true);
    try {
      const isLandscape = layout === "landscape";
      const W = isLandscape ? 1600 : 1080;
      const H = isLandscape ? 1080 : 1920;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("無法初始化畫布");

      // 1. 宣紙／羊皮紙溫潤漸層基底
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, "#fffdf8");
      bgGrad.addColorStop(0.5, "#faf1e2");
      bgGrad.addColorStop(1, "#f2e2ca");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. Guilloché 古典防偽同心幾何波紋
      ctx.save();
      ctx.strokeStyle = "rgba(166, 130, 88, 0.085)";
      ctx.lineWidth = 1.2;
      const cx = W / 2;
      const cy = H / 2;
      for (let r = 80; r < Math.max(W, H) * 0.72; r += 26) {
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.03) {
          const wave = Math.sin(a * 16) * 8 + Math.cos(a * 8) * 5;
          const px = cx + (r + wave) * Math.cos(a);
          const py = cy + (r + wave) * Math.sin(a);
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();

      // 3. 外層活版雙線雕花邊框與四角古典黃銅紋飾
      const pad = isLandscape ? 46 : 44;
      ctx.strokeStyle = "#8c6744";
      ctx.lineWidth = 4;
      ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

      ctx.strokeStyle = "#c7ab88";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad + 12, pad + 12, W - (pad + 12) * 2, H - (pad + 12) * 2);

      ctx.strokeStyle = "#935941";
      ctx.lineWidth = 2;
      ctx.strokeRect(pad + 22, pad + 22, W - (pad + 22) * 2, H - (pad + 22) * 2);

      // 四角雕花角飾
      const corners = [
        [pad + 22, pad + 22, 1, 1],
        [W - pad - 22, pad + 22, -1, 1],
        [pad + 22, H - pad - 22, 1, -1],
        [W - pad - 22, H - pad - 22, -1, -1],
      ] as const;
      ctx.save();
      ctx.strokeStyle = "#935941";
      ctx.fillStyle = "#935941";
      ctx.lineWidth = 2.5;
      for (const [x, y, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * 42);
        ctx.lineTo(x + dx * 16, y + dy * 42);
        ctx.lineTo(x + dx * 16, y + dy * 16);
        ctx.lineTo(x + dx * 42, y + dy * 16);
        ctx.lineTo(x + dx * 42, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + dx * 10, y + dy * 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 4. 頂部標題與防偽流水字號
      const topY = isLandscape ? 118 : 140;
      ctx.fillStyle = "#935941";
      ctx.font = "bold 18px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "PURESPOT CRAFT CITIZENSHIP & NUTRITION CERTIFICATE · TAIWAN",
        W / 2,
        topY,
      );

      ctx.fillStyle = "#2b221b";
      ctx.font = isLandscape
        ? "bold 52px Georgia, 'Noto Serif TC', serif"
        : "bold 46px Georgia, 'Noto Serif TC', serif";
      ctx.fillText("台灣街坊毛孩・榮譽里民伴食認證書", W / 2, topY + 62);

      // 分隔雙金線与中央菱形徽記
      ctx.strokeStyle = "#bda07f";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(pad + 70, topY + 92);
      ctx.lineTo(W - pad - 70, topY + 92);
      ctx.stroke();

      ctx.fillStyle = "#935941";
      ctx.beginPath();
      ctx.moveTo(W / 2, topY + 83);
      ctx.lineTo(W / 2 + 10, topY + 92);
      ctx.lineTo(W / 2, topY + 101);
      ctx.lineTo(W / 2 - 10, topY + 92);
      ctx.closePath();
      ctx.fill();

      // 載入毛孩照片輔助函式
      const loadImg = (src: string) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });

      const petImg = photoDataUrl ? await loadImg(photoDataUrl) : null;

      if (isLandscape) {
        // 橫式版型佈局：左側圓拱金框肖像區 + 右側正式證書內文與六格體質認證表
        const photoCx = 320;
        const photoCy = 470;
        const photoR = 135;

        // 肖像外層金環
        ctx.save();
        ctx.beginPath();
        ctx.arc(photoCx, photoCy, photoR + 12, 0, Math.PI * 2);
        ctx.fillStyle = "#efe0cb";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#935941";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(photoCx, photoCy, photoR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = "#fffaf2";
        ctx.fillRect(
          photoCx - photoR,
          photoCy - photoR,
          photoR * 2,
          photoR * 2,
        );
        if (petImg) {
          const scale = Math.max(
            (photoR * 2) / petImg.width,
            (photoR * 2) / petImg.height,
          );
          const dw = petImg.width * scale;
          const dh = petImg.height * scale;
          ctx.drawImage(petImg, photoCx - dw / 2, photoCy - dh / 2, dw, dh);
        } else {
          ctx.fillStyle = "#935941";
          ctx.font = "bold 56px Georgia, serif";
          ctx.textAlign = "center";
          ctx.fillText(petName.slice(0, 2), photoCx, photoCy + 18);
        }
        ctx.restore();

        // 肖像下方銘牌編號籤
        ctx.fillStyle = "#935941";
        ctx.fillRect(photoCx - 125, photoCy + photoR + 28, 250, 42);
        ctx.fillStyle = "#fffdf8";
        ctx.font = "bold 17px Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          `CERT NO. ${serialNo}`,
          photoCx,
          photoCy + photoR + 55,
        );

        // 右側主資訊區
        const rx = 530;
        ctx.textAlign = "left";
        ctx.fillStyle = "#7a634d";
        ctx.font = "bold 19px sans-serif";
        ctx.fillText("受證毛孩里民姓名 / HONORED CITIZEN", rx, 275);

        ctx.fillStyle = "#2b221b";
        ctx.font = "bold 58px Georgia, 'Noto Serif TC', serif";
        ctx.fillText(petName, rx, 342);

        // 年度榮譽稱號勳帶
        ctx.fillStyle = "#fdf3e4";
        ctx.strokeStyle = "#b58952";
        ctx.lineWidth = 2;
        ctx.fillRect(rx + 280, 294, 420, 56);
        ctx.strokeRect(rx + 280, 294, 420, 56);
        ctx.fillStyle = "#8c5328";
        ctx.font = "bold 24px 'Noto Sans TC', sans-serif";
        ctx.fillText(`榮譽核定 · ${honorTitle}`, rx + 296, 330);

        // 六格活版體質與飲食認證表格
        const tableY = 385;
        const tableW = 950;
        const tableH = 210;
        ctx.fillStyle = "rgba(255, 252, 246, 0.85)";
        ctx.strokeStyle = "#cbb294";
        ctx.lineWidth = 2;
        ctx.fillRect(rx, tableY, tableW, tableH);
        ctx.strokeRect(rx, tableY, tableW, tableH);

        // 表格格線
        ctx.beginPath();
        ctx.moveTo(rx, tableY + tableH / 2);
        ctx.lineTo(rx + tableW, tableY + tableH / 2);
        ctx.moveTo(rx + tableW / 3, tableY);
        ctx.lineTo(rx + tableW / 3, tableY + tableH);
        ctx.moveTo(rx + (tableW * 2) / 3, tableY);
        ctx.lineTo(rx + (tableW * 2) / 3, tableY + tableH);
        ctx.stroke();

        const cells = [
          ["物種與品種別", `${petLabels[activePet.type]} · ${breedText}`],
          ["核定體重與年齡", `${weightText} · ${ageLabel}`],
          ["檔案入籍日期", issueDate],
          ["過敏原安全核定", allergyText],
          ["封蠟認證章記", sealText],
          ["核發認證機構", "PURESPOT 日台生活工藝選物所"],
        ] as const;

        cells.forEach(([label, val], idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          const cellX = rx + col * (tableW / 3) + 22;
          const cellY = tableY + row * (tableH / 2) + 36;
          ctx.fillStyle = "#8a725c";
          ctx.font = "bold 15px sans-serif";
          ctx.fillText(label, cellX, cellY);
          ctx.fillStyle = "#2b221b";
          ctx.font = "bold 21px sans-serif";
          ctx.fillText(val.slice(0, 18), cellX, cellY + 38);
        });

        // 伴食宣言
        ctx.fillStyle = "#5a493b";
        ctx.font = "22px Georgia, 'Noto Serif TC', serif";
        ctx.fillText(`「${pledgeText.slice(0, 40)}`, rx, 650);
        if (pledgeText.length > 40) {
          ctx.fillText(`${pledgeText.slice(40, 80)}」`, rx, 686);
        } else {
          ctx.fillText("」", rx + pledgeText.length * 22, 650);
        }
      } else {
        // 直式 9:16 IG 限動版佈局
        const photoCx = W / 2;
        const photoCy = 460;
        const photoR = 165;

        ctx.save();
        ctx.beginPath();
        ctx.arc(photoCx, photoCy, photoR + 14, 0, Math.PI * 2);
        ctx.fillStyle = "#efe0cb";
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "#935941";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(photoCx, photoCy, photoR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = "#fffaf2";
        ctx.fillRect(
          photoCx - photoR,
          photoCy - photoR,
          photoR * 2,
          photoR * 2,
        );
        if (petImg) {
          const scale = Math.max(
            (photoR * 2) / petImg.width,
            (photoR * 2) / petImg.height,
          );
          const dw = petImg.width * scale;
          const dh = petImg.height * scale;
          ctx.drawImage(petImg, photoCx - dw / 2, photoCy - dh / 2, dw, dh);
        } else {
          ctx.fillStyle = "#935941";
          ctx.font = "bold 68px Georgia, serif";
          ctx.textAlign = "center";
          ctx.fillText(petName.slice(0, 2), photoCx, photoCy + 24);
        }
        ctx.restore();

        ctx.textAlign = "center";
        ctx.fillStyle = "#2b221b";
        ctx.font = "bold 64px Georgia, 'Noto Serif TC', serif";
        ctx.fillText(petName, W / 2, 725);

        ctx.fillStyle = "#935941";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(`【 ${honorTitle} 】`, W / 2, 780);

        // 直式四欄認證表
        const boxX = 110;
        const boxY = 835;
        const boxW = W - 220;
        const boxH = 420;
        ctx.fillStyle = "rgba(255, 252, 246, 0.9)";
        ctx.strokeStyle = "#cbb294";
        ctx.lineWidth = 2;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        const rows = [
          ["證書字號", serialNo],
          ["品種與歲數", `${petLabels[activePet.type]} · ${breedText} (${ageLabel})`],
          ["體重紀錄", weightText],
          ["過敏原避忌認證", allergyText],
          ["核發日期與單位", `${issueDate} · PURESPOT 生活工藝選物所`],
        ] as const;

        ctx.textAlign = "left";
        rows.forEach(([k, v], idx) => {
          const ry = boxY + 58 + idx * 76;
          ctx.fillStyle = "#8a725c";
          ctx.font = "bold 20px sans-serif";
          ctx.fillText(k, boxX + 36, ry);
          ctx.fillStyle = "#2b221b";
          ctx.font = "bold 24px sans-serif";
          ctx.fillText(v.slice(0, 26), boxX + 250, ry);
        });

        ctx.textAlign = "center";
        ctx.fillStyle = "#5a493b";
        ctx.font = "24px Georgia, 'Noto Serif TC', serif";
        ctx.fillText(pledgeText.slice(0, 32), W / 2, 1340);
        if (pledgeText.length > 32) {
          ctx.fillText(pledgeText.slice(32, 64), W / 2, 1382);
        }
      }

      // 5. 底部防偽條碼、飼主親筆簽名、24K 燙金鋼印與朱紅火漆印鑑
      const footerY = isLandscape ? 835 : 1580;

      // 左側防偽條碼
      const barcodeX = isLandscape ? 120 : 120;
      ctx.fillStyle = "#3b2e23";
      for (let i = 0; i < 38; i++) {
        const bw = (i * 7 + 3) % 3 === 0 ? 4 : 2;
        ctx.fillRect(barcodeX + i * 7, footerY - 35, bw, 46);
      }
      ctx.font = "bold 14px Consolas, monospace";
      ctx.textAlign = "left";
      ctx.fillText(
        `AUTHENTICATED · ${serialNo}`,
        barcodeX,
        footerY + 30,
      );

      // 中央飼主親筆簽名欄
      const signX = isLandscape ? 540 : 120;
      const signY = isLandscape ? footerY : footerY + 135;
      ctx.strokeStyle = "#8c7259";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(signX, signY + 18);
      ctx.lineTo(signX + 310, signY + 18);
      ctx.stroke();

      if (
        signMode === "draw" &&
        hasDrawnSignature &&
        signCanvasRef.current
      ) {
        ctx.drawImage(signCanvasRef.current, signX + 20, signY - 56, 240, 72);
      } else {
        ctx.fillStyle = "#3a271b";
        ctx.font = "italic bold 32px Georgia, 'Noto Serif TC', serif";
        ctx.fillText(ownerName, signX + 24, signY + 4);
      }
      ctx.fillStyle = "#7d6854";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(
        "飼主親筆簽署 / GUARDIAN SIGNATURE",
        signX,
        signY + 42,
      );

      // 24K 燙金齒輪浮雕鋼印
      const goldX = isLandscape ? 1140 : 680;
      const goldY = isLandscape ? 825 : 1620;
      ctx.save();
      ctx.fillStyle = "#d9af57";
      ctx.strokeStyle = "#8f681e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const teeth = 28;
      for (let i = 0; i < teeth * 2; i++) {
        const r = i % 2 === 0 ? 74 : 66;
        const a = (i * Math.PI) / teeth;
        const gx = goldX + r * Math.cos(a);
        const gy = goldY + r * Math.sin(a);
        if (i === 0) ctx.moveTo(gx, gy);
        else ctx.lineTo(gx, gy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(goldX, goldY, 54, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff4d4";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#523809";
      ctx.textAlign = "center";
      ctx.font = "bold 13px Consolas, monospace";
      ctx.fillText("7C CRAFT VERIFIED", goldX, goldY - 10);
      ctx.font = "bold 17px serif";
      ctx.fillText("金箔品質核定", goldX, goldY + 14);
      ctx.restore();

      // 朱紅火漆封蠟印章
      const waxX = isLandscape ? 1335 : 880;
      const waxY = isLandscape ? 820 : 1620;
      ctx.save();
      const waxGrad = ctx.createRadialGradient(
        waxX - 18,
        waxY - 18,
        10,
        waxX,
        waxY,
        84,
      );
      waxGrad.addColorStop(0, "#d85f45");
      waxGrad.addColorStop(0.6, "#a63522");
      waxGrad.addColorStop(1, "#6b1d10");
      ctx.fillStyle = waxGrad;
      ctx.beginPath();
      ctx.arc(waxX, waxY, 82, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#57160b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(waxX, waxY, 64, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#fff3ea";
      ctx.textAlign = "center";
      ctx.font = "bold 13px Consolas, monospace";
      ctx.fillText("PURESPOT SEAL", waxX, waxY - 12);
      ctx.font = "bold 20px serif";
      ctx.fillText(sealText, waxX, waxY + 16);
      ctx.restore();

      // 觸發下載
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `PURESPOT-數位里民認證書-${petName}-${layout}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(
        `已下載高解析度數位認證書（${isLandscape ? "橫式典藏賞狀" : "9:16 IG 限動版"} .PNG）`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "證書匯出失敗");
    } finally {
      setDownloading(false);
    }
  }

  function handleCopyCertificateText() {
    const text = `【台灣街坊毛孩・榮譽里民伴食認證書】\n證書字號：${serialNo}\n受證里民：${petName}（${petLabels[activePet.type]}・${breedText}）\n年度榮譽稱號：${honorTitle}\n過敏原安全核定：${allergyText}\n封蠟雙印鑑：${sealText}\n—— PURESPOT 日台生活工藝選物所 核發`;
    void navigator.clipboard.writeText(text);
    toast.success("已複製數位認證書完整字號與宣言");
  }

  return (
    <section id="id-card-studio" className="page-shell mt-10 scroll-mt-24">
      <div className="craft-letterpress overflow-hidden rounded-[2.2rem] p-6 sm:p-10">
        {/* 頂部工作台標頭與版型切換器 */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4d5c3] pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d5c3ae] bg-[#faf2e6] px-3.5 py-1 font-mono text-[11px] font-bold tracking-wider text-[#935941]">
              <Award size={13} />
              DIGITAL CITIZENSHIP CERTIFICATE STUDIO · 數位銅版雕花認證所
            </span>
            <h2 className="editorial-title mt-2.5 text-2xl font-bold text-[#302b26] sm:text-4xl">
              核發「台灣街坊毛孩・數位里民伴食認證書」
            </h2>
            <p className="mt-1 text-xs leading-6 text-[#6b5d50] sm:text-sm">
              自動同步 {activePet.name}{" "}
              的體重、品種與過敏原避忌紀錄，支援上傳專屬照片、手寫飼主簽名、雙重火漆金箔蓋印與一鍵下載高解析度
              PNG 證書。
            </p>
          </div>

          {/* 雙版型切換 */}
          <div className="flex items-center gap-2 rounded-2xl border border-[#dfd0be] bg-[#faf4eb] p-1.5">
            <button
              type="button"
              onClick={() => setLayout("landscape")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                layout === "landscape"
                  ? "bg-[#935941] text-white shadow-xs"
                  : "text-[#6a5b4e] hover:text-[#302b26]"
              }`}
            >
              <RectangleHorizontal size={15} />
              橫式古典雕花賞狀
            </button>
            <button
              type="button"
              onClick={() => setLayout("portrait")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                layout === "portrait"
                  ? "bg-[#935941] text-white shadow-xs"
                  : "text-[#6a5b4e] hover:text-[#302b26]"
              }`}
            >
              <RectangleVertical size={15} />
              9:16 IG 限動直式證書
            </button>
          </div>
        </div>

        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          {/* 左欄：認證書客製化控制台 */}
          <div className="space-y-5 rounded-2xl border border-[#e5d7c5] bg-[#fcf8f2] p-5 sm:p-6">
            {/* 1. 毛孩大名、品種與照片上傳 */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#5e5044]">
                1. 受證毛孩姓名
                <input
                  type="text"
                  maxLength={20}
                  value={petName}
                  onChange={(e) => setPetName(e.target.value || activePet.name)}
                  className="input !mt-1 bg-white font-bold"
                />
              </label>
              <label className="text-xs font-bold text-[#5e5044]">
                2. 品種與特徵標註
                <input
                  type="text"
                  maxLength={24}
                  value={breedText}
                  onChange={(e) => setBreedText(e.target.value)}
                  className="input !mt-1 bg-white"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#5e5044]">
                3. 體重與體態核定
                <input
                  type="text"
                  maxLength={20}
                  value={weightText}
                  onChange={(e) => setWeightText(e.target.value)}
                  className="input !mt-1 bg-white"
                />
              </label>
              <label className="text-xs font-bold text-[#5e5044]">
                4. 過敏原安全避忌認證
                <input
                  type="text"
                  maxLength={32}
                  value={allergyText}
                  onChange={(e) => setAllergyText(e.target.value)}
                  className="input !mt-1 bg-white"
                />
              </label>
            </div>

            {/* 上傳毛孩照片 */}
            <div className="rounded-xl border border-[#dfd0be] bg-white p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-[#302b26]">
                    5. 毛孩證書肖像照片（將嵌入證書圓拱金框並隨 PNG 下載）
                  </p>
                  <p className="text-[11px] text-[#7c6d5f]">
                    支援 JPG / PNG / WebP，未上傳則使用工藝浮雕徽章
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#935941] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#7d4934]">
                    <Camera size={14} />
                    上傳毛孩照片
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {photoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl(null)}
                      className="rounded-xl border border-[#dfd0be] px-2.5 py-2 text-xs font-semibold text-[#6e5e50] hover:bg-[#f4ece1]"
                    >
                      改用浮雕徽章
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 年度榮譽稱號 */}
            <div>
              <p className="mb-2 text-xs font-bold text-[#5e5044]">
                6. 核定年度榮譽稱號
              </p>
              <div className="flex flex-wrap gap-1.5">
                {HONOR_TITLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHonorTitle(t)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      honorTitle === t
                        ? "bg-[#935941] text-white shadow-2xs"
                        : "border border-[#dfd0be] bg-white text-[#6a5b4e] hover:border-[#935941]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 壓蓋雙印鑑與伴食證詞 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-[#5e5044]">
                  7. 選擇火漆與金箔鋼印核章（點擊觸發蓋印動畫）
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    triggerPawBurst(e.currentTarget);
                    setStampTrigger((c) => c + 1);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#935941] hover:underline"
                >
                  <Stamp size={12} />
                  重新蓋印
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HONOR_STAMPS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={(e) => {
                      setSealText(st);
                      setStampTrigger((c) => c + 1);
                      triggerPawBurst(e.currentTarget);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      sealText === st
                        ? "bg-[#4e6752] text-white shadow-2xs"
                        : "border border-[#dfd0be] bg-white text-[#6a5b4e] hover:border-[#4e6752]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* 飼主親筆簽名板（手寫畫布 or 活版落款） */}
            <div className="rounded-xl border border-[#dfd0be] bg-white p-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#302b26]">
                  <PenTool size={13} className="text-[#935941]" />
                  8. 飼主親筆簽署（同步烙印於證書下方）
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSignMode("type")}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                      signMode === "type"
                        ? "bg-[#935941] text-white"
                        : "bg-[#f4ece1] text-[#6a5b4e]"
                    }`}
                  >
                    活版落款字體
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignMode("draw")}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                      signMode === "draw"
                        ? "bg-[#935941] text-white"
                        : "bg-[#f4ece1] text-[#6a5b4e]"
                    }`}
                  >
                    手寫簽名畫布
                  </button>
                </div>
              </div>

              {signMode === "type" ? (
                <input
                  type="text"
                  maxLength={24}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="輸入飼主落款姓名"
                  className="input !mt-2 font-serif text-sm font-bold"
                />
              ) : (
                <div className="mt-2">
                  <div className="relative overflow-hidden rounded-xl border border-dashed border-[#c7b097] bg-[#fffdf8]">
                    <canvas
                      ref={signCanvasRef}
                      width={360}
                      height={96}
                      onPointerDown={startDraw}
                      onPointerMove={moveDraw}
                      onPointerUp={endDraw}
                      onPointerLeave={endDraw}
                      className="h-24 w-full cursor-crosshair touch-none"
                    />
                    {!hasDrawnSignature && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[#9c8b7a]">
                        請在此處以滑鼠或手指親筆簽名…
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex justify-end">
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7c6a58] hover:text-[#935941]"
                    >
                      <Eraser size={12} />
                      清除重簽
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右欄：高工藝數位認證書即時預覽與 PNG 下載 */}
          <div className="flex flex-col items-center">
            <motion.div
              key={`${layout}-${petName}-${honorTitle}`}
              initial={{ opacity: 0.92, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`relative w-full overflow-hidden rounded-[1.8rem] border-2 border-[#9e7b56] bg-[linear-gradient(145deg,#fffdf9_0%,#faf0e1_52%,#f1e0c7_100%)] shadow-[inset_0_0_0_5px_#fffdf8,inset_0_0_0_7px_#cbb193,inset_0_0_0_11px_#fffdf8,inset_0_0_0_12.5px_#935941,0_24px_50px_-22px_rgba(85,50,25,0.42)] ${
                layout === "landscape"
                  ? "max-w-2xl p-6 sm:p-8"
                  : "max-w-md p-6 sm:p-8"
              }`}
            >
              {/* 背景 Guilloché 古典防偽同心波紋 SVG */}
              <svg
                viewBox="0 0 600 400"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full object-cover opacity-20"
              >
                <circle
                  cx="300"
                  cy="200"
                  r="110"
                  stroke="#935941"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <circle
                  cx="300"
                  cy="200"
                  r="145"
                  stroke="#8c6744"
                  strokeWidth="0.7"
                />
                <circle
                  cx="300"
                  cy="200"
                  r="180"
                  stroke="#935941"
                  strokeWidth="0.8"
                  strokeDasharray="6 4"
                />
                <circle
                  cx="300"
                  cy="200"
                  r="220"
                  stroke="#8c6744"
                  strokeWidth="0.6"
                />
                <path
                  d="M25 25H85M25 25V85M575 25H515M575 25V85M25 375H85M25 375V315M575 375H515M575 375V315"
                  stroke="#935941"
                  strokeWidth="2.5"
                />
              </svg>

              {/* 證書頂部銅版銘文與雙線標頭 */}
              <div className="relative z-10 border-b-2 border-[#cbb293] pb-3.5 text-center">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.16em] text-[#8c6744]">
                  <span className="font-mono">AUTHENTICATED CITIZEN PASS</span>
                  <span className="font-mono">NO. {serialNo}</span>
                </div>
                <p className="mt-2 font-mono text-[10px] font-bold tracking-[0.22em] text-[#935941]">
                  PURESPOT CRAFT CITIZENSHIP CERTIFICATE
                </p>
                <h3 className="editorial-title mt-1 text-xl font-bold tracking-wider text-[#2b221b] sm:text-2xl">
                  台灣街坊毛孩・榮譽里民伴食認證書
                </h3>
              </div>

              {/* 證書主體區：依橫式或直式切換 */}
              <div
                className={`relative z-10 mt-5 ${
                  layout === "landscape"
                    ? "grid items-center gap-5 sm:grid-cols-[155px_1fr]"
                    : "flex flex-col items-center text-center"
                }`}
              >
                {/* 圓拱金框毛孩肖像 */}
                <div className="flex flex-col items-center">
                  <div className="relative flex size-32 items-center justify-center overflow-hidden rounded-full border-4 border-[#935941] bg-[#fffaf2] shadow-[0_0_0_4px_#efe0cb,0_10px_20px_rgba(95,60,35,0.2)]">
                    {photoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoDataUrl}
                        alt={petName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <SpeciesMedallion type={activePet.type} size="lg" />
                    )}
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#935941] px-3 py-0.5 font-mono text-[10px] font-bold text-white shadow-2xs">
                    <ShieldCheck size={11} />
                    {petLabels[activePet.type]}里民正本
                  </span>
                </div>

                {/* 受證毛孩資訊與六格活版認證表 */}
                <div className="w-full min-w-0">
                  <div
                    className={`flex flex-wrap items-baseline gap-2 ${
                      layout === "portrait" ? "justify-center" : ""
                    }`}
                  >
                    <span className="text-xs font-bold text-[#7c6652]">
                      受證里民：
                    </span>
                    <strong className="editorial-title text-2xl font-bold text-[#2b221b] sm:text-3xl">
                      {petName}
                    </strong>
                    <span className="rounded-md border border-[#c69d63] bg-[#fdf3e3] px-2.5 py-0.5 text-xs font-bold text-[#8a5624]">
                      {honorTitle}
                    </span>
                  </div>

                  {/* 六格體質與飲食認證表 */}
                  <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-[#cbb293] bg-[#fffcf7]/90 p-2.5 text-left text-[11px] sm:grid-cols-3">
                    <div className="rounded-lg bg-[#faf3e8] p-2">
                      <span className="block text-[10px] font-semibold text-[#8a725c]">
                        品種與歲數
                      </span>
                      <strong className="mt-0.5 block truncate text-[#2b221b]">
                        {breedText} · {ageLabel}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-[#faf3e8] p-2">
                      <span className="block text-[10px] font-semibold text-[#8a725c]">
                        體態與體重
                      </span>
                      <strong className="mt-0.5 block truncate text-[#2b221b]">
                        {weightText}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-[#faf3e8] p-2 col-span-2 sm:col-span-1">
                      <span className="block text-[10px] font-semibold text-[#8a725c]">
                        過敏原避忌核定
                      </span>
                      <strong className="mt-0.5 block truncate text-[#4e6752]">
                        {allergyText}
                      </strong>
                    </div>
                  </div>

                  {/* 證書正式證詞 */}
                  <p className="mt-3 text-left font-serif text-xs leading-5 text-[#544437]">
                    「{pledgeText}」
                  </p>
                </div>
              </div>

              {/* 證書底部：防偽條碼、飼主親筆簽名、24K 金箔鋼印與朱紅火漆封蠟雙印鑑 */}
              <div className="relative z-10 mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-[#d6c0a5] pt-4">
                {/* 防偽條碼與核發日期 */}
                <div>
                  <div
                    aria-hidden="true"
                    className="flex h-6 items-end gap-[2px]"
                  >
                    {Array.from({ length: 24 }).map((_, idx) => (
                      <span
                        key={idx}
                        className="bg-[#3b2e23]"
                        style={{
                          width: idx % 3 === 0 ? "3px" : "1.5px",
                          height: idx % 5 === 0 ? "24px" : "18px",
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-1 font-mono text-[9px] font-bold tracking-wider text-[#7d6854]">
                    ISSUED {issueDate} · PURESPOT TAIWAN
                  </p>
                </div>

                {/* 飼主簽名欄 */}
                <div className="min-w-[140px] border-b border-[#8c7259] pb-1 text-center">
                  <p className="font-serif text-sm font-bold italic text-[#3a271b]">
                    {signMode === "draw" && hasDrawnSignature
                      ? "（已附親筆手寫簽署）"
                      : ownerName}
                  </p>
                  <span className="block font-mono text-[9px] font-bold tracking-wider text-[#8a735e]">
                    GUARDIAN SIGNATURE
                  </span>
                </div>

                {/* 雙重印鑑：24K 金箔浮雕鋼印 + 朱紅火漆封蠟章 */}
                <div className="flex items-center gap-2">
                  {/* 24K 金箔浮雕鋼印 */}
                  <motion.div
                    key={`gold-${stampTrigger}-${sealText}`}
                    initial={{ scale: 1.35, rotate: 15, opacity: 0 }}
                    animate={{ scale: 1, rotate: -6, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className="flex size-16 flex-col items-center justify-center rounded-full border-2 border-[#8f681e] bg-[radial-gradient(circle_at_30%_30%,#fae7a5_0%,#d8ae54_58%,#9e7322_100%)] text-center shadow-md"
                  >
                    <span className="font-mono text-[7px] font-bold tracking-tighter text-[#523809]">
                      7C VERIFIED
                    </span>
                    <span className="font-serif text-[10px] font-bold text-[#3d2804]">
                      金箔核定
                    </span>
                  </motion.div>

                  {/* 朱紅火漆封蠟印章 */}
                  <motion.div
                    key={`wax-${stampTrigger}-${sealText}`}
                    initial={{ scale: 1.48, opacity: 0, rotate: -26 }}
                    animate={{ scale: 1, opacity: 1, rotate: -8 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  >
                    <WaxSealStamp text={sealText} subtext="PURESPOT" size={78} />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* 下載與分享操作按鈕列 */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownloadCertificate}
                className="btn-tactile inline-flex items-center gap-2 bg-[#935941] px-5 py-3 text-xs font-bold text-white hover:bg-[#7d4934] disabled:opacity-50 sm:text-sm"
              >
                <Download size={16} />
                {downloading
                  ? "正在繪製高解析度證書…"
                  : `下載高畫質數位證書 (${layout === "landscape" ? "橫式賞狀" : "9:16 限動"} .PNG)`}
              </button>

              <button
                type="button"
                onClick={handleCopyCertificateText}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-[#d6c4b0] bg-white px-4 py-3 text-xs font-bold text-[#5a4a3c] transition-colors hover:bg-[#f4ece1]"
              >
                <Copy size={14} />
                複製證書字號與證詞
              </button>

              <button
                type="button"
                onClick={() =>
                  onUseInDiary({
                    petName,
                    title: honorTitle,
                    stamp: sealText,
                    serialNo,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-2xl border border-[#b8ceb9] bg-[#eef4ef] px-4 py-3 text-xs font-bold text-[#3d5c43] transition-colors hover:bg-[#e1ede3]"
              >
                <FileCheck2 size={14} />
                嵌入街坊生活日記發表
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
