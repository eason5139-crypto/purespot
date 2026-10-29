"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="page-shell py-24 text-center">
      <h1 className="text-2xl font-semibold text-[#302b26]">頁面暫時無法載入</h1>
      <p className="my-5 text-sm text-[#7d7165]">請重新載入，稍後再繼續挑選。</p>
      <Button onClick={reset} className="bg-[#935941] text-white hover:bg-[#794632]">重新嘗試</Button>
    </main>
  );
}
