"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
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
        body: JSON.stringify({ username, password }),
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
    <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-[#e5d8c8] bg-white p-7 shadow-sm sm:p-9">
      <h1 className="text-2xl font-bold tracking-tight text-[#302b26]">後台登入</h1>

      <div className="mt-6 space-y-5">
        <label className="block text-sm font-medium text-[#4a3e33]">
          管理員帳號
          <input type="text" name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="輸入管理員帳號" className="mt-2 min-h-12 w-full rounded-xl border border-[#dfd0be] bg-[#fffdf9] px-4 text-[#302b26] outline-none transition-colors focus:border-[#935941]" />
        </label>
        <div className="text-sm font-medium text-[#4a3e33]">
          <label htmlFor="admin-password">密碼</label>
          <span className="mt-2 flex items-center rounded-xl border border-[#dfd0be] bg-[#fffdf9] focus-within:border-[#935941]">
            <input id="admin-password" type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" required minLength={4} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="輸入密碼" className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-[#302b26] outline-none" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "隱藏密碼" : "顯示密碼"} className="mr-2 rounded-lg p-2 text-[#7c6d5e] hover:bg-[#faf4eb] hover:text-[#935941]">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </div>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <Button type="submit" disabled={submitting} className="mt-7 h-12 w-full bg-[#935941] text-white hover:bg-[#7a4733]">
        {submitting ? <><LoaderCircle className="animate-spin" />登入中</> : "登入"}
      </Button>
    </form>
  );
}
