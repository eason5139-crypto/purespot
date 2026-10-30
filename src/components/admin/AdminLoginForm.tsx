"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "登入失敗，請稍後再試");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("無法連線到登入服務，請稍後重試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-[#dce7ef] bg-white p-7 shadow-[0_24px_60px_-38px_rgba(52,104,152,.32)] sm:p-9">
      <h1 className="text-3xl font-semibold tracking-tight text-[#25282b]">公司後台登入</h1>
      <p className="mt-2 text-sm text-[#69737b]">請輸入管理員帳號與密碼。</p>

      <div className="mt-8 space-y-5">
        <label className="block text-sm font-medium text-[#36414a]">
          管理員帳號
          <input type="email" name="username" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="電子郵件" className="mt-2 min-h-12 w-full rounded-xl border border-[#cbd8e2] bg-[#fbfcfd] px-4 text-[#25282b] outline-none transition-colors focus:border-[#5B93C5]" />
        </label>
        <label className="block text-sm font-medium text-[#36414a]">
          密碼
          <span className="mt-2 flex items-center rounded-xl border border-[#cbd8e2] bg-[#fbfcfd] focus-within:border-[#5B93C5]">
            <input type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="輸入密碼" className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-[#25282b] outline-none" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "隱藏密碼" : "顯示密碼"} className="mr-2 rounded-lg p-2 text-[#69737b] hover:bg-[#e8f1f8] hover:text-[#376F9F]">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <Button type="submit" disabled={submitting} className="mt-7 h-12 w-full bg-[#5B93C5] text-white hover:bg-[#376F9F]">
        {submitting ? <><LoaderCircle className="animate-spin" />登入中</> : "登入"}
      </Button>
    </form>
  );
}
