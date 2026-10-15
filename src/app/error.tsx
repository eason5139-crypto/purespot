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
      <h1 className="text-2xl">頁面暫時無法載入</h1>
      <p className="my-5 text-slate-400">請重新載入，稍後再繼續挑選。</p>
      <Button onClick={reset}>重新嘗試</Button>
    </main>
  );
}
